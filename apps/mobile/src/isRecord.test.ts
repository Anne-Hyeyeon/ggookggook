import { isRecord } from './isRecord';

it.each([
  ['a plain object', {}, true],
  ['an object with keys', { a: 1 }, true],
  ['null', null, false],
  ['undefined', undefined, false],
  ['a string', 'x', false],
  ['a number', 1, false],
  ['an array', [1, 2], true],
])('%s -> %s', (_label, value, expected) => {
  expect(isRecord(value)).toBe(expected);
});
