import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { canvasKindFor, normalizeImage } from '../images';
import { OUT_IMAGE_DIR, RAW_IMAGE_DIR } from '../paths';

const INPUT = /\.(png|jpe?g|webp)$/i;
const only = process.argv[2];

for (const file of await readdir(RAW_IMAGE_DIR)) {
  if (!INPUT.test(file)) continue;
  const id = file.replace(INPUT, '');
  if (only && id !== only) continue;
  const kind = canvasKindFor(id);
  await normalizeImage(path.join(RAW_IMAGE_DIR, file), path.join(OUT_IMAGE_DIR, `${id}.webp`), kind);
  console.log(`${id}.webp (${kind})`);
}
