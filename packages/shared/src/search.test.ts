import { describe, expect, it } from 'vitest';
import type { Acupoint, Symptom } from './content';
import { searchAcupoints, searchSymptoms } from './search';

const symptoms: Symptom[] = [
  { id: 'insomnia', name: '불면', aliases: ['잠이 안 올 때'], steps: [{ acupointId: 'HT7', seconds: 60 }], seeDoctor: '…' },
  { id: 'eye_fatigue', name: '눈 피로', aliases: [], steps: [{ acupointId: 'BL2', seconds: 60 }], seeDoctor: '…' },
  { id: 'headache', name: '두통', aliases: [], steps: [{ acupointId: 'LI4', seconds: 60 }], seeDoctor: '…' },
];
const acupoints = new Map<string, Pick<Acupoint, 'name'>>([
  ['HT7', { name: { ko: '신문', hanja: '神門', en: 'Sinmun' } }],
  ['BL2', { name: { ko: '찬죽', hanja: '攢竹', en: 'Chanjuk' } }],
  ['LI4', { name: { ko: '합곡', hanja: '合谷', en: 'Hapgok' } }],
]);

const acupointList: Pick<Acupoint, 'id' | 'name'>[] = [
  { id: 'HT7', name: { ko: '신문', hanja: '神門', en: 'Sinmun' } },
  { id: 'BL2', name: { ko: '찬죽', hanja: '攢竹', en: 'Chanjuk' } },
  { id: 'LI4', name: { ko: '합곡', hanja: '合谷', en: 'Hapgok' } },
];

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

describe('searchAcupoints', () => {
  it('returns every acupoint for an empty query', () => {
    expect(searchAcupoints(acupointList, '  ')).toHaveLength(3);
  });

  it('matches the Korean name', () => {
    expect(searchAcupoints(acupointList, '합곡').map((a) => a.id)).toEqual(['LI4']);
  });

  it('matches the hanja name', () => {
    expect(searchAcupoints(acupointList, '神門').map((a) => a.id)).toEqual(['HT7']);
  });

  it('matches the romanized name, case-insensitively', () => {
    expect(searchAcupoints(acupointList, 'chanjuk').map((a) => a.id)).toEqual(['BL2']);
  });

  it('ignores spaces and case', () => {
    expect(searchAcupoints(acupointList, ' HaPgOk ').map((a) => a.id)).toEqual(['LI4']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchAcupoints(acupointList, '없음')).toEqual([]);
  });
});
