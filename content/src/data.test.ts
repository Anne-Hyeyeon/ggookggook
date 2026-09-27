import { describe, expect, it } from 'vitest';
import { loadRawContent } from './paths';
import { validateContent } from './validate';

describe('content/data', () => {
  it('has no validation errors', async () => {
    const issues = validateContent(await loadRawContent(), { release: false });
    expect(issues.filter((issue) => issue.level === 'error')).toEqual([]);
  });

  it('keeps every routine usable in pregnancy mode', async () => {
    const issues = validateContent(await loadRawContent(), { release: false });
    expect(issues.filter((issue) => issue.message.includes('pregnancy mode'))).toEqual([]);
  });
});
