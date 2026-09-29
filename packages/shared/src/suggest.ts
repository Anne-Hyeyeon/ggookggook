import type { Symptom } from './content';

interface TimeWindow {
  inWindow: (hour: number) => boolean;
  ids: readonly [string, string];
}

const WINDOWS: readonly TimeWindow[] = [
  { inWindow: (h) => h >= 5 && h < 10, ids: ['fatigue', 'neck_pain'] },
  { inWindow: (h) => (h >= 10 && h < 12) || (h >= 14 && h < 18), ids: ['eye_fatigue', 'shoulder_pain'] },
  { inWindow: (h) => (h >= 12 && h < 14) || (h >= 18 && h < 20), ids: ['indigestion', 'food_stagnation'] },
  { inWindow: (h) => h >= 20 && h < 23, ids: ['insomnia', 'stress'] },
  { inWindow: (h) => h >= 23 || h < 5, ids: ['insomnia', 'headache'] },
];

const USAGE_THRESHOLD = 3;

function mostUsedSymptom(symptoms: readonly Symptom[], usage: Record<string, number>): Symptom | undefined {
  let best: Symptom | undefined;
  let bestCount = 0;
  for (const candidate of symptoms) {
    const count = usage[candidate.id] ?? 0;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

export function suggestFor(date: Date, symptoms: readonly Symptom[], usage: Record<string, number>): Symptom[] {
  const hour = date.getHours();
  const window = WINDOWS.find((candidate) => candidate.inWindow(hour));
  const byId = new Map(symptoms.map((symptom) => [symptom.id, symptom] as const));
  const base = window ? window.ids.map((id) => byId.get(id)).filter((s): s is Symptom => s !== undefined) : [];

  const mostUsed = mostUsedSymptom(symptoms, usage);
  const qualifies = mostUsed !== undefined && (usage[mostUsed.id] ?? 0) >= USAGE_THRESHOLD && mostUsed.id !== base[0]?.id;
  if (qualifies && mostUsed !== undefined) {
    return base[0] ? [base[0], mostUsed] : [mostUsed];
  }
  return base.slice(0, 2);
}
