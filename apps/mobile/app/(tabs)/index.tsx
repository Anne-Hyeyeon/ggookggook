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
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDateLine, formatRelativeDay, greetingFor } from '@/format';
import { GROUP_LABELS, GROUP_ORDER, sectionsBySymptomGroup } from '@/groups';
import { MyRoutineChip } from '@/home/MyRoutineChip';
import { SuggestionRow } from '@/home/SuggestionRow';
import { routineSummary, visibleSteps } from '@/routine';
import { isUserRoutineUsable } from '@/routines';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

// A stable reference so a repeated failed refetch sets state to the same object every time,
// letting React bail out via Object.is instead of looping on a fresh {} each time.
const NO_USAGE: Record<string, number> = {};
const NO_ROUTINES: UserRoutine[] = [];
const NO_REPEATS: Record<string, number> = {};

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
  const [suggestionRepeats, setSuggestionRepeats] = useState<Record<string, number>>(NO_REPEATS);
  // Mirrors whether this screen is the currently focused one: the async loads below (and the
  // AppState listener that repeats them) must not set state once it's lost focus or unmounted.
  const activeRef = useRef(true);
  // Guards 시작/다시 하기 against a double tap firing two navigations before the first one's
  // push has actually moved the screen away; reset on every focus so a legitimate return trip
  // isn't left permanently blocked.
  const navigatingRef = useRef(false);

  const load = useCallback(() => {
    latestCompletedSession(db)
      .then((session) => resolveRecentRoutine(db, session))
      .then((resolved) => {
        if (activeRef.current) setRecent(resolved);
      })
      .catch((error: unknown) => {
        console.error('Failed to load the most recent session', error);
        if (activeRef.current) setRecent(null);
      });
    countSessionsByFeedback(db, 'better')
      .then((count) => {
        if (activeRef.current) setBetterCount(count);
      })
      .catch((error: unknown) => {
        console.error('Failed to load the better-feedback count', error);
        if (activeRef.current) setBetterCount(0);
      });
    // Loads the suggestions' remembered repeat counts here too, right after the usage counts
    // that decide which symptoms they are: 시작 then has the repeat in hand already, with no
    // second store read needed on tap.
    countSessionsBySymptom(db)
      .then((counts) => {
        if (!activeRef.current) return undefined;
        setUsageCounts(counts);
        const suggested = suggestFor(new Date(), content.symptoms, counts);
        return Promise.all(suggested.map((symptom) => getSymptomRepeat(db, symptom.id).then((repeat) => [symptom.id, repeat] as const)));
      })
      .then((entries) => {
        if (activeRef.current && entries) setSuggestionRepeats(Object.fromEntries(entries));
      })
      .catch((error: unknown) => {
        console.error('Failed to load symptom usage counts', error);
        if (activeRef.current) {
          setUsageCounts(NO_USAGE);
          setSuggestionRepeats(NO_REPEATS);
        }
      });
    listUserRoutines(db)
      .then((routines) => {
        if (activeRef.current) setMyRoutines(routines);
      })
      .catch((error: unknown) => {
        console.error('Failed to load my routines', error);
        if (activeRef.current) setMyRoutines(NO_ROUTINES);
      });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      navigatingRef.current = false;
      load();
      // react-native-web's AppState is noisy around ordinary focus changes (the Playwright
      // screenshot harness would otherwise retrigger this constantly), so only native gets
      // the foreground-refresh behavior.
      if (Platform.OS === 'web') {
        return () => {
          activeRef.current = false;
        };
      }
      const subscription = AppState.addEventListener('change', (nextState) => {
        // Coming back to Today from the background: the greeting and 지금 해 보기 depend on
        // the time of day, which a re-render alone won't pick up without fresh state to key it.
        if (nextState === 'active') load();
      });
      return () => {
        activeRef.current = false;
        subscription.remove();
      };
    }, [load]),
  );

  const handleStartSuggestion = useCallback((symptomId: string, repeat: number) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    router.push(`/guide/${symptomId}?rounds=${repeat}`);
  }, []);

  const handleRecentPress = useCallback(() => {
    if (!recent || navigatingRef.current) return;
    navigatingRef.current = true;
    router.push(recent.href);
  }, [recent]);

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

  const renderItem = useCallback(({ item }: { item: Symptom }) => <SymptomRow symptom={item} settings={settings} />, [settings]);

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
            onPress={handleRecentPress}
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
              <SuggestionRow
                symptom={symptom}
                settings={settings}
                repeat={suggestionRepeats[symptom.id] ?? 1}
                onStart={handleStartSuggestion}
              />
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
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        renderItem={renderItem}
        renderSectionHeader={({ section }) =>
          section.title ? <Txt variant="caption" style={styles.sectionHeader}>{section.title}</Txt> : null
        }
        ItemSeparatorComponent={Rule}
        ListEmptyComponent={emptyState}
      />
    </SafeAreaView>
  );
}

interface SymptomRowProps {
  symptom: Symptom;
  settings: Settings;
}

const SymptomRow = memo(function SymptomRow({ symptom, settings }: SymptomRowProps) {
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
});

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
  myRoutinesBlock: { gap: space(1) },
  myRoutinesLabel: { paddingTop: space(1) },
  myRoutinesRow: { gap: space(2), paddingRight: space(2) },
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
