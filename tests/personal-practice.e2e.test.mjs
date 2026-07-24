import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const chromePath = process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "/usr/bin/google-chrome";

test("three stable Guided repetitions across dates progress the UI to Prompted on mobile", {
  timeout: 120_000,
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
      if (!localStorage.getItem("eq-today-practice-router-v1")) {
        localStorage.setItem("eq-today-practice-router-v1", JSON.stringify({
          readiness: {
            accumulatedIntensity: 7,
            upcomingEvent: true,
            availableEnergy: 5,
          },
          selectedRoute: "past_repair",
        }));
      }
      if (!localStorage.getItem("eq-personal-practice-pilot-v1")) {
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
      }
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Сонсож ойлгоод, тодорхой хариулъя" }).waitFor();
    assert.equal(await page.locator("#personal-practice-pilot").count(), 0);
    assert.equal(await page.locator("#arena").count(), 0);
    await page.getByRole("link", { name: "Дасгал эхлэх" }).click();
    await page.waitForURL(`${baseUrl}/today`);
    await page.getByRole("heading", { name: "Нэг өмнөх мөчийг аюулгүй засварлах" }).waitFor();
    const mobileOverlap = await page.evaluate(() => {
      const nav = document.querySelector(".mobile-app-nav")?.getBoundingClientRect();
      const card = document.querySelector(".today-router-card")?.getBoundingClientRect();
      return nav && card ? Math.max(0, card.bottom - nav.top) : null;
    });
    assert.equal(mobileOverlap, 0);
    assert.equal(await page.locator("#personal-practice-pilot").count(), 0);
    assert.equal(await page.locator("#arena").count(), 0);
    assert.equal(await page.locator("#voice-coach").count(), 0);
    assert.equal(await page.locator("#practice").count(), 0);
    assert.equal(await page.locator("#roleplay").count(), 0);
    const alternativePaths = [
      "/practice/personal",
      "/practice/arena",
      "/practice/voice",
      "/practice/daily",
      "/practice/roleplay",
    ];
    for (const path of alternativePaths) {
      assert.equal(await page.locator(`a[href="${path}"]`).count(), 0);
    }
    const libraryToggle = page.getByRole("button", { name: /Өөр дасгал/ });
    assert.equal(await libraryToggle.getAttribute("aria-expanded"), "false");
    await libraryToggle.focus();
    await page.keyboard.press("Enter");
    assert.equal(await libraryToggle.getAttribute("aria-expanded"), "true");
    for (const path of alternativePaths) {
      assert.equal(await page.locator(`a[href="${path}"]`).count(), 1);
    }
    await page.getByRole("link", { name: /Дүрд тоглох/ }).click();
    await page.waitForURL(`${baseUrl}/practice/roleplay`);
    await page.getByRole("heading", { name: "Хэлэхээсээ өмнө туршаад үз" }).waitFor();
    await page.getByRole("button", { name: /Санал зөрөлдөөнийг тайван шийдэх/ }).click();
    await page.getByRole("dialog", { name: "Санал зөрөлдөөнийг тайван шийдэх" }).waitFor();
    await page.getByRole("button", { name: /Яагаад бодитой биш/ }).click();
    await page.getByText("Сайн сонголт").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.getByRole("link", { name: "← Өнөөдөр" }).click();
    await page.waitForURL(`${baseUrl}/today`);
    await page.goto(`${baseUrl}/practice/personal?route=future_rehearsal`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Ойрын нөхцөлөө хоёр минутад бэлдэе" }).waitFor();
    await page.getByLabel(/Хамгийн хэцүү санагдаж буй мөч/).fill("Хоёр хүн зэрэг ярьсны дараа санаагаа оруулах");
    await page.getByLabel(/Бэлэн байлгах эхний өгүүлбэр/).fill("Таны хэлсэнтэй холбоод нэг санаа нэмье.");
    await page.getByRole("button", { name: "Хадгалахгүй үргэлжлүүлэх" }).click();
    await page.getByRole("img", { name: /Тайван хурлын өрөөнд/ }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("eq-personal-practice-pilot-v1")).context), null);
    await page.goto(`${baseUrl}/today`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Past Event Repair эхлэх" }).click();
    await page.waitForURL(`${baseUrl}/practice/personal?route=past_repair`);
    await page.getByRole("heading", { name: "Өмнөх эвентийн нэг жижиг мөчийг сонгоё" }).waitFor();
    await page.locator(".mobile-app-nav").getByRole("link", { name: "Өнөөдөр", exact: true }).click();
    await page.waitForURL(`${baseUrl}/today`);
    await page.getByRole("heading", { name: "Past Event Repair" }).waitFor();
    await page.getByRole("button", { name: /Үргэлжлүүлэх/ }).click();
    await page.waitForURL(`${baseUrl}/practice/personal?route=past_repair`);
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
    assert.equal(await page.locator(".mobile-app-nav").getByRole("link", { name: "Өнөөдөр", exact: true }).getAttribute("aria-current"), "page");

    await page.evaluate(() => {
      const practice = JSON.parse(localStorage.getItem("eq-personal-practice-pilot-v1"));
      practice.bridgeAccepted = true;
      practice.bridge = {
        id: "00000000-0000-4000-8000-000000000018",
        status: "accepted",
        offeredAt: "2026-07-23T10:00:00.000Z",
        respondedAt: "2026-07-23T10:01:00.000Z",
        didIt: null,
        intensityBefore: null,
        intensityAfter: null,
        reflection: "",
      };
      localStorage.setItem("eq-personal-practice-pilot-v1", JSON.stringify(practice));
      localStorage.setItem("hariltsaa-user-preferences-v1", JSON.stringify({
        primaryGoal: "work",
        primaryChallenge: "express",
        dailyMinutes: 10,
        onboardingCompletedAt: "2026-07-18T08:00:00.000Z",
      }));
      localStorage.setItem("hariltsaa-learning-plan-v1", JSON.stringify({
        id: "00000000-0000-4000-8000-000000000019",
        status: "active",
        startDate: "2026-07-18",
        currentDay: 7,
        days: Array.from({ length: 7 }, (_, index) => ({
          day: index + 1,
          lessonIndex: index % 5,
          title: `Day ${index + 1}`,
          reason: "Test",
          skill: "Тодорхой илэрхийлэх",
        })),
        completions: ["18", "19", "20", "21", "22", "23"].map((day, index) => ({
          day: index + 1,
          date: `2026-07-${day}`,
          skill: "Тодорхой илэрхийлэх",
          ratingBefore: 5,
          ratingAfter: 4,
        })),
      }));
      localStorage.removeItem("eq-connected-rehearsal-v1");
      localStorage.removeItem("eq-active-practice-v1");
    });
    await page.goto(`${baseUrl}/practice/personal`, { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Өмнөх жижиг алхмаа эргэн харах" }).click();
    await page.getByRole("button", { name: "Тийм", exact: true }).click();
    await page.getByLabel("Бодсоноос юу өөр байсан бэ?").fill("Бодсоноос тайван, богино байсан.");
    await page.getByRole("button", { name: "Reflection хадгалах" }).click();
    await page.getByRole("button", { name: "Day 7 Connected rehearsal" }).click();
    await page.getByRole("button", { name: "Connected rehearsal эхлэх" }).click();
    await page.getByRole("button", { name: "Ⅱ Pause" }).click();
    await page.getByRole("heading", { name: "Түр зогслоо" }).waitFor();
    await page.getByRole("button", { name: "Үргэлжлүүлэх", exact: true }).click();

    for (let index = 0; index < 7; index += 1) {
      if (index === 4) {
        await page.getByRole("button", { name: "◇ Recovery phrase ашиглах" }).click();
      } else {
        await page.getByLabel("Таны хариулт", { exact: true }).fill(`Хариулт ${index + 1}`);
      }
      await page.getByRole("button", {
        name: index === 6 ? "Rehearsal дуусгах" : "Дараагийн мөч",
      }).click();
    }

    await page.getByRole("heading", { name: "Connected rehearsal дууслаа." }).waitFor();
    await page.getByRole("button", { name: "Дуусгах", exact: true }).click();
    const saved = await page.evaluate(() => ({
      plan: JSON.parse(localStorage.getItem("hariltsaa-learning-plan-v1")),
      bridge: JSON.parse(localStorage.getItem("eq-personal-practice-pilot-v1")).bridge,
      connected: JSON.parse(localStorage.getItem("eq-connected-rehearsal-v1")),
    }));
    assert.equal(saved.plan.completions.length, 7);
    assert.equal(saved.plan.status, "completed");
    assert.equal(saved.bridge.status, "reflected");
    assert.equal(saved.bridge.didIt, true);
    assert.equal(saved.connected.status, "completed");
    assert.equal(saved.connected.completedMomentIds.length, 7);
    assert.equal(saved.connected.pauseCount, 1);
    assert.equal(saved.connected.usedRecovery, true);

    for (const destination of [
      { label: "Замнал", path: "/journey", heading: "Нэг чадварыг өдөр бүр бататга" },
      { label: "Ахиц", path: "/progress", heading: "Төгс биш, тогтвортой" },
      { label: "Профайл", path: "/profile", heading: "Таны account, таны хяналт" },
      { label: "Өнөөдөр", path: "/today", heading: "Нэг өмнөх мөчийг аюулгүй засварлах" },
    ]) {
      const navLink = page.locator(".mobile-app-nav").getByRole("link", { name: destination.label, exact: true });
      await navLink.click();
      await page.waitForURL(`${baseUrl}${destination.path}`);
      await page.getByRole("heading", { name: destination.heading }).waitFor();
      assert.equal(await navLink.getAttribute("aria-current"), "page");
    }

    await page.goto(`${baseUrl}/?code=invalid-oauth-code`, { waitUntil: "networkidle" });
    await page.getByRole("dialog", { name: "Ахицаа бүх төхөөрөмждөө хадгалах" }).waitFor();
    await page.getByText("Нэвтрэх session үүсгэж чадсангүй. Supabase Redirect URLs тохиргоог шалгаад дахин оролдоно уу.").waitFor();
    assert.equal(new URL(page.url()).pathname, "/today");
    assert.equal(new URL(page.url()).searchParams.has("code"), false);
    assert.equal(new URL(page.url()).searchParams.has("auth_error"), false);

    const externalResponse = await page.goto(`${baseUrl}/auth/callback?next=https://evil.example`, { waitUntil: "networkidle" });
    assert.ok(externalResponse);
    assert.equal(new URL(page.url()).origin, baseUrl);
    assert.equal(new URL(page.url()).pathname, "/today");
  } finally {
    await browser?.close();
    await server.close();
  }
});
