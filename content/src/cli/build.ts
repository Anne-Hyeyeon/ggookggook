import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildBundle, buildManifest } from '../build';
import { DIST_DIR, loadRawContent, OUT_IMAGE_DIR } from '../paths';

const bundle = buildBundle(await loadRawContent());
const manifest = buildManifest(bundle.version, new Date());

await rm(DIST_DIR, { recursive: true, force: true });
const imagesDir = path.join(DIST_DIR, manifest.imagesPath);
await mkdir(imagesDir, { recursive: true });

await writeFile(path.join(DIST_DIR, manifest.bundlePath), JSON.stringify(bundle));
const images = (await readdir(OUT_IMAGE_DIR)).filter((file) => file.endsWith('.webp'));
for (const file of images) await copyFile(path.join(OUT_IMAGE_DIR, file), path.join(imagesDir, file));
await writeFile(path.join(DIST_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built content v${bundle.version}: ${bundle.acupoints.length} acupoints, ${bundle.symptoms.length} symptoms, ${images.length} images`);
