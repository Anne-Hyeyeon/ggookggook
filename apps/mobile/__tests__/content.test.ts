import type { ContentBundle } from '@ggookggook/shared';
import { buildIndex, content } from '@/content';

const bundle: ContentBundle = {
  version: 1,
  acupoints: [
    {
      id: 'LI4',
      name: { ko: '합곡', hanja: '合谷', en: 'Hegu' },
      sides: 'sequential',
      location: '손등입니다.',
      technique: '누르세요.',
      defaultSeconds: 60,
      cautions: ['pregnancy'],
      whoLocation: 'dorsum',
    },
  ],
  symptoms: [{ id: 'headache', name: '두통', aliases: [], steps: [{ acupointId: 'LI4', seconds: 60 }], seeDoctor: '병원에 가세요.' }],
  plates: [
    { id: 'no-image', name: '그림 없음', subject: 's', depicts: 'left', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 0.1, y: 0.1 }] },
    { id: 'hand-dorsal', name: '손등', subject: 's', depicts: 'left', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 0.61, y: 0.59 }] },
  ],
  maps: [],
};

describe('buildIndex', () => {
  const index = buildIndex(bundle, { 'hand-dorsal': 42 });

  it('looks up symptoms and acupoints', () => {
    expect(index.symptom('headache')?.name).toBe('두통');
    expect(index.symptom('nope')).toBeUndefined();
    expect(index.acupoints.get('LI4')?.name.ko).toBe('합곡');
  });

  it('prefers a plate that has an image', () => {
    const view = index.plateFor('LI4');
    expect(view?.plate.id).toBe('hand-dorsal');
    expect(view?.image).toBe(42);
    expect(view?.pins).toEqual([{ acupointId: 'LI4', x: 0.61, y: 0.59 }]);
  });

  it('returns null for an acupoint on no plate', () => {
    expect(index.plateFor('ST36')).toBeNull();
  });
});

describe('bundled content', () => {
  it('parses and holds the reviewed data', () => {
    expect(content.symptoms).toHaveLength(16);
    expect(content.acupoints.size).toBe(37);
    expect(content.image('cat-shoulder')).not.toBeNull();
  });
});
