import { searchAcupoints, type Acupoint } from '@ggookggook/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { firstSentence } from '@/routine';
import { useFavorites } from '@/state/favorites';
import { useRoutineDraft } from '@/state/routineDraft';
import { colors, fonts, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export default function PickAcupointScreen() {
  const [query, setQuery] = useState('');
  const favoriteIds = useFavorites((state) => state.ids);
  const addAcupoint = useRoutineDraft((state) => state.addAcupoint);

  const allAcupoints = useMemo(() => [...content.acupoints.values()], []);
  const results = useMemo(() => searchAcupoints(allAcupoints, query), [allAcupoints, query]);
  const favorites = results.filter((acupoint) => favoriteIds.has(acupoint.id));
  const others = results.filter((acupoint) => !favoriteIds.has(acupoint.id));

  const handlePick = (acupoint: Acupoint) => {
    addAcupoint({ acupointId: acupoint.id, seconds: acupoint.defaultSeconds });
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <BackLink onPress={() => router.back()} />
        <Txt variant="title">혈자리 고르기</Txt>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="혈자리 이름, 한자, 영문"
          placeholderTextColor={colors.faint}
          returnKeyType="search"
          accessibilityLabel="혈자리 검색"
          style={styles.search}
        />

        {results.length === 0 && <Txt variant="sub" style={styles.empty}>찾는 혈자리가 없어요.</Txt>}

        {favorites.length > 0 && (
          <View>
            <Txt variant="sub" style={styles.sectionLabel}>즐겨찾는 혈자리</Txt>
            {favorites.map((acupoint) => (
              <AcupointRow key={acupoint.id} acupoint={acupoint} onPress={() => handlePick(acupoint)} />
            ))}
          </View>
        )}

        {others.length > 0 && (
          <View>
            {favorites.length > 0 && <Txt variant="sub" style={styles.sectionLabel}>모든 혈자리</Txt>}
            {others.map((acupoint) => (
              <AcupointRow key={acupoint.id} acupoint={acupoint} onPress={() => handlePick(acupoint)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AcupointRow({ acupoint, onPress }: { acupoint: Acupoint; onPress: () => void }) {
  return (
    <View>
      <Rule />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${acupoint.name.ko}, ${firstSentence(acupoint.location)}`}
        onPress={onPress}
        style={styles.row}
      >
        <View style={styles.rowHead}>
          <Txt variant="point" style={styles.pointName}>{acupoint.name.ko}</Txt>
          <Txt variant="caption">{acupoint.name.hanja}</Txt>
          <Txt variant="caption">{acupoint.name.en}</Txt>
        </View>
        <Txt variant="sub">{firstSentence(acupoint.location)}</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(4), paddingBottom: space(10) },
  search: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    paddingVertical: space(2),
  },
  empty: { paddingVertical: space(4), textAlign: 'center' },
  sectionLabel: { paddingBottom: space(1) },
  row: { gap: space(1), paddingVertical: space(3.5), minHeight: space(11) },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space(1.5) },
  pointName: { fontSize: 21, lineHeight: 28 },
});
