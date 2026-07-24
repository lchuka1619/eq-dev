import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Personal Practice route does not load the monolithic practice experience", async () => {
  const page = await readFile("app/(practice)/practice/personal/page.tsx", "utf8");
  const experience = await readFile(
    "components/personal-practice/personal-practice-experience.tsx",
    "utf8",
  );

  assert.match(page, /PersonalPracticeExperience/);
  assert.doesNotMatch(page, /components\/app\/practice-experience/);
  assert.doesNotMatch(experience, /components\/app\/practice-experience/);
  assert.match(experience, /PersonalPracticePilot/);
});

test("Roleplay route owns its interaction state outside the monolithic experience", async () => {
  const page = await readFile("app/(practice)/practice/roleplay/page.tsx", "utf8");
  const experience = await readFile(
    "components/practice/roleplay-practice-experience.tsx",
    "utf8",
  );

  assert.match(page, /RoleplayPracticeExperience/);
  assert.doesNotMatch(page, /components\/app\/practice-experience/);
  assert.doesNotMatch(experience, /components\/app\/practice-experience/);
  assert.match(experience, /setSelectedScenario/);
  assert.match(experience, /event\.key === "Escape"/);
});
