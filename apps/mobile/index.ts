import 'expo-router/entry';
import { registerAndroidWidget } from './src/widget/registerAndroidWidget';

// react-native-android-widget renders the widget from a headless JS task, which has to be
// registered from the app entry (outside any component) so it exists even with no UI running.
registerAndroidWidget();
