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
      const requested = path.normalize(decodeURIComponent(url.pathname));
      let filePath = path.resolve(EXPORT_DIR, `.${requested}`);
      // Reject a `..`-resolved path that escapes EXPORT_DIR instead of serving it.
      if (filePath !== EXPORT_DIR && !filePath.startsWith(EXPORT_DIR + path.sep)) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }
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
    // Loopback only: this dev-only harness has no reason to accept other machines' connections.
    server.listen(PORT, '127.0.0.1', () => resolve(server));
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
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });

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

  // 15. 내 루틴 (mine) tab, completely fresh: no favorites, no user routines beyond the
  // 새 루틴 만들기 affordance, and no history yet, so the big empty-state cat shows once
  // instead of three separate per-section empty lines (see mine.tsx's `allEmpty`).
  await page.getByRole('tab', { name: '내 루틴' }).click();
  await page.getByText('즐겨찾기를 누른 혈자리가 여기에 모여요.').waitFor();
  await page.getByText('오늘 탭에서 불편한 곳을 골라 보세요.').waitFor();
  await shoot(page, '15-mine-empty.png');
  await page.getByRole('tab', { name: '오늘' }).click();
  await search.waitFor();

  // 4. Search "잠이 안" (matches the 잠이 안 올 때 symptom)
  await search.fill('잠이 안');
  await page.getByText('잠이 안 올 때', { exact: true }).waitFor();
  await shoot(page, '04-search.png');

  // 5. Symptom detail for headache, found via its old disease-name alias (두통)
  await search.fill('두통');
  await page.getByText('머리가 아플 때', { exact: true }).waitFor();
  await page.getByText('머리가 아플 때', { exact: true }).click();
  await page.getByRole('button', { name: '시작' }).waitFor();
  await shoot(page, '05-symptom.png');

  // 6 (23). Guide, get-ready countdown ("곧 시작해요 N") before the first press. On by
  // default; 바로 시작 skips it immediately.
  await page.getByRole('button', { name: '시작' }).click();
  await page.waitForURL('**/guide/**');
  await page.getByRole('button', { name: '바로 시작' }).waitFor();
  await shoot(page, '23-guide-ready.png');

  // 6. Guide, first frame (press phase), with the 이전/재생/다음 controls row
  await page.getByRole('button', { name: '바로 시작' }).click();
  await shoot(page, '06-guide-press.png');

  // 7. Guide, a rest phase a few (sped-up) seconds in
  await page.waitForFunction(() => document.body.innerText.includes('잠시 떼세요'), null, { timeout: 10_000 });
  await shoot(page, '07-guide-rest.png');

  // 8. Done, after the routine finishes. Feedback is given here (rather than after the
  // shot) so 08-done.png also shows the post-feedback acknowledgement and the selected
  // option, and so Today's "나아졌어요를 N번 남겼어요" line below has something to show.
  await page.waitForURL('**/done**', { timeout: 60_000 });
  await page.getByRole('button', { name: '나아졌어요' }).click();
  await page.getByText('기록해 둘게요.').waitFor();
  await shoot(page, '08-done.png');

  // 9. Today again, showing the just-finished session as the recent row (with its
  // "다시 하기" affordance) and the resulting "나아졌어요를 1번 남겼어요" line.
  // The Today screen stayed mounted under the stack the whole time, so its search
  // field still holds "두통" from step 5 and hides the recent row until cleared.
  await page.getByRole('button', { name: '처음으로' }).click();
  await search.fill('');
  await page.getByText('나아졌어요를 1번 남겼어요').waitFor();
  await shoot(page, '09-today-after.png');

  // 10. Settings, opened from the Today header
  await page.getByRole('button', { name: '설정' }).click();
  await page.getByText('앱 정보').waitFor();
  await shoot(page, '10-settings.png');

  // 11. 내 루틴 (mine) tab, showing the just-finished session as a history row grouped
  // under "오늘" with its time, duration, and the "나아졌어요" feedback recorded in step 8.
  await page.getByRole('button', { name: '뒤로' }).click();
  await page.getByRole('tab', { name: '내 루틴' }).click();
  await page.getByText('나아졌어요', { exact: true }).waitFor();
  await shoot(page, '11-mine.png');

  // 12. 찾아보기 (browse) tab, front-side body map with its region rows below
  await page.getByRole('tab', { name: '찾아보기' }).click();
  await page.getByText('손 · 혈자리 5곳', { exact: true }).waitFor();
  await shoot(page, '12-browse.png');

  // 13. Region detail for 손, listing acupoints from both linked plates
  // (손목 안쪽 and 손등)
  await page.getByText('손 · 혈자리 5곳', { exact: true }).click();
  await page.getByText('합곡', { exact: true }).waitFor();
  await shoot(page, '13-region-hand.png');

  // 14. Acupoint detail for 합곡, including its routines, pregnancy caution, and the
  // favorite toggle turned on (top right, next to 뒤로)
  await page.getByText('합곡', { exact: true }).click();
  await page.getByText('이 혈자리를 쓰는 루틴').waitFor();
  await page.getByRole('button', { name: '즐겨찾기에 추가' }).click();
  await page.getByRole('button', { name: '즐겨찾기에서 빼기' }).waitFor();
  await shoot(page, '14-acupoint-hapgok.png');

  // 15-16. A new routine, named and given two acupoints through the picker. 내 루틴's own
  // 새 루틴 만들기 row leads here too (see step 15's empty-state shot above); this deep-links
  // directly instead, since that row isn't otherwise needed on screen for this shot.
  await page.goto(`http://127.0.0.1:${PORT}/routine/new`, { waitUntil: 'load' });
  await page.getByText('새 루틴').waitFor();
  await page.getByPlaceholder('루틴 이름').fill('아침 루틴');

  await page.getByRole('button', { name: '혈자리 추가' }).click();
  await page.getByText('혈자리 고르기').waitFor();
  await page.getByRole('button', { name: /^합곡,/ }).click();
  await page.getByText('합곡').first().waitFor();

  await page.getByRole('button', { name: '혈자리 추가' }).click();
  await page.getByText('혈자리 고르기').waitFor();
  await page.getByRole('button', { name: /^내관,/ }).click();
  await page.getByText('내관').first().waitFor();
  await shoot(page, '16-routine-editor.png');

  // 17. The picker again, this time with a search typed, showing the filtered result
  await page.getByRole('button', { name: '혈자리 추가' }).click();
  await page.getByText('혈자리 고르기').waitFor();
  const pickerSearch = page.getByPlaceholder('혈자리 이름, 한자, 영문');
  await pickerSearch.fill('족');
  await page.getByText('족삼리').waitFor();
  await shoot(page, '17-routine-picker.png');

  // 18. Save the routine (discarding the unpicked picker search above) and land on its
  // new preview: numbers, serif names, seconds, 시작/편집/지우기.
  await page.getByRole('button', { name: '뒤로' }).click();
  await page.getByRole('button', { name: '저장' }).click();
  await page.waitForURL('**/routine/**');
  await page.getByRole('button', { name: '시작' }).waitFor();
  await page.getByRole('button', { name: '지우기' }).waitFor();
  await shoot(page, '18-routine-preview.png');

  // 19. Acupoint detail for 족삼리, with the 루틴에 추가 sheet open: my routines (the one
  // just created, above) with step counts, and 새 루틴 만들기.
  await page.goto(`http://127.0.0.1:${PORT}/acupoint/ST36`, { waitUntil: 'load' });
  await page.getByText('족삼리').first().waitFor();
  await page.getByRole('button', { name: '루틴에 추가' }).click();
  await page.getByRole('button', { name: '새 루틴 만들기' }).waitFor();
  await page.getByText('아침 루틴').waitFor();
  await shoot(page, '19-add-to-routine.png');

  // 20. 내 루틴 tab, fully populated: 합곡 favorited (step 14), 아침 루틴 created and now
  // holding all three added acupoints (steps 16-19), and the finished headache routine
  // from step 8 still in 지난 기록.
  await page.goto(`http://127.0.0.1:${PORT}/mine`, { waitUntil: 'load' });
  await page.getByText('아침 루틴').waitFor();
  await page.getByText('합곡', { exact: true }).waitFor();
  await page.getByText('나아졌어요', { exact: true }).waitFor();
  await shoot(page, '20-mine-full.png');

  // 21. Settings, scrolled to the 알림 section: the daily-reminder switch, off and disabled on
  // web (with its "이 기기에서는 알림을 쓸 수 없어요." note). The time/minute/routine rows
  // stay collapsed while off, keeping the section short instead of showing every routine.
  await page.goto(`http://127.0.0.1:${PORT}/settings`, { waitUntil: 'load' });
  await page.getByText('이 기기에서는 알림을 쓸 수 없어요.').waitFor();
  await page.getByText('이 기기에서는 알림을 쓸 수 없어요.').scrollIntoViewIfNeeded();
  await shoot(page, '21-settings-reminder.png');

  // 24. Guide with two rounds, via a direct '?rounds=2' link (Task 4's repeat picker isn't
  // built yet). 다음 (skips ahead a point at a time, no waiting on the timer) is pressed
  // until the round indicator crosses into "2회차 / 2".
  await page.goto(`http://127.0.0.1:${PORT}/guide/headache?rounds=2`, { waitUntil: 'load' });
  const readyButton = page.getByRole('button', { name: '바로 시작' });
  if (await readyButton.isVisible().catch(() => false)) await readyButton.click();
  for (let presses = 0; presses < 20; presses++) {
    if (await page.getByText('2회차 / 2', { exact: true }).isVisible().catch(() => false)) break;
    await page.getByRole('button', { name: '다음' }).click();
  }
  await page.getByText('2회차 / 2', { exact: true }).waitFor();
  await shoot(page, '24-guide-round.png');
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
