import { parseRounds } from './rounds';

it('defaults to 1 when missing', () => {
  expect(parseRounds(undefined)).toBe(1);
});

it('parses a valid value', () => {
  expect(parseRounds('3')).toBe(3);
});

it('clamps a value above the max down to 5', () => {
  expect(parseRounds('9')).toBe(5);
});

it('clamps a value below the min up to 1', () => {
  expect(parseRounds('0')).toBe(1);
  expect(parseRounds('-2')).toBe(1);
});

it('defaults to 1 for a non-numeric value', () => {
  expect(parseRounds('nope')).toBe(1);
});

it('rounds a fractional value to the nearest integer', () => {
  expect(parseRounds('2.6')).toBe(3);
});

it('takes the first value when the param repeats', () => {
  expect(parseRounds(['4', '2'])).toBe(4);
});
