import type { ContentBundle } from '@ggookggook/shared';

export function validContent(): ContentBundle {
  return {
    version: 1,
    acupoints: [
      {
        id: 'LI4',
        name: { ko: '합곡', hanja: '合谷', en: 'Hegu' },
        sides: 'sequential',
        location: '손등에서 엄지와 검지 뼈 사이입니다.',
        technique: '반대쪽 엄지로 꾹 누르세요.',
        defaultSeconds: 60,
        cautions: ['pregnancy'],
        whoLocation: 'On the dorsum of the hand, radial to the midpoint of the second metacarpal bone.',
      },
      {
        id: 'PC6',
        name: { ko: '내관', hanja: '內關', en: 'Neiguan' },
        sides: 'sequential',
        location: '손목 안쪽 주름에서 손가락 세 개 너비만큼 올라온 곳입니다.',
        technique: '반대쪽 엄지로 지그시 누르세요.',
        defaultSeconds: 60,
        cautions: [],
        whoLocation:
          'On the anterior aspect of the forearm, between the tendons of palmaris longus and flexor carpi radialis, 2 B-cun proximal to the palmar wrist crease.',
      },
    ],
    symptoms: [
      {
        id: 'food_stagnation',
        name: '식체',
        aliases: ['체했을 때'],
        steps: [
          { acupointId: 'LI4', seconds: 60 },
          { acupointId: 'PC6', seconds: 60 },
        ],
        seeDoctor: '가슴 통증이나 식은땀이 함께 오면 바로 119에 연락하세요.',
      },
    ],
    plates: [
      { id: 'hand-dorsal', name: '손등', subject: 'the back of a hand', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 0.6, y: 0.56 }] },
      { id: 'wrist-inner', name: '손목 안쪽', subject: 'the inner wrist', acupointIds: ['PC6'], pins: [{ acupointId: 'PC6', x: 0.5, y: 0.4 }] },
    ],
    maps: [
      {
        id: 'body-front',
        name: '앞면',
        subject: 'a full body',
        regions: [{ id: 'hand', name: '손', x: 0.15, y: 0.53, plateIds: ['hand-dorsal', 'wrist-inner'] }],
      },
    ],
  };
}
