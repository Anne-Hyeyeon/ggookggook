# 꾹꾹 (ggookggook)

Acupressure guide app being rebuilt as an Expo (React Native) app with an AWS CDK backend.

- Design spec: `docs/superpowers/specs/2026-09-27-ggookggook-app-design.md`
- Content data (WHO-reviewed): `content/data/`
- First-pass illustrations: `content/images/raw/`

Expo, React Native, and AWS CDK APIs change often. Check the installed package docs before writing code, and heed deprecation notices.

## Commands

- `npm test`: run every workspace's tests
- `npm run typecheck`: typecheck every workspace
- `npm test -w @ggookggook/store`: local SQLite store tests (better-sqlite3)
- `npm run validate -w @ggookggook/content`: check content data (add `-- --release` before shipping)
- `npm run images -w @ggookggook/content [-- <id>]`: normalize `content/images/raw/*` into `content/images/out/<id>.webp`
- `npm run prompt -w @ggookggook/content [-- <id>]`: print the ChatGPT prompt for a plate or map (see `docs/illustration-style-guide.md`)
- `npm run pin -w @ggookggook/content`: coordinate pinning tool at http://127.0.0.1:4321
- `npm run build -w @ggookggook/content`: write the versioned bundle to `content/dist/` (phase 3 uploads it)
- `npm test -w @ggookggook/mobile`: app tests (jest-expo)
- `cd apps/mobile && npx expo start`: run the app (Expo Go or a dev build)
- `npm run sync-content -w @ggookggook/mobile`: rebuild content and copy it into the app (run after changing content/data or images)
- `cd apps/mobile && EXPO_PUBLIC_GUIDE_SPEED=60 npx expo run:ios && maestro test e2e/core-flow.yaml`: core-flow E2E on the iOS simulator (speed only for tests)

## Toolchain

- TypeScript is pinned below 7 because later tooling needs its JS API. The root devDependency is `typescript@~6.0.3`; TypeScript 7 ships only the native compiler, which breaks ts-node, typescript-eslint, and CDK tooling.

## Installing packages

The user's `~/.npmrc` sets `os=linux`. Prefix every install with `npm_config_os=darwin`, including `npx expo install`. Do not edit `~/.npmrc`.
