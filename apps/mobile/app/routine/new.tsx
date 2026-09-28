import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { content } from '@/content';
import { RoutineEditorView } from '@/routineEditor/RoutineEditorView';
import { useRoutineDraft } from '@/state/routineDraft';

export default function NewRoutineScreen() {
  // Set by the acupoint screen's "새 루틴 만들기" (inside its 루틴에 추가 sheet), so the
  // new draft opens with that one acupoint already in it instead of empty.
  const { prefillAcupointId } = useLocalSearchParams<{ prefillAcupointId?: string }>();
  const startNew = useRoutineDraft((state) => state.startNew);
  const addAcupoint = useRoutineDraft((state) => state.addAcupoint);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startNew();
    const acupoint = prefillAcupointId ? content.acupoints.get(prefillAcupointId) : undefined;
    if (acupoint) addAcupoint({ acupointId: acupoint.id, seconds: acupoint.defaultSeconds });
    setReady(true);
  }, [startNew, addAcupoint, prefillAcupointId]);

  // Show nothing until the draft is reset: otherwise a leftover draft from an earlier,
  // abandoned /routine/new visit would flash before this effect clears it.
  if (!ready) return null;
  return <RoutineEditorView />;
}
