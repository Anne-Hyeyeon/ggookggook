import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export type CanvasKind = 'map' | 'square';

export const CANVAS: Record<CanvasKind, { width: number; height: number }> = {
  map: { width: 1024, height: 1536 },
  square: { width: 1024, height: 1024 },
};

const MARGIN = 0.06;
// Background (#F8F8F7, 248) minus line ink (#3A3732, 58): a pixel this far from the background is fully opaque.
const INK_RANGE = 190;
// Alpha below this (out of 255) is noise from JPEG-style artifacts or soft halos.
const ALPHA_FLOOR = 16;

export function canvasKindFor(id: string): CanvasKind {
  return id.startsWith('body-') ? 'map' : 'square';
}

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
}

function hasTransparency(data: Buffer): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 250) return true;
  }
  return false;
}

function cornerColor({ data, width, height }: RawImage): [number, number, number] {
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const pixel of corners) {
    r += data[pixel * 4]!;
    g += data[pixel * 4 + 1]!;
    b += data[pixel * 4 + 2]!;
  }
  return [r / 4, g / 4, b / 4];
}

function keyOutBackground(image: RawImage): void {
  const bg = cornerColor(image);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const diff = Math.max(Math.abs(data[i]! - bg[0]), Math.abs(data[i + 1]! - bg[1]), Math.abs(data[i + 2]! - bg[2]));
    const alpha = Math.min(1, diff / INK_RANGE);
    if (alpha === 0) {
      data[i + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) {
      const unmixed = (data[i + c]! - (1 - alpha) * bg[c]!) / alpha;
      data[i + c] = Math.max(0, Math.min(255, Math.round(unmixed)));
    }
    data[i + 3] = Math.round(alpha * 255);
  }
}

function alphaBounds({ data, width, height }: RawImage): { left: number; top: number; width: number; height: number } | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function readRgba(input: string | Buffer): Promise<RawImage> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function normalizeImage(input: string | Buffer, output: string, kind: CanvasKind): Promise<void> {
  const image = await readRgba(input);
  if (!hasTransparency(image.data)) keyOutBackground(image);
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i]! < ALPHA_FLOOR) image.data[i] = 0;
  }

  const box = alphaBounds(image);
  if (!box) throw new Error('Image is empty after removing the background');

  const canvas = CANVAS[kind];
  const fitted = await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } })
    .extract(box)
    .resize(Math.round(canvas.width * (1 - 2 * MARGIN)), Math.round(canvas.height * (1 - 2 * MARGIN)), { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });

  await mkdir(path.dirname(output), { recursive: true });
  await sharp({ create: { width: canvas.width, height: canvas.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      {
        input: fitted.data,
        left: Math.round((canvas.width - fitted.info.width) / 2),
        top: Math.round((canvas.height - fitted.info.height) / 2),
      },
    ])
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(output);
}
