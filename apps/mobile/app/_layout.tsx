import { NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DbProvider, useDb } from '@/db/DbProvider';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { colors } from '@/theme';

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

function Routes() {
  const db = useDb();
  const settingsLoaded = useSettings((state) => state.loaded);
  const loadSettings = useSettings((state) => state.load);
  const onboardingLoaded = useOnboarding((state) => state.loaded);
  const accepted = useOnboarding((state) => state.disclaimerAcceptedAt !== null);
  const loadOnboarding = useOnboarding((state) => state.load);

  useEffect(() => {
    void loadSettings(db);
    void loadOnboarding(db);
  }, [db, loadSettings, loadOnboarding]);

  if (!settingsLoaded || !onboardingLoaded) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={accepted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="symptom/[id]" />
        <Stack.Screen name="guide/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="done" options={{ gestureEnabled: false }} />
        <Stack.Screen name="settings" />
      </Stack.Protected>
      <Stack.Protected guard={!accepted}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}
