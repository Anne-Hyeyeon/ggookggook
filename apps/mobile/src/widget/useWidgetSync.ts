import type { SqlDatabase } from '@ggookggook/store';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { isWidgetRuntime } from '@/widget/native';
import { syncWidgets } from '@/widget/sync';

// Settings never feed the snapshot, so only launch and app-state changes sync; background catches in-visit routine edits.
export function useWidgetSync(db: SqlDatabase): void {
  useEffect(() => {
    if (!isWidgetRuntime()) return;
    void syncWidgets(db);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') void syncWidgets(db);
    });
    return () => subscription.remove();
  }, [db]);
}
