import type { UserRoutine } from '@ggookggook/shared';
import { getUserRoutine } from '@ggookggook/store';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useDb } from '@/db/DbProvider';
import { GuideView } from '@/guide/GuideView';
import { parseRounds } from '@/guide/rounds';
import { NO_STEPS, resolveRoutine, type RoutineRef } from '@/routines';
import { useSettings } from '@/state/settings';

export default function GuideRoutineScreen() {
  const { id, rounds } = useLocalSearchParams<{ id: string; rounds?: string }>();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const [userRoutine, setUserRoutine] = useState<UserRoutine | null | undefined>(undefined);

  const routineRef = useMemo<RoutineRef>(() => ({ kind: 'user', id }), [id]);

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
    () => (userRoutine === undefined ? undefined : resolveRoutine(routineRef, { settings, userRoutine })),
    // Resolved once the routine has loaded: a settings change mid-routine must not rebuild the plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routineRef, userRoutine],
  );

  // Still loading: show nothing rather than a flash of the empty state.
  if (resolved === undefined) return null;

  // No explicit ?rounds param (most launches carry one, but a deep link or reminder might
  // not): fall back to the routine's own saved repeat instead of always defaulting to 1.
  const effectiveRounds = rounds !== undefined ? parseRounds(rounds) : (userRoutine?.repeat ?? 1);

  return (
    <GuideView
      routineRef={routineRef}
      title={resolved?.title ?? ''}
      steps={resolved?.steps ?? NO_STEPS}
      rounds={effectiveRounds}
    />
  );
}
