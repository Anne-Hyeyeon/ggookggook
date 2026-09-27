import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { ROUTINE_DISCLAIMER } from '@/disclaimers';
import { routineSummary, sideLabel, visibleSteps } from '@/routine';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { PlateView } from '@/ui/PlateView';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export default function AcupointScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettings((state) => state.settings);
  const { width } = useWindowDimensions();
  const plateSize = Math.min(width - space(10), 280);
  const acupoint = content.acupoints.get(id);

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
      <ScrollView contentContainerStyle={styles.body}>
        <BackLink onPress={() => router.back()} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(5), paddingBottom: space(8) },
  head: { gap: space(1.5) },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space(1.5) },
  pointName: { fontSize: 27 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: space(2), marginBottom: space(1) },
  caution: { color: colors.accent },
  symptomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: space(11), paddingVertical: space(2.5) },
  symptomName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  symptomMinutes: { color: colors.accent },
});
