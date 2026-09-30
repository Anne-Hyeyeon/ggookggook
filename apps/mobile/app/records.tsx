import type { SessionLog, UserRoutine } from '@ggookggook/shared';
import { getUserRoutine, listSessionsBetween, statsByRoutine, type RoutineStats } from '@ggookggook/store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { CatImage } from '@/ui/CatImage';
import { Txt } from '@/ui/Txt';

const TOP_ROUTINES_LIMIT = 5;
const EMPTY_TEXT = '아직 기록이 없어요.';

interface Data {
  // Captured once per load and reused for both the fetch window and every render-time
  // helper below (thisAndLastWeek/calendarDays), instead of each calling `new Date()`
  // separately: keeps the fetched range and what's derived from it from ever disagreeing
  // (e.g. a render landing on the other side of local midnight from the fetch).
  now: Date;
  sessions: SessionLog[];
  stats: RoutineStats[];
  userRoutines: Map<string, UserRoutine | null>;
}

// A stable reference so a repeated failed refetch sets state to the same value every time,
// letting React bail out via Object.is instead of looping on a fresh object each time. The
// fixed placeholder `now` here never actually reaches the calendar/summary math: with an
// empty session list, `isEmpty` is true regardless of `now`, so the render always takes the
// empty-state branch for this value.
const EMPTY_DATA: Data = { now: new Date(0), sessions: [], stats: [], userRoutines: new Map() };

function routineRefKey(ref: TopRoutine['ref']): string {
  return ref.kind === 'symptom' ? `symptom:${ref.symptomId}` : `user:${ref.routineId}`;
}

export default function RecordsScreen() {
  const styles = useThemedStyles(makeStyles);
  const db = useDb();
  const [data, setData] = useState<Data>(EMPTY_DATA);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const now = new Date();
          const from = recordsWindowStart(now).toISOString();
          const to = now.toISOString();
          const [sessions, stats] = await Promise.all([listSessionsBetween(db, from, to), statsByRoutine(db, from)]);
          if (!active) return;
          const userRoutineIds = [...new Set(stats.flatMap((stat) => (stat.ref.kind === 'user' ? [stat.ref.routineId] : [])))];
          const routines = await Promise.all(userRoutineIds.map((id) => getUserRoutine(db, id)));
          if (!active) return;
          setData({ now, sessions, stats, userRoutines: new Map(userRoutineIds.map((id, i) => [id, routines[i] ?? null])) });
        } catch (error) {
          console.error('Failed to load records', error);
          if (active) setData(EMPTY_DATA);
        }
      })();
      return () => {
        active = false;
      };
    }, [db]),
  );

  const { thisWeek, lastWeek } = thisAndLastWeek(data.sessions, data.now);
  const isEmpty = thisWeek.count === 0 && lastWeek.count === 0;
  const days = calendarDays(data.sessions, data.now);
  // Resolved up front (not inside each row) so a stats entry whose symptom no longer
  // exists in content is dropped before deciding whether the "자주 한 루틴" section itself
  // has anything to show, rather than leaving a heading over zero rows.
  const routines = topRoutines(data.stats, TOP_ROUTINES_LIMIT)
    .map((routine) => ({ routine, resolved: resolveRoutineRefTitle(routine.ref, data.userRoutines) }))
    .filter((entry): entry is { routine: TopRoutine; resolved: ResolvedRoutineRefTitle } => entry.resolved !== null);
  const cat = content.image('cat-shoulder');

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackLink onPress={() => router.back()} />
        <Txt variant="title">나의 기록</Txt>

        {isEmpty ? (
          <View style={styles.empty}>
            {cat !== null && <CatImage source={cat} style={styles.catImage} />}
            <Txt variant="heading" style={styles.center}>{EMPTY_TEXT}</Txt>
            <Txt variant="sub" style={styles.center}>루틴을 마치면 여기에 모여요.</Txt>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <Txt variant="heading">{`이번 주 ${thisWeek.count}번 · ${recordMinutes(thisWeek.totalSeconds)}분`}</Txt>
              <Txt variant="sub">
                {lastWeek.count === 0 ? '지난주에는 기록이 없어요.' : `지난주 ${lastWeek.count}번 · ${recordMinutes(lastWeek.totalSeconds)}분`}
              </Txt>
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
                  <TopRoutineRow key={routineRefKey(routine.ref)} routine={routine} resolved={resolved} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// A count of 0 draws a faint outline dot (still visible, so the grid reads as a full
// calendar rather than having gaps); each additional session steps the dot up in size.
function dotSize(count: number): number {
  if (count <= 0) return 4;
  if (count === 1) return 7;
  if (count === 2) return 10;
  return 13;
}

// `day` is null for a day after `now` (the remainder of the current week, which hasn't
// happened yet): rendered as a bare, unlabeled cell, not a dot claiming "0 sessions" for a
// day that hasn't occurred, and not reachable by screen readers as a day at all.
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
    // The 나아졌어요 ring (accent) and the today ring (ink) nest around the same dot, so a
    // day that's both today and has a 나아졌어요 shows both at once.
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
