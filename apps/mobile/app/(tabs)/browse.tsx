import type { BodyMap, BodyMapId, Region } from '@ggookggook/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_REGION_HIT_SIZE, regionHitSizes } from '@/browseLayout';
import { content } from '@/content';
import { colors, fonts, space } from '@/theme';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

const MAP_ASPECT = 2 / 3; // width : height, matching the source drawing
// Caps the map's height so the region list's first row stays visible above the tab bar on a 390x844 screen.
const MAX_MAP_HEIGHT = 340;
const DOT_SIZE = 8;

function regionAcupointCount(mapId: BodyMapId, region: Region): number {
  return content
    .acupointsForRegion(mapId, region.id)
    .reduce((sum, group) => sum + group.acupoints.length, 0);
}

function BodyMapImage({ map, width, height }: { map: BodyMap; width: number; height: number }) {
  const image = content.image(map.id);
  const hitSizes = regionHitSizes(map.regions, width, height);
  return (
    <View style={[styles.mapFrame, { width, height }]}>
      {image !== null && (
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityIgnoresInvertColors />
      )}
      {map.regions.map((region) => {
        if (region.x === null || region.y === null) return null;
        // Fallback only satisfies noUncheckedIndexedAccess; a positioned region always has a size.
        const hitSize = hitSizes[region.id] ?? MAX_REGION_HIT_SIZE;
        const left = region.x * width - hitSize / 2;
        const top = region.y * height - hitSize / 2;
        return (
          <Pressable
            key={region.id}
            accessibilityRole="button"
            accessibilityLabel={region.name}
            onPress={() => router.push(`/region/${map.id}/${region.id}`)}
            style={[styles.hitArea, { left, top, width: hitSize, height: hitSize }]}
          >
            <View style={styles.dot} />
          </Pressable>
        );
      })}
    </View>
  );
}

function RegionRow({ mapId, region }: { mapId: BodyMapId; region: Region }) {
  const count = regionAcupointCount(mapId, region);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/region/${mapId}/${region.id}`)}
      style={styles.row}
    >
      <Txt style={styles.rowName}>{`${region.name} · 혈자리 ${count}곳`}</Txt>
    </Pressable>
  );
}

export default function BrowseScreen() {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const mapId: BodyMapId = side === 'front' ? 'body-front' : 'body-back';
  const map = content.map(mapId);

  const contentWidth = windowWidth - space(5) * 2;
  const maxMapHeight = Math.min(windowHeight * 0.42, MAX_MAP_HEIGHT);
  const mapHeight = Math.min(contentWidth / MAP_ASPECT, maxMapHeight);
  const mapWidth = mapHeight * MAP_ASPECT;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="title">찾아보기</Txt>
        <View accessibilityRole="tablist" style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: side === 'front' }}
            hitSlop={8}
            onPress={() => setSide('front')}
            style={styles.tabItem}
          >
            <Txt style={[styles.tabLabel, side === 'front' && styles.tabActive]}>앞면</Txt>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: side === 'back' }}
            hitSlop={8}
            onPress={() => setSide('back')}
            style={styles.tabItem}
          >
            <Txt style={[styles.tabLabel, side === 'back' && styles.tabActive]}>뒷면</Txt>
          </Pressable>
        </View>

        {side === 'front' && map ? (
          <BodyMapImage map={map} width={mapWidth} height={mapHeight} />
        ) : (
          <Txt variant="sub">{side === 'front' ? '앞면 그림은 준비 중이에요.' : '뒷면 그림은 준비 중이에요.'}</Txt>
        )}

        <View>
          {map?.regions.map((region) => (
            <View key={region.id}>
              <Rule />
              <RegionRow mapId={mapId} region={region} />
            </View>
          ))}
          <Rule />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(4), paddingBottom: space(10) },
  tabs: { flexDirection: 'row', gap: space(5) },
  tabItem: { paddingBottom: space(1.5) },
  tabLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.faint },
  tabActive: {
    fontFamily: fonts.bold,
    color: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    paddingBottom: space(0.5),
  },
  mapFrame: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
  },
  hitArea: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: colors.accent },
  row: { paddingVertical: space(3.5), minHeight: space(12), justifyContent: 'center' },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink },
});
