import { readFile, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { sideSchema, type BodyMap, type Plate, type Side } from '@ggookggook/shared';
import { DATA_DIR, OUT_IMAGE_DIR, readJson } from '../../src/paths';
import { setPin, setRegionPosition } from '../../src/pins';
import { isAllowedHost, PORT } from './host';

const dataFile = (name: string) => path.join(DATA_DIR, name);
const writeJson = (name: string, value: unknown) => writeFile(dataFile(name), `${JSON.stringify(value, null, 2)}\n`);

async function readBody(req: IncomingMessage): Promise<{ x: number; y: number; side?: Side }> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { x?: unknown; y?: unknown; side?: unknown };
  if (typeof body.x !== 'number' || typeof body.y !== 'number') throw new Error('Body must be { x: number, y: number, side?: "left" | "right" }');
  if (body.side === undefined) return { x: body.x, y: body.y };
  const side = sideSchema.safeParse(body.side);
  if (!side.success) throw new Error('side must be "left" or "right"');
  return { x: body.x, y: body.y, side: side.data };
}

function send(res: ServerResponse, status: number, type: string, body: string | Buffer): void {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

createServer(async (req, res) => {
  if (!isAllowedHost(req.headers.host)) {
    send(res, 403, 'text/plain', 'Forbidden host');
    return;
  }
  try {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && parts.length === 0) {
      send(res, 200, 'text/html; charset=utf-8', await readFile(path.join(import.meta.dirname, 'index.html')));
    } else if (req.method === 'GET' && url.pathname === '/api/data') {
      const data = {
        acupoints: await readJson(dataFile('acupoints.json')),
        plates: await readJson(dataFile('plates.json')),
        maps: await readJson(dataFile('maps.json')),
      };
      send(res, 200, 'application/json', JSON.stringify(data));
    } else if (req.method === 'GET' && parts[0] === 'images' && parts.length === 2) {
      send(res, 200, 'image/webp', await readFile(path.join(OUT_IMAGE_DIR, path.basename(parts[1]!))));
    } else if (req.method === 'PUT' && parts[0] === 'api' && parts[1] === 'plates' && parts[3] === 'pins' && parts.length === 5) {
      const { x, y, side } = await readBody(req);
      const plates = (await readJson(dataFile('plates.json'))) as Plate[];
      await writeJson('plates.json', setPin(plates, parts[2]!, parts[4]!, x, y, side));
      send(res, 200, 'application/json', '{"ok":true}');
    } else if (req.method === 'PUT' && parts[0] === 'api' && parts[1] === 'maps' && parts[3] === 'regions' && parts.length === 5) {
      const { x, y } = await readBody(req);
      const maps = (await readJson(dataFile('maps.json'))) as BodyMap[];
      await writeJson('maps.json', setRegionPosition(maps, parts[2]!, parts[4]!, x, y));
      send(res, 200, 'application/json', '{"ok":true}');
    } else {
      send(res, 404, 'text/plain', 'Not found');
    }
  } catch (error) {
    send(res, 400, 'text/plain; charset=utf-8', error instanceof Error ? error.message : String(error));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Pin tool: http://127.0.0.1:${PORT}`));
