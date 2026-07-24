import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const port = 3017;
const baseUrl = `http://127.0.0.1:${port}`;
const chromePath = process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "/usr/bin/google-chrome";

async function waitForServer(url, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Production server did not start within ${timeoutMs}ms`);
}

test("three stable Guided repetitions progress the UI to Prompted on mobile", {
  timeout: 60_000,
}, async () => {
  const server = spawn(process.execPath, [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
  ], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore",
  });
  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      localStorage.setItem("hariltsaa-onboarding-skipped-v1", "1");
      localStorage.setItem("eq-personal-practice-pilot-v1", JSON.stringify({
        journeyId: "00000000-0000-4000-8000-000000000017",
        targetSkillId: "idea-entry.clear-contribution.v1",
        stage: "guided",
        repair: null,
        attempts: [],
        bridgeAccepted: null,
      }));
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Pilot дасгал эхлэх" }).click();
    await page.getByRole("button", { name: "Алгасаад үргэлжлүүлэх" }).click();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.getByLabel("Таны хэлэх хариулт").fill(
        `Таны хэлсэнтэй холбоод ${attempt}-р санаа нэмье. Эхлээд жижиг туршилт хийж болох уу?`,
      );
      await page.getByRole("button", { name: "Давталтыг дуусгах" }).click();
      if (attempt < 3) {
        await page.getByRole("button", { name: "Өөр жижиг хувилбараар давтах" }).click();
      }
    }

    await assert.doesNotReject(() =>
      page.getByText("Дараагийн шат: Prompted.").waitFor({ state: "visible" }),
    );
    await page.getByRole("button", { name: "Өөр жижиг хувилбараар давтах" }).click();
    await assert.doesNotReject(() =>
      page.getByText("Prompted rehearsal").waitFor({ state: "visible" }),
    );

    const layout = await page.evaluate(() => {
      window.scrollTo(1000, window.scrollY);
      return {
        horizontalScroll: window.scrollX,
        pilotLabel: document.querySelector("#personal-practice-pilot")?.getAttribute("aria-labelledby"),
      };
    });
    assert.equal(layout.horizontalScroll, 0);
    assert.equal(layout.pilotLabel, "personal-pilot-title");
  } finally {
    await browser?.close();
    server.kill();
  }
});
