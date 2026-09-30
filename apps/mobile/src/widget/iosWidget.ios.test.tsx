import { createWidget } from 'expo-widgets';
import appJson from '../../app.json';
import { content } from '@/content';
import { darkColors, lightColors } from '@/theme';
import { IOS_WIDGET_NAME, iosWidgetProps, updateIosWidget } from './iosWidget.ios';
import { buildWidgetSnapshot, widgetTimelineDates } from './snapshot';

jest.mock('expo-widgets', () => ({
  createWidget: jest.fn(() => ({ updateTimeline: jest.fn() })),
}));

// Captured before any clearAllMocks: the module registers its layout once, at import.
const [registeredName, registeredLayout] = jest.mocked(createWidget).mock.calls[0] ?? [];
const registeredWidget = jest.mocked(createWidget).mock.results[0]?.value;

const NOW = new Date(2026, 9, 1, 15, 30);
const snapshot = buildWidgetSnapshot({
  now: NOW,
  symptoms: content.symptoms,
  usage: {},
  recentSession: {
    id: 's1',
    routine: { kind: 'user', routineId: 'r1' },
    startedAt: '2026-10-01T05:00:00.000Z',
    completedAt: '2026-10-01T05:04:00.000Z',
    durationSeconds: 240,
    feedback: null,
  },
  recentUserRoutine: {
    id: 'r1',
    name: '아침 루틴',
    steps: [],
    sourceSymptomId: null,
    repeat: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    deletedAt: null,
  },
});

interface Node {
  type: string;
  props: Record<string, unknown>;
}

const COMPONENTS = ['VStack', 'HStack', 'Text', 'Link', 'Spacer'] as const;
const MODIFIERS = ['containerBackground', 'font', 'foregroundStyle', 'lineLimit', 'widgetURL'] as const;

// The 'widget' directive turns the layout into source text that the widget extension evaluates
// with @expo/ui's components and modifiers as globals; this evaluates it the same way, with
// stand-ins that record what was rendered.
function evaluateLayout(): (props: unknown, environment: unknown) => unknown {
  if (typeof registeredLayout !== 'string') throw new Error('expected the babel widget plugin to serialize the layout');
  const jsx = (type: string, props: Record<string, unknown>): Node => ({ type, props });
  const modifier =
    (name: string) =>
    (...args: unknown[]) => ({ modifier: name, args });
  const factory = new Function('_jsx', '_jsxs', ...COMPONENTS, ...MODIFIERS, `return (${registeredLayout});`);
  return factory(jsx, jsx, ...COMPONENTS, ...MODIFIERS.map(modifier));
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

function flatten(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (!isNode(value)) return [];
  return [value, ...flatten(value.props.children)];
}

const render = (props: unknown, environment: Record<string, unknown>) =>
  flatten(evaluateLayout()(props, { widgetFamily: 'systemMedium', configuration: undefined, ...environment }));
const texts = (nodes: Node[]) => nodes.filter((node) => node.type === 'Text').map((node) => node.props.children);
const links = (nodes: Node[]) => nodes.filter((node) => node.type === 'Link').map((node) => node.props.destination);
const rootModifiers = (nodes: Node[]) => nodes[0]?.props.modifiers;

it('registers the layout under the name configured in app.json', () => {
  expect(registeredName).toBe(IOS_WIDGET_NAME);
  const plugin = appJson.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-widgets');
  expect(JSON.stringify(plugin)).toContain(`"name":"${IOS_WIDGET_NAME}"`);
});

it('passes theme tokens and copy through props, since the layout cannot import them', () => {
  expect(iosWidgetProps(snapshot)).toEqual({
    ...snapshot,
    light: { bg: lightColors.bg, ink: lightColors.ink, sub: lightColors.sub, accent: lightColors.accent, rule: lightColors.rule },
    dark: { bg: darkColors.bg, ink: darkColors.ink, sub: darkColors.sub, accent: darkColors.accent, rule: darkColors.rule },
    copy: { title: '꾹꾹', recentLabel: '다시 하기', suggestionLabel: '지금 해 보기' },
  });
});

it('schedules a week of timeline entries at the upcoming window starts, all with the same props', () => {
  updateIosWidget(snapshot, NOW);
  const props = iosWidgetProps(snapshot);
  expect(registeredWidget.updateTimeline).toHaveBeenCalledWith(widgetTimelineDates(NOW, snapshot, 7).map((date) => ({ date, props })));
});

describe('layout', () => {
  const props = iosWidgetProps(snapshot);

  it('shows the recent routine and the suggestion for the entry hour, each as a link', () => {
    const nodes = render(props, { date: new Date(2026, 9, 1, 15), colorScheme: 'light' });
    expect(texts(nodes)).toEqual(['꾹꾹', '다시 하기', '아침 루틴', '지금 해 보기', content.symptom('eye_fatigue')?.name]);
    expect(links(nodes)).toEqual(['ggookggook://routine/r1', 'ggookggook://symptom/eye_fatigue']);
  });

  it('picks the suggestion by the timeline entry date', () => {
    const nodes = render(props, { date: new Date(2026, 9, 2, 7), colorScheme: 'light' });
    expect(texts(nodes)).toContain(content.symptom('fatigue')?.name);
  });

  it('opens the recent routine when the small widget is tapped, or the suggestion when there is none', () => {
    const withRecent = render(props, { date: new Date(2026, 9, 1, 15), colorScheme: 'light' });
    expect(rootModifiers(withRecent)).toContainEqual({ modifier: 'widgetURL', args: ['ggookggook://routine/r1'] });
    const withoutRecent = render({ ...props, recent: null }, { date: new Date(2026, 9, 1, 15), colorScheme: 'light' });
    expect(texts(withoutRecent)).toEqual(['꾹꾹', '지금 해 보기', content.symptom('eye_fatigue')?.name]);
    expect(rootModifiers(withoutRecent)).toContainEqual({ modifier: 'widgetURL', args: ['ggookggook://symptom/eye_fatigue'] });
  });

  it('uses the light or dark tokens by the widget color scheme', () => {
    const light = render(props, { date: new Date(2026, 9, 1, 15), colorScheme: 'light' });
    expect(rootModifiers(light)).toContainEqual({ modifier: 'containerBackground', args: [lightColors.bg, 'widget'] });
    const dark = render(props, { date: new Date(2026, 9, 1, 15), colorScheme: 'dark' });
    expect(rootModifiers(dark)).toContainEqual({ modifier: 'containerBackground', args: [darkColors.bg, 'widget'] });
  });

  it('renders an empty placeholder before any props have been synced', () => {
    expect(render(undefined, { date: new Date(2026, 9, 1, 15) })).toEqual([{ type: 'Spacer', props: {} }]);
  });
});
