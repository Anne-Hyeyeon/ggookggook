import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { GuideView } from '@/guide/GuideView';
import { NO_STEPS, resolveRoutine } from '@/routines';
import { useSettings } from '@/state/settings';

export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettings((state) => state.settings);

  const resolved = useMemo(
    () => resolveRoutine({ kind: 'symptom', id }, { settings }),
    // Resolved once per symptom id: a settings change mid-routine must not rebuild the plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  return <GuideView routineRef={{ kind: 'symptom', id }} title={resolved?.title ?? ''} steps={resolved?.steps ?? NO_STEPS} />;
}
