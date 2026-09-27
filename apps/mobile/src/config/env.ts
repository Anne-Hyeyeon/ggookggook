// EXPO_PUBLIC_GUIDE_SPEED speeds up the guide timer for local development and E2E runs.
// It must never affect a production build, so it is only honored when __DEV__ is true.
const parsed = Math.max(1, Number(process.env.EXPO_PUBLIC_GUIDE_SPEED ?? '1') || 1);

export const GUIDE_SPEED = __DEV__ ? parsed : 1;
