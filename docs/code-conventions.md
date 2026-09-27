# Code Conventions

Conventions for this npm-workspaces Expo/React Native monorepo (`packages/shared`,
`packages/store`, `content`, `apps/mobile`).

## Naming

- Component files: `PascalCase.tsx`, one component plus small local helpers per file. Hooks and
  plain utils: `camelCase.ts` (`Button.tsx`, `useGuide.ts`, `format.ts`).
- Route files follow Expo Router's own convention (`app/(tabs)/index.tsx`, `app/guide/[id].tsx`).
- Props types: `interface <Component>Props`, never an `I` prefix.
- No name reuse across layers for different behavior (e.g. two `useX()` hooks with the same
  name but different shapes).
- Prefer `function ScreenName()` / `function ComponentName()` for exported screens and
  components, not arrow-`const`. Never define a component inside another component's body.

## File & Feature Placement

- Pure, RN-independent domain logic (zod schemas, the guide/rhythm engine, routine math) lives
  in `packages/shared`. Anything that touches `expo-*`, React Native, or a screen stays in
  `apps/mobile/src` or `apps/mobile/app`.
- Default new code to the workspace that already owns the concern; only add a new workspace
  boundary once a second consumer needs the same shape.
- `apps/mobile/app/` is routes only (Expo Router); everything else (components, hooks, state,
  formatting) lives in `apps/mobile/src/`.
- Generated files (`src/content/images.ts`, `src/content/bundle.json`) are marked
  "Generated... Do not edit" and only touched by `npm run sync-content`.

## Component Structure

- Named tokens over literals: colors, fonts, and spacing come from `src/theme.ts`
  (`colors.ink`, `fonts.semibold`, `space(3)`), never a raw hex or an ad-hoc number in a
  `StyleSheet.create` block.
- Styling goes through `StyleSheet.create` plus array composition
  (`style={[styles.pin, { left, top }]}`). An inline style object is only for a genuinely
  runtime-computed value (a measured position, a percentage width), never a static value that a
  stylesheet key could hold.
- Headless building blocks (`Txt`, `Button`, `Rule`) take no data-fetching or navigation
  dependency; the caller wires those in.
- Screens compose UI primitives and hooks; they do not inline a second component definition.

## Hooks

- One hook, one reason to change (`useGuide` owns timer/progress only, `useSettings` owns
  routine settings, `useOnboarding` owns the disclaimer flag).
- Keep `useRef` "latest callback" mirrors (`callbacks.current = { onEvent, onFinish }`) when a
  ticking interval must call current props without restarting.
- An `eslint-disable-next-line react-hooks/exhaustive-deps` must carry a one-line comment saying
  why the omitted dependency is safe.

## State Management

- Local/UI/session state: Zustand.
- There is no remote/server API yet. Until one exists, async reads (SQLite, content lookups)
  belong in an event handler or an effect, not in render. Once a real backend lands, route calls
  through one fetch layer instead of scattering `useEffect`+await pairs across screens.
- Persistence goes through `packages/store`'s functions (`insertSession`, `loadSettings`, ...),
  never raw SQL in a screen.

## Side-Effect Boundaries

- Pure functions (schemas, `guide.ts`, `routine.ts`, `search.ts`) take data in and return data
  out: no `Date.now()`, no I/O, no throw-as-control-flow beyond documented invariants.
- Side effects (DB writes, haptics, navigation, `console.error`) live in event handlers or
  `useEffect`/`useFocusEffect`, and are wrapped so a screen can render a recoverable failure state
  instead of crashing (the `failedLog` retry pattern in `guide/[id].tsx` is the model to reuse).
- Environment/config reads (`process.env.EXPO_PUBLIC_*`) are parsed once in a small config module
  (`apps/mobile/src/config/env.ts`), not inline in a screen.
- The `SqlDatabase` interface in `packages/store/src/db.ts` plus its two adapters
  (`expo-sqlite` in `DbProvider.tsx`, `better-sqlite3` in `test-db.ts`) is this repo's Ports &
  Adapters: the port is the interface, the concrete implementation is swapped at the edge. Keep
  using this shape for any future integration instead of importing a vendor SDK into
  `packages/shared` or `packages/store` business logic.

## Error Handling

- No `any`; narrow `unknown`. The only permitted type assertion is `as const`; no bare `!`
  non-null assertion, guard explicitly or throw through a named helper (`requireAcupoint` is the
  existing model, in `packages/shared/src/routine.ts` and on the mobile content index).
- Prefer a discriminated union over a flag combination when a value has mutually exclusive
  shapes (`SessionRoutineRef`'s `{kind:'symptom',...} | {kind:'user',...}` is the model); extend
  the pattern rather than adding new optional/boolean flags to `SessionLog`.
- Log with `console.error(message, error)` for developer diagnostics, then set local state so the
  screen can offer a retry; do not let a storage failure crash the screen.

## Testing

- Colocate `<name>.test.ts(x)` next to the source file, for every workspace including
  `apps/mobile/src/**`.
- Route files under `apps/mobile/app/` are the one exception: their tests stay in
  `apps/mobile/__tests__/`, since Expo Router treats any file placed under `app/` as a route.
- Use Vitest for pure Node workspaces (`packages/shared`, `packages/store`, `content`) and
  `jest-expo` plus React Native Testing Library for `apps/mobile`, since RN needs the Expo Jest
  transform.

## Imports

- Cross-workspace imports go through the package name (`@ggookggook/shared`,
  `@ggookggook/store`), never a relative `../../..` reach into another workspace.
- Inside `apps/mobile`, use the `@/*` alias to `src/*`; inside a package, import sibling files by
  relative path and expose the public surface only through `src/index.ts` (no sub-barrels).

## Comments

- Default to no comment; names and structure carry "what", and "why" belongs in the commit/PR,
  not the source.
- When a comment earns its place, one line, `//` only, in English, explaining a non-obvious "why"
  (a `react-hooks/exhaustive-deps` exception, a rounding rule), never a restated "what", never
  `/* */`, never JSDoc, never a decorative divider, never a bare ticket/spec reference.
