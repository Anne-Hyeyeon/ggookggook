import { describe, expect, it } from 'vitest';
import { acupointSchema, contentBundleSchema, symptomSchema } from './content';

const hegu = {
  id: 'LI4',
  name: { ko: '합곡', hanja: '合谷', en: 'Hegu' },
  sides: 'sequential',
  location: '손등에서 엄지와 검지 뼈 사이입니다.',
  technique: '반대쪽 엄지로 꾹 누르세요.',
  defaultSeconds: 60,
  cautions: ['pregnancy'],
  whoLocation: 'On the dorsum of the hand, radial to the midpoint of the second metacarpal bone.',
};

describe('acupointSchema', () => {
  it('accepts a WHO-coded acupoint', () => {
    expect(acupointSchema.parse(hegu).id).toBe('LI4');
  });

  it('accepts extra points and GV29', () => {
    expect(acupointSchema.safeParse({ ...hegu, id: 'EX-HN5' }).success).toBe(true);
    expect(acupointSchema.safeParse({ ...hegu, id: 'GV29' }).success).toBe(true);
  });

  it('rejects the non-WHO kidney prefix KD', () => {
    expect(acupointSchema.safeParse({ ...hegu, id: 'KD1' }).success).toBe(false);
    expect(acupointSchema.safeParse({ ...hegu, id: 'KI1' }).success).toBe(true);
  });

  it('rejects seconds that are not a multiple of 10', () => {
    expect(acupointSchema.safeParse({ ...hegu, defaultSeconds: 45 }).success).toBe(false);
  });
});

describe('symptomSchema', () => {
  const step = { acupointId: 'LI4', seconds: 60 };
  const symptom = { id: 'food_stagnation', name: '식체', aliases: ['체했을 때'], steps: [step], seeDoctor: '가슴 통증이 함께 오면 119에 연락하세요.' };

  it('accepts 1 to 3 steps', () => {
    expect(symptomSchema.safeParse(symptom).success).toBe(true);
    expect(symptomSchema.safeParse({ ...symptom, steps: [step, step, step] }).success).toBe(true);
  });

  it('rejects empty and 4-step routines', () => {
    expect(symptomSchema.safeParse({ ...symptom, steps: [] }).success).toBe(false);
    expect(symptomSchema.safeParse({ ...symptom, steps: [step, step, step, step] }).success).toBe(false);
  });
});

describe('contentBundleSchema', () => {
  it('rejects pins outside 0..1', () => {
    const bundle = {
      version: 1,
      acupoints: [hegu],
      symptoms: [],
      plates: [{ id: 'hand-dorsal', name: '손등', subject: 'a hand', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 1.2, y: 0.5 }] }],
      maps: [],
    };
    expect(contentBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it('allows regions without a position yet', () => {
    const bundle = {
      version: 1,
      acupoints: [hegu],
      symptoms: [],
      plates: [{ id: 'hand-dorsal', name: '손등', subject: 'a hand', acupointIds: ['LI4'], pins: [] }],
      maps: [{ id: 'body-front', name: '앞면', subject: 'a body', regions: [{ id: 'hand', name: '손', x: null, y: null, plateIds: ['hand-dorsal'] }] }],
    };
    expect(contentBundleSchema.safeParse(bundle).success).toBe(true);
  });
});
