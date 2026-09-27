import { bodyMapIdSchema } from '@ggookggook/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { firstSentence } from '@/routine';
import { colors, fonts, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { PlateView } from '@/ui/PlateView';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export default function RegionScreen() {
  const { mapId: rawMapId, regionId } = useLocalSearchParams<{ mapId: string; regionId: string }>();
  const { width } = useWindowDimensions();
  const plateSize = Math.min(width - space(10), 280);

  const mapIdResult = bodyMapIdSchema.safeParse(rawMapId);
  const map = mapIdResult.success ? content.map(mapIdResult.data) : undefined;
  const region = map?.regions.find((candidate) => candidate.id === regionId);
  const groups = mapIdResult.success && region ? content.acupointsForRegion(mapIdResult.data, regionId) : [];

  if (!region) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <BackLink onPress={() => router.back()} />
          <Txt variant="body">찾을 수 없는 부위예요.</Txt>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackLink onPress={() => router.back()} />
        <Txt variant="title">{region.name}</Txt>

        {groups.map(({ plate, acupoints }) => {
          const image = content.image(plate.id);
          return (
            <View key={plate.id} style={styles.plateBlock}>
              <Txt variant="caption" style={styles.plateCaption}>{plate.name}</Txt>
              {image !== null && <PlateView view={{ plate, pins: plate.pins, image }} side="both" size={plateSize} />}
              <View>
                {acupoints.map((acupoint) => (
                  <View key={acupoint.id}>
                    <Rule />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/acupoint/${acupoint.id}`)}
                      style={styles.row}
                    >
                      <View style={styles.rowHead}>
                        <Txt variant="point" style={styles.pointName}>{acupoint.name.ko}</Txt>
                        <Txt variant="caption">{acupoint.name.hanja}</Txt>
                      </View>
                      <Txt variant="sub">{firstSentence(acupoint.location)}</Txt>
                    </Pressable>
                  </View>
                ))}
                <Rule />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(5), paddingBottom: space(8) },
  plateBlock: { gap: space(2) },
  plateCaption: { fontFamily: fonts.semibold, color: colors.sub },
  row: { gap: space(1), paddingVertical: space(3.5) },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: space(1.5) },
  pointName: { fontSize: 21, lineHeight: 28 },
});
