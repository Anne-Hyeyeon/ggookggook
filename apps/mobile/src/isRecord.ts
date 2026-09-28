// Narrows `unknown` to a plain object one can index into, replacing an `as Record<string,
// unknown>` assertion at each untrusted-data boundary (notification payloads, parsed JSON).
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
