import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Smooth mouse move with easing
const smoothMove = async (page, x, y, duration = 400) => {
  const steps = Math.max(10, Math.round(duration / 16));
  const start = await page.evaluate(() => ({
    x: window.__cursorX ?? 195,
    y: window.__cursorY ?? 400,
  }));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut
    const cx = start.x + (x - start.x) * ease;
    const cy = start.y + (y - start.y) * ease;
    await page.mouse.move(cx, cy);
    await page.evaluate(
      ([px, py]) => {
        window.__cursorX = px;
        window.__cursorY = py;
        const dot = document.getElementById("touch-cursor");
        if (dot) {
          dot.style.left = px + "px";
          dot.style.top = py + "px";
        }
      },
      [cx, cy]
    );
    await sleep(16);
  }
};

// Tap with visible ripple effect
const tap = async (page, x, y) => {
  await smoothMove(page, x, y, 350);
  await sleep(100);
  // Show ripple
  await page.evaluate(
    ([px, py]) => {
      const ripple = document.getElementById("touch-ripple");
      const cursor = document.getElementById("touch-cursor");
      if (ripple) {
        ripple.style.left = px + "px";
        ripple.style.top = py + "px";
        ripple.style.opacity = "1";
        ripple.style.transform = "translate(-50%, -50%) scale(0)";
        ripple.offsetHeight; // force reflow
        ripple.style.transition = "transform 0.35s ease-out, opacity 0.35s ease-out";
        ripple.style.transform = "translate(-50%, -50%) scale(1)";
        ripple.style.opacity = "0";
      }
      if (cursor) {
        cursor.style.transform = "translate(-50%, -50%) scale(0.7)";
        setTimeout(() => {
          cursor.style.transform = "translate(-50%, -50%) scale(1)";
        }, 150);
      }
    },
    [x, y]
  );
  await page.mouse.click(x, y);
  await sleep(200);
};

// Tap on an element's center
const tapElement = async (page, locator) => {
  const box = await locator.boundingBox();
  if (!box) return;
  await tap(page, box.x + box.width / 2, box.y + box.height / 2);
};

// Inject touch cursor + ripple overlay
const injectTouchUI = async (page) => {
  await page.evaluate(() => {
    // Cursor dot
    const cursor = document.createElement("div");
    cursor.id = "touch-cursor";
    Object.assign(cursor.style, {
      position: "fixed",
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      background: "rgba(59, 130, 246, 0.35)",
      border: "2px solid rgba(59, 130, 246, 0.6)",
      transform: "translate(-50%, -50%) scale(1)",
      transition: "transform 0.15s ease, left 0.05s, top 0.05s",
      pointerEvents: "none",
      zIndex: "99999",
      left: "195px",
      top: "400px",
    });
    document.body.appendChild(cursor);
    window.__cursorX = 195;
    window.__cursorY = 400;

    // Ripple
    const ripple = document.createElement("div");
    ripple.id = "touch-ripple";
    Object.assign(ripple.style, {
      position: "fixed",
      width: "50px",
      height: "50px",
      borderRadius: "50%",
      background: "rgba(59, 130, 246, 0.2)",
      border: "1px solid rgba(59, 130, 246, 0.3)",
      transform: "translate(-50%, -50%) scale(0)",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "99998",
    });
    document.body.appendChild(ripple);
  });
};

// Slowly type text with visible cursor
const slowType = async (page, locator, text, charDelay = 200) => {
  await locator.click();
  await sleep(300);
  for (const char of text) {
    await locator.pressSequentially(char, { delay: 80 });
    await sleep(charDelay);
  }
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: {
      dir: "./demo",
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await sleep(800);
  await injectTouchUI(page);
  await sleep(1200);

  // ═══════════════════════════════════════════════
  // Scene 1: 인체 앞면 → 손 → 줌인 → 바텀시트
  // ═══════════════════════════════════════════════

  // Click left hand on the SVG to zoom in
  // Target the left hand path directly (first path child of hand group)
  const leftHandPath = page.locator("g#region-hand path").first();
  await tapElement(page, leftHandPath);
  await sleep(1800); // Wait for zoom animation

  // After zoom, acupoint dots appear. Click 합곡 (LI4)
  const heguDot = page.locator("g[aria-label='합곡']");
  await heguDot.waitFor({ state: "visible", timeout: 5000 });
  await sleep(400);
  await tapElement(page, heguDot);
  await sleep(800);

  // Wait for bottom sheet to open
  const dialog = page.locator("[role='dialog']");
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await sleep(1800);

  // Scroll the bottom sheet to show more content
  await dialog.evaluate((el) => {
    el.scrollTo({ top: 250, behavior: "smooth" });
  });
  await sleep(1800);
  await dialog.evaluate((el) => {
    el.scrollTo({ top: 0, behavior: "smooth" });
  });
  await sleep(1200);

  // Close bottom sheet
  await page.keyboard.press("Escape");
  await sleep(1200);

  // Zoom out
  const zoomOut = page.getByText("←").first();
  if (await zoomOut.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tapElement(page, zoomOut);
    await sleep(1200);
  }

  // ═══════════════════════════════════════════════
  // Scene 2: 증상 탭 → 급똥참기 → 세트 순회 + 타이머
  // ═══════════════════════════════════════════════

  const symptomTab = page.locator("button[role='tab']").nth(1);
  await tapElement(page, symptomTab);
  await sleep(1200);

  // Scroll down to find 급똥참기 chip if needed, then click it
  const urgentChip = page.getByText("급똥참기");
  await tapElement(page, urgentChip);
  await sleep(2200);

  // Bottom sheet opens with first acupoint in set
  // Scroll to show detail content
  await dialog.evaluate((el) => {
    el.scrollTo({ top: 150, behavior: "smooth" });
  });
  await sleep(1200);
  await dialog.evaluate((el) => {
    el.scrollTo({ top: 0, behavior: "smooth" });
  });
  await sleep(800);

  // Navigate to next acupoint in set
  const nextBtn = page.getByText("다음").first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tapElement(page, nextBtn);
    await sleep(2000);
  }

  // Quick timer test: start then pause
  const startBtn = page.getByText("시작").first();
  if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Scroll to timer area
    await dialog.evaluate((el) => {
      el.scrollTo({ top: 300, behavior: "smooth" });
    });
    await sleep(800);

    await tapElement(page, startBtn);
    await sleep(2500);

    const pauseBtn = page.getByText("일시정지").first();
    if (await pauseBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await tapElement(page, pauseBtn);
      await sleep(1000);
    }
  }

  // Close bottom sheet
  await page.keyboard.press("Escape");
  await sleep(1200);

  // ═══════════════════════════════════════════════
  // Scene 3: 검색 탭 → 합곡 입력
  // ═══════════════════════════════════════════════

  const searchTab = page.locator("button[role='tab']").nth(2);
  await tapElement(page, searchTab);
  await sleep(1000);

  // Type "합곡" slowly
  const searchInput = page.locator("input[type='text']");
  const inputBox = await searchInput.boundingBox();
  if (inputBox) {
    await tap(page, inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2);
  }
  await sleep(500);
  await slowType(page, searchInput, "합곡", 250);
  await sleep(1800);

  // Click the search result to open detail
  const resultCard = page.locator("[class*='flex flex-col gap-2'] > div").first();
  if (await resultCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tapElement(page, resultCard);
    await sleep(2500);
  }

  // Close bottom sheet
  await page.keyboard.press("Escape");
  await sleep(1000);

  // ═══════════════════════════════════════════════
  // Scene 4: 메인 복귀
  // ═══════════════════════════════════════════════

  const bodyTab = page.locator("button[role='tab']").first();
  await tapElement(page, bodyTab);
  await sleep(2500);

  // Hide cursor for final frame
  await page.evaluate(() => {
    const c = document.getElementById("touch-cursor");
    if (c) c.style.opacity = "0";
  });
  await sleep(1500);

  // ── Done ──
  await page.close();
  await context.close();
  await browser.close();

  console.log("✅ Demo video saved to ./demo/");
})();
