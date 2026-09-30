import type { WidgetSnapshot } from './snapshot';

// The iOS widget lives in iosWidget.ios.tsx; on Android and web there is nothing to update.
export function updateIosWidget(_snapshot: WidgetSnapshot, _now: Date): void {}
