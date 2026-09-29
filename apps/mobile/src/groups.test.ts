import type { Symptom } from '@ggookggook/shared';
import { GROUP_LABELS, GROUP_ORDER, sectionsBySymptomGroup } from '@/groups';

function symptom(id: string, group: Symptom['group']): Symptom {
  return { id, name: id, aliases: [], steps: [{ acupointId: 'LI4', seconds: 60 }], seeDoctor: '…', group };
}

it('has a Korean label for every content group, in the brief-specified order', () => {
  expect(GROUP_ORDER).toEqual(['head-eyes', 'neck-back', 'digestion', 'sleep-mind', 'women', 'limbs', 'daily']);
  expect(GROUP_ORDER.map((group) => GROUP_LABELS[group])).toEqual(['머리·눈', '목·어깨·허리', '속·소화', '잠·마음', '여성', '손발·다리', '생활']);
});

it('buckets symptoms by group in GROUP_ORDER, dropping groups with nothing in them', () => {
  const symptoms = [symptom('a', 'daily'), symptom('b', 'head-eyes'), symptom('c', 'head-eyes')];
  const sections = sectionsBySymptomGroup(symptoms);
  expect(sections.map((section) => section.key)).toEqual(['head-eyes', 'daily']);
  expect(sections[0]?.title).toBe('머리·눈');
  expect(sections[0]?.data.map((s) => s.id)).toEqual(['b', 'c']);
});

it('preserves each group bucket\'s relative input order (e.g. an already usage-sorted list)', () => {
  const symptoms = [symptom('z', 'daily'), symptom('a', 'daily')];
  expect(sectionsBySymptomGroup(symptoms)[0]?.data.map((s) => s.id)).toEqual(['z', 'a']);
});
