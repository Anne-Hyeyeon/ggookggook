import { HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { WIDGET_COPY } from '@/widget/copy';
import { WIDGET_PALETTES, type WidgetPalette } from '@/widget/palette';
import { widgetTimelineDates, type WidgetSnapshot } from '@/widget/snapshot';

// Must match the widget `name` in app.json's expo-widgets plugin config.
export const IOS_WIDGET_NAME = 'GgookWidget';

// WidgetKit replays these entries (.atEnd), so a week keeps suggestions rotating between app opens.
const TIMELINE_DAYS = 7;

export interface IosWidgetProps extends WidgetSnapshot {
  light: WidgetPalette;
  dark: WidgetPalette;
  copy: typeof WIDGET_COPY;
}

// Serialized by the 'widget' directive into the extension's runtime, so it sees only its arguments (not module scope).
function GgookWidget(props: IosWidgetProps, environment: WidgetEnvironment) {
  'widget';
  if (!props || !props.light || !props.copy) {
    return <Spacer />;
  }
  const colors = environment.colorScheme === 'dark' ? props.dark : props.light;
  const hour = environment.date.getHours();
  const suggestion = props.suggestions.find((item) => hour >= item.fromHour && hour < item.toHour) ?? null;
  const recent = props.recent;
  const primaryUrl = recent ? recent.url : suggestion ? suggestion.url : null;
  const rootModifiers = [containerBackground(colors.bg, 'widget')];
  if (primaryUrl) rootModifiers.push(widgetURL(primaryUrl));
  return (
    <HStack modifiers={rootModifiers}>
      <VStack alignment="leading" spacing={10}>
        <Text modifiers={[font({ size: 17, weight: 'bold', design: 'serif' }), foregroundStyle(colors.ink)]}>{props.copy.title}</Text>
        <Spacer />
        {recent ? (
          <Link destination={recent.url}>
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(colors.accent)]}>{props.copy.recentLabel}</Text>
              <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(colors.ink), lineLimit(1)]}>{recent.title}</Text>
            </VStack>
          </Link>
        ) : null}
        {suggestion ? (
          <Link destination={suggestion.url}>
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(colors.sub)]}>{props.copy.suggestionLabel}</Text>
              <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(colors.ink), lineLimit(1)]}>{suggestion.title}</Text>
            </VStack>
          </Link>
        ) : null}
      </VStack>
      <Spacer />
    </HStack>
  );
}

const widget = createWidget<IosWidgetProps>(IOS_WIDGET_NAME, GgookWidget);

export function iosWidgetProps(snapshot: WidgetSnapshot): IosWidgetProps {
  return { ...snapshot, light: WIDGET_PALETTES.light, dark: WIDGET_PALETTES.dark, copy: WIDGET_COPY };
}

export function updateIosWidget(snapshot: WidgetSnapshot, now: Date): void {
  const props = iosWidgetProps(snapshot);
  widget.updateTimeline(widgetTimelineDates(now, snapshot, TIMELINE_DAYS).map((date) => ({ date, props })));
}
