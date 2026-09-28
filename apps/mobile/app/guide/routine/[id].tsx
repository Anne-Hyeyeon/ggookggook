import type { UserRoutine } from '@ggookggook/shared';
import { getUserRoutine } from '@ggookggook/store';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useDb } from '@/db/DbProvider';
import { GuideView } from '@/guide/GuideView';
import { NO_STEPS, resolveRoutine } from '@/routines';
import { useSettings } from '@/state/settings';

export default function GuideRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const [userRoutine, setUserRoutine] = useState<UserRoutine | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setUserRoutine(undefined);
    getUserRoutine(db, id)
      .then((loaded) => {
        if (!cancelled) setUserRoutine(loaded);
      })
      .catch((error) => {
        console.error('Failed to load the user routine', error);
        if (!cancelled) setUserRoutine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const resolved = useMemo(
    () => (userRoutine === undefined ? undefined : resolveRoutine({ kind: 'user', id }, { settings, userRoutine })),
    // Resolved once the routine has loaded: a settings change mid-routine must not rebuild the plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, userRoutine],
  );

  // Still loading: show nothing rather than a flash of the empty state.
  if (resolved === undefined) return null;

  return <GuideView routineRef={{ kind: 'user', id }} title={resolved?.title ?? ''} steps={resolved?.steps ?? NO_STEPS} />;
}
