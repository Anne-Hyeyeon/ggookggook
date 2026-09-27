import type { Region } from '@ggookggook/shared';

export const MAX_REGION_HIT_SIZE = 44;

// Shrinks a region's hit size to the gap to its nearest neighbor, so close touch targets never overlap.
export function regionHitSizes(regions: Region[], width: number, height: number): Record<string, number> {
  const points = regions
    .filter((region): region is Region & { x: number; y: number } => region.x !== null && region.y !== null)
    .map((region) => ({ id: region.id, x: region.x * width, y: region.y * height }));

  const sizes: Record<string, number> = {};
  for (const point of points) {
    let nearest = Infinity;
    for (const other of points) {
      if (other.id === point.id) continue;
      const distance = Math.hypot(point.x - other.x, point.y - other.y);
      if (distance < nearest) nearest = distance;
    }
    sizes[point.id] = Math.min(MAX_REGION_HIT_SIZE, nearest);
  }
  return sizes;
}
