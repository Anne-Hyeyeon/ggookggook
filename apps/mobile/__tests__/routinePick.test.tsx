import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import PickAcupointScreen from '../app/routine/pick';
import { useFavorites } from '@/state/favorites';
import { useRoutineDraft } from '@/state/routineDraft';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useFavorites.setState({ loaded: true, ids: new Set() });
  useRoutineDraft.getState().startNew();
});

it('lists acupoints with no favorites section when there are no favorites', async () => {
  await render(<PickAcupointScreen />);
  expect(screen.queryByText('즐겨찾는 혈자리')).toBeNull();
  expect(screen.getByText('합곡')).toBeTruthy();
});

it('lists favorites first under 즐겨찾는 혈자리', async () => {
  useFavorites.setState({ ids: new Set(['ST36']) });
  await render(<PickAcupointScreen />);
  expect(screen.getByText('즐겨찾는 혈자리')).toBeTruthy();

  const rows = screen.getAllByRole('button').filter((row) => row.props.accessibilityLabel !== '뒤로');
  const rowNames = rows.map((row) => (row.props.accessibilityLabel as string).split(',')[0]);
  expect(rowNames[0]).toBe('족삼리');
  expect(rowNames.slice(1)).toContain('합곡');
});

it('searches by Korean name', async () => {
  await render(<PickAcupointScreen />);
  await fireEvent.changeText(screen.getByLabelText('혈자리 검색'), '합곡');
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.queryByText('족삼리')).toBeNull();
});

it('searches by hanja', async () => {
  await render(<PickAcupointScreen />);
  await fireEvent.changeText(screen.getByLabelText('혈자리 검색'), '合谷');
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.queryByText('족삼리')).toBeNull();
});

it('searches by the romanized name, case-insensitively', async () => {
  await render(<PickAcupointScreen />);
  await fireEvent.changeText(screen.getByLabelText('혈자리 검색'), 'hapgok');
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.queryByText('족삼리')).toBeNull();
});

it('shows an empty state when nothing matches', async () => {
  await render(<PickAcupointScreen />);
  await fireEvent.changeText(screen.getByLabelText('혈자리 검색'), '없는이름');
  expect(screen.getByText('찾는 혈자리가 없어요.')).toBeTruthy();
});

it('adds the tapped acupoint with its default seconds to the draft and goes back', async () => {
  await render(<PickAcupointScreen />);
  await fireEvent.press(screen.getByRole('button', { name: /^합곡,/ }));
  expect(useRoutineDraft.getState().draft.steps).toEqual([{ acupointId: 'LI4', seconds: 60 }]);
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('appends to an existing draft instead of replacing it', async () => {
  useRoutineDraft.getState().addAcupoint({ acupointId: 'PC6', seconds: 60 });
  await render(<PickAcupointScreen />);
  await fireEvent.press(screen.getByRole('button', { name: /^합곡,/ }));
  expect(useRoutineDraft.getState().draft.steps).toEqual([
    { acupointId: 'PC6', seconds: 60 },
    { acupointId: 'LI4', seconds: 60 },
  ]);
});

it('goes back without changing the draft from 뒤로', async () => {
  await render(<PickAcupointScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(useRoutineDraft.getState().draft.steps).toEqual([]);
});
