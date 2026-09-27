import { describe, expect, it } from 'vitest';
import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('wraps a plate subject in the fixed style and a square frame', () => {
    const prompt = buildPrompt('the sole of a right foot', 'square');
    expect(prompt.startsWith('A clean illustration of the sole of a right foot.')).toBe(true);
    expect(prompt).toContain('#3A3732');
    expect(prompt).toContain('Transparent background');
    expect(prompt.endsWith('Square 1:1.')).toBe(true);
  });

  it('uses a portrait frame for body maps', () => {
    expect(buildPrompt('a full body', 'map').endsWith('Portrait 2:3.')).toBe(true);
  });
});
