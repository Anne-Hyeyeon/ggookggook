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
  const cutout = await cutoutOnTransparent(await catCropBuffer());
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
  const cutout = await cutoutOnTransparent(await catCropBuffer());
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

async function buildSplashIcon() {
  const cutout = await cutoutOnTransparent(await catCropBuffer());
  const trimmed = await sharp(cutout).trim({ threshold: 10 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  const scale = 600 / meta.width;
  const height = Math.round(meta.height * scale);
  await sharp(trimmed).resize(600, height).toFile(path.join(ASSETS, 'splash-icon.png'));
}

await buildIcon();
await buildAdaptiveIcon();
await buildSplashIcon();
console.log('Wrote icon.png, adaptive-icon.png, android-icon-monochrome.png, splash-icon.png');
console.log('Previews: .superpowers/screens/icon-180.png, icon-60.png');
