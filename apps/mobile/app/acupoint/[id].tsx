import { addStep, USER_ROUTINE_LIMITS, type UserRoutine } from '@ggookggook/shared';
import { listUserRoutines, saveUserRoutine } from '@ggookggook/store';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, BackHandler, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { ROUTINE_DISCLAIMER } from '@/disclaimers';
import { routineSummary, sideLabel, visibleSteps } from '@/routine';
import { useFavorites } from '@/state/favorites';
import { useSettings } from '@/state/settings';
import type { Colors } from '@/theme';
import { fonts, space } from '@/theme';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { PlateView } from '@/ui/PlateView';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export default function AcupointScreen() {
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const settings = useSettings((state) => state.settings);
  const isFavorite = useFavorites((state) => state.ids.has(id));
  const toggleFavorite = useFavorites((state) => state.toggle);
  const [favoriteError, setFavoriteError] = useState(false);
  const { width } = useWindowDimensions();
  const plateSize = Math.min(width - space(10), 280);
  const acupoint = content.acupoints.get(id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [routines, setRoutines] = useState<UserRoutine[] | null>(null);
  const [listError, setListError] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [addError, setAddError] = useState(false);

  const handleToggleFavorite = useCallback(() => {
    setFavoriteError(false);
    toggleFavorite(db, id).catch((error: unknown) => {
      console.error('Failed to save a favorite', error);
      setFavoriteError(true);
    });
  }, [db, id, toggleFavorite]);

  const openSheet = useCallback(() => {
    setSheetOpen(true);
    setListError(false);
    setAddError(false);
    setAddedId(null);
    setRoutines(null);
    listUserRoutines(db)
      .then(setRoutines)
      .catch((error: unknown) => {
        console.error('Failed to load my routines', error);
        setListError(true);
        setRoutines([]);
      });
  }, [db]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const handleAdd = useCallback(
    (target: UserRoutine) => {
      if (!acupoint) return;
      setAddError(false);
      setAddingId(target.id);
      const now = new Date();
      const steps = addStep(target.steps, { acupointId: acupoint.id, seconds: acupoint.defaultSeconds });
      saveUserRoutine(db, { ...target, steps, updatedAt: now.toISOString() }, now)
        .then(() => {
          setRoutines((prev) => prev?.map((r) => (r.id === target.id ? { ...r, steps } : r)) ?? prev);
          setAddedId(target.id);
          // The live region alone doesn't fire reliably on every platform; the imperative
          // announce is the one that actually reaches VoiceOver/TalkBack on native.
          if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility('추가했어요');
        })
        .catch((error: unknown) => {
          console.error('Failed to add the acupoint to the routine', error);
          setAddError(true);
        })
        .finally(() => setAddingId(null));
    },
    [db, acupoint],
  );

  const handleCreateNew = useCallback(() => {
    setSheetOpen(false);
    router.push({ pathname: '/routine/new', params: { prefillAcupointId: id } });
  }, [id]);

  // Android hardware back while the 루틴에 추가 sheet is open must close it, not pop this
  // screen out from under it (same pattern as GuideView/RoutineEditorView).
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      const onBackPress = () => {
        if (!sheetOpen) return false;
        closeSheet();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [sheetOpen, closeSheet]),
  );

  if (!acupoint) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <BackLink onPress={() => router.back()} />
          <Txt variant="body">찾을 수 없는 혈자리예요.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  const sides = sideLabel(acupoint.sides);
  const symptoms = content.symptomsFor(acupoint.id);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap} importantForAccessibility={sheetOpen ? 'no-hide-descendants' : 'auto'}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.topRow}>
            <BackLink onPress={() => router.back()} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? '즐겨찾기에서 빼기' : '즐겨찾기에 추가'}
              accessibilityState={{ selected: isFavorite }}
              hitSlop={12}
              onPress={handleToggleFavorite}
            >
              <Txt variant="sub" style={isFavorite ? styles.favoriteOn : undefined}>
                {isFavorite ? '즐겨찾는 중' : '즐겨찾기'}
              </Txt>
            </Pressable>
          </View>
          {favoriteError && (
            <Txt variant="sub" style={styles.error}>
              저장하지 못했어요. 다시 눌러 주세요.
            </Txt>
          )}
          <View style={styles.head}>
            <View style={styles.nameRow}>
              <Txt variant="point" style={styles.pointName}>{acupoint.name.ko}</Txt>
              <Txt variant="caption">{acupoint.name.hanja}</Txt>
              <Txt variant="caption">{acupoint.name.en}</Txt>
            </View>
            {sides !== '' && <Txt variant="sub">{sides}</Txt>}
          </View>

          <PlateView view={content.plateFor(acupoint.id)} side="both" size={plateSize} />

          <View>
            <Rule strong />
            <Txt style={styles.sectionTitle}>위치</Txt>
            <Txt variant="sub">{acupoint.location}</Txt>
          </View>

          <View>
            <Rule />
            <Txt style={styles.sectionTitle}>누르는 법</Txt>
            <Txt variant="sub">{acupoint.technique}</Txt>
          </View>

          {acupoint.cautions.includes('pregnancy') && (
            <View>
              <Rule />
              <Txt variant="sub" style={styles.caution}>임신 중에는 누르지 마세요.</Txt>
            </View>
          )}

          {symptoms.length > 0 && (
            <View>
              <Rule />
              <Txt style={styles.sectionTitle}>이 혈자리를 쓰는 루틴</Txt>
              <View>
                {symptoms.map((symptom) => {
                  const steps = visibleSteps(symptom, settings);
                  const { minutes } = routineSummary(steps);
                  return (
                    <Pressable
                      key={symptom.id}
                      accessibilityRole="button"
                      onPress={() => router.push(`/symptom/${symptom.id}`)}
                      style={styles.symptomRow}
                    >
                      <Txt style={styles.symptomName}>{symptom.name}</Txt>
                      <Txt variant="caption" style={styles.symptomMinutes}>{`${minutes}분`}</Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <Txt variant="caption">{ROUTINE_DISCLAIMER}</Txt>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="루틴에 추가" onPress={openSheet} />
        </View>
      </View>

      {sheetOpen && (
        <View testID="add-to-routine-overlay" style={styles.sheetOverlay} accessibilityViewIsModal>
          <View style={styles.sheetBox}>
            <Txt variant="body" style={styles.sheetTitle}>루틴에 추가</Txt>

            {listError && (
              <Txt variant="sub" style={styles.error}>
                불러오지 못했어요. 다시 눌러 주세요.
              </Txt>
            )}
            {addError && (
              <Txt variant="sub" style={styles.error}>
                추가하지 못했어요. 다시 눌러 주세요.
              </Txt>
            )}

            <ScrollView style={styles.sheetList}>
              {routines === null && <Txt variant="sub">불러오는 중…</Txt>}
              {routines !== null && routines.length === 0 && (
                <Txt variant="sub" style={styles.sheetEmpty}>아직 만든 루틴이 없어요.</Txt>
              )}
              {routines?.map((target) => {
                const atMax = target.steps.length >= USER_ROUTINE_LIMITS.stepsMax;
                const isAdding = addingId === target.id;
                const justAdded = addedId === target.id;
                return (
                  <View key={target.id}>
                    <Rule />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${target.name}, ${target.steps.length}개`}
                      accessibilityState={{ disabled: atMax || isAdding }}
                      disabled={atMax || isAdding}
                      onPress={() => handleAdd(target)}
                      style={({ pressed }) => [styles.routineRow, (pressed || atMax || isAdding) && styles.routineRowDim]}
                    >
                      <View style={styles.routineRowHead}>
                        <Txt style={styles.routineName}>{target.name}</Txt>
                        <Txt variant="caption">{`${target.steps.length}개`}</Txt>
                      </View>
                      {atMax && <Txt variant="sub" style={styles.limit}>혈자리는 10개까지 넣을 수 있어요.</Txt>}
                      {justAdded && (
                        <Txt variant="sub" style={styles.added} accessibilityLiveRegion="polite">
                          추가했어요
                        </Txt>
                      )}
                    </Pressable>
                  </View>
                );
              })}
              <Rule />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="새 루틴 만들기"
                onPress={handleCreateNew}
                style={({ pressed }) => [styles.newRow, pressed && styles.routineRowDim]}
              >
                <Txt style={styles.newRowLabel}>새 루틴 만들기</Txt>
              </Pressable>
            </ScrollView>

            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={closeSheet} style={styles.sheetClose}>
              <Txt variant="sub">닫기</Txt>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    wrap: { flex: 1 },
    body: { padding: space(5), gap: space(5), paddingBottom: space(8) },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    favoriteOn: { color: colors.accent },
    error: { color: colors.accent },
    head: { gap: space(1.5) },
    nameRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space(1.5) },
    pointName: { fontSize: 27 },
    sectionTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: space(2), marginBottom: space(1) },
    caution: { color: colors.accent },
    symptomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: space(11),
      paddingVertical: space(2.5),
    },
    symptomName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
    symptomMinutes: { color: colors.accent },
    footer: { padding: space(5), paddingTop: space(2) },
    sheetOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space(5),
      backgroundColor: colors.scrim,
    },
    sheetBox: {
      width: '100%',
      maxHeight: '80%',
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.rule,
      borderRadius: 2,
      padding: space(5),
      gap: space(3),
    },
    sheetTitle: { fontFamily: fonts.semibold },
    sheetList: { flexGrow: 0 },
    sheetEmpty: { paddingVertical: space(4), textAlign: 'center' },
    routineRow: { minHeight: space(11), paddingVertical: space(2.5), gap: space(1) },
    routineRowDim: { opacity: 0.5 },
    routineRowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    routineName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
    limit: { color: colors.accent },
    added: { color: colors.accent },
    newRow: { minHeight: space(11), paddingVertical: space(2.5), alignItems: 'center' },
    newRowLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
    sheetClose: { minHeight: space(11), alignItems: 'center', justifyContent: 'center' },
  });
