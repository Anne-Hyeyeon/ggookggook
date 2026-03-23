# Design System Master File — ggookggook

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** ggookggook (꾹꾹이)
**Updated:** 2026-03-24
**Style:** Organic Biophilic — "The Tactile Sanctuary"
**Category:** Healthcare / Wellness / Acupressure Guide

---

## Creative North Star

A warm, organic, editorial feel — like a physical self-care journal. No sterile grids.
Prioritize "Digital Haptics" (visual sensation of touch) to mirror acupressure.

---

## Color Palette

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary | `#50644b` | `--color-primary` | CTAs, active states, headings |
| Primary Dim | `#445840` | `--color-primary-dim` | Gradient end, hover states |
| Primary Container | `#d2e9c9` | `--color-primary-container` | Active chips, tags, nav pills |
| On Primary | `#eaffe1` | `--color-on-primary` | Text on primary bg |
| On Primary Container | `#43573e` | `--color-on-primary-container` | Text on container |
| Surface | `#faf9f4` | `--color-surface` | Main background (warm cream) |
| Surface Container Low | `#f4f4ee` | `--color-surface-container-low` | Cards, grouped content |
| Surface Container High | `#e8e9e2` | `--color-surface-container-high` | Inactive chips, buttons |
| On Surface | `#30332e` | `--color-on-surface` | Primary text |
| On Surface Variant | `#5d605a` | `--color-on-surface-variant` | Secondary text |
| Outline | `#797c75` | `--color-outline` | Labels |
| Outline Variant | `#b1b3ab` | `--color-outline-variant` | Ghost borders (15% opacity) |
| Brand | `#889E81` | `--color-brand` | Logo color |
| Error | `#a73b21` | `--color-error` | Error states, red dot |

**Key Rule:** Never use pure black (#000) or pure white (#fff) for backgrounds.

---

## Typography

- **Heading & Body:** Plus Jakarta Sans
- **Korean Fallback:** Noto Sans KR
- **Mood:** organic, clean, editorial, trustworthy

```css
--font-sans: 'Plus Jakarta Sans', 'Noto Sans KR', system-ui, sans-serif;
```

| Scale | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 28-30px | 800 (extrabold) | Hero titles |
| Headline | 20-24px | 700-800 | Section headers, acupoint names |
| Title | 16-18px | 600-700 | Card titles |
| Body | 14-16px | 400-500 | Descriptions |
| Label | 10-12px | 700 | Uppercase tracking labels |

**Label Style:** `text-[10px] font-bold uppercase tracking-widest text-outline`

---

## The "No-Line" Rule

**1px solid borders are strictly prohibited for sectioning.**

Boundaries must be defined through:
- Background color shifts (surface → surface-container-low → surface-container-high)
- Large rounded corners (1.5rem-2rem)
- Tonal layering

**Ghost Border fallback** (inputs only): `outline-variant` at 15% opacity.

---

## Border Radius

| Element | Radius |
|---------|--------|
| Cards, bottom sheet | `2rem` (32px) |
| Nested elements, buttons | `1.5rem` (24px) |
| Chips, pills | `9999px` (full) |
| Minimum (images, etc.) | `0.5rem` (8px) |

---

## Components

### Chips (Symptoms/Tags)
- **Inactive:** `bg-surface-container-high text-on-surface-variant rounded-full`
- **Active:** `bg-primary-container text-on-primary-container rounded-full`
- **Tag prefix:** Use `#` before benefit labels

### Cards
- **No borders, no dividers**
- Background: `bg-surface-container-low rounded-[2rem] p-6`
- Use `space-y-6` between cards, not `<hr>` lines
- Body part badge: `bg-primary-container text-on-primary-container text-[10px] font-extrabold px-3 py-1 rounded-full uppercase`

### Bottom Sheet
- Glassmorphism: 80% surface-container-lowest + blur(20px)
- Top radius: `rounded-t-[2.5rem]`
- Handle: `h-1.5 w-12 bg-outline-variant/30 rounded-full`
- Transition: `400ms cubic-bezier(0.4, 0, 0.2, 1)`

### Bottom Nav
- Glass panel: `rgba(255,255,255,0.8) backdrop-blur(20px)`
- Active item: `bg-primary-container text-on-primary-container rounded-2xl`
- Inactive: `text-on-surface-variant`

### Timer
- Horizontal layout: −/number/+/CTA in a row
- Large number: `text-5xl font-extrabold`
- CTA: gradient `from-primary to-primary-dim` with rounded-2xl

---

## Interaction & Animation

- Transitions: `200-300ms ease-out` for micro-interactions
- Bottom sheet: `400ms cubic-bezier(0.4, 0, 0.2, 1)`
- Active/tap: `active:scale-95` or `active:scale-[0.98]`
- **Always** respect `prefers-reduced-motion`
- Max 1-2 animated elements per view

---

## Touch & Accessibility

- Minimum touch target: **44x44px**
- Minimum touch gap: **8px**
- `touch-action: manipulation` on html (removes 300ms tap delay)
- `overscroll-behavior: contain` on body (prevents pull-to-refresh)
- ARIA: `role="tab"`, `aria-selected`, `role="dialog"`, `aria-modal`
- Focus visible states on all interactive elements
- Color contrast: **4.5:1 minimum** for text

---

## Icons

- **Library:** Lucide React (consistent stroke-based icons)
- **Never:** Use emojis as icons
- **Stroke width:** 1.8 (default), 2.5 (active states)
- **Size:** `h-5 w-5` standard, `h-4 w-4` small

---

## Anti-Patterns

- No bright neon colors
- No heavy motion animations
- No pure black/white backgrounds
- No 1px border lines for sectioning
- No emoji icons
- No layout-shifting hover effects (no scale on layout items)
- No instant state changes (always use transitions)

---

## Pre-Delivery Checklist

- [ ] No emojis used as icons (Lucide SVG only)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover/active states with smooth transitions (150-300ms)
- [ ] Text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] `prefers-reduced-motion` respected in CSS
- [ ] Touch targets >= 44x44px
- [ ] No content hidden behind fixed bottom nav
- [ ] No horizontal scroll on mobile
- [ ] No 1px borders for sectioning
