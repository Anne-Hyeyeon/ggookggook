import { describe, expect, it } from 'vitest';
import type { Symptom } from './content';
import { suggestFor } from './suggest';

function symptom(id: string, group: Symptom['group']): Symptom {
  return { id, name: id, aliases: [], steps: [{ acupointId: 'LI4', seconds: 60 }], seeDoctor: '…', group };
}

const symptoms: Symptom[] = [
  symptom('fatigue', 'daily'),
  symptom('neck_pain', 'neck-back'),
  symptom('eye_fatigue', 'head-eyes'),
  symptom('shoulder_pain', 'neck-back'),
  symptom('indigestion', 'digestion'),
  symptom('food_stagnation', 'digestion'),
  symptom('insomnia', 'sleep-mind'),
  symptom('stress', 'sleep-mind'),
  symptom('headache', 'head-eyes'),
];

const at = (hour: number, minute = 0) => new Date(2026, 8, 29, hour, minute, 0);

describe('suggestFor', () => {
  it('suggests 기운이 없을 때 and 목이 뻐근할 때 from 05:00 to 09:59', () => {
    expect(suggestFor(at(5, 0), symptoms, {}).map((s) => s.id)).toEqual(['fatigue', 'neck_pain']);
    expect(suggestFor(at(9, 59), symptoms, {}).map((s) => s.id)).toEqual(['fatigue', 'neck_pain']);
  });

  it('suggests 눈이 뻑뻑할 때 and 어깨가 뭉쳤을 때 from 10:00 to 11:59 and 14:00 to 17:59', () => {
    expect(suggestFor(at(10, 0), symptoms, {}).map((s) => s.id)).toEqual(['eye_fatigue', 'shoulder_pain']);
    expect(suggestFor(at(11, 59), symptoms, {}).map((s) => s.id)).toEqual(['eye_fatigue', 'shoulder_pain']);
    expect(suggestFor(at(14, 0), symptoms, {}).map((s) => s.id)).toEqual(['eye_fatigue', 'shoulder_pain']);
    expect(suggestFor(at(17, 59), symptoms, {}).map((s) => s.id)).toEqual(['eye_fatigue', 'shoulder_pain']);
  });

  it('suggests 속이 더부룩할 때 and 체했을 때 from 12:00 to 13:59 and 18:00 to 19:59', () => {
    expect(suggestFor(at(12, 0), symptoms, {}).map((s) => s.id)).toEqual(['indigestion', 'food_stagnation']);
    expect(suggestFor(at(13, 59), symptoms, {}).map((s) => s.id)).toEqual(['indigestion', 'food_stagnation']);
    expect(suggestFor(at(18, 0), symptoms, {}).map((s) => s.id)).toEqual(['indigestion', 'food_stagnation']);
    expect(suggestFor(at(19, 59), symptoms, {}).map((s) => s.id)).toEqual(['indigestion', 'food_stagnation']);
  });

  it('suggests 잠이 안 올 때 and 스트레스 받을 때 from 20:00 to 22:59', () => {
    expect(suggestFor(at(20, 0), symptoms, {}).map((s) => s.id)).toEqual(['insomnia', 'stress']);
    expect(suggestFor(at(22, 59), symptoms, {}).map((s) => s.id)).toEqual(['insomnia', 'stress']);
  });

  it('suggests 잠이 안 올 때 and 머리가 아플 때 from 23:00 to 04:59', () => {
    expect(suggestFor(at(23, 0), symptoms, {}).map((s) => s.id)).toEqual(['insomnia', 'headache']);
    expect(suggestFor(at(0, 0), symptoms, {}).map((s) => s.id)).toEqual(['insomnia', 'headache']);
    expect(suggestFor(at(4, 59), symptoms, {}).map((s) => s.id)).toEqual(['insomnia', 'headache']);
  });

  it('replaces the second suggestion with the most-used symptom at 3 or more completed sessions', () => {
    const usage = { shoulder_pain: 3 };
    expect(suggestFor(at(10, 0), symptoms, usage).map((s) => s.id)).toEqual(['eye_fatigue', 'shoulder_pain']);

    const usage2 = { stress: 5 };
    expect(suggestFor(at(5, 0), symptoms, usage2).map((s) => s.id)).toEqual(['fatigue', 'stress']);
  });

  it('does not replace the second suggestion when the most-used symptom is already first', () => {
    const usage = { eye_fatigue: 10 };
    expect(suggestFor(at(10, 0), symptoms, usage).map((s) => s.id)).toEqual(['eye_fatigue', 'shoulder_pain']);
  });

  it('does not replace the second suggestion when the most-used symptom has fewer than 3 sessions', () => {
    const usage = { stress: 2 };
    expect(suggestFor(at(5, 0), symptoms, usage).map((s) => s.id)).toEqual(['fatigue', 'neck_pain']);
  });

  it('picks the highest-usage symptom when several qualify', () => {
    const usage = { stress: 3, headache: 7 };
    expect(suggestFor(at(5, 0), symptoms, usage).map((s) => s.id)).toEqual(['fatigue', 'headache']);
  });

  it('returns at most 2 suggestions', () => {
    expect(suggestFor(at(5, 0), symptoms, {}).length).toBeLessThanOrEqual(2);
  });
});
