# ggookggook — Design Spec

> Acupressure point guide web app for self-care

## Overview

ggookggook is a bilingual (Korean/English) web app that helps users find and apply acupressure points for common ailments. The core experience is an interactive SVG body illustration where users can explore acupoints by body part, symptom, or search.

## Target Users

General public interested in self-acupressure for health and wellness. No professional medical background assumed.

## Core Features

### 1. Interactive Body SVG

- Full-body line illustration rendered as a single SVG with front and back views (toggle button to switch)
- 12 body regions: head, face, neck, shoulder, arm, hand, chest, abdomen, back, hip, leg, foot
- Each region is a `<g>` group with a dedicated ID (e.g., `region-hand`, `region-back`) and an invisible hit-area overlay for click detection
- Click a region → animated viewBox transition zooms into that area → acupoints displayed as dots
- Click an acupoint dot → opens detail bottom sheet
- SVG viewBox transitions animated via CSS transitions (`transition: viewBox`) with JS fallback for unsupported browsers

### 2. Three Entry Points (Top Tab Navigation)

**Body Part tab (default):**
- Shows full-body SVG
- User clicks a body region to zoom in and see acupoints

**Symptom tab:**
- List of symptoms as selectable chips
- Selecting a symptom highlights related acupoints on the full-body SVG
- Same zoom → detail flow follows

**Search tab:**
- Text search by acupoint name (Korean or English)
- Matches against acupoint name and benefit/symptom tags
- Debounced input (300ms), minimum 1 character
- Results displayed as a scrollable list of acupoint cards (name, body part, top benefits)
- Empty state: "검색 결과가 없습니다" with suggestion to try a different keyword

### 3. Acupoint Detail Bottom Sheet

Bottom sheet overlay that slides up from the bottom, keeping the SVG visible behind.

Contents (top to bottom):
1. **Set navigation** — "Headache Set 2/4" with previous/next buttons (only shown when accessed via symptom)
2. **Acupoint name** — Korean name, ID, English name, body part + favorite button (heart)
3. **Zoomed body part SVG** — Same full-body SVG zoomed further into the specific acupoint area with position marked (red dot). Not a separate image.
4. **Benefits** — Chip tags showing related symptoms/effects
5. **Technique** — Text description of how to apply pressure
6. **Acupressure timer** — Preset buttons (10s/20s/30s), -/+ buttons for 5-second adjustments, direct input by tapping the number, countdown display, start/pause button
7. **YouTube video** — Embedded video (to be added later, placeholder hidden until URL exists)

### 4. Acupressure Timer

- Preset durations: 10s, 20s, 30s
- Fine adjustment: -/+ buttons in 5-second increments (min: 5s, max: 120s)
- Direct input: tap the time display to type a custom duration
- Visual countdown with start/pause control
- On completion: visual pulse animation + optional vibration (if device supports)
- Timer does not persist across page navigation or screen lock — it is a simple in-component timer

### 5. Set Guide (Symptom-based)

When a user selects a symptom, the related acupoints form an ordered set:
- Navigate between acupoints with previous/next buttons
- Progress indicator: "Set 2/4"
- Timer duration setting persists across acupoints in the set (e.g., if user picks 20s, next acupoint also starts with 20s). Active countdown resets on navigation.

### 6. Favorites

- Heart button on each acupoint detail to toggle favorite
- `/favorites` page shows saved acupoints as a list
- Requires login (Supabase Auth)
- Stored in Supabase DB
- Unauthenticated user tapping heart → redirect to login with return URL
- Empty favorites state: "즐겨찾기한 혈자리가 없습니다" with link back to home

### 7. Bilingual Support (i18n)

- Korean and English
- Implemented with next-intl for UI strings
- Acupoint/symptom content uses `{ ko: string; en: string }` fields, selected by current locale (not through next-intl translation files)

## Data Model

### Acupoint

```typescript
interface IAcupoint {
  id: string;                          // "LI4"
  name: { ko: string; en: string };    // { ko: "합곡", en: "Hegu" }
  bodyPart: BodyPart;                  // "hand"
  view: "front" | "back";             // which body view this point appears on
  position: { x: number; y: number }; // SVG coordinates
  description: { ko: string; en: string };
  benefits: string[];                  // symptom IDs: ["headache", "toothache", "stress"]
  technique: { ko: string; en: string };
  videoUrl?: string;                   // YouTube URL (later)
}
```

### Symptom (single source of truth for symptom-acupoint relationships)

```typescript
interface ISymptom {
  id: string;                          // "headache"
  name: { ko: string; en: string };    // { ko: "두통", en: "Headache" }
  acupointIds: string[];               // ["LI4", "GB20", "EX-HN5"]
}
```

`ISymptom` is the **single source of truth** for which acupoints relate to which symptoms. `IAcupoint.benefits` contains symptom IDs for display convenience and is derived from symptom data (validated at build time).

### Body Part

```typescript
type BodyPart =
  | "head" | "face" | "neck" | "shoulder"
  | "arm" | "hand" | "chest" | "abdomen"
  | "back" | "hip" | "leg" | "foot";
```

### Favorite (Supabase)

```typescript
interface IFavorite {
  id: string;
  userId: string;
  acupointId: string;
  createdAt: string;
}
```

## MVP Symptom List

Fixed list for MVP (expandable later):

| ID | Korean | English |
|----|--------|---------|
| headache | 두통 | Headache |
| insomnia | 불면 | Insomnia |
| stress | 스트레스 | Stress |
| indigestion | 소화불량 | Indigestion |
| shoulder_pain | 어깨통증 | Shoulder Pain |
| back_pain | 허리통증 | Back Pain |
| eye_fatigue | 눈피로 | Eye Fatigue |
| nausea | 메스꺼움 | Nausea |
| neck_pain | 목통증 | Neck Pain |
| menstrual_pain | 생리통 | Menstrual Pain |
| cold_extremities | 수족냉증 | Cold Hands & Feet |
| concentration | 집중력 | Concentration |
| urgent_bowel | 급똥참기 | Urgent Bowel Relief |
| food_stagnation | 식체 | Food Stagnation |
| constipation | 변비 | Constipation |
| facial_swelling | 얼굴 부종 | Facial Swelling |

## Data Strategy

- **MVP**: Static JSON files in the project (`data/acupoints.json`, `data/symptoms.json`)
- **Later**: Migrate to Supabase DB when admin editing or dynamic content is needed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| SVG Interaction | Native SVG with viewBox transitions (CSS transition + JS fallback) |
| State Management | Zustand |
| i18n | next-intl |
| Auth | Supabase Auth (OAuth: Google, Kakao) |
| Database | Supabase (PostgreSQL) — for user data/favorites |
| Deployment | Vercel |

## Pages

| Path | Description | Auth Required |
|------|-------------|---------------|
| `/` | Main — top tabs (body/symptom/search) + interactive SVG | No |
| `/favorites` | Saved acupoints list | Yes |
| `/login` | Login page (Google, Kakao OAuth) | No |
| `/auth/callback` | OAuth callback handler | No |

### Future Pages

| Path | Description |
|------|-------------|
| `/archive` | Custom acupoint sets/collections |

## Navigation

- **Top tabs** (on main page): Body Part / Symptom / Search — switches the main content area
- **Bottom nav bar**: Home / Favorites / My(Profile)
  - Home → `/`
  - Favorites → `/favorites` (login required)
  - My → shows login button if unauthenticated, or user profile/logout if authenticated (implemented as a simple dropdown, not a separate page)

## Architecture Notes

- Single SVG for full body with front/back views; zoom via animated viewBox transition
- Each body region defined as a `<g>` group with ID and invisible hit-area for click detection
- Acupoint coordinates stored relative to the full SVG coordinate system
- Bottom sheet is a client component with slide-up animation
- Timer state managed locally within the bottom sheet component
- Set navigation state managed via Zustand when navigating symptom-based sets
- Favorites synced with Supabase; optimistic UI updates
- `IAcupoint.benefits` validated against `ISymptom` data at build time to prevent inconsistency
