# Figma Pixel-Perfect UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match every screen pixel-perfectly to the Figma/Stitch design mockups — layout structure, content, typography, spacing, components.

**Architecture:** Update existing React components to match Figma structure. No new pages or routes needed. Changes are purely visual/layout, preserving all existing state management and business logic.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Lucide icons, clsx

**Reference files:**
- Figma screenshots: `demo/figma/*.png`
- Stitch HTML: `/Users/anne/Downloads/stitch/stitch/*/code.html`
- Figma node data: extracted via API (colors, sizes, spacing all documented per task)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/Tabs/SymptomTab.tsx` | Modify | Bilingual chips with icons, "Select Relief" header |
| `src/components/Tabs/SearchTab.tsx` | Modify | "Discovery" label, body part badges on cards, description text |
| `src/components/AcupointCard.tsx` | Modify | Add description text, reorder badge layout |
| `src/app/favorites/page.tsx` | Modify | Horizontal cards with 80x80 thumbnails, category badges |
| `src/components/Navigation/BottomNav.tsx` | Modify | Fix active pill shadow, spacing fine-tune |
| `src/components/BottomSheet/AcupointDetail.tsx` | Modify | Technique overlay on SVG, set title header, body part label |
| `src/components/BottomSheet/BottomSheet.tsx` | Modify | Solid white bg (not glassmorphism) per Figma detail |
| `src/data/acupoints.json` | Modify | Add `description` bilingual field for search card text |
| `src/types/index.ts` | No change | `description` field already exists in IAcupoint |

---

### Task 1: Symptom Tab — Bilingual chips + "Select Relief" header

**Files:**
- Modify: `src/components/Tabs/SymptomTab.tsx`

**Current:** Korean-only grid buttons with single text. No section header.
**Target (Figma/Stitch):** "Select Relief" + "ACUPRESSURE FOCUS" header row. Chips show bilingual labels (e.g., "Headache/두통"). Selected chip has healing icon. Chips are flex-wrap horizontal (not 2-col grid).

- [ ] **Step 1: Update SymptomTab layout**

Change grid to flex-wrap. Add header row. Show bilingual labels. Use Lucide `Activity` icon for selected chip.

```tsx
// Key changes:
// 1. Header: "Select Relief" left + "ACUPRESSURE FOCUS" right
// 2. Chips: flex-wrap, bilingual "English/한국어" labels
// 3. Selected chip: has icon prefix
// 4. Chip style: px-5 py-2.5 rounded-full (not r=32 grid)
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Screenshot and compare**

Take Playwright screenshot, compare to `demo/figma/symptom-en.png`

- [ ] **Step 4: Commit**

```bash
git add src/components/Tabs/SymptomTab.tsx
git commit -m "fix(symptom): bilingual chips, Select Relief header, flex-wrap layout"
```

---

### Task 2: Search Tab — "Discovery" section, body part badges, description text

**Files:**
- Modify: `src/components/Tabs/SearchTab.tsx`

**Current:** Simple card with ID + name + #tags + "바로가기" button.
**Target (Stitch):** "Discovery" uppercase label above "Recent Results" heading. Cards show: body part badge (HAND/FOOT) top-right as pill, acupoint name large, benefit chips in rounded-xl pills, description paragraph, chevron button bottom-right.

- [ ] **Step 1: Update SearchTab card layout**

```tsx
// Key changes per card:
// 1. Top row: ID (LI4) left, body part badge (HAND) right as primary-container pill
// 2. Title: "Hegu (합곡)" — English name first with Korean in parens
// 3. Benefit chips: bg-surface-container-lowest rounded-xl px-3 py-1.5
// 4. Description text: 14px, #5a5c58, leading-relaxed, max 2 lines
// 5. Bottom: chevron button in surface-container-highest rounded-2xl
// 6. Section label: "DISCOVERY" 12px uppercase tracking-widest above "검색 결과"
```

- [ ] **Step 2: Use acupoint.description for card text**

The `IAcupoint.description` field already exists in types. Use `getLocalizedText(a.description, locale)` for the card description text.

- [ ] **Step 3: Verify build and screenshot**

- [ ] **Step 4: Commit**

```bash
git add src/components/Tabs/SearchTab.tsx
git commit -m "fix(search): Discovery label, body part badges, description text on cards"
```

---

### Task 3: Favorites Page — Horizontal cards with thumbnails + category badges

**Files:**
- Modify: `src/app/favorites/page.tsx`

**Current:** Reuses `AcupointCard` (vertical layout, no thumbnails).
**Target (Stitch/Figma):** Horizontal card: 80x80 thumbnail left (colored bg with body part icon), category badge "HAND / HEADACHE" as uppercase label, bilingual name "합곡 (Hegu)", heart/bookmark icon right, benefit tags below.

- [ ] **Step 1: Create inline FavoriteCard within favorites page**

```tsx
// Card structure (Figma: r=32 p=20 shadow flex horizontal gap=20):
// [80x80 thumbnail] [content area]
//   thumbnail: rounded-2xl bg-primary-container, body part SVG icon or colored square
//   category: "HAND / HEADACHE" 10px uppercase tracking-widest text-primary
//   name: "합곡 (Hegu)" text-lg font-bold
//   bookmark icon: right-aligned
//   tags: "Relief" "Digestion" pills below
```

Since we don't have actual photos, use a colored SVG mini-view of the body part as the thumbnail (render the BodySvg zoomed to the acupoint's region in an 80x80 container).

- [ ] **Step 2: Add bottom hint card**

```tsx
// Figma: bg=#d4f4c8/20% r=48 p=24 border=#d4f4c8/50%
// Content: green circle icon + "더 많은 혈자리를 찾아보세요" + subtitle
```

- [ ] **Step 3: Update title to Figma specs**

```tsx
// Title: "즐겨찾기" 36px w800 ls=-0.9
// Subtitle: "내가 저장한 {n}개의 혈자리가 있습니다." 16px w500
```

- [ ] **Step 4: Verify build and screenshot**

- [ ] **Step 5: Commit**

```bash
git add src/app/favorites/page.tsx
git commit -m "fix(favorites): horizontal cards with thumbnails, category badges, hint card"
```

---

### Task 4: Bottom Sheet Detail — Technique overlay on SVG + set title

**Files:**
- Modify: `src/components/BottomSheet/AcupointDetail.tsx`
- Modify: `src/components/BottomSheet/BottomSheet.tsx`

**Current:** Technique text is in a separate card below the SVG view.
**Target (Figma KR detail):**
1. Bottom sheet bg = solid `#ffffff` (not glassmorphism)
2. When in set: "현재 진행 중인 코스" 16px subtitle above "지긋지긋한 두통 완화 세트" 30px title
3. SVG area has technique text OVERLAID at bottom: `bg-white/69% r=6 p=14/16 border-white/50% shadow`
4. Body part label below name: "Body Part: Hand" with pan_tool icon
5. Handlebar: 48x6 bg=#e8e9e3

- [ ] **Step 1: Update BottomSheet to solid bg**

Change `bg-surface-container-lowest/80 backdrop-blur` to `bg-surface-container-lowest` (solid white).

- [ ] **Step 2: Move technique overlay inside SVG container**

```tsx
// SVG container becomes relative, technique text positioned at bottom:
<div className="relative w-full bg-surface-container-low rounded-[32px] overflow-hidden">
  <div className="flex justify-center items-center p-6">
    <svg ...> ... </svg>
  </div>
  {/* Technique overlay — Figma: absolute bottom, bg=white/69% r=6 */}
  <div className="absolute bottom-4 left-4 right-4 bg-white/70 rounded-md p-3.5 px-4 border border-white/50 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
    <p className="text-on-surface leading-relaxed font-medium text-sm">
      {technique text}
    </p>
  </div>
</div>
```

Remove the separate technique card that's currently below the SVG.

- [ ] **Step 3: Add set context subtitle**

When `isInSet`, show "현재 진행 중인 코스" (16px w500 #5a5c58) above the set title "두통 완화 세트".

- [ ] **Step 4: Add body part label**

Below acupoint name, show "Body Part: {bodyPart}" with a MapPin icon, matching Figma `pan_tool` icon equivalent.

- [ ] **Step 5: Verify build and screenshot**

- [ ] **Step 6: Commit**

```bash
git add src/components/BottomSheet/AcupointDetail.tsx src/components/BottomSheet/BottomSheet.tsx
git commit -m "fix(detail): technique overlay on SVG, set subtitle, solid sheet bg"
```

---

### Task 5: Bottom Nav — Active pill shadow + precise spacing

**Files:**
- Modify: `src/components/Navigation/BottomNav.tsx`

**Current:** Active item is `bg-primary rounded-full` but missing shadow. Spacing/alignment slightly off from Figma.
**Target (Figma):**
- Active pill: 56x56 r=9999, shadow(y=-4 blur=40) below the nav, text inside pill
- Inactive: icon 16-20px #a8a29e, label 11px w600 ls=0.3
- Nav shadow: `shadow-[0_-4px_40px_rgba(48,51,46,0.06)]`
- Active pill has a subtle shadow of its own: `shadow(type=DROP_SHADOW)`

- [ ] **Step 1: Add shadow to active pill**

Add `shadow-[0_2px_8px_rgba(71,98,65,0.3)]` to active nav item.

- [ ] **Step 2: Fine-tune icon sizes**

Figma: Home icon 16x18, Heart icon 20x18, User icon 16x16. Adjust per-icon.

- [ ] **Step 3: Verify and commit**

```bash
git add src/components/Navigation/BottomNav.tsx
git commit -m "fix(nav): active pill shadow, icon size fine-tuning"
```

---

### Task 6: AcupointCard — Match stitch search card layout

**Files:**
- Modify: `src/components/AcupointCard.tsx`

**Current:** Vertical card with flex-col. Body part badge and name in same row.
**Target (Stitch):** Card has: top-left ID + name, top-right body part badge, benefit chips as white rounded-xl pills, description text, bottom-right chevron in square button.

- [ ] **Step 1: Update card structure**

```tsx
// Layout:
// Row 1: [LI4 + "Hegu (합곡)"] ... [HAND badge]
// Row 2: Benefit chips (bg-surface-container-lowest rounded-xl)
// Row 3: Description text (14px, text-on-surface-variant)
// Row 4: [empty] ... [chevron square button]
```

- [ ] **Step 2: Show English name first in cards**

Display `{en} ({ko})` format to match stitch: "Hegu (합곡)".

- [ ] **Step 3: Verify and commit**

```bash
git add src/components/AcupointCard.tsx
git commit -m "fix(card): match stitch layout with description, bilingual name"
```

---

### Task 7: Final polish — cross-screen consistency check

**Files:**
- All modified files

- [ ] **Step 1: Full build check**

Run: `npm run build`

- [ ] **Step 2: Take screenshots of all screens**

Playwright screenshots: home, symptom, search (with query), detail, favorites

- [ ] **Step 3: Side-by-side comparison with Figma**

Compare each screenshot with corresponding `demo/figma/*.png`

- [ ] **Step 4: Fix any remaining mismatches**

Address spacing, font weight, color, or layout differences found in comparison.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix(ui): final Figma pixel-perfect polish pass"
```
