import type { Acupoint, Symptom } from './content';

const normalize = (text: string) => text.replace(/\s+/g, '').toLowerCase();

export function searchSymptoms(
  symptoms: readonly Symptom[],
  acupoints: ReadonlyMap<string, Pick<Acupoint, 'name'>>,
  query: string,
): Symptom[] {
  const needle = normalize(query);
  if (!needle) return [...symptoms];
  return symptoms.filter((symptom) => {
    const haystack = [symptom.name, ...symptom.aliases, ...symptom.steps.map((step) => acupoints.get(step.acupointId)?.name.ko ?? '')];
    return haystack.some((text) => normalize(text).includes(needle));
  });
}

export function searchAcupoints<T extends Pick<Acupoint, 'name'>>(acupoints: readonly T[], query: string): T[] {
  const needle = normalize(query);
  if (!needle) return [...acupoints];
  return acupoints.filter((acupoint) => {
    const haystack = [acupoint.name.ko, acupoint.name.hanja, acupoint.name.en];
    return haystack.some((text) => normalize(text).includes(needle));
  });
}
