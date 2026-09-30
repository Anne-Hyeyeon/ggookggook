import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { androidWidgetTaskHandler } from './androidWidget.android';

export function registerAndroidWidget(): void {
  registerWidgetTaskHandler(androidWidgetTaskHandler);
}
