# Body SVG Minimal Redesign

## Goal

Replace the current character-like body SVG with a generated acupuncture-chart-style body image that feels calm, credible, and modern in the app UI.

## Constraints

- Keep the existing `200x500` SVG canvas.
- Keep `BODY_REGIONS` viewBoxes unchanged.
- Keep all acupoint coordinates unchanged for this pass.
- Keep interactive region IDs and click behavior unchanged.
- Make the body illustration visually quiet so acupoint dots remain the primary focus.
- Use image assets inside the SVG, with transparent region overlays for interaction.

## Visual Direction

- Reference style: simplified Eastern medicine chart, not a cartoon and not a detailed anatomy drawing.
- Thin outline strokes with soft skin fill.
- Natural standing front/back pose with uncrossed legs.
- Minimal facial detail: light eyebrows/eyes/nose/mouth only.
- Light structural landmarks only:
  - Front: clavicle, chest contour, abdomen center line, navel, pelvic guide, knees
  - Back: neck line, scapula hints, spine center line, gluteal split, calf/Achilles hints

## Implementation Scope

- Rewrite `src/components/BodySvg/BodySvgFront.tsx`
- Rewrite `src/components/BodySvg/BodySvgBack.tsx`
- Add generated image assets under `public/body/`
- Do not change `BODY_REGIONS`, acupoint data, zoom logic, or viewer layout

## Acceptance Criteria

- Front/back figures read as human anatomy-inspired illustrations instead of toy-like characters.
- The body remains centered and fits current zoom boxes.
- Region click targets still exist for all current body parts.
- Acupoint dots remain visually dominant over the body artwork.
