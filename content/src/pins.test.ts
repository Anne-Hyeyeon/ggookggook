import { describe, expect, it } from 'vitest';
import { validContent } from './fixtures';
import { setPin, setRegionPosition } from './pins';

describe('setPin', () => {
  it('adds or replaces a pin, rounded to 3 decimals', () => {
    const plates = validContent().plates;
    const next = setPin(plates, 'hand-dorsal', 'LI4', 0.61234, 0.55555);
    expect(next[0]!.pins).toEqual([{ acupointId: 'LI4', x: 0.612, y: 0.556 }]);
    expect(plates[0]!.pins[0]!.x).toBe(0.6);
  });

  it('keeps pins in the same order as acupointIds', () => {
    const plates = validContent().plates;
    plates[0]!.acupointIds = ['LI4', 'SI3'];
    plates[0]!.pins = [];
    const next = setPin(setPin(plates, 'hand-dorsal', 'SI3', 0.3, 0.5), 'hand-dorsal', 'LI4', 0.6, 0.5);
    expect(next[0]!.pins.map((pin) => pin.acupointId)).toEqual(['LI4', 'SI3']);
  });

  it('rejects unknown plates, unlisted acupoints, and out-of-range values', () => {
    const plates = validContent().plates;
    expect(() => setPin(plates, 'nope', 'LI4', 0.5, 0.5)).toThrow('Unknown plate');
    expect(() => setPin(plates, 'hand-dorsal', 'PC6', 0.5, 0.5)).toThrow('does not list');
    expect(() => setPin(plates, 'hand-dorsal', 'LI4', 1.5, 0.5)).toThrow(RangeError);
  });
});

describe('setRegionPosition', () => {
  it('sets a region center', () => {
    const next = setRegionPosition(validContent().maps, 'body-front', 'hand', 0.1504, 0.53);
    expect(next[0]!.regions[0]).toMatchObject({ x: 0.15, y: 0.53 });
  });

  it('rejects unknown maps and regions', () => {
    const maps = validContent().maps;
    expect(() => setRegionPosition(maps, 'body-back', 'hand', 0.5, 0.5)).toThrow('Unknown map');
    expect(() => setRegionPosition(maps, 'body-front', 'knee', 0.5, 0.5)).toThrow('Unknown region');
  });
});
