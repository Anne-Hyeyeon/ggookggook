import { DISCLAIMER_NOTICES, ROUTINE_DISCLAIMER } from './disclaimers';

it('has the four safety notices shown before onboarding is accepted', () => {
  expect(DISCLAIMER_NOTICES).toHaveLength(4);
  expect(DISCLAIMER_NOTICES).toEqual([
    '꾹꾹은 지압 방법을 안내하는 앱이에요. 진단이나 치료를 대신하지 않아요.',
    '통증이 심하거나 오래가면 병원 진료를 받으세요.',
    '지병이 있으면 전문가와 먼저 상의하세요.',
    '상처나 염증, 부기가 있는 곳은 누르지 마세요.',
  ]);
});

it('has the routine disclaimer shown on symptom and acupoint screens', () => {
  expect(ROUTINE_DISCLAIMER).toBe('지압은 불편함을 덜어줄 수 있지만 진료를 대신하지 않아요.');
});
