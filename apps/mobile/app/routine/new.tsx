import { useEffect, useState } from 'react';
import { RoutineEditorView } from '@/routineEditor/RoutineEditorView';
import { useRoutineDraft } from '@/state/routineDraft';

export default function NewRoutineScreen() {
  const startNew = useRoutineDraft((state) => state.startNew);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startNew();
    setReady(true);
  }, [startNew]);

  // Show nothing until the draft is reset: otherwise a leftover draft from an earlier,
  // abandoned /routine/new visit would flash before this effect clears it.
  if (!ready) return null;
  return <RoutineEditorView />;
}
