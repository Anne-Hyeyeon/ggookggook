import { listImageIds, loadRawContent } from '../paths';
import { validateContent } from '../validate';

const release = process.argv.includes('--release');
const issues = validateContent(await loadRawContent(), { release, imageIds: await listImageIds() });

for (const issue of issues) {
  console.log(`${issue.level === 'error' ? 'ERROR' : 'warn '} ${issue.message}`);
}
const errorCount = issues.filter((issue) => issue.level === 'error').length;
console.log(`${errorCount} error(s), ${issues.length - errorCount} warning(s)${release ? ' [release]' : ''}`);
process.exitCode = errorCount > 0 ? 1 : 0;
