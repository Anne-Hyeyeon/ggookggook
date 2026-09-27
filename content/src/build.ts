import { contentBundleSchema, type ContentBundle, type Manifest } from '@ggookggook/shared';
import { validateContent } from './validate';

export function buildBundle(raw: unknown): ContentBundle {
  const errors = validateContent(raw, { release: false }).filter((issue) => issue.level === 'error');
  if (errors.length > 0) {
    throw new Error(`Content has errors:\n${errors.map((issue) => issue.message).join('\n')}`);
  }
  return contentBundleSchema.parse(raw);
}

export function buildManifest(version: number, publishedAt: Date): Manifest {
  return {
    version,
    bundlePath: `v${version}/bundle.json`,
    imagesPath: `v${version}/images/`,
    publishedAt: publishedAt.toISOString(),
  };
}
