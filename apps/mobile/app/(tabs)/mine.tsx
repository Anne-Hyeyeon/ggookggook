import type { Acupoint, SessionFeedback, SessionLog, UserRoutine } from '@ggookggook/shared';
import { getUserRoutine, listCompletedSessions, listUserRoutines } from '@ggookggook/store';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDayHeader, formatDuration, formatTimeOfDay, localDayKey } from '@/format';
import { firstSentence, routineSummary, summaryLine, visibleStepsFor } from '@/routine';
import { DELETED_ROUTINE_LABEL, isUserRoutineUsable } from '@/routines';
import { useFavorites } from '@/state/favorites';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const HISTORY_LIMIT = 60;

interface History {
  sessions: SessionLog[];
  userRoutines: Map<string, UserRoutine | null>;
}

// A stable reference so a repeated failed refetch sets state to the same value every time,
// letting React bail out via Object.is instead of looping on a fresh object each time.
const EMPTY_HISTORY: History = { sessions: [], userRoutines: new Map() };

const FEEDBACK_LABEL: Record<SessionFeedback, string> = {
  better: '나아졌어요',
  same: '비슷해요',
  worse: '더 불편해요',
};

const FAVORITES_EMPTY_TEXT = '즐겨찾기를 누른 혈자리가 여기에 모여요.';
const HISTORY_EMPTY_TEXT = '아직 기록이 없어요.';

interface HistoryRow {
  session: SessionLog;
  title: string;
  // Navigation target for this row's preview screen; null for a deleted user routine,
  // which has nothing left to preview.
  href: `/symptom/${string}` | `/routine/${string}` | null;
}

type Row =
  | { kind: 'favorite'; key: string; acupoint: Acupoint }
  | { kind: 'routine'; key: string; routine: UserRoutine }
  | { kind: 'newRoutine'; key: string }
  | { kind: 'history'; key: string; row: HistoryRow }
  | { kind: 'emptyLine'; key: string; text: string }
  | { kind: 'freshEmpty'; key: string };

interface Section {
  key: string;
  title: string;
  // Whether this section's header carries a hairline above it; day sub-headers within
  // 지난 기록 don't, since the 지난 기록 header right above them already does.
  hairline: boolean;
  data: Row[];
}

function toHistoryRows(sessions: SessionLog[], userRoutines: Map<string, UserRoutine | null>): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const session of sessions) {
    if (session.routine.kind === 'symptom') {
      const symptom = content.symptom(session.routine.symptomId);
      if (!symptom) continue;
      rows.push({ session, title: symptom.name, href: `/symptom/${symptom.id}` });
      continue;
    }
    const routine = userRoutines.get(session.routine.routineId);
    const usable = isUserRoutineUsable(routine);
    rows.push({ session, title: usable ? routine.name : DELETED_ROUTINE_LABEL, href: usable ? `/routine/${routine.id}` : null });
  }
  return rows;
}

function groupHistoryByDay(rows: HistoryRow[], now: Date): Section[] {
  const sections: Section[] = [];
  for (const row of rows) {
    const timestamp = row.session.completedAt ?? row.session.startedAt;
    const key = localDayKey(timestamp);
    const last = sections[sections.length - 1];
    const item: Row = { kind: 'history', key: `hist:${row.session.id}`, row };
    if (last && last.key === key) {
      last.data.push(item);
    } else {
      sections.push({ key, title: formatDayHeader(timestamp, now), hairline: false, data: [item] });
    }
  }
  return sections;
}

export default function MineScreen() {
  const db = useDb();
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const [myRoutines, setMyRoutines] = useState<UserRoutine[]>([]);
  const favoriteIds = useFavorites((state) => state.ids);
  const settings = useSettings((state) => state.settings);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const sessions = await listCompletedSessions(db, HISTORY_LIMIT);
          const routineIds = [...new Set(sessions.flatMap((s) => (s.routine.kind === 'user' ? [s.routine.routineId] : [])))];
          const routines = await Promise.all(routineIds.map((id) => getUserRoutine(db, id)));
          if (!active) return;
          setHistory({ sessions, userRoutines: new Map(routineIds.map((id, i) => [id, routines[i] ?? null])) });
        } catch (error) {
          console.error('Failed to load session history', error);
          if (active) setHistory(EMPTY_HISTORY);
        }
      })();
      (async () => {
        try {
          const routines = await listUserRoutines(db);
          if (active) setMyRoutines(routines);
        } catch (error) {
          console.error('Failed to load my routines', error);
          if (active) setMyRoutines([]);
        }
      })();
      return () => {
        active = false;
      };
    }, [db]),
  );

  const favoriteAcupoints = [...favoriteIds]
    .map((id) => content.acupoints.get(id))
    .filter((acupoint): acupoint is Acupoint => acupoint !== undefined);
  const historyRows = toHistoryRows(history.sessions, history.userRoutines);
  const daySections = groupHistoryByDay(historyRows, new Date());
  const allEmpty = favoriteAcupoints.length === 0 && myRoutines.length === 0 && historyRows.length === 0;
  const cat = content.image('cat-shoulder');

  const sections: Section[] = [
    {
      key: 'favorites',
      title: '즐겨찾는 혈자리',
      hairline: true,
      data:
        favoriteAcupoints.length > 0
          ? favoriteAcupoints.map((acupoint) => ({ kind: 'favorite', key: `fav:${acupoint.id}`, acupoint }) as const)
          : [{ kind: 'emptyLine', key: 'favorites-empty', text: FAVORITES_EMPTY_TEXT }],
    },
    {
      key: 'routines',
      title: '내 루틴',
      hairline: true,
      data: [
        ...myRoutines.map((routine) => ({ kind: 'routine', key: `routine:${routine.id}`, routine }) as const),
        { kind: 'newRoutine', key: 'new-routine' } as const,
      ],
    },
    {
      key: 'history-label',
      title: '지난 기록',
      hairline: true,
      data:
        historyRows.length > 0
          ? []
          : [allEmpty ? { kind: 'freshEmpty', key: 'fresh-empty' } : { kind: 'emptyLine', key: 'history-empty', text: HISTORY_EMPTY_TEXT }],
    },
    ...daySections,
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        renderItem={({ item }) => <RowView row={item} cat={cat} settings={settings} />}
        renderSectionHeader={({ section }) => (
          <View>
            {section.hairline && <Rule />}
            <Txt variant="sub" style={styles.sectionLabel}>
              {section.title}
            </Txt>
          </View>
        )}
        ItemSeparatorComponent={Rule}
        contentContainerStyle={styles.content}
        // The three sections (favorites, my routines, history) plus their day sub-groups
        // easily add up to more cells than the default initial render batch, which would
        // otherwise hide 지난 기록's later days until the user scrolls past them once.
        initialNumToRender={50}
        ListHeaderComponent={
          <Txt variant="title" style={styles.title}>내 루틴</Txt>
        }
      />
    </SafeAreaView>
  );
}

function RowView({
  row,
  cat,
  settings,
}: {
  row: Row;
  cat: number | null;
  settings: ReturnType<typeof useSettings.getState>['settings'];
}) {
  if (row.kind === 'favorite') return <FavoriteRowView acupoint={row.acupoint} />;
  if (row.kind === 'routine') return <RoutineRowView routine={row.routine} settings={settings} />;
  if (row.kind === 'newRoutine') return <NewRoutineRowView />;
  if (row.kind === 'history') return <HistoryRowView row={row.row} />;
  if (row.kind === 'emptyLine') return <Txt variant="sub" style={styles.emptyLine}>{row.text}</Txt>;
  return (
    <View style={styles.empty}>
      {cat !== null && <Image source={cat} style={styles.catImage} contentFit="contain" accessibilityIgnoresInvertColors />}
      <Txt variant="heading" style={styles.center}>{HISTORY_EMPTY_TEXT}</Txt>
      <Txt variant="sub" style={styles.center}>오늘 탭에서 불편한 곳을 골라 보세요.</Txt>
    </View>
  );
}

function FavoriteRowView({ acupoint }: { acupoint: Acupoint }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${acupoint.name.ko}, ${firstSentence(acupoint.location)}`}
      onPress={() => router.push(`/acupoint/${acupoint.id}`)}
      style={styles.row}
    >
      <View style={styles.rowHead}>
        <Txt variant="point" style={styles.pointName}>{acupoint.name.ko}</Txt>
        <Txt variant="caption">{acupoint.name.hanja}</Txt>
      </View>
      <Txt variant="sub">{firstSentence(acupoint.location)}</Txt>
    </Pressable>
  );
}

function RoutineRowView({ routine, settings }: { routine: UserRoutine; settings: ReturnType<typeof useSettings.getState>['settings'] }) {
  const { count, minutes } = routineSummary(visibleStepsFor(routine.steps, settings), routine.repeat);
  const summary = summaryLine(count, minutes, routine.repeat);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${routine.name}, ${summary}`}
      onPress={() => router.push(`/routine/${routine.id}`)}
      style={styles.row}
    >
      <Txt maxFontSizeMultiplier={1.4} style={styles.rowName}>{routine.name}</Txt>
      <Txt variant="sub">{summary}</Txt>
    </Pressable>
  );
}

function NewRoutineRowView() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="새 루틴 만들기"
      onPress={() => router.push('/routine/new')}
      style={styles.newRow}
    >
      <Txt style={styles.newRowLabel}>새 루틴 만들기</Txt>
    </Pressable>
  );
}

function HistoryRowView({ row }: { row: HistoryRow }) {
  const { session, title, href } = row;
  const timestamp = session.completedAt ?? session.startedAt;
  const time = formatTimeOfDay(timestamp);
  const duration = formatDuration(session.durationSeconds);
  const feedbackLabel = session.feedback ? FEEDBACK_LABEL[session.feedback] : null;
  const accessibilityLabel = [title, time, duration, feedbackLabel].filter(Boolean).join(' · ');

  const inner = (
    <>
      <View style={styles.rowText}>
        <Txt maxFontSizeMultiplier={1.4} style={styles.rowName}>{title}</Txt>
        <Txt variant="sub">{`${time} · ${duration}`}</Txt>
      </View>
      {feedbackLabel !== null && (
        <Txt variant="caption" style={session.feedback === 'better' ? styles.feedbackBetter : styles.feedbackOther}>
          {feedbackLabel}
        </Txt>
      )}
    </>
  );

  if (href === null) return <View style={styles.historyRow}>{inner}</View>;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => router.push(href)} style={styles.historyRow}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space(5), paddingBottom: space(10), flexGrow: 1 },
  title: { paddingTop: space(4), paddingBottom: space(2) },
  sectionLabel: { paddingTop: space(3), paddingBottom: space(1) },
  row: { gap: space(1), minHeight: space(11), paddingVertical: space(3) },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space(1.5) },
  pointName: { fontSize: 19, lineHeight: 25 },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
  newRow: { minHeight: space(11), paddingVertical: space(3), alignItems: 'center', justifyContent: 'center' },
  newRowLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  emptyLine: { textAlign: 'center', paddingVertical: space(4) },
  historyRow: { flexDirection: 'row', alignItems: 'center', minHeight: space(12), paddingVertical: space(3), gap: space(3) },
  rowText: { flex: 1, gap: 3 },
  feedbackBetter: { color: colors.accent },
  feedbackOther: { color: colors.sub },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: space(8), gap: space(2) },
  catImage: { width: 160, height: 160 },
  center: { textAlign: 'center' },
});
