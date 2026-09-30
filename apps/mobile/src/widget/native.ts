import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import type { WidgetSnapshot } from '@/widget/snapshot';

export type UpdateWidget = (snapshot: WidgetSnapshot, now: Date) => void | Promise<void>;

let reported = false;

function reportUnavailable(reason: unknown): void {
  if (!__DEV__ || reported) return;
  reported = true;
  console.log('Home-screen widgets are unavailable in this build', reason);
}

// Expo Go ships neither widget native module, and both throw when imported without it.
export function isWidgetRuntime(): boolean {
  return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

export function loadWidgetUpdater(): UpdateWidget | null {
  if (Platform.OS === 'web') return null;
  if (!isWidgetRuntime()) {
    reportUnavailable('running in Expo Go');
    return null;
  }
  try {
    if (Platform.OS === 'ios') {
      const widget: typeof import('@/widget/iosWidget') = require('@/widget/iosWidget');
      return widget.updateIosWidget;
    }
    if (Platform.OS === 'android') {
      const widget: typeof import('@/widget/androidWidget') = require('@/widget/androidWidget');
      return widget.updateAndroidWidget;
    }
  } catch (error) {
    reportUnavailable(error);
  }
  return null;
}

export function registerAndroidWidget(): void {
  if (Platform.OS !== 'android') return;
  if (!isWidgetRuntime()) {
    reportUnavailable('running in Expo Go');
    return;
  }
  try {
    const widget: typeof import('@/widget/androidWidget') = require('@/widget/androidWidget');
    widget.registerAndroidWidgetTaskHandler();
  } catch (error) {
    reportUnavailable(error);
  }
}
