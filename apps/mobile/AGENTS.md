This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed (do not trust your training data)

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt (an index of all Expo docs with corrections to common LLM misconceptions). Follow its links to the specific page you need; never answer from memory.

## Commands

The user's `~/.npmrc` sets `os=linux`. Prefix every install with `npm_config_os=darwin`, including `npx expo install`.

```bash
npm_config_os=darwin npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm add, resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npm_config_os=darwin npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `apps/mobile/app/`. Every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) in `apps/mobile/src/`, outside `app/`.
- Never create a `src/app/` directory: Expo Router would switch its routes root there and orphan every route already in `app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`). No local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## E2E tests

`e2e/core-flow.yaml` is a Maestro flow. The guided routine it walks through runs at real-world
speed by default, so run it with `EXPO_PUBLIC_GUIDE_SPEED=10` to compress the timer and stay
comfortably under Maestro's 60s `extendedWaitUntil` timeout (the food_stagnation routine finishes
in about 24s at that speed instead of 240s). This env var is only honored in dev builds
(`apps/mobile/src/config/env.ts` gates it on `__DEV__`), so it has no effect in production.

```bash
EXPO_PUBLIC_GUIDE_SPEED=10 maestro test e2e/core-flow.yaml
EXPO_PUBLIC_GUIDE_SPEED=10 maestro test e2e/my-routine.yaml
```

## Web preview harness (visual QA)

`npm run screens -w @ggookggook/mobile` exports a dev-mode web build, serves it locally, and
drives it with Playwright to save PNGs (390×844, deviceScaleFactor 2) to
`.superpowers/screens/` (a way to review screens without a simulator). Dev-only; see
`apps/mobile/scripts/screenshots.mjs`. It also uses `EXPO_PUBLIC_GUIDE_SPEED` to make the guide
routine finish in seconds.

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand. Configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
