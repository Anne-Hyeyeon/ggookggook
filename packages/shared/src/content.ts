import { z } from 'zod';

const MERIDIANS = 'LU|LI|ST|SP|HT|SI|BL|KI|PC|TE|GB|LR|GV|CV';
export const ACUPOINT_ID = new RegExp(`^(?:(?:${MERIDIANS})\\d{1,2}|EX-(?:HN|CA|B|UE|LE)\\d{1,2})$`);
export const SLUG = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;

const acupointId = z.string().regex(ACUPOINT_ID);
const slug = z.string().regex(SLUG);
const unit = z.number().min(0).max(1);

export const sidesSchema = z.enum(['single', 'sequential', 'together']);
export const cautionSchema = z.enum(['pregnancy']);

export const acupointSchema = z.object({
  id: acupointId,
  name: z.object({ ko: z.string().min(1), hanja: z.string().min(1), en: z.string().min(1) }),
  sides: sidesSchema,
  location: z.string().min(1),
  technique: z.string().min(1),
  defaultSeconds: z.number().int().min(10).max(300).multipleOf(10),
  cautions: z.array(cautionSchema),
  whoLocation: z.string().min(1),
});

export const routineStepSchema = z.object({
  acupointId,
  seconds: z.number().int().min(10).max(600).multipleOf(10),
});

export const symptomSchema = z.object({
  id: slug,
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  steps: z.array(routineStepSchema).min(1).max(3),
  seeDoctor: z.string().min(1),
});

export const pinSchema = z.object({ acupointId, x: unit, y: unit });

export const plateSchema = z.object({
  id: slug,
  name: z.string().min(1),
  subject: z.string().min(1),
  acupointIds: z.array(acupointId).min(1),
  pins: z.array(pinSchema),
});

export const regionSchema = z.object({
  id: slug,
  name: z.string().min(1),
  x: unit.nullable(),
  y: unit.nullable(),
  plateIds: z.array(slug).min(1),
});

export const bodyMapIdSchema = z.enum(['body-front', 'body-back']);

export const bodyMapSchema = z.object({
  id: bodyMapIdSchema,
  name: z.string().min(1),
  subject: z.string().min(1),
  regions: z.array(regionSchema).min(1),
});

export const contentBundleSchema = z.object({
  version: z.number().int().positive(),
  acupoints: z.array(acupointSchema),
  symptoms: z.array(symptomSchema),
  plates: z.array(plateSchema),
  maps: z.array(bodyMapSchema),
});

export const manifestSchema = z.object({
  version: z.number().int().positive(),
  bundlePath: z.string().min(1),
  imagesPath: z.string().min(1),
  publishedAt: z.string().min(1),
});

export type Sides = z.infer<typeof sidesSchema>;
export type Caution = z.infer<typeof cautionSchema>;
export type Acupoint = z.infer<typeof acupointSchema>;
export type RoutineStep = z.infer<typeof routineStepSchema>;
export type Symptom = z.infer<typeof symptomSchema>;
export type Pin = z.infer<typeof pinSchema>;
export type Plate = z.infer<typeof plateSchema>;
export type Region = z.infer<typeof regionSchema>;
export type BodyMapId = z.infer<typeof bodyMapIdSchema>;
export type BodyMap = z.infer<typeof bodyMapSchema>;
export type ContentBundle = z.infer<typeof contentBundleSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
