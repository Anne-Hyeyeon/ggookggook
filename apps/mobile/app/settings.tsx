import { PRESS_SECONDS_MAX, PRESS_SECONDS_MIN, REST_SECONDS_MAX, REST_SECONDS_MIN } from '@ggookggook/shared';
import Constants from 'expo-constants';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { content } from '@/content';
import { useDb } from '@/db/DbProvider';
import { DISCLAIMER_NOTICES } from '@/disclaimers';
import { useSettings } from '@/state/settings';
import { colors, fonts, space } from '@/theme';
import { BackLink } from '@/ui/BackLink';
import { Rule } from '@/ui/Rule';
import { Txt } from '@/ui/Txt';

export default function SettingsScreen() {
  const db = useDb();
  const { settings, update } = useSettings();
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const apply = useCallback(
    (patch: Partial<typeof settings>) => {
      setSaveError(false);
      update(db, patch).catch((error: unknown) => {
        console.error('Failed to save a setting', error);
        setSaveError(true);
      });
    },
    [db, update],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <BackLink />
        <Txt variant="title">설정</Txt>
        {saveError && (
          <Txt variant="sub" style={styles.error}>
            저장하지 못했어요. 다시 눌러 주세요.
          </Txt>
        )}

        <View>
          <Rule />
          <SwitchRow
            label="리듬 진동"
            value={settings.rhythmHaptics}
            onValueChange={(value) => apply({ rhythmHaptics: value })}
          />
          <Rule />
          <StepperRow
            label="누르는 시간"
            value={settings.pressSeconds}
            min={PRESS_SECONDS_MIN}
            max={PRESS_SECONDS_MAX}
            onChange={(value) => apply({ pressSeconds: value })}
          />
          <Rule />
          <StepperRow
            label="쉬는 시간"
            value={settings.restSeconds}
            min={REST_SECONDS_MIN}
            max={REST_SECONDS_MAX}
            onChange={(value) => apply({ restSeconds: value })}
          />
          <Rule />
          <SwitchRow
            label="임신 중이에요"
            sub="켜면 임신 중 피해야 할 혈자리를 빼고 안내해요."
            value={settings.pregnancyMode}
            onValueChange={(value) => apply({ pregnancyMode: value })}
          />
          <Rule />
          <Pressable accessibilityRole="button" onPress={() => setNoticesOpen((open) => !open)} style={styles.row}>
            <Txt variant="body">안내 다시 보기</Txt>
          </Pressable>
          {noticesOpen && (
            <View style={styles.notices}>
              {DISCLAIMER_NOTICES.map((notice) => (
                <Txt key={notice} variant="sub" style={styles.notice}>
                  {notice}
                </Txt>
              ))}
            </View>
          )}
          <Rule />
          <View style={styles.row}>
            <Txt variant="body">앱 정보</Txt>
            <Txt variant="sub">{`버전 ${Constants.expoConfig?.version ?? '-'} · 콘텐츠 v${content.version}`}</Txt>
          </View>
          <Rule />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SwitchRowProps {
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function SwitchRow({ label, sub, value, onValueChange }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Txt variant="body">{label}</Txt>
        {sub && <Txt variant="sub">{sub}</Txt>}
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.rule }}
      />
    </View>
  );
}

interface StepperRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function StepperRow({ label, value, min, max, onChange }: StepperRowProps) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <View style={styles.row}>
      <Txt variant="body">{label}</Txt>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 줄이기`}
          accessibilityState={{ disabled: atMin }}
          disabled={atMin}
          hitSlop={8}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={({ pressed }) => [styles.stepButton, (pressed || atMin) && styles.stepButtonDim]}
        >
          <Txt style={styles.stepSymbol}>−</Txt>
        </Pressable>
        <Txt variant="body" style={styles.stepValue}>{`${value}초`}</Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 늘리기`}
          accessibilityState={{ disabled: atMax }}
          disabled={atMax}
          hitSlop={8}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={({ pressed }) => [styles.stepButton, (pressed || atMax) && styles.stepButtonDim]}
        >
          <Txt style={styles.stepSymbol}>+</Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space(5), gap: space(4), paddingBottom: space(10) },
  error: { color: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(4), gap: space(3) },
  rowText: { flex: 1, gap: space(1) },
  notices: { gap: space(3), paddingBottom: space(3) },
  notice: { paddingLeft: space(1) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDim: { opacity: 0.3 },
  stepSymbol: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  stepValue: { minWidth: 34, textAlign: 'center' },
});
