import type { WidgetSnapshot } from '@/widget/snapshot';

// The real iOS widget lives in iosWidget.ios.tsx; Android and web have nothing to update.
export function updateIosWidget(_snapshot: WidgetSnapshot, _now: Date): void {}
