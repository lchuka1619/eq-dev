# Codex Task — Context-to-Mastery Flagship Journey

- **Status:** Proposed
- **Implementation:** Not started
- **Product owner:** EQ Dev product lead
- **Prerequisite:** Draft PR #1 (`agent/connected-rehearsal-auth`) product acceptance, release checks, and merge
- **Target implementation branch:** `agent/context-to-mastery`
- **Canonical path after merge:** `docs/CODEX_TASK_CONTEXT_TO_MASTERY.md`
- **Updated:** 2026-07-24

## 1. Product decision

EQ Dev is not a lesson library, generic chatbot, or collection of unrelated EQ exercises.

> EQ Dev is a solo-first social flight simulator: it turns one real communication situation into a safe, short rehearsal loop, then helps the user repeat the same skill across controlled variations until it becomes more stable.

This milestone must make one flagship journey coherent from personal context to demonstrated progress. Do not add another large feature area.

### Flagship user

A user who finds work events, group conversations, or important people difficult; is safer practising alone first; and may abandon the product if pushed into a real meeting, crowd, or public-speaking task too early.

### Flagship skill

**Ярианд тайван нэгдэх** (`calm_thread_entry`)

The user:

1. connects to what was already said;
2. adds one clear thought;
3. leaves room for the other person to continue.

Past Repair, Future Rehearsal, and Daily Skill Loop must all be able to train this same skill through a shared practice engine.

## 2. Product outcome

At the end of this milestone, a user can:

1. enter through `/today`;
2. receive one recommended next practice;
3. describe a past moment or future situation in under two minutes, or choose a context-light Daily loop;
4. see their own context reflected recognisably in the scene;
5. answer with text or the existing supported voice path;
6. receive one evidence-based strength and one improvement;
7. retry the exact improvement;
8. practise a small controlled variation;
9. see progress based on skill evidence, support level, variant stability, and later-day confirmation—not XP alone;
10. pause, level down, skip, or finish safely without penalty.

The user should feel: **“This practice is about my situation, and I know the one thing I am improving.”**

## 3. Current product gap

The branch from PR #1 provides the public landing, practice app shell, Today router, Past Event prototype, variation/mastery structure, connected rehearsal, and real-life bridge.

The remaining product problems are:

- `/today` recommends one task but still exposes multiple feature cards, weakening focus;
- Past Event facts and conclusions do not materially shape the following rehearsal;
- Future Rehearsal does not capture a specific future event, person, feared moment, or intended opening;
- feedback is largely heuristic and is not reliably tied to the target skill;
- mastery can advance from completion signals without sufficient evidence that the user used the target skill;
- progress mixes XP, sessions, old modules, and mastery without a clear learning story;
- hard-coded “AI observed” language can imply evaluation that did not occur.

This is a coherence and learning-quality milestone, not a visual redesign.

## 4. Canonical end-to-end flow

```text
/today
→ short readiness check or resumed recommendation
→ one recommended route
   ├─ Past Event Repair
   ├─ Future Rehearsal
   └─ Daily Skill Loop
→ context capture
→ target skill confirmation
→ scene brief + safety controls
→ user response
→ rubric evidence
→ one strength + one improvement
→ focused retry
→ controlled variation
→ mastery decision
→ optional real-life bridge
→ later-day confirmation
```

### Global flow rules

- One screen has one primary action.
- The user can override a recommendation through a secondary `Өөр дасгал` action.
- Past Event Repair is always optional.
- A real-life task is always optional and has no streak penalty.
- No route should require authentication to begin local-first practice.
- Authentication and refresh must return the user to the current safe practice state.
- Do not expose clinical diagnosis, treatment, or forced-exposure language.

## 5. `/today` focus

The first mobile viewport must contain:

- a compact greeting/state;
- one recommended practice card;
- why it was recommended;
- estimated time;
- one primary CTA;
- one quiet secondary action: `Өөр дасгал`.

Move the current feature catalogue below `Өөр дасгал` or to an appropriate secondary route/sheet. Do not show five equal competing practice cards under the recommendation.

If a session is incomplete, `Үргэлжлүүлэх` takes precedence over a new recommendation.

## 6. Entry routes and context capture

Keep input short, editable, skippable, and usable with curated presets. Do not require a long journal entry.

### 6.1 Past Event Repair

Capture:

- event type or short label;
- one decisive moment;
- observable fact: what a camera could have seen or heard;
- conclusion left about self, others, or the future;
- desired next action: what the user would like to try next time;
- optional current intensity.

The product does not rewrite history or claim the conclusion is false. It separates observable events from interpretation and rehearses a usable next response.

The selected moment, fact, conclusion, and desired action must influence:

- scene opening;
- character cue;
- response frame;
- feedback wording where relevant;
- at least one controlled variation.

### 6.2 Future Rehearsal

Capture:

- event type;
- people or role types involved;
- feared or difficult moment;
- the first sentence/action the user wants available;
- target skill;
- optional expected intensity.

Avoid collecting unnecessary identifying details. Names must not be required.

The event, people, feared moment, and intended opening must be recognisable in the generated or curated scene. Opening a generic unrelated scenario does not satisfy this requirement.

### 6.3 Daily Skill Loop

Use when the user has no specific event to repair or prepare for.

- confirm one target skill;
- select a curated everyday context or reuse a safe saved context;
- start with minimal context capture;
- use the same practice, rubric, feedback, retry, and mastery engine as the other two routes.

## 7. Shared practice contract

Past, Future, and Daily must converge on one domain contract. Naming may follow existing repository conventions, but the product concepts must remain explicit.

```ts
type PracticeContext = {
  entryRoute: "past_repair" | "future_rehearsal" | "daily_skill_loop";
  eventType?: string;
  decisiveMoment?: string;
  observableFact?: string;
  conclusion?: string;
  desiredAction?: string;
  peopleOrRoles?: string[];
  fearedMoment?: string;
  intendedOpening?: string;
  intensity?: number;
};

type SkillCriterion = {
  id: string;
  label: string;
  evidence: "present" | "partial" | "missing" | "not_evaluable";
  evidenceText?: string;
};

type PracticeEvaluation = {
  validAttempt: boolean;
  criteria: SkillCriterion[];
  strength?: string;
  improvement?: string;
  retryPrompt?: string;
  source: "deterministic" | "ai" | "hybrid";
};
```

Do not require these exact types if equivalent contracts already exist. Avoid parallel duplicate mastery systems.

### Context use contract

It is not enough to store the context. Tests must prove that changing a meaningful context field changes an appropriate scene field while safety and target skill remain stable.

AI output must be structured, schema-validated, and have a curated local fallback. Never silently replace the user's facts with invented facts.

## 8. Skill rubric and valid attempts

For `calm_thread_entry`, evaluate:

| Criterion | Mongolian user-facing meaning |
|---|---|
| `links_to_thread` | Өмнөх яриатай нэг холбоос хийсэн |
| `adds_clear_point` | Нэг тодорхой санаа эсвэл туршлага нэмсэн |
| `leaves_room` | Нөгөө хүнд үргэлжлүүлэх орон зай үлдээсэн |

### Valid-attempt rules

- Blank input is not a valid attempt.
- Random, clearly unrelated, or placeholder text must not advance mastery.
- A short answer can be valid; length alone is not quality.
- Punctuation, question marks, and keyword presence alone are not sufficient evidence.
- Speech-to-text uncertainty must not be treated as user failure; allow correction or text fallback.
- If evaluation is unavailable, label the state honestly and use a conservative deterministic fallback. Do not display `AI ажигласан` unless AI evaluation actually ran successfully.

## 9. Feedback and focused retry

After a valid attempt, show only:

1. **one strength**, tied to observable response evidence;
2. **one improvement**, selected from the target-skill rubric;
3. **one example phrase**, presented as an option rather than the only correct answer;
4. one primary CTA to retry that improvement.

When the exact response text is available locally, feedback may quote only the smallest useful excerpt. When it is not available, describe the demonstrated behaviour without pretending to quote it.

The retry prompt must preserve the scene and explicitly focus on the selected improvement. After the retry, show whether that criterion changed. Do not introduce a second improvement in the same loop.

## 10. Controlled variation and difficulty

After the focused retry, change only one or two approved scene slots, such as:

- character role;
- opening wording;
- mild conversational friction;
- setting;
- amount of prompting.

Keep the target skill stable. Do not jump more than one support level.

Support levels:

- `guided`;
- `prompted`;
- `independent`;
- `light_surprise`.

### Light Surprise gate

`light_surprise` is available only when all are true:

- the user explicitly opts in;
- current intensity is below 8;
- no recent safe finish or abrupt exit indicates overload;
- at least two prompted variants show usable evidence on two of the three criteria;
- level-down, pause, and safe finish remain one action away.

Light Surprise must not contain humiliation, aggression, threats, diagnosis, or open-ended adversarial AI behaviour.

## 11. Mastery policy

Preserve the existing mastery stages where practical, but change progression so completion alone is insufficient.

Minimum product rules:

- no valid attempt → no mastery progression;
- valid but weak evidence → repeat or soften;
- evidence on at least two of three criteria across two controlled variants → may stabilise;
- at least one successful attempt without a hint is required before independent;
- a later-day confirmation is required before the skill is shown as stable across days;
- safe finish never removes earned progress;
- repeating the same completed day/session must not inflate streak, plan day, or mastery;
- one self-rating, completion count, or AI score must never independently unlock a higher difficulty.

Store enough evaluation evidence to explain the decision without storing raw audio by default.

## 12. Progress experience

The progress page should prioritise:

- target skill;
- current support level;
- criteria becoming stable;
- number of meaningfully different variants;
- whether the skill has been confirmed on another day;
- the next recommended practice.

XP and session count may remain secondary if already used, but must not imply mastery.

Example user-facing summary:

> Ярианд тайван нэгдэх · Prompted
> 2 өөр нөхцөлд давтсан · Дараагийн өдөр баталгаажуулаагүй
> Дараагийн алхам: асуултгүйгээр нөгөө хүнд орон зай үлдээж турших

## 13. Safety, privacy, and persistence

- Pause, hint, level down, skip, and safe finish remain accessible.
- Intensity 8–10 defaults to no surprise and no real-life bridge.
- Raw audio is not stored by default.
- Transcript and personal context are sensitive user data.
- Analytics must not contain raw fact, conclusion, feared moment, transcript, names, or audio.
- Manager or organisation views must not receive individual responses or reflections.
- Guest progress persists locally.
- Authenticated progress uses current local-first and Supabase merge semantics.
- Refresh, sign-in, sign-out, offline/retry, and cross-device restore must not duplicate a completion.
- Avoid a database migration if the current versioned progress payload can safely support the milestone. If a migration is genuinely required, stop after the audit and explain the data, RLS, rollback, and compatibility impact before implementing it.

## 14. Product analytics

Instrument the learning funnel using non-sensitive metadata:

- `today_recommendation_viewed`;
- `entry_route_selected`;
- `context_capture_completed` or `context_capture_skipped`;
- `practice_attempt_submitted`;
- `practice_attempt_validity`;
- `rubric_evaluated`;
- `focused_retry_started`;
- `focused_retry_completed`;
- `controlled_variant_started`;
- `mastery_decision`;
- `level_down_used`;
- `safe_finish_used`;
- `real_life_bridge_offered`;
- `later_day_confirmation`.

Useful dimensions include entry route, target skill ID, support level, variant ID, evaluation source, and criteria state. Do not log free text.

Primary product measures:

- context capture → first valid attempt;
- first feedback → focused retry;
- first variant → second controlled variant;
- percentage of attempts with evaluable skill evidence;
- later-day confirmation;
- safe finish without abrupt abandonment.

Analytics instrumentation is required; a production dashboard is not.

## 15. Implementation sequence

### Gate 0 — Baseline

Before feature changes:

- work from the accepted PR #1 baseline;
- inspect current branch, dirty worktree, `AGENTS.md`, routes, storage, Supabase, and test scripts;
- verify a fresh install is reproducible;
- resolve the known `package.json` / `package-lock.json` mismatch if still present;
- run baseline lint, TypeScript, unit tests, build, and relevant E2E tests;
- report any failure that is not caused by this task.

### Phase A — Focused Today entry

- reduce `/today` to one primary recommendation;
- preserve resume precedence;
- move alternative features behind `Өөр дасгал`;
- add mobile and keyboard acceptance coverage.

### Phase B — Context capture

- implement short Past and Future context flows;
- keep Daily context-light;
- persist resumable safe state;
- add validation and curated presets.

### Phase C — Shared scene context

- converge the three routes on one practice contract;
- demonstrate that user context changes scene content;
- retain deterministic fallback and safety rules.

### Phase D — Rubric, feedback, and retry

- evaluate the three criteria;
- reject invalid attempts from mastery;
- give one strength and one improvement;
- make retry target the same improvement.

### Phase E — Variation, mastery, and progress

- apply controlled variation;
- gate difficulty with rubric evidence and safety state;
- surface explainable mastery progress;
- protect against repeat inflation.

### Phase F — Persistence, analytics, and QA

- validate guest and cloud restore;
- instrument non-sensitive funnel events;
- complete mobile, auth, persistence, and learning-loop regression tests.

## 16. Acceptance criteria

The milestone is product-complete only when all are demonstrated:

1. `/today` has one primary recommended action in the first mobile viewport.
2. Incomplete practice resumes before a new recommendation.
3. Alternative practices are reachable but not presented as equal primary cards.
4. Past Repair and Future Rehearsal are visibly different context flows.
5. Daily Skill Loop can start without requiring a personal event.
6. A changed past decisive moment changes the subsequent scene appropriately.
7. A changed future feared moment or intended opening changes the subsequent scene appropriately.
8. The user's context appears recognisably without invented personal facts.
9. Past, Future, and Daily use one shared practice/evaluation/mastery path.
10. Blank, placeholder, and clearly unrelated responses do not advance mastery.
11. A meaningful short response can count; response length alone does not decide quality.
12. Feedback identifies one evidence-based strength and one rubric-based improvement.
13. The retry explicitly practises that same improvement.
14. A controlled variant changes no more than two approved slots and retains the target skill.
15. Light Surprise remains opt-in and respects evidence and safety gates.
16. Mastery cannot reach independent from completion or self-rating alone.
17. Cross-day stability requires a later-day confirmation.
18. Repeating one completed session does not inflate streak, plan day, or mastery.
19. Progress explains skill, support, variation, and cross-day state without equating XP to mastery.
20. Guest refresh and authenticated cross-device restore preserve the coherent state.
21. Login from an in-progress safe route returns to that route.
22. Raw audio remains local/not stored by default and analytics contain no sensitive free text.
23. iPhone-sized viewport has one obvious primary CTA and no bottom-nav overlap.
24. Pause, level down, skip, and safe finish remain accessible throughout practice.
25. AI-labelled feedback is shown only when validated AI evaluation actually succeeded.

## 17. Required tests

Use repository conventions and add coverage for:

- context-to-scene transformation;
- structured AI validation and deterministic fallback;
- rubric evidence for positive, partial, empty, and unrelated responses;
- feedback selecting only one improvement;
- retry retaining the improvement target;
- mastery decisions and cross-day gate;
- Light Surprise gate;
- repeat/streak/day inflation protection;
- guest persistence and Supabase merge/RLS regression;
- route/auth resume;
- mobile `/today` focus and bottom navigation;
- analytics redaction/no free-text payload.

Run and report:

- fresh `npm ci`;
- TypeScript check;
- lint;
- unit/integration tests;
- production build;
- relevant E2E/mobile flows;
- Supabase integration/RLS checks if available in the existing workflow.

Do not report checks as passed unless they were actually run.

## 18. Explicit non-goals

Do not add in this milestone:

- new Arena modes;
- multiple new journeys;
- 6–8 full scenes × three rich variants;
- manager workspace;
- team invitations or aggregate reporting;
- billing;
- multilingual support;
- white-label or multi-tenant roles;
- POV video, 360°, or VR implementation;
- a new design system;
- a production analytics dashboard;
- open-ended surprise generation;
- clinical assessment or therapy claims.

## 19. Codex working instructions

1. Start with a concise audit: current HEAD, dirty state, accepted baseline, current flow, reusable boundaries, persistence model, schema impact, and baseline checks.
2. If there is no blocking ambiguity, continue implementation after the audit.
3. Preserve unrelated user changes.
4. Prefer extending current domain contracts over creating duplicate engines.
5. Keep commits scoped and reviewable.
6. Do not merge to `main` or deploy production without explicit user approval.
7. At completion, report:
   - product outcome;
   - routes and flows changed;
   - how personal context affects scenes;
   - rubric and mastery behaviour;
   - persistence/privacy impact;
   - tests actually run;
   - screenshots or a short manual QA matrix for the flagship mobile flow;
   - remaining product risks.
