import { describe, expect, it } from 'vitest';
import { buildBundle, buildManifest } from './build';
import { validContent } from './fixtures';

describe('buildBundle', () => {
  it('returns the parsed bundle for valid content', () => {
    const bundle = buildBundle(validContent());
    expect(bundle.version).toBe(1);
    expect(bundle.symptoms[0]!.id).toBe('food_stagnation');
  });

  it('refuses content with errors and lists them', () => {
    const content = validContent();
    content.symptoms[0]!.steps.push({ acupointId: 'ST36', seconds: 60 });
    expect(() => buildBundle(content)).toThrow('Symptom food_stagnation uses unknown acupoint ST36');
  });

  it('does not refuse content that only has warnings', () => {
    const content = validContent();
    content.plates[0]!.pins = [];
    expect(() => buildBundle(content)).not.toThrow();
  });
});

describe('buildManifest', () => {
  it('points at versioned paths', () => {
    expect(buildManifest(3, new Date('2026-09-27T00:00:00Z'))).toEqual({
      version: 3,
      bundlePath: 'v3/bundle.json',
      imagesPath: 'v3/images/',
      publishedAt: '2026-09-27T00:00:00.000Z',
    });
  });
});
