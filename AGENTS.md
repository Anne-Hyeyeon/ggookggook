# 꾹꾹 (ggookggook)

Acupressure guide app being rebuilt as an Expo (React Native) app with an AWS CDK backend.

- Design spec: `docs/superpowers/specs/2026-09-27-ggookggook-app-design.md`
- Content data (WHO-reviewed): `content/data/`
- First-pass illustrations: `content/images/raw/`

Expo, React Native, and AWS CDK APIs change often. Check the installed package docs before writing code, and heed deprecation notices.

## Commands

- `npm test`: run every workspace's tests
- `npm run typecheck`: typecheck every workspace
- `npm run validate -w @ggookggook/content`: check content data (add `-- --release` before shipping)
- `npm run images -w @ggookggook/content [-- <id>]`: normalize `content/images/raw/*` into `content/images/out/<id>.webp`
