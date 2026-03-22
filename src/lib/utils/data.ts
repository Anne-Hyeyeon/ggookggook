import acupointsData from "@/data/acupoints.json";
import symptomsData from "@/data/symptoms.json";
import type { IAcupoint, ISymptom } from "@/types";

export const getAcupoints = (): IAcupoint[] => acupointsData as IAcupoint[];
export const getSymptoms = (): ISymptom[] => symptomsData as ISymptom[];

export const getAcupointById = (id: string): IAcupoint | undefined =>
  getAcupoints().find((a) => a.id === id);

export const getAcupointsByBodyPart = (bodyPart: string): IAcupoint[] =>
  getAcupoints().filter((a) => a.bodyPart === bodyPart);

export const getAcupointsBySymptom = (symptomId: string): IAcupoint[] => {
  const symptom = getSymptoms().find((s) => s.id === symptomId);
  if (!symptom) return [];
  return symptom.acupointIds
    .map((id) => getAcupointById(id))
    .filter((a): a is IAcupoint => a !== undefined);
};

export const searchAcupoints = (query: string): IAcupoint[] => {
  const q = query.toLowerCase();
  return getAcupoints().filter(
    (a) =>
      a.name.ko.includes(q) ||
      a.name.en.toLowerCase().includes(q) ||
      a.benefits.some((b) => b.includes(q))
  );
};
