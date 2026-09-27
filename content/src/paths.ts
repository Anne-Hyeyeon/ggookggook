import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const CONTENT_ROOT = path.resolve(import.meta.dirname, '..');
export const DATA_DIR = path.join(CONTENT_ROOT, 'data');
export const RAW_IMAGE_DIR = path.join(CONTENT_ROOT, 'images', 'raw');
export const OUT_IMAGE_DIR = path.join(CONTENT_ROOT, 'images', 'out');
export const DIST_DIR = path.join(CONTENT_ROOT, 'dist');

export async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function loadRawContent(dataDir: string = DATA_DIR): Promise<Record<string, unknown>> {
  const meta = (await readJson(path.join(dataDir, 'meta.json'))) as { version?: unknown };
  return {
    version: meta.version,
    acupoints: await readJson(path.join(dataDir, 'acupoints.json')),
    symptoms: await readJson(path.join(dataDir, 'symptoms.json')),
    plates: await readJson(path.join(dataDir, 'plates.json')),
    maps: await readJson(path.join(dataDir, 'maps.json')),
  };
}

export async function listImageIds(dir: string = OUT_IMAGE_DIR): Promise<Set<string>> {
  try {
    const files = await readdir(dir);
    return new Set(files.filter((file) => file.endsWith('.webp')).map((file) => file.slice(0, -'.webp'.length)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }
}
