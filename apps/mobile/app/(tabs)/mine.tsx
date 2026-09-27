import type { SessionFeedback, SessionLog } from '@ggookggook/shared';
import { listCompletedSessions } from '@ggookggook/store';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { formatDayHeader, formatDuration, formatTimeOfDay, localDayKey } from '@/format';
import { colors, fonts, space } from '@/theme';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const HISTORY_LIMIT = 60;

// A stable reference so a repeated failed refetch sets state to the same array every time,
// letting React bail out via Object.is instead of looping on a fresh [] each time.
const NO_SESSIONS: SessionLog[] = [];

const FEEDBACK_LABEL: Record<SessionFeedback, string> = {
  better: '나아졌어요',
  same: '비슷해요',
  worse: '더 불편해요',
};

interface HistoryRow {
  session: SessionLog;
  symptomId: string;
  symptomName: string;
}

interface DaySection {
  key: string;
  title: string;
  data: HistoryRow[];
}

function toRows(sessions: SessionLog[]): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const session of sessions) {
    if (session.routine.kind !== 'symptom') continue;
    const symptom = content.symptom(session.routine.symptomId);
    if (!symptom) continue;
    rows.push({ session, symptomId: symptom.id, symptomName: symptom.name });
  }
  return rows;
}

function groupByDay(rows: HistoryRow[], now: Date): DaySection[] {
  const sections: DaySection[] = [];
  for (const row of rows) {
    const timestamp = row.session.completedAt ?? row.session.startedAt;
    const key = localDayKey(timestamp);
    const last = sections[sections.length - 1];
    if (last && last.key === key) {
      last.data.push(row);
    } else {
      sections.push({ key, title: formatDayHeader(timestamp, now), data: [row] });
    }
  }
  return sections;
}

export default function MineScreen() {
  const db = useDb();
  const [sessions, setSessions] = useState<SessionLog[]>(NO_SESSIONS);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listCompletedSessions(db, HISTORY_LIMIT)
        .then((list) => {
          if (active) setSessions(list);
        })
        .catch((error) => {
          console.error('Failed to load session history', error);
          if (active) setSessions(NO_SESSIONS);
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const rows = toRows(sessions);
  const sections = groupByDay(rows, new Date());
  const cat = content.image('cat-shoulder');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.session.id}
        renderItem={({ item }) => <HistoryRowView row={item} />}
        renderSectionHeader={({ section }) => (
          <Txt variant="caption" style={styles.dayHeader}>
            {section.title}
          </Txt>
        )}
        ItemSeparatorComponent={Rule}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Txt variant="title" style={styles.title}>내 루틴</Txt>
            <Rule />
            <Txt variant="sub" style={styles.sectionLabel}>지난 기록</Txt>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {cat !== null && <Image source={cat} style={styles.catImage} contentFit="contain" accessibilityIgnoresInvertColors />}
            <Txt variant="heading" style={styles.center}>아직 기록이 없어요.</Txt>
            <Txt variant="sub" style={styles.center}>오늘 탭에서 불편한 곳을 골라 보세요.</Txt>
          </View>
        }
        ListFooterComponent={
          <Txt variant="caption" style={styles.footer}>나만의 루틴 만들기는 준비 중이에요.</Txt>
        }
      />
    </SafeAreaView>
  );
}

function HistoryRowView({ row }: { row: HistoryRow }) {
  const { session, symptomId, symptomName } = row;
  const timestamp = session.completedAt ?? session.startedAt;
  const time = formatTimeOfDay(timestamp);
  const duration = formatDuration(session.durationSeconds);
  const feedbackLabel = session.feedback ? FEEDBACK_LABEL[session.feedback] : null;
  const accessibilityLabel = [symptomName, time, duration, feedbackLabel].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => router.push(`/symptom/${symptomId}`)}
      style={styles.row}
    >
      <View style={styles.rowText}>
        <Txt maxFontSizeMultiplier={1.4} style={styles.rowName}>{symptomName}</Txt>
        <Txt variant="sub">{`${time} · ${duration}`}</Txt>
      </View>
      {feedbackLabel !== null && (
        <Txt variant="caption" style={session.feedback === 'better' ? styles.feedbackBetter : styles.feedbackOther}>
          {feedbackLabel}
        </Txt>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space(5), paddingBottom: space(10), flexGrow: 1 },
  header: { paddingTop: space(4), paddingBottom: space(2), gap: space(2) },
  title: { marginTop: space(1) },
  sectionLabel: { paddingTop: space(1) },
  dayHeader: { paddingTop: space(4), paddingBottom: space(1) },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: space(12), paddingVertical: space(3), gap: space(3) },
  rowText: { flex: 1, gap: 3 },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
  feedbackBetter: { color: colors.accent },
  feedbackOther: { color: colors.sub },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space(10), gap: space(2) },
  catImage: { width: 160, height: 160 },
  center: { textAlign: 'center' },
  footer: { textAlign: 'center', paddingTop: space(6), paddingBottom: space(2) },
});
