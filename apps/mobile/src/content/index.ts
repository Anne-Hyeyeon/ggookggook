import { contentBundleSchema, type Acupoint, type ContentBundle, type Pin, type Plate, type Symptom } from '@ggookggook/shared';
import raw from './bundle.json';
import { IMAGES } from './images';

export interface PlateView {
  plate: Plate;
  pins: Pin[];
  image: number | null;
}

export interface ContentIndex {
  version: number;
  symptoms: Symptom[];
  acupoints: ReadonlyMap<string, Acupoint>;
  symptom(id: string): Symptom | undefined;
  plateFor(acupointId: string): PlateView | null;
  image(id: string): number | null;
}

export function buildIndex(bundle: ContentBundle, images: Record<string, number>): ContentIndex {
  const acupoints = new Map(bundle.acupoints.map((acupoint) => [acupoint.id, acupoint]));
  const symptoms = new Map(bundle.symptoms.map((symptom) => [symptom.id, symptom]));
  const image = (id: string) => images[id] ?? null;
  const score = (plate: Plate, acupointId: string) =>
    (image(plate.id) !== null ? 2 : 0) + (plate.pins.some((pin) => pin.acupointId === acupointId) ? 1 : 0);

  return {
    version: bundle.version,
    symptoms: bundle.symptoms,
    acupoints,
    symptom: (id) => symptoms.get(id),
    plateFor(acupointId) {
      const plate = bundle.plates
        .filter((candidate) => candidate.acupointIds.includes(acupointId))
        .sort((a, b) => score(b, acupointId) - score(a, acupointId))[0];
      if (!plate) return null;
      return { plate, pins: plate.pins.filter((pin) => pin.acupointId === acupointId), image: image(plate.id) };
    },
    image,
  };
}

export const content = buildIndex(contentBundleSchema.parse(raw), IMAGES);
