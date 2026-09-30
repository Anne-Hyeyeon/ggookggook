import 'expo-router/entry';
import { registerAndroidWidget } from './src/widget/native';

// The widget's headless task must be registered from the entry, outside any component.
registerAndroidWidget();
