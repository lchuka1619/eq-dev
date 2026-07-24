import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const chromePath = process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "/usr/bin/google-chrome";

test("three stable Guided repetitions across dates progress the UI to Prompted on mobile", {
  timeout: 90_000,
}, async () => {
  const server = await createServer({
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });
  let browser;
  try {
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      localStorage.setItem("hariltsaa-onboarding-skipped-v1", "1");
      localStorage.setItem("eq-today-practice-router-v1", JSON.stringify({
        readiness: {
          accumulatedIntensity: 7,
          upcomingEvent: true,
          availableEnergy: 5,
        },
        selectedRoute: "past_repair",
      }));
      localStorage.setItem("eq-personal-practice-pilot-v1", JSON.stringify({
        journeyId: "00000000-0000-4000-8000-000000000017",
        targetSkillId: "idea-entry.clear-contribution.v1",
        stage: "guided",
        repair: null,
        attempts: [
          {
            id: "prior-a",
            stage: "guided",
            completed: true,
            safeFinished: false,
            usedHint: false,
            anxietyBefore: 5,
            anxietyAfter: 4,
            variation: { id: "prior-variant-a" },
            response: "",
            reflection: "",
            decision: "repeat",
            completedAt: "2026-07-22T10:00:00.000Z",
          },
          {
            id: "prior-b",
            stage: "guided",
            completed: true,
            safeFinished: false,
            usedHint: false,
            anxietyBefore: 5,
            anxietyAfter: 4,
            variation: { id: "prior-variant-b" },
            response: "",
            reflection: "",
            decision: "repeat",
            completedAt: "2026-07-23T10:00:00.000Z",
          },
        ],
        bridgeAccepted: null,
        surpriseOptIn: false,
      }));
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Нэг өмнөх мөчийг аюулгүй засварлах" }).waitFor();
    await page.getByRole("button", { name: "Past Event Repair эхлэх" }).click();
    await page.getByRole("button", { name: "Алгасаад үргэлжлүүлэх" }).click();
    await page.getByRole("img", { name: /Тайван хурлын өрөөнд/ }).waitFor();
    await page.getByRole("button", { name: "Орчны дууг сонсох" }).waitFor();
    await page.getByRole("button", { name: "Энэ нөхцөлөөр үргэлжлүүлэх" }).click();

    await page.getByLabel("Таны хэлэх хариулт").fill(
      "Таны хэлсэнтэй холбоод нэг санаа нэмье. Эхлээд жижиг туршилт хийж болох уу?",
    );
    await page.getByRole("button", { name: "Давталтыг дуусгах" }).click();
    await page.getByText("Сайн болсон").waitFor();
    await page.getByText("Нэг сайжруулалт").waitFor();

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
    await server.close();
  }
});
