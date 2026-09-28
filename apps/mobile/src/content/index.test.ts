import type { ContentBundle } from '@ggookggook/shared';
import { buildIndex, content } from '@/content';

const bundle: ContentBundle = {
  version: 1,
  acupoints: [
    {
      id: 'LI4',
      name: { ko: '합곡', hanja: '合谷', en: 'Hapgok' },
      sides: 'sequential',
      location: '손등입니다.',
      technique: '누르세요.',
      defaultSeconds: 60,
      cautions: ['pregnancy'],
      whoLocation: 'dorsum',
    },
    {
      id: 'SI3',
      name: { ko: '후계', hanja: '後谿', en: 'Hugye' },
      sides: 'sequential',
      location: '손등 바깥쪽입니다.',
      technique: '누르세요.',
      defaultSeconds: 60,
      cautions: [],
      whoLocation: 'dorsum',
    },
  ],
  symptoms: [{ id: 'headache', name: '두통', aliases: [], steps: [{ acupointId: 'LI4', seconds: 60 }], seeDoctor: '병원에 가세요.' }],
  plates: [
    { id: 'no-image', name: '그림 없음', subject: 's', depicts: 'left', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 0.1, y: 0.1 }] },
    { id: 'wrist-dup', name: '중복', subject: 's', depicts: 'left', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 0.2, y: 0.2 }] },
    {
      id: 'hand-dorsal',
      name: '손등',
      subject: 's',
      depicts: 'left',
      acupointIds: ['LI4', 'SI3'],
      pins: [
        { acupointId: 'LI4', x: 0.61, y: 0.59 },
        { acupointId: 'SI3', x: 0.7, y: 0.5 },
      ],
    },
  ],
  maps: [
    {
      id: 'body-front',
      name: '앞면',
      subject: 's',
      regions: [{ id: 'hand', name: '손', x: 0.5, y: 0.5, plateIds: ['no-image', 'wrist-dup', 'hand-dorsal'] }],
    },
  ],
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

  it('looks up a body map and an unknown one', () => {
    expect(index.map('body-front')?.name).toBe('앞면');
    expect(index.map('body-back')).toBeUndefined();
  });

  it('looks up a plate and an unknown one', () => {
    expect(index.plate('hand-dorsal')?.name).toBe('손등');
    expect(index.plate('nope')).toBeUndefined();
  });

  it('finds symptoms that use an acupoint, in content order', () => {
    expect(index.symptomsFor('LI4').map((symptom) => symptom.id)).toEqual(['headache']);
    expect(index.symptomsFor('ST36')).toEqual([]);
  });

  it('groups a region into its linked plates, de-duplicating acupoints and dropping a plate left with none', () => {
    expect(index.acupointsForRegion('body-front', 'hand')).toEqual([
      { plate: bundle.plates[2], acupoints: [bundle.acupoints[1]] },
      { plate: bundle.plates[0], acupoints: [bundle.acupoints[0]] },
    ]);
  });

  it('orders an image-bearing plate before one with no drawing yet', () => {
    const order = index.acupointsForRegion('body-front', 'hand').map((group) => group.plate.id);
    expect(order).toEqual(['hand-dorsal', 'no-image']);
  });

  it('returns an empty list for an unknown map or region', () => {
    expect(index.acupointsForRegion('body-back', 'hand')).toEqual([]);
    expect(index.acupointsForRegion('body-front', 'nope')).toEqual([]);
  });
});

describe('bundled content', () => {
  it('parses and holds the reviewed data', () => {
    expect(content.symptoms).toHaveLength(31);
    expect(content.acupoints.size).toBe(42);
    expect(content.image('cat-shoulder')).not.toBeNull();
  });

  it('groups the hand region across its two plates', () => {
    const groups = content.acupointsForRegion('body-front', 'hand');
    const names = groups.flatMap((group) => group.acupoints.map((acupoint) => acupoint.name.ko));
    expect(names).toEqual(expect.arrayContaining(['합곡', '후계', '내관']));
  });

  it('finds the routines that use 합곡', () => {
    expect(content.symptomsFor('LI4').map((symptom) => symptom.name)).toContain('머리가 아플 때');
  });
});
