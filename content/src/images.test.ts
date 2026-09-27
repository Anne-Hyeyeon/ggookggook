import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { canvasKindFor, normalizeImage } from './images';

async function alphaAt(file: string, x: number, y: number): Promise<number> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * info.channels + 3]!;
}

async function lightBackgroundWithInk(): Promise<Buffer> {
  const ink = await sharp({ create: { width: 50, height: 80, channels: 3, background: '#3A3732' } }).png().toBuffer();
  return sharp({ create: { width: 200, height: 300, channels: 3, background: '#F8F8F7' } })
    .composite([{ input: ink, left: 60, top: 100 }])
    .png()
    .toBuffer();
}

describe('canvasKindFor', () => {
  it('uses the tall canvas for body maps', () => {
    expect(canvasKindFor('body-front')).toBe('map');
    expect(canvasKindFor('hand-dorsal')).toBe('square');
    expect(canvasKindFor('cat-shoulder')).toBe('square');
  });
});

describe('normalizeImage', () => {
  it('keys out a light background, trims, and centers on the map canvas', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ggook-'));
    const out = path.join(dir, 'body-front.webp');
    await normalizeImage(await lightBackgroundWithInk(), out, 'map');

    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1536]);
    expect(await alphaAt(out, 2, 2)).toBe(0);
    expect(await alphaAt(out, 512, 768)).toBeGreaterThan(200);
  });

  it('keeps existing transparency on the square canvas', async () => {
    const ink = await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 58, g: 55, b: 50, alpha: 1 } } }).png().toBuffer();
    const input = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: ink, left: 30, top: 30 }])
      .png()
      .toBuffer();
    const dir = await mkdtemp(path.join(tmpdir(), 'ggook-'));
    const out = path.join(dir, 'hand-dorsal.webp');
    await normalizeImage(input, out, 'square');

    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(await alphaAt(out, 2, 2)).toBe(0);
    expect(await alphaAt(out, 512, 512)).toBeGreaterThan(200);
  });

  it('refuses an image with nothing on it', async () => {
    const blank = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#F8F8F7' } }).png().toBuffer();
    const dir = await mkdtemp(path.join(tmpdir(), 'ggook-'));
    await expect(normalizeImage(blank, path.join(dir, 'x.webp'), 'square')).rejects.toThrow('empty');
  });
});
