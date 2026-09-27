// Generates apps/mobile/assets/icon.png, adaptive-icon.png, android-icon-monochrome.png,
// and splash-icon.png from content/images/raw/cat-shoulder.png using sharp only.
// No network calls, no new illustration generation — see task-7 constraints.
import sharp from 'sharp';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const APP_DIR = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(APP_DIR, '..', '..');
const RAW = path.join(REPO_ROOT, 'content/images/raw/cat-shoulder.png');
const ASSETS = path.join(APP_DIR, 'assets');
const SCREENS = path.join(REPO_ROOT, '.superpowers/screens');
const FONT_FILE = path.join(REPO_ROOT, 'node_modules/pretendard/dist/public/static/Pretendard-Bold.otf');

const PAPER = { r: 0xf8, g: 0xf8, b: 0xf7 };
const SEAL_RED = { r: 0xc2, g: 0x3b, b: 0x2a };

// Tight crop around the cat only (head, ears, whiskers, body, tail, both paws) —
// excludes the person's head/face. A little of the shoulder line stays at the very
// bottom, since the cat's paws rest on it.
const CAT_CROP = { left: 90, top: 400, width: 540, height: 520 };
// The raw scan's background is near-white but not exactly #F8F8F7; used to cut the
// cat out to a transparent RGBA layer (alpha ~ distance from this background color).
const SCAN_BG = { r: 246, g: 246, b: 245 };
const CUTOUT_THRESHOLD = 55;

// The seal glyph was rendered and tested at 60px (see task-7 report): even at a
// seal size large enough to look imbalanced against the icon, "꾹" reads as a
// smudge, not a character, so it is omitted per the brief's fallback.
const SEAL_ENABLED = false;

async function catCropBuffer() {
  return sharp(RAW).extract(CAT_CROP).png().toBuffer();
}

// Turns "ink on near-white paper" into an RGBA cutout: alpha rises with distance
// from the scanned paper color, RGB kept as scanned (ink is on paper in both the
// old and new background, both near #F8F8F7, so this reproduces cleanly).
async function cutoutOnTransparent(buffer) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.max(Math.abs(r - SCAN_BG.r), Math.abs(g - SCAN_BG.g), Math.abs(b - SCAN_BG.b));
    const alpha = Math.max(0, Math.min(255, Math.round((dist / CUTOUT_THRESHOLD) * 255)));
    out[j] = r;
    out[j + 1] = g;
    out[j + 2] = b;
    out[j + 3] = alpha;
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Fix round 1: a few strokes of the person's hair sit just past the cat's own
// ear/back-of-head contour, in the crop's top-right corner. The contour runs
// roughly through these points (crop-local px); everything above/right of it,
// up to the crop's top and right edges, is the person's hair and gets erased.
const HAIR_CUT_POLYGON = [
  [415, 0],
  [540, 0],
  [540, 210],
  [500, 205],
  [495, 165],
  [485, 115],
  [468, 72],
  [443, 38],
  [415, 18],
];

async function eraseHairRegion(cutoutBuffer) {
  const meta = await sharp(cutoutBuffer).metadata();
  const points = HAIR_CUT_POLYGON.map(([x, y]) => `${x},${y}`).join(' ');
  const svg = `<svg width="${meta.width}" height="${meta.height}"><polygon points="${points}" fill="#fff"/></svg>`;
  return sharp(cutoutBuffer)
    .composite([{ input: Buffer.from(svg), blend: 'dest-out' }])
    .png()
    .toBuffer();
}

// The person's shoulder line runs the full width of the crop and would otherwise
// hit the bottom edge at full strength, reading as a hard cut. Both paws sit well
// above this band (bottom ~120px), so fading only that band tapers the shoulder
// line to nothing before the edge without touching the cat itself.
async function fadeBottomEdge(cutoutBuffer, marginPx) {
  const { data, info } = await sharp(cutoutBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let y = 0; y < height; y += 1) {
    const distFromBottom = height - 1 - y;
    if (distFromBottom >= marginPx) continue;
    const factor = distFromBottom / marginPx;
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels + 3;
      data[idx] = Math.round(data[idx] * factor);
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

// Hair erased, no fade yet — fade is applied last by each caller (dilating after
// a faded edge would let the dilation pull full-strength alpha back in from just
// outside the fade band, undoing the taper).
async function baseCatCutout() {
  const cutout = await cutoutOnTransparent(await catCropBuffer());
  return eraseHairRegion(cutout);
}

// Thickens strokes for the icon-sized variants only (not the splash, which stays
// thin per the brief). A true dilation: each pixel takes the highest alpha (and
// that neighbor's color) found within `radius`, so lines grow outward with their
// own ink color instead of leaving a pale halo. Followed by a small blur: the
// scan has enough per-pixel noise in its anti-aliased edges that a plain max-filter
// dilation amplifies it into a scalloped/stitched-looking edge; blurring after
// dilation smooths that back into a clean, uniformly thicker line.
async function dilateStrokes(buffer, radius) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const src = Buffer.from(data);
  const out = Buffer.from(data);
  const rSq = radius * radius;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels;
      if (src[idx + 3] >= 250) continue;
      let bestAlpha = src[idx + 3];
      let bestR = src[idx];
      let bestG = src[idx + 1];
      let bestB = src[idx + 2];
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(height - 1, y + radius);
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);
      for (let ny = yMin; ny <= yMax; ny += 1) {
        const dy = ny - y;
        for (let nx = xMin; nx <= xMax; nx += 1) {
          const dx = nx - x;
          if (dx * dx + dy * dy > rSq) continue;
          const nIdx = (ny * width + nx) * channels;
          const nAlpha = src[nIdx + 3];
          if (nAlpha > bestAlpha) {
            bestAlpha = nAlpha;
            bestR = src[nIdx];
            bestG = src[nIdx + 1];
            bestB = src[nIdx + 2];
          }
        }
      }
      out[idx] = bestR;
      out[idx + 1] = bestG;
      out[idx + 2] = bestB;
      out[idx + 3] = bestAlpha;
    }
  }
  return sharp(out, { raw: { width, height, channels } })
    .blur(Math.max(1, radius * 0.5))
    .png()
    .toBuffer();
}

// Dilation radius in the crop's native ~540px resolution; the icon canvas scales
// content up ~1.63x from there, and the 60px preview scales the 1024 icon back
// down ~0.06x, so this small a radius still reads as a clear boldening at 60px
// (tuned against .superpowers/screens/icon-60.png — see task-7 fix report).
const ICON_DILATE_RADIUS = 3;
// Applied last, after any dilation, so it isn't undone by dilation pulling
// full-strength alpha back in from just outside the fade band.
const BOTTOM_FADE_PX = 110;

async function fitOnCanvas(cutoutBuffer, canvasSize, contentSize) {
  const meta = await sharp(cutoutBuffer).metadata();
  const scale = contentSize / Math.max(meta.width, meta.height);
  const targetWidth = Math.round(meta.width * scale);
  const targetHeight = Math.round(meta.height * scale);
  const resized = await sharp(cutoutBuffer)
    .resize(targetWidth, targetHeight, { fit: 'fill' })
    .toBuffer();
  const left = Math.round((canvasSize - targetWidth) / 2);
  const top = Math.round((canvasSize - targetHeight) / 2);
  return { resized, left, top, targetWidth, targetHeight };
}

async function makeSeal(sizePx) {
  // Vermilion rounded square with the glyph cut out as a transparent hole, so the
  // paper background shows through the character (traditional red-stamp look).
  const glyphCanvas = Math.round(sizePx * 1.6);
  const glyphBuf = await sharp({
    text: {
      text: '꾹',
      font: 'Pretendard Bold',
      fontfile: FONT_FILE,
      width: glyphCanvas,
      height: glyphCanvas,
      rgba: true,
      align: 'center',
    },
  })
    .png()
    .toBuffer();
  const trimmed = await sharp(glyphBuf).trim().toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  const glyphTarget = Math.round(sizePx * 0.62);
  const glyphScale = glyphTarget / Math.max(trimmedMeta.width, trimmedMeta.height);
  const glyphResized = await sharp(trimmed)
    .resize(Math.round(trimmedMeta.width * glyphScale), Math.round(trimmedMeta.height * glyphScale))
    .toBuffer();
  const glyphMeta = await sharp(glyphResized).metadata();

  const radius = Math.round(sizePx * 0.18);
  const roundedMaskSvg = `<svg width="${sizePx}" height="${sizePx}"><rect x="0" y="0" width="${sizePx}" height="${sizePx}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`;

  const square = await sharp({
    create: { width: sizePx, height: sizePx, channels: 4, background: { ...SEAL_RED, alpha: 1 } },
  })
    .composite([{ input: Buffer.from(roundedMaskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  const glyphLeft = Math.round((sizePx - glyphMeta.width) / 2);
  const glyphTop = Math.round((sizePx - glyphMeta.height) / 2);

  return sharp(square)
    .composite([{ input: glyphResized, left: glyphLeft, top: glyphTop, blend: 'dest-out' }])
    .png()
    .toBuffer();
}

async function buildIcon() {
  const dilated = await dilateStrokes(await baseCatCutout(), ICON_DILATE_RADIUS);
  const cutout = await fadeBottomEdge(dilated, BOTTOM_FADE_PX);
  const { resized, left, top } = await fitOnCanvas(cutout, 1024, 880);

  const composites = [{ input: resized, left, top }];

  if (SEAL_ENABLED) {
    const sealSize = 168;
    const margin = 56;
    const seal = await makeSeal(sealSize);
    composites.push({ input: seal, left: 1024 - margin - sealSize, top: 1024 - margin - sealSize });
  }

  const icon = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { ...PAPER, alpha: 1 } },
  })
    .composite(composites)
    .png()
    .toBuffer();

  await sharp(icon).toFile(path.join(ASSETS, 'icon.png'));

  await mkdir(SCREENS, { recursive: true });
  await sharp(icon).resize(180, 180).toFile(path.join(SCREENS, 'icon-180.png'));
  await sharp(icon).resize(60, 60).toFile(path.join(SCREENS, 'icon-60.png'));
}

async function buildAdaptiveIcon() {
  const dilated = await dilateStrokes(await baseCatCutout(), ICON_DILATE_RADIUS);
  const cutout = await fadeBottomEdge(dilated, BOTTOM_FADE_PX);
  // 66% safe zone: Android may mask the adaptive icon to a circle/squircle, so
  // content must stay inside the centered 66%-of-1024 box.
  const { resized, left, top } = await fitOnCanvas(cutout, 1024, Math.round(1024 * 0.66));

  const foreground = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
  await sharp(foreground).toFile(path.join(ASSETS, 'adaptive-icon.png'));

  // Monochrome (Android 13+ themed icons): same silhouette, single color; the OS
  // tints it at runtime.
  const alpha = await sharp(foreground).ensureAlpha().extractChannel('alpha').raw().toBuffer();
  const { width, height } = await sharp(foreground).metadata();
  const black = await sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
  await sharp(black).toFile(path.join(ASSETS, 'android-icon-monochrome.png'));
}

// Fix round 3: the trimmed cutout used to be resized straight to the final width, so the cat's
// ink touched the canvas edge (worst on the right, where a paw sits closest to the trim box).
// This fraction of each final dimension is left as transparent margin on every side instead,
// comfortably past the brief's 6% minimum.
const SPLASH_MARGIN_FRACTION = 0.08;

async function buildSplashIcon() {
  // Undilated — the splash keeps the original thin ink line weight.
  const cutout = await fadeBottomEdge(await baseCatCutout(), BOTTOM_FADE_PX);
  const trimmed = await sharp(cutout).trim({ threshold: 10 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const canvasWidth = 600;
  const contentWidth = Math.round(canvasWidth * (1 - SPLASH_MARGIN_FRACTION * 2));
  const scale = contentWidth / meta.width;
  const contentHeight = Math.round(meta.height * scale);
  const canvasHeight = Math.round(contentHeight / (1 - SPLASH_MARGIN_FRACTION * 2));
  const resized = await sharp(trimmed).resize(contentWidth, contentHeight).toBuffer();
  const left = Math.round((canvasWidth - contentWidth) / 2);
  const top = Math.round((canvasHeight - contentHeight) / 2);
  await sharp({
    create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(path.join(ASSETS, 'splash-icon.png'));
}

await buildIcon();
await buildAdaptiveIcon();
await buildSplashIcon();
console.log('Wrote icon.png, adaptive-icon.png, android-icon-monochrome.png, splash-icon.png');
console.log('Previews: .superpowers/screens/icon-180.png, icon-60.png');
