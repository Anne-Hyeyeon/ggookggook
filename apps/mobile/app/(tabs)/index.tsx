import {
  searchSymptoms,
  suggestFor,
  type SessionLog,
  type Settings,
  type Symptom,
  type SymptomGroup,
  type UserRoutine,
} from '@ggookggook/shared';
import {
  countSessionsByFeedback,
  countSessionsBySymptom,
  getSymptomRepeat,
  getUserRoutine,
  latestCompletedSession,
  listUserRoutines,
  type SqlDatabase,
} from '@ggookggook/store';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDateLine, formatRelativeDay, greetingFor } from '@/format';
import { GROUP_LABELS, GROUP_ORDER, sectionsBySymptomGroup } from '@/groups';
import { routineSummary, summaryLine, visibleSteps, visibleStepsFor } from '@/routine';
import { isUserRoutineUsable } from '@/routines';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

// A stable reference so a repeated failed refetch sets state to the same object every time,
// letting React bail out via Object.is instead of looping on a fresh {} each time.
const NO_USAGE: Record<string, number> = {};
const NO_ROUTINES: UserRoutine[] = [];

const CHIPS: readonly { id: SymptomGroup | 'all'; label: string }[] = [
  { id: 'all', label: '전체' },
  ...GROUP_ORDER.map((group) => ({ id: group, label: GROUP_LABELS[group] }) as const),
];

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
  const [selectedGroup, setSelectedGroup] = useState<SymptomGroup | 'all'>('all');
  const [recent, setRecent] = useState<RecentRoutine | null>(null);
  const [betterCount, setBetterCount] = useState(0);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>(NO_USAGE);
  const [myRoutines, setMyRoutines] = useState<UserRoutine[]>(NO_ROUTINES);

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
      listUserRoutines(db)
        .then((routines) => {
          if (active) setMyRoutines(routines);
        })
        .catch((error) => {
          console.error('Failed to load my routines', error);
          if (active) setMyRoutines(NO_ROUTINES);
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const handleStartSuggestion = useCallback(
    (symptomId: string) => {
      getSymptomRepeat(db, symptomId)
        .then((repeat) => router.push(`/guide/${symptomId}?rounds=${repeat}`))
        .catch((error: unknown) => {
          console.error('Failed to load the symptom repeat before starting', error);
          router.push(`/guide/${symptomId}?rounds=1`);
        });
    },
    [db],
  );

  // Ties keep content order because Array#sort is stable; with no history every count is
  // 0, so the sort is a no-op and content order falls out for free.
  const sortedSymptoms = useMemo(
    () => [...content.symptoms].sort((a, b) => (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0)),
    [usageCounts],
  );
  // `new Date()` is read fresh here rather than passed in as a dependency: only a change in
  // usageCounts (which a focus refetch always produces a new object for) should recompute
  // the suggestions, not the ticking clock on an already-mounted screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const suggestions = useMemo(() => suggestFor(new Date(), content.symptoms, usageCounts), [usageCounts]);
  const searching = query.trim() !== '';
  // Always a SectionList, even for the flat (search or single-group) cases: switching to a
  // different list component type on the first keystroke would unmount and remount the whole
  // header underneath it, including the search TextInput itself, dropping focus mid-type. A
  // flat result set is just a single section with no header title instead.
  const sections = useMemo(() => {
    // An empty flat result becomes an empty sections array (not a single empty-data
    // section): SectionList only triggers ListEmptyComponent when `sections` itself has
    // nothing in it, not when every section it does have happens to hold zero rows.
    if (searching) {
      const data = searchSymptoms(content.symptoms, content.acupoints, query);
      return data.length > 0 ? [{ key: 'search', title: '', data }] : [];
    }
    if (selectedGroup !== 'all') {
      const data = sortedSymptoms.filter((symptom) => symptom.group === selectedGroup);
      return data.length > 0 ? [{ key: selectedGroup, title: '', data }] : [];
    }
    return sectionsBySymptomGroup(sortedSymptoms);
  }, [searching, query, selectedGroup, sortedSymptoms]);
  const cat = content.image('cat-shoulder');
  const now = new Date();

  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Txt variant="caption">{formatDateLine(now)}</Txt>
        <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} hitSlop={14}>
          <Txt variant="sub">설정</Txt>
        </Pressable>
      </View>
      <Txt variant="sub">{greetingFor(now.getHours())}</Txt>
      <View style={styles.titleRow}>
        <Txt variant="title" style={styles.title}>
          어디가{'\n'}불편하세요?
        </Txt>
        {cat !== null && (
          <Image
            source={cat}
            style={styles.titleCat}
            contentFit="contain"
            accessibilityIgnoresInvertColors
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="증상이나 혈자리 이름"
        placeholderTextColor={colors.faint}
        returnKeyType="search"
        style={styles.search}
      />
      {recent && !searching && (
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
      {!searching && suggestions.length > 0 && (
        <View style={styles.suggestCard}>
          <Txt variant="sub" style={styles.suggestTitle}>지금 해 보기</Txt>
          {suggestions.map((symptom, index) => (
            <View key={symptom.id}>
              {index > 0 && <Rule />}
              <SuggestionRow symptom={symptom} settings={settings} onStart={handleStartSuggestion} />
            </View>
          ))}
        </View>
      )}
      {!searching && myRoutines.length > 0 && (
        <View style={styles.myRoutinesBlock}>
          <Txt variant="caption" style={styles.myRoutinesLabel}>내 루틴</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myRoutinesRow}>
            {myRoutines.map((routine) => (
              <MyRoutineChip key={routine.id} routine={routine} settings={settings} />
            ))}
          </ScrollView>
        </View>
      )}
      {!searching && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CHIPS.map((chip) => {
            const selected = selectedGroup === chip.id;
            return (
              <Pressable
                key={chip.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                hitSlop={4}
                onPress={() => setSelectedGroup(chip.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Txt style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{chip.label}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const emptyState = (
    <Txt variant="sub" style={styles.empty}>찾는 증상이 없어요. 다른 말로 찾아보세요.</Txt>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(symptom) => symptom.id}
        keyboardShouldPersistTaps="handled"
        // The 7 group sections plus all ~30 symptoms comfortably exceed the default
        // initial render batch, which would otherwise hide later groups until scrolled.
        initialNumToRender={50}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        renderItem={({ item }) => <SymptomRow symptom={item} settings={settings} />}
        renderSectionHeader={({ section }) =>
          section.title ? <Txt variant="caption" style={styles.sectionHeader}>{section.title}</Txt> : null
        }
        ItemSeparatorComponent={Rule}
        ListEmptyComponent={emptyState}
      />
    </SafeAreaView>
  );
}

function SuggestionRow({
  symptom,
  settings,
  onStart,
}: {
  symptom: Symptom;
  settings: Settings;
  onStart: (symptomId: string) => void;
}) {
  const steps = visibleSteps(symptom, settings);
  const { minutes } = routineSummary(steps);
  const names = steps.map((step) => content.acupoints.get(step.acupointId)?.name.ko ?? '').join(' · ');
  // Two sibling Pressables, not one nested in the other: react-native-web renders a
  // `Pressable` with accessibilityRole="button" as an actual <button>, and a <button>
  // inside a <button> is invalid HTML that breaks web hydration.
  return (
    <View style={styles.suggestRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${symptom.name} 미리보기`}
        onPress={() => router.push(`/symptom/${symptom.id}`)}
        style={styles.suggestText}
      >
        <Txt maxFontSizeMultiplier={1.4} style={styles.suggestName}>{symptom.name}</Txt>
        <Txt variant="pointSmall">{names}</Txt>
        <Txt variant="sub">{`${minutes}분`}</Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${symptom.name} 시작`}
        hitSlop={10}
        onPress={() => onStart(symptom.id)}
        style={styles.suggestStart}
      >
        <Txt style={styles.suggestStartLabel}>시작</Txt>
      </Pressable>
    </View>
  );
}

function MyRoutineChip({ routine, settings }: { routine: UserRoutine; settings: Settings }) {
  const { count, minutes } = routineSummary(visibleStepsFor(routine.steps, settings), routine.repeat);
  const summary = summaryLine(count, minutes, routine.repeat);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${routine.name}, ${summary}`}
      onPress={() => router.push(`/routine/${routine.id}`)}
      style={styles.myRoutineChip}
    >
      <Txt maxFontSizeMultiplier={1.4} style={styles.myRoutineName}>{routine.name}</Txt>
      <Txt variant="caption">{summary}</Txt>
    </Pressable>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(2) },
  title: { flex: 1, marginTop: space(1), marginBottom: space(1) },
  titleCat: { width: 72, height: 72 },
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
  suggestCard: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    borderRadius: 2,
    paddingHorizontal: space(4),
    paddingVertical: space(1),
  },
  suggestTitle: { paddingTop: space(2.5), paddingBottom: space(0.5) },
  suggestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3), gap: space(3) },
  suggestText: { flex: 1, gap: 3 },
  suggestName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  suggestStart: {
    minWidth: space(14),
    height: space(9),
    borderRadius: 2,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(3),
  },
  suggestStartLabel: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.bg },
  myRoutinesBlock: { gap: space(1) },
  myRoutinesLabel: { paddingTop: space(1) },
  myRoutinesRow: { gap: space(2), paddingRight: space(2) },
  myRoutineChip: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 2,
    minHeight: 44,
    paddingHorizontal: space(3.5),
    paddingVertical: space(1.5),
    justifyContent: 'center',
    gap: 2,
  },
  myRoutineName: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink },
  chipsRow: { gap: space(2), paddingRight: space(2) },
  chip: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 2,
    paddingHorizontal: space(3.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  chipLabelSelected: { color: colors.bg },
  sectionHeader: { paddingTop: space(3), paddingBottom: space(1), backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3.5), gap: space(3) },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
  minutes: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent },
  empty: { paddingVertical: space(8), textAlign: 'center' },
});
