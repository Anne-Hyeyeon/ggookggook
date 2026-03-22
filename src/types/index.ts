export type BodyPart =
  | "head"
  | "face"
  | "neck"
  | "shoulder"
  | "arm"
  | "hand"
  | "chest"
  | "abdomen"
  | "back"
  | "hip"
  | "leg"
  | "foot";

export type BodyView = "front" | "back";

export interface IBilingualText {
  ko: string;
  en: string;
}

export interface IAcupoint {
  id: string;
  name: IBilingualText;
  bodyPart: BodyPart;
  view: BodyView;
  position: { x: number; y: number };
  description: IBilingualText;
  benefits: string[];
  technique: IBilingualText;
  videoUrl?: string;
}

export interface ISymptom {
  id: string;
  name: IBilingualText;
  acupointIds: string[];
}

export interface IFavorite {
  id: string;
  userId: string;
  acupointId: string;
  createdAt: string;
}

export type TabType = "body" | "symptom" | "search";
export type Locale = "ko" | "en";
