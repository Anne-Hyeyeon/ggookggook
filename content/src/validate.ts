import { contentBundleSchema, type ContentBundle } from '@ggookggook/shared';

export interface Issue {
  level: 'error' | 'warning';
  message: string;
}

export interface ValidateOptions {
  release: boolean;
  imageIds?: ReadonlySet<string>;
}

export function validateContent(raw: unknown, options: ValidateOptions): Issue[] {
  const parsed = contentBundleSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({ level: 'error', message: `${issue.path.join('.')}: ${issue.message}` }));
  }
  return checkReferences(parsed.data, options);
}

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
}

function checkReferences(content: ContentBundle, { release, imageIds }: ValidateOptions): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });
  const warn = (message: string) => issues.push({ level: 'warning', message });
  const gap = release ? error : warn;
  const checkUnique = (kind: string, ids: string[]) => duplicates(ids).forEach((id) => error(`Duplicate ${kind} id: ${id}`));

  checkUnique('acupoint', content.acupoints.map((a) => a.id));
  checkUnique('symptom', content.symptoms.map((s) => s.id));
  checkUnique('plate', content.plates.map((p) => p.id));
  checkUnique('map', content.maps.map((m) => m.id));
  for (const map of content.maps) checkUnique(`region in ${map.id}`, map.regions.map((r) => r.id));

  const acupoints = new Map(content.acupoints.map((a) => [a.id, a]));
  const plateIds = new Set(content.plates.map((p) => p.id));

  for (const symptom of content.symptoms) {
    for (const step of symptom.steps) {
      if (!acupoints.has(step.acupointId)) error(`Symptom ${symptom.id} uses unknown acupoint ${step.acupointId}`);
    }
    const allContraindicated = symptom.steps.every((step) => acupoints.get(step.acupointId)?.cautions.includes('pregnancy'));
    if (allContraindicated) warn(`Symptom ${symptom.id} has no steps left in pregnancy mode`);
  }

  const onPlate = new Set<string>();
  for (const plate of content.plates) {
    for (const id of plate.acupointIds) {
      if (!acupoints.has(id)) error(`Plate ${plate.id} lists unknown acupoint ${id}`);
      onPlate.add(id);
    }
    const pinned = new Set<string>();
    for (const pin of plate.pins) {
      if (!plate.acupointIds.includes(pin.acupointId)) error(`Plate ${plate.id} has a pin for ${pin.acupointId}, which it does not list`);
      if (pinned.has(pin.acupointId)) error(`Plate ${plate.id} pins ${pin.acupointId} twice`);
      pinned.add(pin.acupointId);
    }
    for (const id of plate.acupointIds) {
      if (!pinned.has(id)) gap(`Plate ${plate.id} has no pin for ${id}`);
    }
    if (imageIds && !imageIds.has(plate.id)) gap(`Plate ${plate.id} has no image`);
  }
  for (const acupoint of content.acupoints) {
    if (!onPlate.has(acupoint.id)) error(`Acupoint ${acupoint.id} is not on any plate`);
  }

  const reachable = new Set<string>();
  for (const map of content.maps) {
    if (imageIds && !imageIds.has(map.id)) gap(`Map ${map.id} has no image`);
    for (const region of map.regions) {
      for (const id of region.plateIds) {
        if (!plateIds.has(id)) error(`Region ${map.id}/${region.id} links unknown plate ${id}`);
        reachable.add(id);
      }
      if (region.x === null || region.y === null) gap(`Region ${map.id}/${region.id} has no position`);
    }
  }
  for (const plate of content.plates) {
    if (!reachable.has(plate.id)) error(`Plate ${plate.id} is not reachable from any body map region`);
  }

  return issues;
}
