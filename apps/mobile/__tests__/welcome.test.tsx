import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import WelcomeScreen from '../app/welcome';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));

const update = jest.fn().mockResolvedValue(undefined);
const accept = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: null, update, accept });
});

it('walks through the intro, pregnancy toggle, and disclaimer', async () => {
  await render(<WelcomeScreen />);
  expect(screen.getByText('꾹꾹')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '다음' }));

  expect(screen.getByText('시작하기 전에 확인해 주세요')).toBeTruthy();
  await fireEvent(screen.getByRole('switch'), 'valueChange', true);
  expect(update).toHaveBeenCalledWith({}, { pregnancyMode: true });

  await fireEvent.press(screen.getByRole('button', { name: '확인했어요' }));
  expect(accept).toHaveBeenCalledWith({});
});

it('shows an inline message and keeps the button usable when accepting fails', async () => {
  accept.mockRejectedValueOnce(new Error('write failed'));
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await render(<WelcomeScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '다음' }));
  await fireEvent.press(screen.getByRole('button', { name: '확인했어요' }));

  expect(await screen.findByText('저장하지 못했어요. 다시 눌러 주세요.')).toBeTruthy();

  accept.mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('button', { name: '확인했어요' }));
  expect(accept).toHaveBeenCalledTimes(2);

  errorSpy.mockRestore();
});
