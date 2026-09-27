import { searchSymptoms, type SessionLog, type Settings, type Symptom } from '@ggookggook/shared';
import { latestCompletedSession } from '@ggookggook/store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDateLine, formatRelativeDay } from '@/format';
import { routineSummary, visibleSteps } from '@/routine';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export default function TodayScreen() {
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<SessionLog | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      latestCompletedSession(db)
        .then((session) => {
          if (active) setRecent(session);
        })
        .catch((error) => {
          console.error('Failed to load the most recent session', error);
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const results = useMemo(() => searchSymptoms(content.symptoms, content.acupoints, query), [query]);
  const recentSymptom = recent?.routine.kind === 'symptom' ? content.symptom(recent.routine.symptomId) : undefined;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={results}
        keyExtractor={(symptom) => symptom.id}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topRow}>
              <Txt variant="caption">{formatDateLine(new Date())}</Txt>
              <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} hitSlop={14}>
                <Txt variant="sub">설정</Txt>
              </Pressable>
            </View>
            <Txt variant="title" style={styles.title}>
              어디가{'\n'}불편하세요?
            </Txt>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="증상이나 혈자리 이름"
              placeholderTextColor={colors.faint}
              returnKeyType="search"
              style={styles.search}
            />
            {recent && recentSymptom && query.trim() === '' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/symptom/${recentSymptom.id}`)}
                style={styles.recent}
              >
                <Txt variant="sub">{`최근 · ${recentSymptom.name} · ${formatRelativeDay(recent.completedAt ?? recent.startedAt, new Date())}`}</Txt>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => <SymptomRow symptom={item} settings={settings} />}
        ItemSeparatorComponent={Rule}
        ListEmptyComponent={<Txt variant="sub" style={styles.empty}>찾는 증상이 없어요. 다른 말로 찾아보세요.</Txt>}
      />
    </SafeAreaView>
  );
}

function SymptomRow({ symptom, settings }: { symptom: Symptom; settings: Settings }) {
  const steps = visibleSteps(symptom, settings);
  const { minutes } = routineSummary(steps);
  const names = steps.map((step) => content.acupoints.get(step.acupointId)?.name.ko ?? '').join(' · ');
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/symptom/${symptom.id}`)} style={styles.row}>
      <View style={styles.rowText}>
        <Txt style={styles.rowName}>{symptom.name}</Txt>
        <Txt variant="pointSmall">{names}</Txt>
      </View>
      <Txt style={styles.minutes} testID={`minutes-${symptom.id}`}>{`${minutes}분`}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space(5), paddingBottom: space(10) },
  header: { paddingTop: space(4), paddingBottom: space(2), gap: space(2) },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: space(1), marginBottom: space(3) },
  search: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    paddingVertical: space(2),
  },
  recent: { minHeight: 44, justifyContent: 'center', paddingVertical: space(3) },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3.5), gap: space(3) },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
  minutes: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent },
  empty: { paddingVertical: space(8), textAlign: 'center' },
});
