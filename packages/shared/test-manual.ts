import { acupointSchema, contentBundleSchema, symptomSchema } from './src/content';

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

// Test acupointSchema
console.log('Testing acupointSchema...');
try {
  const result = acupointSchema.parse(hegu);
  console.log('✓ accepts a WHO-coded acupoint');
} catch (e) {
  console.error('✗ Failed to parse WHO-coded acupoint:', e);
  process.exit(1);
}

if (acupointSchema.safeParse({ ...hegu, id: 'EX-HN5' }).success) {
  console.log('✓ accepts EX-HN5');
} else {
  console.error('✗ rejected EX-HN5');
  process.exit(1);
}

if (acupointSchema.safeParse({ ...hegu, id: 'GV29' }).success) {
  console.log('✓ accepts GV29');
} else {
  console.error('✗ rejected GV29');
  process.exit(1);
}

if (!acupointSchema.safeParse({ ...hegu, id: 'KD1' }).success) {
  console.log('✓ rejects KD1');
} else {
  console.error('✗ incorrectly accepted KD1');
  process.exit(1);
}

if (acupointSchema.safeParse({ ...hegu, id: 'KI1' }).success) {
  console.log('✓ accepts KI1');
} else {
  console.error('✗ rejected KI1');
  process.exit(1);
}

if (!acupointSchema.safeParse({ ...hegu, defaultSeconds: 45 }).success) {
  console.log('✓ rejects non-multiple-of-10 seconds');
} else {
  console.error('✗ incorrectly accepted non-multiple-of-10 seconds');
  process.exit(1);
}

// Test symptomSchema
console.log('\nTesting symptomSchema...');
const step = { acupointId: 'LI4', seconds: 60 };
const symptom = { id: 'food_stagnation', name: '식체', aliases: ['체했을 때'], steps: [step], seeDoctor: '가슴 통증이 함께 오면 119에 연락하세요.' };

if (symptomSchema.safeParse(symptom).success) {
  console.log('✓ accepts 1-step routine');
} else {
  console.error('✗ rejected 1-step routine');
  process.exit(1);
}

if (symptomSchema.safeParse({ ...symptom, steps: [step, step, step] }).success) {
  console.log('✓ accepts 3-step routine');
} else {
  console.error('✗ rejected 3-step routine');
  process.exit(1);
}

if (!symptomSchema.safeParse({ ...symptom, steps: [] }).success) {
  console.log('✓ rejects 0-step routine');
} else {
  console.error('✗ incorrectly accepted 0-step routine');
  process.exit(1);
}

if (!symptomSchema.safeParse({ ...symptom, steps: [step, step, step, step] }).success) {
  console.log('✓ rejects 4-step routine');
} else {
  console.error('✗ incorrectly accepted 4-step routine');
  process.exit(1);
}

// Test contentBundleSchema
console.log('\nTesting contentBundleSchema...');
const bundleWithBadPin = {
  version: 1,
  acupoints: [hegu],
  symptoms: [],
  plates: [{ id: 'hand-dorsal', name: '손등', subject: 'a hand', acupointIds: ['LI4'], pins: [{ acupointId: 'LI4', x: 1.2, y: 0.5 }] }],
  maps: [],
};

if (!contentBundleSchema.safeParse(bundleWithBadPin).success) {
  console.log('✓ rejects pins outside 0..1');
} else {
  console.error('✗ incorrectly accepted pin outside 0..1');
  process.exit(1);
}

const bundleWithNullPosition = {
  version: 1,
  acupoints: [hegu],
  symptoms: [],
  plates: [{ id: 'hand-dorsal', name: '손등', subject: 'a hand', acupointIds: ['LI4'], pins: [] }],
  maps: [{ id: 'body-front', name: '앞면', subject: 'a body', regions: [{ id: 'hand', name: '손', x: null, y: null, plateIds: ['hand-dorsal'] }] }],
};

if (contentBundleSchema.safeParse(bundleWithNullPosition).success) {
  console.log('✓ allows regions without position');
} else {
  console.error('✗ rejected regions without position');
  process.exit(1);
}

console.log('\nAll tests passed!');
