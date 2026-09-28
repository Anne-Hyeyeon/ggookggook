import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { GuideView } from '@/guide/GuideView';
import { NO_STEPS, resolveRoutine, type RoutineRef } from '@/routines';
import { useSettings } from '@/state/settings';

export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettings((state) => state.settings);

  const routineRef = useMemo<RoutineRef>(() => ({ kind: 'symptom', id }), [id]);
  const resolved = useMemo(
    () => resolveRoutine(routineRef, { settings }),
    // Resolved once per symptom id: a settings change mid-routine must not rebuild the plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routineRef],
  );

  return <GuideView routineRef={routineRef} title={resolved?.title ?? ''} steps={resolved?.steps ?? NO_STEPS} />;
}
