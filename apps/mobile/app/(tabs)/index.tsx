import { searchSymptoms, type SessionLog, type Settings, type Symptom } from '@ggookggook/shared';
import { countSessionsByFeedback, countSessionsBySymptom, getUserRoutine, latestCompletedSession, type SqlDatabase } from '@ggookggook/store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDateLine, formatRelativeDay } from '@/format';
import { routineSummary, visibleSteps } from '@/routine';
import { isUserRoutineUsable } from '@/routines';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

// A stable reference so a repeated failed refetch sets state to the same object every time,
// letting React bail out via Object.is instead of looping on a fresh {} each time.
const NO_USAGE: Record<string, number> = {};

interface RecentRoutine {
  session: SessionLog;
  title: string;
  href: `/symptom/${string}` | `/routine/${string}`;
}

// Resolves what the "최근" row shows for a completed session: a symptom's name is always
// known from content, but a user routine's name (and whether the row shows at all) depends
// on that routine still existing, so it's looked up fresh rather than assumed.
async function resolveRecentRoutine(db: SqlDatabase, session: SessionLog | null): Promise<RecentRoutine | null> {
  if (!session) return null;
  if (session.routine.kind === 'symptom') {
    const symptom = content.symptom(session.routine.symptomId);
    return symptom ? { session, title: symptom.name, href: `/symptom/${symptom.id}` } : null;
  }
  const routine = await getUserRoutine(db, session.routine.routineId).catch((error: unknown) => {
    console.error('Failed to load the recent user routine', error);
    return null;
  });
  return isUserRoutineUsable(routine) ? { session, title: routine.name, href: `/routine/${routine.id}` } : null;
}

export default function TodayScreen() {
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<RecentRoutine | null>(null);
  const [betterCount, setBetterCount] = useState(0);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>(NO_USAGE);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      latestCompletedSession(db)
        .then((session) => resolveRecentRoutine(db, session))
        .then((resolved) => {
          if (active) setRecent(resolved);
        })
        .catch((error) => {
          console.error('Failed to load the most recent session', error);
          if (active) setRecent(null);
        });
      countSessionsByFeedback(db, 'better')
        .then((count) => {
          if (active) setBetterCount(count);
        })
        .catch((error) => {
          console.error('Failed to load the better-feedback count', error);
          if (active) setBetterCount(0);
        });
      countSessionsBySymptom(db)
        .then((counts) => {
          if (active) setUsageCounts(counts);
        })
        .catch((error) => {
          console.error('Failed to load symptom usage counts', error);
          if (active) setUsageCounts(NO_USAGE);
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  // Ties keep content order because Array#sort is stable; with no history every count is
  // 0, so the sort is a no-op and content order falls out for free.
  const sortedSymptoms = useMemo(
    () => [...content.symptoms].sort((a, b) => (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0)),
    [usageCounts],
  );
  const results = useMemo(
    () => (query.trim() === '' ? sortedSymptoms : searchSymptoms(content.symptoms, content.acupoints, query)),
    [query, sortedSymptoms],
  );
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
            {recent && query.trim() === '' && (
              <View style={styles.recentBlock}>
                <Rule />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${recent.title} 다시 하기`}
                  onPress={() => router.push(recent.href)}
                  style={styles.recent}
                >
                  <Txt variant="sub" style={styles.recentLabel}>
                    {`최근 · ${recent.title} · ${formatRelativeDay(recent.session.completedAt ?? recent.session.startedAt, new Date())}`}
                  </Txt>
                  <Txt maxFontSizeMultiplier={1.4} style={styles.recentAction}>다시 하기</Txt>
                </Pressable>
                {betterCount >= 1 && (
                  <Txt variant="caption" maxFontSizeMultiplier={1.4} style={styles.betterLine}>
                    {`나아졌어요를 ${betterCount}번 남겼어요`}
                  </Txt>
                )}
                <Rule />
              </View>
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
        <Txt maxFontSizeMultiplier={1.4} style={styles.rowName}>{symptom.name}</Txt>
        <Txt variant="pointSmall">{names}</Txt>
      </View>
      <Txt maxFontSizeMultiplier={1.4} style={styles.minutes} testID={`minutes-${symptom.id}`}>{`${minutes}분`}</Txt>
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
  recentBlock: { gap: space(1.5) },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
    minHeight: space(12),
    paddingVertical: space(3),
  },
  recentLabel: { flex: 1 },
  recentAction: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.accent },
  betterLine: { paddingBottom: space(1) },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3.5), gap: space(3) },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
  minutes: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent },
  empty: { paddingVertical: space(8), textAlign: 'center' },
});
