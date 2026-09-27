import { Tabs } from 'expo-router';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: '오늘' }} />
      <Tabs.Screen name="browse" options={{ title: '찾아보기' }} />
      <Tabs.Screen name="mine" options={{ title: '내 루틴' }} />
    </Tabs>
  );
}
