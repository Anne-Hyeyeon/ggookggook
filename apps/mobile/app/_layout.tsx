import { NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DbProvider, useDb } from '@/db/DbProvider';
import { useSettings } from '@/state/settings';
import { colors } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('pretendard/dist/public/static/Pretendard-Bold.otf'),
    'NotoSerifKR-Bold': NotoSerifKR_700Bold,
  });
  if (!fontsLoaded) return null;
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
  const loaded = useSettings((state) => state.loaded);
  const accepted = useSettings((state) => state.disclaimerAcceptedAt !== null);
  const load = useSettings((state) => state.load);

  useEffect(() => {
    void load(db);
  }, [db, load]);

  if (!loaded) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={accepted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="symptom/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!accepted}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}
