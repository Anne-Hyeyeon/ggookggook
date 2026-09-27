import {
  contentBundleSchema,
  type Acupoint,
  type BodyMap,
  type BodyMapId,
  type ContentBundle,
  type Pin,
  type Plate,
  type Symptom,
} from '@ggookggook/shared';
import raw from './bundle.json';
import { IMAGES } from './images';

export interface PlateView {
  plate: Plate;
  pins: Pin[];
  image: number | null;
}

export interface RegionPlateGroup {
  plate: Plate;
  acupoints: Acupoint[];
}

export interface ContentIndex {
  version: number;
  symptoms: Symptom[];
  acupoints: ReadonlyMap<string, Acupoint>;
  symptom(id: string): Symptom | undefined;
  requireAcupoint(id: string): Acupoint;
  plateFor(acupointId: string): PlateView | null;
  image(id: string): number | null;
  map(id: BodyMapId): BodyMap | undefined;
  plate(id: string): Plate | undefined;
  symptomsFor(acupointId: string): Symptom[];
  acupointsForRegion(mapId: BodyMapId, regionId: string): RegionPlateGroup[];
}

export function buildIndex(bundle: ContentBundle, images: Record<string, number>): ContentIndex {
  const acupoints = new Map(bundle.acupoints.map((acupoint) => [acupoint.id, acupoint]));
  const symptoms = new Map(bundle.symptoms.map((symptom) => [symptom.id, symptom]));
  const plates = new Map(bundle.plates.map((plate) => [plate.id, plate]));
  const maps = new Map(bundle.maps.map((map) => [map.id, map]));
  const image = (id: string) => images[id] ?? null;
  const score = (plate: Plate, acupointId: string) =>
    (image(plate.id) !== null ? 2 : 0) + (plate.pins.some((pin) => pin.acupointId === acupointId) ? 1 : 0);

  return {
    version: bundle.version,
    symptoms: bundle.symptoms,
    acupoints,
    symptom: (id) => symptoms.get(id),
    requireAcupoint(id) {
      const acupoint = acupoints.get(id);
      if (!acupoint) throw new Error(`Unknown acupoint: ${id}`);
      return acupoint;
    },
    plateFor(acupointId) {
      const plate = bundle.plates
        .filter((candidate) => candidate.acupointIds.includes(acupointId))
        .sort((a, b) => score(b, acupointId) - score(a, acupointId))[0];
      if (!plate) return null;
      return { plate, pins: plate.pins.filter((pin) => pin.acupointId === acupointId), image: image(plate.id) };
    },
    image,
    map: (id) => maps.get(id),
    plate: (id) => plates.get(id),
    symptomsFor: (acupointId) => bundle.symptoms.filter((symptom) => symptom.steps.some((step) => step.acupointId === acupointId)),
    acupointsForRegion(mapId, regionId) {
      const region = maps.get(mapId)?.regions.find((candidate) => candidate.id === regionId);
      if (!region) return [];
      const seen = new Set<string>();
      const groups = region.plateIds.flatMap((plateId) => {
        const plate = plates.get(plateId);
        if (!plate) return [];
        const groupAcupoints = plate.acupointIds.flatMap((acupointId) => {
          if (seen.has(acupointId)) return [];
          const acupoint = acupoints.get(acupointId);
          if (!acupoint) return [];
          seen.add(acupointId);
          return [acupoint];
        });
        return groupAcupoints.length === 0 ? [] : [{ plate, acupoints: groupAcupoints }];
      });
      // A plate with its own drawing is the more useful stop; stable sort keeps plateIds order otherwise.
      return [...groups].sort((a, b) => Number(image(b.plate.id) !== null) - Number(image(a.plate.id) !== null));
    },
  };
}

export const content = buildIndex(contentBundleSchema.parse(raw), IMAGES);
