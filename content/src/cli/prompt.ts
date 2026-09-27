import type { BodyMap, Plate } from '@ggookggook/shared';
import { canvasKindFor } from '../images';
import { loadRawContent } from '../paths';
import { buildPrompt } from '../prompt';

const id = process.argv[2];
const raw = await loadRawContent();
const items = [...(raw.plates as Plate[]), ...(raw.maps as BodyMap[])];

if (!id) {
  console.log(items.map((item) => `${item.id}  ${item.name}`).join('\n'));
} else {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    console.error(`Unknown plate or map: ${id}`);
    process.exitCode = 1;
  } else {
    console.log(buildPrompt(item.subject, canvasKindFor(item.id)));
  }
}
