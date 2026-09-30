import type { WidgetSnapshot } from '@/widget/snapshot';

// The real Android widget lives in androidWidget.android.tsx; iOS and web have nothing to do.
export async function updateAndroidWidget(_snapshot: WidgetSnapshot, _now: Date): Promise<void> {}

export function registerAndroidWidgetTaskHandler(): void {}
