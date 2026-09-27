#!/usr/bin/env node
// Web preview harness for visual QA (dev-only).
//
// Exports the app for web in dev mode (so EXPO_PUBLIC_GUIDE_SPEED is honored, see
// src/config/env.ts), serves the export locally, and drives it with Playwright to
// capture a deterministic set of screenshots into .superpowers/screens/.
//
// This never touches native builds: web support is Metro/Expo's own web target,
// and the only web-only addition is metro.config.js registering `wasm` as an asset
// extension so expo-sqlite's wa-sqlite.wasm resolves (native platforms never hit
// that import path).
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const MOBILE_DIR = path.resolve(import.meta.dirname, '..');
const EXPORT_DIR = path.join(MOBILE_DIR, 'dist');
const OUT_DIR = path.resolve(MOBILE_DIR, '../../.superpowers/screens');
const PORT = 4590;
// Matches the speed used by the project's Maestro e2e flow (see AGENTS.md) so the
// headache routine (~4 simulated minutes) finishes in a few seconds of real time.
const GUIDE_SPEED = process.env.SCREENSHOT_GUIDE_SPEED ?? '10';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function exportWeb() {
  console.log(`[screens] exporting web build (dev mode, EXPO_PUBLIC_GUIDE_SPEED=${GUIDE_SPEED})...`);
  execFileSync(
    'npx',
    ['expo', 'export', '--platform', 'web', '--dev', '--clear', '--output-dir', 'dist'],
    {
      cwd: MOBILE_DIR,
      stdio: 'inherit',
      env: { ...process.env, EXPO_PUBLIC_GUIDE_SPEED: GUIDE_SPEED },
    },
  );
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let filePath = path.join(EXPORT_DIR, decodeURIComponent(url.pathname));
      try {
        const s = await stat(filePath);
        if (s.isDirectory()) filePath = path.join(filePath, 'index.html');
      } catch {
        // SPA fallback: expo-router handles client-side routing for any unknown path.
        filePath = path.join(EXPORT_DIR, 'index.html');
      }
      const data = await readFile(filePath);
      const ext = path.extname(filePath);
      // expo-sqlite's web support documents these as required for its SharedArrayBuffer-
      // based sync path; the app here only calls the async APIs, which don't need them,
      // but they're harmless (everything is same-origin) so we set them to match the docs.
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
      res.end(data);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });
  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

async function withFontsReady(page) {
  await page.evaluate(() => document.fonts.ready);
}

async function shoot(page, name) {
  await withFontsReady(page);
  await page.screenshot({ path: path.join(OUT_DIR, name) });
  console.log(`[screens] wrote ${name}`);
}

async function runFlow(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });

  // 1. Welcome, step 1 (intro)
  await page.getByRole('button', { name: '다음' }).waitFor();
  await shoot(page, '01-welcome.png');

  // 2. Welcome, step 2 (disclaimer)
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '확인했어요' }).waitFor();
  await shoot(page, '02-disclaimer.png');

  // 3. Today
  await page.getByRole('button', { name: '확인했어요' }).click();
  const search = page.getByPlaceholder('증상이나 혈자리 이름');
  await search.waitFor();
  await shoot(page, '03-today.png');

  // 4. Search "잠이 안" (matches the 불면 symptom)
  await search.fill('잠이 안');
  await page.getByText('불면', { exact: true }).waitFor();
  await shoot(page, '04-search.png');

  // 5. Symptom detail for headache (두통)
  await search.fill('두통');
  await page.getByText('두통', { exact: true }).waitFor();
  await page.getByText('두통', { exact: true }).click();
  await page.getByRole('button', { name: '시작' }).waitFor();
  await shoot(page, '05-symptom.png');

  // 6. Guide, first frame (press phase)
  await page.getByRole('button', { name: '시작' }).click();
  await page.waitForURL('**/guide/**');
  await shoot(page, '06-guide-press.png');

  // 7. Guide, a rest phase a few (sped-up) seconds in
  await page.waitForFunction(() => document.body.innerText.includes('잠시 떼세요'), null, { timeout: 10_000 });
  await shoot(page, '07-guide-rest.png');

  // 8. Done, after the routine finishes
  await page.waitForURL('**/done**', { timeout: 60_000 });
  await shoot(page, '08-done.png');

  // 9. Today again, showing the just-finished session as the recent row.
  // The Today screen stayed mounted under the stack the whole time, so its search
  // field still holds "두통" from step 5 and hides the recent row until cleared.
  await page.getByRole('button', { name: '처음으로' }).click();
  await search.fill('');
  await page.getByText('최근', { exact: false }).waitFor();
  await shoot(page, '09-today-after.png');
}

async function main() {
  await rm(EXPORT_DIR, { recursive: true, force: true });
  exportWeb();
  await mkdir(OUT_DIR, { recursive: true });

  const server = await startServer();
  const browser = await chromium.launch();
  try {
    // Fresh, isolated storage (OPFS/IndexedDB/localStorage) per run: a new context
    // gets its own ephemeral profile, so every run starts at the welcome screen.
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    // expo-keep-awake's web Wake Lock request never resolves under headless/automated
    // Chromium, which otherwise surfaces as an "Uncaught Error" dev overlay covering
    // the done screen when the guide screen unmounts. This stub is scoped to this
    // script only; it does not change app code or native behavior.
    await context.addInitScript(() => {
      if (window.navigator.wakeLock) {
        window.navigator.wakeLock.request = async () => ({
          released: false,
          type: 'screen',
          release() {
            this.released = true;
          },
          addEventListener() {},
          removeEventListener() {},
        });
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    await runFlow(page);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log(`[screens] done. Screenshots in ${OUT_DIR}`);
}

await main();
