import type { BodyMap, Pin, Plate, Side } from '@ggookggook/shared';

const round = (value: number) => Math.round(value * 1000) / 1000;

function assertUnit(x: number, y: number): void {
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) throw new RangeError(`Coordinates must be within 0..1, got (${x}, ${y})`);
}

const SIDE_ORDER = { none: 0, left: 1, right: 2 } as const;

export function setPin(plates: Plate[], plateId: string, acupointId: string, x: number, y: number, side?: Side): Plate[] {
  assertUnit(x, y);
  const plate = plates.find((candidate) => candidate.id === plateId);
  if (!plate) throw new Error(`Unknown plate: ${plateId}`);
  if (!plate.acupointIds.includes(acupointId)) throw new Error(`Plate ${plateId} does not list ${acupointId}`);

  const pin: Pin = side ? { acupointId, x: round(x), y: round(y), side } : { acupointId, x: round(x), y: round(y) };
  const pins = [...plate.pins.filter((other) => other.acupointId !== acupointId || other.side !== side), pin];
  pins.sort(
    (a, b) =>
      plate.acupointIds.indexOf(a.acupointId) - plate.acupointIds.indexOf(b.acupointId) ||
      SIDE_ORDER[a.side ?? 'none'] - SIDE_ORDER[b.side ?? 'none'],
  );
  return plates.map((candidate) => (candidate.id === plateId ? { ...candidate, pins } : candidate));
}

export function setRegionPosition(maps: BodyMap[], mapId: string, regionId: string, x: number, y: number): BodyMap[] {
  assertUnit(x, y);
  const map = maps.find((candidate) => candidate.id === mapId);
  if (!map) throw new Error(`Unknown map: ${mapId}`);
  if (!map.regions.some((region) => region.id === regionId)) throw new Error(`Unknown region ${regionId} in ${mapId}`);

  const regions = map.regions.map((region) => (region.id === regionId ? { ...region, x: round(x), y: round(y) } : region));
  return maps.map((candidate) => (candidate.id === mapId ? { ...candidate, regions } : candidate));
}
