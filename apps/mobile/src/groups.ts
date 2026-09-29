import type { Symptom, SymptomGroup } from '@ggookggook/shared';

export const GROUP_LABELS: Record<SymptomGroup, string> = {
  'head-eyes': '머리·눈',
  'neck-back': '목·어깨·허리',
  digestion: '속·소화',
  'sleep-mind': '잠·마음',
  women: '여성',
  limbs: '손발·다리',
  daily: '생활',
};

export const GROUP_ORDER: SymptomGroup[] = ['head-eyes', 'neck-back', 'digestion', 'sleep-mind', 'women', 'limbs', 'daily'];

export interface SymptomSection {
  key: SymptomGroup;
  title: string;
  data: Symptom[];
}

// Buckets symptoms into their content group, keeping each bucket's relative order (so a
// caller that hands in an already usage-sorted list gets usage order within each section);
// a group with nothing in it is dropped rather than shown as an empty section.
export function sectionsBySymptomGroup(symptoms: readonly Symptom[]): SymptomSection[] {
  return GROUP_ORDER.map((group) => ({
    key: group,
    title: GROUP_LABELS[group],
    data: symptoms.filter((symptom) => symptom.group === group),
  })).filter((section) => section.data.length > 0);
}
