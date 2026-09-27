import type { CanvasKind } from './images';

const STYLE = [
  'Style: fine single-weight ink line art in warm charcoal (#3A3732).',
  'No color fill, no shading, no hatching, no color anywhere.',
  'No text, labels, arrows, or markers.',
  'Anatomically accurate: exactly five fingers and five toes wherever hands or feet appear.',
  'No visible veins or tendons, and only a faint line per joint.',
  'Transparent background, with no glow, vignette, shadow, ground line, or gradient.',
].join(' ');

const FRAME: Record<CanvasKind, string> = {
  map: 'Centered with generous margin. Portrait 2:3.',
  square: 'Centered with generous margin. Square 1:1.',
};

export function buildPrompt(subject: string, kind: CanvasKind): string {
  return `A clean illustration of ${subject}. ${STYLE} ${FRAME[kind]}`;
}
