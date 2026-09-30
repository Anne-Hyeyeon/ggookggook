import type { SqlDatabase } from '@ggookggook/store';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useSettings } from '@/state/settings';
import { syncWidgets } from './sync';

// Keeps the home-screen widget current: on launch, whenever the app comes back to the
// foreground or leaves for the background (so edits made during the visit, like a renamed or
// deleted routine, reach the widget), and on every settings change. Session completion syncs
// from the guide itself, right after the session is saved.
export function useWidgetSync(db: SqlDatabase): void {
  useEffect(() => {
    // react-native-web's AppState fires on ordinary focus changes, and web has no widget.
    if (Platform.OS === 'web') return;
    void syncWidgets(db);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') void syncWidgets(db);
    });
    const unsubscribeSettings = useSettings.subscribe((state, previous) => {
      if (state.settings !== previous.settings) void syncWidgets(db);
    });
    return () => {
      appState.remove();
      unsubscribeSettings();
    };
  }, [db]);
}
