import { describe, expect, it } from 'vitest';
import { validContent } from './fixtures';
import { validateContent, type Issue } from './validate';

const allImages = new Set(['hand-dorsal', 'wrist-inner', 'body-front']);
const errors = (issues: Issue[]) => issues.filter((i) => i.level === 'error').map((i) => i.message);
const warnings = (issues: Issue[]) => issues.filter((i) => i.level === 'warning').map((i) => i.message);

describe('validateContent', () => {
  it('passes valid content in release mode', () => {
    expect(validateContent(validContent(), { release: true, imageIds: allImages })).toEqual([]);
  });

  it('reports schema errors with their path', () => {
    const content = validContent();
    (content.acupoints[0] as { id: string }).id = 'li4';
    expect(errors(validateContent(content, { release: false }))[0]).toContain('acupoints.0.id');
  });

  it('reports unknown acupoints in symptom steps', () => {
    const content = validContent();
    content.symptoms[0]!.steps.push({ acupointId: 'ST36', seconds: 60 });
    expect(errors(validateContent(content, { release: false }))).toContain('Symptom food_stagnation uses unknown acupoint ST36');
  });

  it('reports duplicate ids', () => {
    const content = validContent();
    content.acupoints.push({ ...content.acupoints[0]! });
    expect(errors(validateContent(content, { release: false }))).toContain('Duplicate acupoint id: LI4');
  });

  it('reports acupoints that are on no plate', () => {
    const content = validContent();
    content.plates[1]!.acupointIds = ['LI4'];
    content.plates[1]!.pins = [];
    expect(errors(validateContent(content, { release: false }))).toContain('Acupoint PC6 is not on any plate');
  });

  it('reports pins for acupoints the plate does not list', () => {
    const content = validContent();
    content.plates[0]!.pins.push({ acupointId: 'PC6', x: 0.1, y: 0.1 });
    expect(errors(validateContent(content, { release: false }))).toContain('Plate hand-dorsal has a pin for PC6, which it does not list');
  });

  it('reports plates no region links to', () => {
    const content = validContent();
    content.maps[0]!.regions[0]!.plateIds = ['hand-dorsal'];
    expect(errors(validateContent(content, { release: false }))).toContain('Plate wrist-inner is not reachable from any body map region');
  });

  it('treats missing pins as warnings until release', () => {
    const content = validContent();
    content.plates[0]!.pins = [];
    expect(warnings(validateContent(content, { release: false }))).toContain('Plate hand-dorsal has no pin for LI4');
    expect(errors(validateContent(content, { release: true, imageIds: allImages }))).toContain('Plate hand-dorsal has no pin for LI4');
  });

  it('treats missing images as warnings until release', () => {
    const images = new Set(['wrist-inner', 'body-front']);
    expect(warnings(validateContent(validContent(), { release: false, imageIds: images }))).toContain('Plate hand-dorsal has no image');
    expect(errors(validateContent(validContent(), { release: true, imageIds: images }))).toContain('Plate hand-dorsal has no image');
  });

  it('treats regions without a position as warnings until release', () => {
    const content = validContent();
    content.maps[0]!.regions[0]!.x = null;
    expect(warnings(validateContent(content, { release: false }))).toContain('Region body-front/hand has no position');
    expect(errors(validateContent(content, { release: true, imageIds: allImages }))).toContain('Region body-front/hand has no position');
  });

  it('warns when pregnancy mode would empty a routine', () => {
    const content = validContent();
    content.symptoms[0]!.steps = [{ acupointId: 'LI4', seconds: 60 }];
    expect(warnings(validateContent(content, { release: false }))).toContain('Symptom food_stagnation has no steps left in pregnancy mode');
  });

  it('reports a plate that pins the same acupoint twice', () => {
    const content = validContent();
    content.plates[0]!.pins.push({ acupointId: 'LI4', x: 0.5, y: 0.5 });
    expect(errors(validateContent(content, { release: false }))).toContain('Plate hand-dorsal pins LI4 twice');
  });
});

describe('validateContent pins on plates that depict both sides', () => {
  const bothSides = () => {
    const content = validContent();
    content.plates[0]!.depicts = 'both';
    content.plates[0]!.pins = [
      { acupointId: 'LI4', x: 0.3, y: 0.5, side: 'left' },
      { acupointId: 'LI4', x: 0.7, y: 0.5, side: 'right' },
    ];
    return content;
  };

  it('passes a bilateral acupoint pinned on both sides', () => {
    expect(validateContent(bothSides(), { release: true, imageIds: allImages })).toEqual([]);
  });

  it('treats a missing side as a gap until release', () => {
    const content = bothSides();
    content.plates[0]!.pins = content.plates[0]!.pins.filter((pin) => pin.side === 'left');
    expect(warnings(validateContent(content, { release: false }))).toEqual(['Plate hand-dorsal has no right pin for LI4']);
    expect(errors(validateContent(content, { release: true, imageIds: allImages }))).toEqual(['Plate hand-dorsal has no right pin for LI4']);
  });

  it('reports a bilateral pin with no side', () => {
    const content = bothSides();
    content.plates[0]!.pins[1] = { acupointId: 'LI4', x: 0.7, y: 0.5 };
    const issues = validateContent(content, { release: false });
    expect(errors(issues)).toEqual(['Plate hand-dorsal has a pin with no side for LI4']);
    expect(warnings(issues)).toEqual(['Plate hand-dorsal has no right pin for LI4']);
  });

  it('reports the same side pinned twice', () => {
    const content = bothSides();
    content.plates[0]!.pins.push({ acupointId: 'LI4', x: 0.72, y: 0.5, side: 'right' });
    expect(errors(validateContent(content, { release: false }))).toEqual(['Plate hand-dorsal pins LI4 right twice']);
  });

  it('wants one pin with no side for a single acupoint', () => {
    const content = bothSides();
    content.acupoints[0]!.sides = 'single';
    const issues = validateContent(content, { release: false });
    expect(errors(issues)).toEqual(['Plate hand-dorsal has an unexpected left pin for LI4', 'Plate hand-dorsal has an unexpected right pin for LI4']);
    expect(warnings(issues)).toContain('Plate hand-dorsal has no pin for LI4');

    content.plates[0]!.pins = [{ acupointId: 'LI4', x: 0.5, y: 0.5 }];
    expect(validateContent(content, { release: true, imageIds: allImages })).toEqual([]);
  });

  it('wants one pin with no side on a plate that depicts one side', () => {
    const content = validContent();
    content.plates[0]!.pins[0] = { acupointId: 'LI4', x: 0.6, y: 0.56, side: 'left' };
    expect(errors(validateContent(content, { release: false }))).toContain('Plate hand-dorsal has an unexpected left pin for LI4');
  });
});

