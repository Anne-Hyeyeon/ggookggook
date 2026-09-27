import { describe, expect, it } from 'vitest';
import type { Acupoint, Symptom } from './content';
import { searchSymptoms } from './search';

const symptoms: Symptom[] = [
  { id: 'insomnia', name: '불면', aliases: ['잠이 안 올 때'], steps: [{ acupointId: 'HT7', seconds: 60 }], seeDoctor: '…' },
  { id: 'eye_fatigue', name: '눈 피로', aliases: [], steps: [{ acupointId: 'BL2', seconds: 60 }], seeDoctor: '…' },
  { id: 'headache', name: '두통', aliases: [], steps: [{ acupointId: 'LI4', seconds: 60 }], seeDoctor: '…' },
];
const acupoints = new Map<string, Pick<Acupoint, 'name'>>([
  ['HT7', { name: { ko: '신문', hanja: '神門', en: 'Shenmen' } }],
  ['BL2', { name: { ko: '찬죽', hanja: '攢竹', en: 'Cuanzhu' } }],
  ['LI4', { name: { ko: '합곡', hanja: '合谷', en: 'Hegu' } }],
]);

describe('searchSymptoms', () => {
  it('returns every symptom for an empty query', () => {
    expect(searchSymptoms(symptoms, acupoints, '  ')).toHaveLength(3);
  });

  it('matches aliases', () => {
    expect(searchSymptoms(symptoms, acupoints, '잠이 안').map((s) => s.id)).toEqual(['insomnia']);
  });

  it('ignores spaces', () => {
    expect(searchSymptoms(symptoms, acupoints, '눈피로').map((s) => s.id)).toEqual(['eye_fatigue']);
  });

  it('matches acupoint names used in the routine', () => {
    expect(searchSymptoms(symptoms, acupoints, '합곡').map((s) => s.id)).toEqual(['headache']);
  });
});
