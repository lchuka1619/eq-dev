import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.VISUAL_REVIEW_URL ?? "http://localhost:3000";
const chromePath = process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "/usr/bin/google-chrome";
const outputDir = ".artifacts/visual-review";

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript(() => {
      localStorage.setItem("hariltsaa-onboarding-skipped-v1", "1");
    });

    for (const route of ["/", "/today", "/journey", "/progress", "/profile"]) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const slug = route === "/" ? "landing" : route.slice(1);
      await page.screenshot({
        path: `${outputDir}/${viewport.name}-${slug}.png`,
        fullPage: true,
      });
      const diagnostics = await page.evaluate(() => {
        const nav = document.querySelector(".mobile-app-nav")?.getBoundingClientRect();
        const main = document.querySelector("main")?.getBoundingClientRect();
        return {
          title: document.title,
          horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
          mobileNavVisible: nav ? getComputedStyle(document.querySelector(".mobile-app-nav")).display !== "none" : false,
          mainBottomBehindNav: nav && main ? Math.max(0, main.bottom - nav.top) : 0,
          activeRoutes: Array.from(document.querySelectorAll('[aria-current="page"]')).map((item) => item.getAttribute("href")),
        };
      });
      console.log(JSON.stringify({ viewport: viewport.name, route, ...diagnostics }));
    }
    await page.close();
  }
} finally {
  await browser.close();
}
