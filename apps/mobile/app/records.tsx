import type { SessionLog, UserRoutine } from '@ggookggook/shared';
import { getUserRoutine, listCompletedSessions, listSessionsBetween, statsByRoutine, type RoutineStats } from '@ggookggook/store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDateLine } from '@/format';
import {
  CALENDAR_WEEKDAYS,
  calendarDays,
  recordMinutes,
  recordsWindowStart,
  refKey,
  thisAndLastWeek,
  topRoutines,
  type CalendarDay,
  type TopRoutine,
} from '@/records';
import { resolveRoutineRefTitle, type ResolvedRoutineRefTitle } from '@/routines';
import type { Colors } from '@/theme';
import { fonts, space } from '@/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { CatImage } from '@/ui/CatImage';
import { Txt } from '@/ui/Txt';

const TOP_ROUTINES_LIMIT = 5;
const EMPTY_TEXT = '아직 기록이 없어요.';
const WINDOW_EMPTY_TEXT = '최근 4주에는 기록이 없어요.';
const FAILED_TEXT = '기록을 불러오지 못했어요.';

interface Data {
  // Captured once per load and reused everywhere below, so the fetch and its renders never disagree on "now".
  now: Date;
  sessions: SessionLog[];
  stats: RoutineStats[];
  userRoutines: Map<string, UserRoutine | null>;
  // Any completed session ever, not windowed: decides the cat empty state vs. the windowed one below.
  hasHistory: boolean;
}

type ScreenState = { status: 'loading' } | { status: 'failed' } | { status: 'loaded'; data: Data };

export default function RecordsScreen() {
  const styles = useThemedStyles(makeStyles);
  const db = useDb();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  // Mirrors screen focus (Today tab's pattern): guards setState after unmount, and lets 다시 불러오기 call `load` outside the focus effect.
  const activeRef = useRef(true);

  const load = useCallback(() => {
    setState({ status: 'loading' });
    (async () => {
      try {
        const now = new Date();
        const from = recordsWindowStart(now).toISOString();
        const to = now.toISOString();
        const [sessions, stats, recent] = await Promise.all([
          listSessionsBetween(db, from, to),
          statsByRoutine(db, from),
          listCompletedSessions(db, 1),
        ]);
        if (!activeRef.current) return;
        const userRoutineIds = [...new Set(stats.flatMap((stat) => (stat.ref.kind === 'user' ? [stat.ref.routineId] : [])))];
        const routines = await Promise.all(userRoutineIds.map((id) => getUserRoutine(db, id)));
        if (!activeRef.current) return;
        setState({
          status: 'loaded',
          data: {
            now,
            sessions,
            stats,
            userRoutines: new Map(userRoutineIds.map((id, i) => [id, routines[i] ?? null])),
            hasHistory: recent.length > 0,
          },
        });
      } catch (error) {
        console.error('Failed to load records', error);
        if (activeRef.current) setState({ status: 'failed' });
      }
    })();
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      load();
      return () => {
        activeRef.current = false;
      };
    }, [load]),
  );

  if (state.status !== 'loaded') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.body}>
          <BackLink onPress={() => router.back()} />
          <Txt variant="title">나의 기록</Txt>
          {state.status === 'failed' && (
            <View style={styles.empty}>
              <Txt variant="heading" style={styles.center}>{FAILED_TEXT}</Txt>
              <Button label="다시 불러오기" onPress={load} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { data } = state;
  const { thisWeek, lastWeek } = thisAndLastWeek(data.sessions, data.now);
  const windowEmpty = data.sessions.length === 0;
  const days = calendarDays(data.sessions, data.now);
  // Resolved up front so a dropped (content-missing) entry counts before deciding whether the section heading has anything to show.
  const routines = topRoutines(data.stats, TOP_ROUTINES_LIMIT)
    .map((routine) => ({ routine, resolved: resolveRoutineRefTitle(routine.ref, data.userRoutines) }))
    .filter((entry): entry is { routine: TopRoutine; resolved: ResolvedRoutineRefTitle } => entry.resolved !== null);
  const cat = content.image('cat-shoulder');

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackLink onPress={() => router.back()} />
        <Txt variant="title">나의 기록</Txt>

        {!data.hasHistory ? (
          <View style={styles.empty}>
            {cat !== null && <CatImage source={cat} style={styles.catImage} />}
            <Txt variant="heading" style={styles.center}>{EMPTY_TEXT}</Txt>
            <Txt variant="sub" style={styles.center}>루틴을 마치면 여기에 모여요.</Txt>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              {windowEmpty ? (
                <Txt variant="heading">{WINDOW_EMPTY_TEXT}</Txt>
              ) : (
                <>
                  <Txt variant="heading">{`이번 주 ${thisWeek.count}번 · ${recordMinutes(thisWeek.totalSeconds)}분`}</Txt>
                  <Txt variant="sub">
                    {lastWeek.count === 0 ? '지난주에는 기록이 없어요.' : `지난주 ${lastWeek.count}번 · ${recordMinutes(lastWeek.totalSeconds)}분`}
                  </Txt>
                </>
              )}
            </View>

            <View>
              <View style={styles.weekdayRow}>
                {CALENDAR_WEEKDAYS.map((label, index) => (
                  <Txt key={`weekday-${index}`} variant="caption" style={styles.weekdayLabel}>
                    {label}
                  </Txt>
                ))}
              </View>
              <View style={styles.calendarGrid} accessibilityRole="list" accessibilityLabel="최근 4주 기록">
                {days.map((day, index) => (
                  <CalendarCell key={day?.date.toISOString() ?? `blank-${index}`} day={day} />
                ))}
              </View>
            </View>

            {routines.length > 0 && (
              <View>
                <Txt variant="sub" style={styles.sectionLabel}>자주 한 루틴</Txt>
                {routines.map(({ routine, resolved }) => (
                  <TopRoutineRow key={refKey(routine.ref)} routine={routine} resolved={resolved} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// A count of 0 still draws a faint outline dot (so the grid reads as a full calendar, not gaps); higher counts step the dot up in size.
function dotSize(count: number): number {
  if (count <= 0) return 4;
  if (count === 1) return 7;
  if (count === 2) return 10;
  return 13;
}

// `day` is null for a day after `now` (not yet happened): a bare, unlabeled cell, never a "0 sessions" dot.
function CalendarCell({ day }: { day: CalendarDay | null }) {
  const styles = useThemedStyles(makeStyles);
  if (day === null) return <View style={styles.dayCell} />;
  const size = dotSize(day.count);
  const label = `${formatDateLine(day.date)}, ${day.count}번${day.hasBetter ? ', 나아졌어요를 남긴 날' : ''}`;
  return (
    <View style={styles.dayCell} accessible accessibilityLabel={label}>
      <View style={[styles.todayRing, day.isToday && styles.todayRingActive]}>
        <View style={[styles.dotRing, day.hasBetter && styles.dotRingActive]}>
          <View style={[styles.dot, { width: size, height: size }, day.count === 0 && styles.dotEmpty]} />
        </View>
      </View>
    </View>
  );
}

function TopRoutineRow({ routine, resolved }: { routine: TopRoutine; resolved: ResolvedRoutineRefTitle }) {
  const styles = useThemedStyles(makeStyles);
  const { title, href } = resolved;
  const minutes = recordMinutes(routine.totalSeconds);

  const inner = (
    <>
      <View style={styles.rowText}>
        <Txt maxFontSizeMultiplier={1.4} style={styles.rowName}>{title}</Txt>
        <Txt variant="sub">{`${routine.count}번 · ${minutes}분`}</Txt>
      </View>
      <Txt variant="caption" style={routine.betterCount > 0 ? styles.feedbackBetter : styles.feedbackOther}>
        {`나아졌어요 ${routine.betterCount}번`}
      </Txt>
    </>
  );

  if (href === null) return <View style={styles.row}>{inner}</View>;

  const accessibilityLabel = `${title}, ${routine.count}번, ${minutes}분, 나아졌어요 ${routine.betterCount}번`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => router.push(href)} style={styles.row}>
      {inner}
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    body: { padding: space(5), gap: space(6), paddingBottom: space(10) },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: space(8), gap: space(2) },
    catImage: { width: 160, height: 160 },
    center: { textAlign: 'center' },
    summary: { gap: space(1) },
    weekdayRow: { flexDirection: 'row' },
    weekdayLabel: { width: `${100 / 7}%`, textAlign: 'center' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: `${100 / 7}%`, height: space(9), alignItems: 'center', justifyContent: 'center' },
    // The 나아졌어요 ring (accent) and the today ring (ink) nest around the same dot, so both can show at once.
    todayRing: {
      width: 26,
      height: 26,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayRingActive: { borderColor: colors.ink },
    dotRing: {
      width: 19,
      height: 19,
      borderRadius: 9999,
      borderWidth: 1.5,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotRingActive: { borderColor: colors.accent },
    dot: { borderRadius: 9999, backgroundColor: colors.accent },
    dotEmpty: { backgroundColor: colors.rule },
    sectionLabel: { paddingBottom: space(1) },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: space(11), paddingVertical: space(3), gap: space(3) },
    rowText: { flex: 1, gap: 3 },
    rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
    feedbackBetter: { color: colors.accent },
    feedbackOther: { color: colors.sub },
  });
