import * as store from '@ggookggook/store';
import type { ReactElement } from 'react';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { content } from '@/content';
import { darkColors, lightColors } from '@/theme';
import { androidWidgetTaskHandler, ANDROID_WIDGET_NAME, GgookWidget, renderAndroidWidget, updateAndroidWidget } from './androidWidget.android';
import { buildWidgetSnapshot } from './snapshot';
import { WIDGET_SNAPSHOT_KEY } from './storage';
import appJson from '../../app.json';

jest.mock('react-native-android-widget', () => ({
  FlexWidget: () => null,
  TextWidget: () => null,
  requestWidgetUpdate: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@ggookggook/store', () => ({ getValue: jest.fn() }));
const mockDb = {};
jest.mock('@/db/open', () => ({ openAppDatabase: jest.fn(() => Promise.resolve(mockDb)) }));

const NOW = new Date(2026, 9, 1, 15, 30);
const snapshot = buildWidgetSnapshot({
  now: NOW,
  symptoms: content.symptoms,
  usage: {},
  recentSession: {
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: '2026-10-01T05:00:00.000Z',
    completedAt: '2026-10-01T05:04:00.000Z',
    durationSeconds: 240,
    feedback: null,
  },
  recentUserRoutine: null,
});

interface Node {
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'props' in value && 'type' in value;
}

// Expands function components other than the library's leaf widgets, then collects every
// element in the tree, so assertions can look at the rendered widget without a native host.
function flatten(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (!isNode(value)) return [];
  if (typeof value.type === 'function' && value.type.name !== 'FlexWidget' && value.type.name !== 'TextWidget') {
    return flatten(value.type(value.props));
  }
  return [value, ...flatten(value.props.children)];
}

const texts = (element: ReactElement) => flatten(element).flatMap((node) => (typeof node.props.text === 'string' ? [node.props.text] : []));
const links = (element: ReactElement) =>
  flatten(element).flatMap((node) => (node.props.clickAction === 'OPEN_URI' ? [node.props.clickActionData] : []));

function lightOf(representation: unknown): Node {
  if (typeof representation === 'object' && representation !== null && 'light' in representation && isNode(representation.light)) {
    return representation.light;
  }
  throw new Error('expected a light/dark pair');
}

function firstArg(mock: jest.Mock): unknown {
  const call = mock.mock.calls[0];
  if (!call) throw new Error('expected a call');
  return call[0];
}

it('matches the widget name registered in app.json', () => {
  const plugin = appJson.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'react-native-android-widget');
  expect(JSON.stringify(plugin)).toContain(`"name":"${ANDROID_WIDGET_NAME}"`);
});

it('shows the title, the recent routine, and the suggestion for the current hour, each linking to its preview', () => {
  const element = <GgookWidget snapshot={snapshot} hour={15} colors={lightColors} />;
  expect(texts(element)).toEqual(['꾹꾹', '다시 하기', content.symptom('headache')?.name, '지금 해 보기', content.symptom('eye_fatigue')?.name]);
  expect(links(element)).toEqual([{ uri: 'ggookggook://symptom/headache' }, { uri: 'ggookggook://symptom/eye_fatigue' }]);
});

it('shows only the suggestion when there is no recent routine', () => {
  const element = <GgookWidget snapshot={{ ...snapshot, recent: null }} hour={7} colors={lightColors} />;
  expect(texts(element)).toEqual(['꾹꾹', '지금 해 보기', content.symptom('fatigue')?.name]);
});

it('shows just the title before any snapshot has been synced', () => {
  expect(texts(<GgookWidget snapshot={null} hour={7} colors={lightColors} />)).toEqual(['꾹꾹']);
});

it('renders a light and a dark variant from the theme tokens', () => {
  const representation = renderAndroidWidget(snapshot, NOW);
  expect('dark' in representation && representation.dark?.props).toEqual(expect.objectContaining({ colors: darkColors, hour: 15 }));
  expect(lightOf(representation).props).toEqual(expect.objectContaining({ colors: lightColors, snapshot }));
});

it('requests an update of the named widget with the rendered snapshot', async () => {
  await updateAndroidWidget(snapshot, NOW);
  expect(requestWidgetUpdate).toHaveBeenCalledWith(expect.objectContaining({ widgetName: ANDROID_WIDGET_NAME }));
  const call = jest.mocked(requestWidgetUpdate).mock.calls[0];
  if (!call) throw new Error('expected a call');
  const { renderWidget } = call[0];
  expect(renderWidget({ widgetName: ANDROID_WIDGET_NAME, widgetId: 1, width: 1, height: 1, screenInfo: { screenHeightDp: 1, screenWidthDp: 1, density: 1, densityDpi: 1 } })).toEqual(renderAndroidWidget(snapshot, NOW));
});

describe('androidWidgetTaskHandler', () => {
  const run = async (widgetAction: WidgetTaskHandlerProps['widgetAction']) => {
    const renderWidget = jest.fn();
    await androidWidgetTaskHandler({
      widgetAction,
      renderWidget,
      widgetInfo: { widgetName: ANDROID_WIDGET_NAME, widgetId: 1, width: 1, height: 1, screenInfo: { screenHeightDp: 1, screenWidthDp: 1, density: 1, densityDpi: 1 } },
    });
    return renderWidget;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each(['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED'] as const)('re-renders from the stored snapshot on %s', async (action) => {
    jest.mocked(store.getValue).mockResolvedValue(JSON.stringify(snapshot));
    const renderWidget = await run(action);
    expect(store.getValue).toHaveBeenCalledWith(mockDb, WIDGET_SNAPSHOT_KEY);
    expect(lightOf(firstArg(renderWidget)).props).toEqual(expect.objectContaining({ snapshot }));
  });

  it('renders the empty widget when the stored snapshot cannot be read', async () => {
    jest.mocked(store.getValue).mockRejectedValue(new Error('no table'));
    const renderWidget = await run('WIDGET_UPDATE');
    expect(lightOf(firstArg(renderWidget)).props).toEqual(expect.objectContaining({ snapshot: null }));
    expect(console.error).toHaveBeenCalled();
  });

  it('does not render on delete or click (links open through OPEN_URI natively)', async () => {
    expect(await run('WIDGET_DELETED')).not.toHaveBeenCalled();
    expect(await run('WIDGET_CLICK')).not.toHaveBeenCalled();
  });
});
