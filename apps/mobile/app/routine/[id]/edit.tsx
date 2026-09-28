import type { UserRoutine } from '@ggookggook/shared';
import { getUserRoutine } from '@ggookggook/store';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDb } from '@/db/DbProvider';
import { RoutineEditorView } from '@/routineEditor/RoutineEditorView';
import { isUserRoutineUsable } from '@/routines';
import { useRoutineDraft } from '@/state/routineDraft';
import { colors, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { Txt } from '@/ui/Txt';

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const startEdit = useRoutineDraft((state) => state.startEdit);
  const [routine, setRoutine] = useState<UserRoutine | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setRoutine(undefined);
    getUserRoutine(db, id)
      .then((loaded) => {
        if (cancelled) return;
        // Load the draft before the routine state update triggers this screen's re-render,
        // so RoutineEditorView never renders one frame with the previous draft still in place.
        if (isUserRoutineUsable(loaded)) startEdit(loaded);
        setRoutine(loaded);
      })
      .catch((error: unknown) => {
        console.error('Failed to load the routine to edit', error);
        if (!cancelled) setRoutine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [db, id, startEdit]);

  if (routine === undefined) return null;

  if (!isUserRoutineUsable(routine)) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <BackLink onPress={() => router.back()} />
          <Txt variant="body">찾을 수 없는 루틴이에요.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  return <RoutineEditorView />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(3) },
});
