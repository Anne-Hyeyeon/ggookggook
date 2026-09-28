import { NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { useFonts } from 'expo-font';
import { router, Stack, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DbProvider, useDb } from '@/db/DbProvider';
import { addReminderResponseListener, getLastNotificationRoute, registerNotificationHandler } from '@/notifications/reminder';
import { useFavorites } from '@/state/favorites';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { colors } from '@/theme';

// Module-scope, not inside a component: registers exactly once, when the app's JS first
// loads, rather than on every RootLayout render.
registerNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('pretendard/dist/public/static/Pretendard-Bold.otf'),
    'NotoSerifKR-Bold': NotoSerifKR_700Bold,
  });
  useEffect(() => {
    if (fontError) console.error('Failed to load fonts, falling back to system fonts', fontError);
  }, [fontError]);
  // Render as soon as either resolves: a font load failure must not dead-end the app on a blank screen.
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DbProvider>
        <Routes />
      </DbProvider>
    </SafeAreaProvider>
  );
}

// Exported so tests can render this directly, bypassing RootLayout's useFonts() (which
// `require()`s .otf files jest-expo has no transform for).
export function Routes() {
  const db = useDb();
  const settingsLoaded = useSettings((state) => state.loaded);
  const loadSettings = useSettings((state) => state.load);
  const onboardingLoaded = useOnboarding((state) => state.loaded);
  const accepted = useOnboarding((state) => state.disclaimerAcceptedAt !== null);
  const loadOnboarding = useOnboarding((state) => state.load);
  const favoritesLoaded = useFavorites((state) => state.loaded);
  const loadFavorites = useFavorites((state) => state.load);
  const navigationReady = useRootNavigationState()?.key != null;

  useEffect(() => {
    void loadSettings(db);
    void loadOnboarding(db);
    void loadFavorites(db);
  }, [db, loadSettings, loadOnboarding, loadFavorites]);

  // Tapping the daily reminder opens the routine's preview, whether the tap launched the app
  // cold (getLastNotificationRoute, a snapshot rather than an event) or arrived while it was
  // already running (the listener). Gated on `accepted` (before the disclaimer, none of the
  // routes a reminder points at are even mounted) and on the root navigator being ready
  // (router.push before it has mounted is silently dropped).
  useEffect(() => {
    if (!accepted || !navigationReady) return;
    const initialRoute = getLastNotificationRoute();
    if (initialRoute) router.push(initialRoute);
    const subscription = addReminderResponseListener((route) => router.push(route));
    return () => subscription.remove();
  }, [accepted, navigationReady]);

  if (!settingsLoaded || !onboardingLoaded || !favoritesLoaded) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={accepted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="symptom/[id]" />
        <Stack.Screen name="region/[mapId]/[regionId]" />
        <Stack.Screen name="acupoint/[id]" />
        <Stack.Screen name="guide/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="guide/routine/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="done" options={{ gestureEnabled: false }} />
        <Stack.Screen name="settings" />
        {/* expo-router (SDK 57) vendors react-navigation internally and doesn't expose
            usePreventRemove publicly (no @react-navigation/* package is even installed), so
            an iOS swipe-back while the editor is dirty can't show the same confirm-leave
            overlay 뒤로 does; disabling the gesture forces 뒤로/hardware back instead. */}
        <Stack.Screen name="routine/new" options={{ gestureEnabled: false }} />
        <Stack.Screen name="routine/[id]/index" />
        <Stack.Screen name="routine/[id]/edit" options={{ gestureEnabled: false }} />
        <Stack.Screen name="routine/pick" />
      </Stack.Protected>
      <Stack.Protected guard={!accepted}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}
