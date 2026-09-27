import type { Region } from '@ggookggook/shared';
import { content } from '@/content';
import { MAX_REGION_HIT_SIZE, regionHitSizes } from './browseLayout';

const region = (id: string, x: number | null, y: number | null): Region => ({ id, name: id, x, y, plateIds: [] });

describe('regionHitSizes', () => {
  it('gives the max hit size when regions are far apart', () => {
    const sizes = regionHitSizes([region('a', 0.1, 0.1), region('b', 0.9, 0.9)], 300, 300);
    expect(sizes.a).toBe(MAX_REGION_HIT_SIZE);
    expect(sizes.b).toBe(MAX_REGION_HIT_SIZE);
  });

  it('shrinks the hit size below the max for close regions', () => {
    const sizes = regionHitSizes([region('a', 0.5, 0.5), region('b', 0.51, 0.5)], 300, 300);
    expect(sizes.a).toBeCloseTo(3, 5);
    expect(sizes.b).toBeCloseTo(3, 5);
  });

  it('skips a region without a plotted position', () => {
    const sizes = regionHitSizes([region('a', null, null), region('b', 0.5, 0.5)], 300, 300);
    expect(sizes.a).toBeUndefined();
    expect(sizes.b).toBe(MAX_REGION_HIT_SIZE);
  });

  it('returns non-overlapping sizes for the real body-front regions', () => {
    const map = content.map('body-front');
    if (!map) throw new Error('body-front map missing from content');
    const width = 260;
    const height = width * 1.5;
    const sizes = regionHitSizes(map.regions, width, height);
    const positioned = map.regions.filter((candidate) => candidate.x !== null && candidate.y !== null) as (Region & {
      x: number;
      y: number;
    })[];

    expect(positioned.length).toBeGreaterThan(1);
    for (const a of positioned) {
      for (const b of positioned) {
        if (a.id === b.id) continue;
        const distance = Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
        const sizeA = sizes[a.id] ?? MAX_REGION_HIT_SIZE;
        const sizeB = sizes[b.id] ?? MAX_REGION_HIT_SIZE;
        expect(sizeA / 2 + sizeB / 2).toBeLessThanOrEqual(distance + 0.001);
      }
    }
  });
});
