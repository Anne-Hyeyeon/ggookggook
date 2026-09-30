import { getValue } from '@ggookggook/store';
import {
  FlexWidget,
  requestWidgetUpdate,
  TextWidget,
  type ColorProp,
  type WidgetRepresentation,
  type WidgetTaskHandler,
} from 'react-native-android-widget';
import { openAppDatabase } from '@/db/open';
import { darkColors, lightColors } from '@/theme';
import { WIDGET_COPY } from './copy';
import { parseWidgetSnapshot, suggestionAt, type WidgetEntry, type WidgetSnapshot } from './snapshot';
import { WIDGET_SNAPSHOT_KEY } from './storage';

// Must match the widget `name` in app.json's react-native-android-widget plugin config.
export const ANDROID_WIDGET_NAME = 'GgookWidget';

type WidgetColors = typeof lightColors | typeof darkColors;

interface WidgetRowProps {
  label: string;
  labelColor: ColorProp;
  item: WidgetEntry;
  colors: WidgetColors;
}

function WidgetRow({ label, labelColor, item, colors }: WidgetRowProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: item.url }}
      accessibilityLabel={`${label} ${item.title}`}
      style={{ width: 'match_parent', flexDirection: 'column', paddingVertical: 4 }}
    >
      <TextWidget text={label} style={{ fontSize: 11, fontWeight: '600', color: labelColor }} />
      <TextWidget text={item.title} maxLines={1} truncate="END" style={{ fontSize: 14, fontWeight: '600', color: colors.ink }} />
    </FlexWidget>
  );
}

interface GgookWidgetProps {
  snapshot: WidgetSnapshot | null;
  hour: number;
  colors: WidgetColors;
}

export function GgookWidget({ snapshot, hour, colors }: GgookWidgetProps) {
  const recent = snapshot?.recent ?? null;
  const suggestion = snapshot ? suggestionAt(snapshot, hour) : null;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: colors.bg,
        borderRadius: 4,
        padding: 14,
      }}
    >
      <TextWidget text={WIDGET_COPY.title} style={{ fontSize: 17, fontWeight: '700', color: colors.ink }} />
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
        {recent ? <WidgetRow label={WIDGET_COPY.recentLabel} labelColor={colors.accent} item={recent} colors={colors} /> : null}
        {suggestion ? <WidgetRow label={WIDGET_COPY.suggestionLabel} labelColor={colors.sub} item={suggestion} colors={colors} /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderAndroidWidget(snapshot: WidgetSnapshot | null, now: Date): WidgetRepresentation {
  const hour = now.getHours();
  return {
    light: <GgookWidget snapshot={snapshot} hour={hour} colors={lightColors} />,
    dark: <GgookWidget snapshot={snapshot} hour={hour} colors={darkColors} />,
  };
}

export async function updateAndroidWidget(snapshot: WidgetSnapshot, now: Date): Promise<void> {
  await requestWidgetUpdate({ widgetName: ANDROID_WIDGET_NAME, renderWidget: () => renderAndroidWidget(snapshot, now) });
}

async function loadStoredSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const db = await openAppDatabase();
    return parseWidgetSnapshot(await getValue(db, WIDGET_SNAPSHOT_KEY));
  } catch (error) {
    console.error('Failed to read the widget snapshot', error);
    return null;
  }
}

// Runs headless (no React tree, possibly with the app closed) whenever the launcher adds,
// resizes, or periodically refreshes the widget: it re-reads the last synced snapshot and
// picks the suggestion for the current hour, so the widget keeps up without the app open.
export const androidWidgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED') {
    renderWidget(renderAndroidWidget(await loadStoredSnapshot(), new Date()));
  }
};
