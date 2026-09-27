import { describe, expect, it } from 'vitest';
import { isAllowedHost } from './host';

describe('isAllowedHost', () => {
  it('accepts the loopback hosts on the pin tool port', () => {
    expect(isAllowedHost('127.0.0.1:4321')).toBe(true);
    expect(isAllowedHost('localhost:4321')).toBe(true);
  });

  it('rejects other hosts, ports, and a missing header', () => {
    expect(isAllowedHost('evil.example:4321')).toBe(false);
    expect(isAllowedHost('localhost')).toBe(false);
    expect(isAllowedHost('127.0.0.1:80')).toBe(false);
    expect(isAllowedHost(undefined)).toBe(false);
  });
});
