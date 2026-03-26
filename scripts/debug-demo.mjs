import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await sleep(1500);

  // Screenshot before click
  await page.screenshot({ path: "./demo/debug-1-before.png" });

  // Click on hand region
  const handRegion = page.locator("g[aria-label='Hands']");
  const handBox = await handRegion.boundingBox();
  console.log("Hand region box:", handBox);

  if (handBox) {
    await page.mouse.click(handBox.x + handBox.width / 2, handBox.y + handBox.height / 2);
  }
  await sleep(1500);

  // Screenshot after click
  await page.screenshot({ path: "./demo/debug-2-after-hand.png" });

  // Check what acupoint dots are visible
  const dots = page.locator("svg g[role='button']");
  const count = await dots.count();
  console.log("Acupoint dots visible:", count);
  for (let i = 0; i < count; i++) {
    const label = await dots.nth(i).getAttribute("aria-label");
    const box = await dots.nth(i).boundingBox();
    console.log(`  Dot ${i}: label="${label}", box=`, box);
  }

  await browser.close();
})();
