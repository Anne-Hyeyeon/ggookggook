import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import SymptomScreen from '../app/symptom/[id]';
import { useSettings } from '@/state/settings';

let mockParams: { id: string } = { id: 'headache' };
jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({ saveUserRoutine: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'headache' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
});

it('shows the routine, the pregnancy caution, and when to see a doctor', async () => {
  await render(<SymptomScreen />);
  expect(screen.getByText('머리가 아플 때')).toBeTruthy();
  expect(screen.queryByText('두통')).toBeNull();
  expect(screen.getByText('3곳 · 약 4분')).toBeTruthy();
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('임신 중이면 합곡은 누르지 마세요.')).toBeTruthy();
  expect(screen.getByText('이럴 땐 병원에 가세요')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '시작' }));
  expect(router.push).toHaveBeenCalledWith('/guide/headache');
});

it('leaves out contraindicated points in pregnancy mode and says so', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  await render(<SymptomScreen />);
  expect(screen.queryByText('합곡')).toBeNull();
  expect(screen.getByText('임신 중이라 합곡은 뺐어요.')).toBeTruthy();
  expect(screen.getByText('2곳 · 약 2분')).toBeTruthy();
});

it('handles an unknown symptom', async () => {
  mockParams = { id: 'nope' };
  await render(<SymptomScreen />);
  expect(screen.getByText('찾을 수 없는 증상이에요.')).toBeTruthy();
});

describe('내 루틴으로 복사', () => {
  it('copies the full, unfiltered symptom steps and opens the new routine editor', async () => {
    mocked.saveUserRoutine.mockResolvedValue(undefined);
    // Pregnancy mode hides LI4 on screen, but the copy still gets all 3 steps: filtering
    // is re-applied wherever the resulting user routine is shown or run, not baked in here.
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
    await render(<SymptomScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '내 루틴으로 복사' }));

    expect(mocked.saveUserRoutine).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        name: '머리가 아플 때',
        steps: [
          { acupointId: 'LI4', seconds: 60 },
          { acupointId: 'EX-HN5', seconds: 60 },
          { acupointId: 'GB20', seconds: 60 },
        ],
        sourceSymptomId: 'headache',
        deletedAt: null,
      }),
      expect.any(Date),
    );
    const savedId = (mocked.saveUserRoutine.mock.calls[0]?.[1] as { id: string }).id;
    // The preview is pushed first so the editor has one underneath it: its own 뒤로/저장
    // then lands back on this new routine's preview, never on this symptom screen.
    expect(router.push).toHaveBeenNthCalledWith(1, `/routine/${savedId}`);
    expect(router.push).toHaveBeenNthCalledWith(2, `/routine/${savedId}/edit`);
  });

  it('copies only once when double-tapped before the first copy settles', async () => {
    let resolveSave: (() => void) | undefined;
    mocked.saveUserRoutine.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = () => resolve(undefined);
      }),
    );
    await render(<SymptomScreen />);

    const copyButton = screen.getByRole('button', { name: '내 루틴으로 복사' });
    await act(async () => {
      copyButton.props.onClick();
      copyButton.props.onClick();
    });
    await act(async () => {
      resolveSave?.();
    });

    expect(mocked.saveUserRoutine).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('shows an error and stays on the symptom when the copy fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.saveUserRoutine.mockRejectedValueOnce(new Error('write failed'));
    await render(<SymptomScreen />);
    await fireEvent.press(screen.getByRole('button', { name: '내 루틴으로 복사' }));

    expect(await screen.findByText('저장하지 못했어요. 다시 눌러 주세요.')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
