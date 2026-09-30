import type { WidgetSnapshot } from './snapshot';

// The Android widget lives in androidWidget.android.tsx; on iOS and web there is nothing to update.
export async function updateAndroidWidget(_snapshot: WidgetSnapshot, _now: Date): Promise<void> {}
