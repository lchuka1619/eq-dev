# Codex Implementation Plan — Past Event Repair + Varied Simulation

**Огноо:** 2026-07-24  
**Сүүлийн шинэчлэлт:** 2026-07-24 — flow router, mastery engine, immersive-ready contract  
**Зорилго:** Одоогийн Sprint 6-ийн 7 өдрийн хувийн замыг эвдэхгүйгээр нэг “Байгууллагын эвентэд тайван оролцох” pilot journey дээр Past Event Repair, controlled variation, graded media, optional real-life bridge-г ажиллуулах.

## 0. Codex-д өгөх үндсэн заавар

> Existing auth, local + Supabase progress, Today card, 7-day plan, streak protection, voice/text fallback, safety controls-ийг хадгал. Эхлээд repository-г inspect хийж бодит schema/component/API нэртэй нийцүүл. Том rewrite хийхгүй. Feature flag-ийн ард босоо slice байдлаар хэрэгжүүл. Raw audio default-аар бүү хадгал. Manager analytics-д transcript, exact response, fact/conclusion/reflection бүү гарга. Build, typecheck, lint, tests-ийг үе бүрийн төгсгөлд ажиллуул.

Feature flag:

```text
NEXT_PUBLIC_PAST_EVENT_PILOT=true
```

## 1. Эхлэхийн өмнөх repository audit

### Ажил

- `AGENTS.md`, README, package scripts, route structure, Supabase migrations шалгах.
- `app/page.tsx` дахь duplicate `voiceResponse` state асуудал байгаа эсэхийг батлах.
- Current Sprint 6 flow: onboarding → Today → practice → result → persistence-г map хийх.
- Existing analytics event helper, AI endpoint, STT/TTS wrapper, session schema-г тогтоох.
- Dirty working tree байвал user changes-г хадгалж, давхцах файлыг тэмдэглэх.

### Deliverable

- `docs/past-event-pilot-baseline.md`
- Өөрчлөх файлын бодит жагсаалт
- Existing test/build baseline result

### Gate

- Baseline build failure байвал эхлээд scope-д хамаарах blocker-ийг засна.
- Repo олдохгүй, branch/remote тодорхойгүй бол код бичихээс өмнө зогсоно.

## 2. Sprint 7A — Content contract ба deterministic variants

### Ажил

1. Type/schema нэмэх:
   - `PastEvent`
   - `PastEventMoment`
   - `SceneTemplate`
   - `SceneVariant`
   - `RealLifeBridge`
2. Curated seed content нэмэх:
   - ideation event-ийн 5 moment;
   - “Байгууллагын эвентэд тайван оролцох” 7 өдөр;
   - эхний 3 scene × 3 variant.
3. Seeded variant selector хийх:
   - нэг target skill;
   - шууд өмнөхтэй ижил combination давтахгүй;
   - difficulty нэг алхмаас илүү өсөхгүй;
   - intensity ≥ 8 бол `light_surprise` хориглоно.
4. JSON/schema validation ба local fallback нэмэх.
5. Renderer-agnostic scene contract:
   - scene logic-ийг text/voice UI-тай хатуу холбохгүй;
   - `DecisionMoment` ба `MediaAsset.renderer` metadata нэмэх;
   - pilot-д зөвхөн `text_voice`, `image_audio` ажиллана;
   - `pov_video`, `video_360`, `vr_interactive` enum/contract-аас цааш хэрэгжүүлэхгүй.

### Санал болгох бүтэц

```text
lib/past-event/types.ts
lib/past-event/schemas.ts
lib/past-event/variant-selector.ts
content/journeys/company-event.mn.json
content/past-events/ideation-day.mn.json
```

Repo-ийн бодит convention өөр бол түүнд нийцүүл.

### Tests

- Ижил seed → ижил variant.
- Өөр seed → зөвшөөрөгдсөн өөр variant.
- Immediate duplicate үүсэхгүй.
- Intensity 8–10 → surprise үүсэхгүй.
- Invalid AI/content JSON → local fallback.
- Ижил scene contract `text_voice` ба `image_audio` renderer дээр target skill/decision moment-оо хадгална.

### Done

- UI-гүйгээр content contract болон selector tests green.

## 3. Sprint 7B — Past Event Repair vertical slice

### Ажил

- Today/Day 1-ээс optional `ExperienceCheck` нээх.
- `PastEventMomentMap` дээр 5 seed moment харуулах.
- Нэг moment сонгох.
- `FactConclusionStep`:
  - preset + edit;
  - skip;
  - high-intensity safe exit.
- `RepairChoice`:
  - response;
  - recovery phrase;
  - small action.
- Сонгосон repair-ийг existing Arena voice/text loop-д нэг turn-аар оруулах.
- Result дээр balanced, non-clinical summary харуулах.

### UX copy constraints

- “Trauma онош”, “эмчилгээ”, “эдгэрүүлнэ” гэх claim хэрэглэхгүй.
- “Хуримтлагдсан таагүй туршлага”, “өмнөх үйл явдлын хамгаалах дохио” гэж нэрлэнэ.
- “Тайзан дээр гарсан нь оролцсон баримт” гэх мэт evidence-balanced copy хэрэглэнэ.
- Safe finish нь failure биш.

### Persistence

- Local-first draft.
- Auth хэрэглэгчид Supabase sync.
- Sensitive field-үүд private user scope.
- Refresh хийсний дараа selected moment ба step сэргээнэ.

### Tests

- Select → edit → save → resume.
- Skip path.
- Safe-finish path.
- Guest local persistence.
- Signed-in cloud restore.
- Manager-facing serialization-д sensitive field байхгүй.

### Done

- Хэрэглэгч нэг өмнөх мөчийг сонгож, fact/conclusion салгаж, нэг repair response давтаж, result хүрнэ.

## 4. Sprint 7C — Varied rehearsal

### Ажил

- Existing Arena state machine-д `variant_ready`, `variant_playing`, `variant_completed` төлөв нэмэх.
- Эхний 3 pilot scene:
  1. автобусанд суух;
  2. багийн ажиллагаанд бүтэц санал болгох;
  3. санаа давхцсан үед differentiate/synthesize хийх.
- Scene бүр:
  - Guided
  - Prompted
  - Light surprise
- Feedback: яг 1 сайн зүйл + 1 сайжруулалт.
- “Ижил чадвар, өөр нөхцөл” CTA.
- Second variant optional; penalty үгүй.

### Acceptance

- Нэг skill-ийг хоёр өөр variant дээр гүйцэтгэж болно.
- Surprise зөвхөн opt-in/зөв intensity үед.
- Level down хийвэл scene context хадгалагдана.
- AI unavailable үед curated character line ба feedback fallback ажиллана.

### Mastery engine

- `SkillMastery` persistence нэмэх.
- `repeat | soften | progress | consolidate | pause` deterministic decision function хийх.
- Нэг self-rating эсвэл LLM score дангаараа progression үүсгэхгүй.
- Сүүлийн 3 variant, hint/recovery usage, intensity, safe finish, өөр өдрийн баталгааг ашиглах.
- Нэг variant тутам хамгийн ихдээ 1–2 slot өөрчлөх.
- Шат ахисны дараа consolidation variant өгөх.
- Completion/streak logic-оос mastery-г тусгаарлах.

### Mastery tests

- Нэг амжилт → шууд progress хийхгүй.
- 2–3 өөр variant дээр тогтвортой, support багассан → progress.
- High intensity эсвэл safe finish → pause/soften, surprise үгүй.
- Progress-ийн дараа → consolidate.
- Repeat session нь streak/day progress-ийг хиймлээр нэмэхгүй.

## 4A. Sprint 7C.1 — Today flow router

### Ажил

- Today эхлэхэд optional нэг readiness check.
- Deterministic recommendation:
  - хүчтэй өмнөх дурсамж → `past_repair`;
  - ойрын тодорхой эвент → `future_rehearsal`;
  - бусад → `daily_skill_loop`.
- Нэг primary CTA + “Өөр дасгал сонгох”.
- Recommendation reason харуулах.
- Override хадгалах боловч хэрэглэгчид онош/label өгөхгүй.

### Tests

- Past Repair skip хийвэл future rehearsal руу орно.
- Router нь гурван ижил primary CTA үүсгэхгүй.
- Existing Sprint 6 хэрэглэгчийн Today path feature flag off үед өөрчлөгдөхгүй.

## 5. Sprint 7D — Graded media

### MVP scope

- Static image.
- Optional ambient audio.
- Autoplay үгүй.
- Mute, replay, skip, text-only.
- Media asset metadata:
  - scene;
  - locale;
  - intensity level;
  - alt text;
  - source/license;
  - duration (audio/video бол).

### Ажил

- `MediaPreview` screen/state.
- Asset preloading ба failure fallback.
- Reduced-motion/device setting хүндэтгэх.
- Placeholder/generated image production-д оруулахын өмнө license/source QA.

### Deferred

- POV video upload/streaming.
- User-owned event photo upload.
- Automatic face/person generation.
- 360° video болон VR runtime.

### Done

- Зураг/аудио ачаалагдахгүй үед session тасрахгүй.
- Media-г алгассан хэрэглэгч ижил practice-г text-only хийж чадна.

## 6. Sprint 7E — Real-life bridge ба Day 7

### Ажил

- Result дараа нэг optional bridge санал болгох.
- Intensity ≥ 8 үед default hide.
- `accepted`, `skipped`, `reflected` state.
- Дараагийн нээлтээр 3 богино reflection:
  - Хийсэн эсэх;
  - Эхлэх/дараах intensity;
  - Бодсоноос юу өөр байсан.
- Day 7 connected rehearsal:
  - 6–8 decision moment;
  - 8–12 минутын cap;
  - нэг recovery branch;
  - pause/resume.

### Done

- Bridge skip streak-д нөлөөлөхгүй.
- Day 7 нь бүх scene-г дэлгэрэнгүй давтахгүй, гол шийдвэрүүдээр явна.

## 6A. Post-pilot R&D — Event recording → 360° → VR

Энэ хэсгийг Personal Pilot learning/safety metric батлагдсаны дараа л эхлүүлнэ.

1. Зөвшөөрөлтэй жүжигчилсэн эвентийн 5–15 секундийн branching POV prototype.
2. Ижил `DecisionMoment` contract-тай mobile 360° prototype.
3. 2D vs 360° дээр completion, safe finish, intensity change, real-life reflection харьцуулах.
4. Нэмэлт үнэ цэнэ батлагдвал VR headset prototype.

Guardrails:

- explicit participant consent ба usage rights;
- face/voice/organization privacy;
- asset unpublish/delete lifecycle;
- autoplay үгүй;
- pause/exit/intensity down/2D fallback;
- passive video watching-ийг practice completion гэж тооцохгүй.

## 7. Analytics ба privacy

### Events

```text
past_event_started
past_event_moment_selected
fact_conclusion_completed
repair_rehearsal_completed
variation_started
variation_completed
mastery_decision_made
mastery_stage_changed
flow_route_recommended
flow_route_overridden
media_level_changed
bridge_offered
bridge_accepted
bridge_reflected
pause_used
level_lowered
safe_finish_used
```

### Properties

Allowed:

- journey/scene/variant id
- target skill
- mastery stage, progression decision
- recommended/selected flow route
- difficulty
- intensity bucket (exact утга шаардлагагүй бол bucket)
- completion/safety action

Forbidden:

- raw audio
- transcript
- exact user response
- fact text
- conclusion text
- private reflection

### Dashboard

- repair completion
- first → second variant conversion
- safe finish vs abrupt quit
- intensity movement
- Day 2/Day 7 return
- bridge offered/accepted/reflected

## 8. Migration strategy

- Additive migrations only.
- Existing Sprint 6 sessions/plan progress-г өөрчлөхгүй.
- New nullable columns эсвэл тусдаа tables.
- RLS: owner-only for past event/moment/bridge private data.
- Migration rollback note бичих; destructive rollback ажиллуулахгүй.
- Feature flag off үед current production flow яг хэвээр.

## 9. QA matrix

| Area | Cases |
|---|---|
| Device | iPhone Safari, Android Chrome, desktop Chrome |
| Input | voice success, STT low confidence, mic denied, text-only |
| Network | slow, timeout, AI unavailable, refresh mid-step |
| Safety | intensity 8–10, pause, level down, safe finish |
| Content | guided, prompted, surprise blocked/allowed |
| Persistence | guest local, auth sync, cross-device restore |
| Privacy | user detail visible; manager raw detail hidden |
| Accessibility | keyboard, focus, alt text, reduced motion, mute |

## 10. Codex execution order

1. Audit repo ба baseline report.
2. Content contracts + tests.
3. Past Event Repair vertical slice.
4. Controlled variation.
5. Today flow router + mastery engine.
6. Static image + optional ambient audio.
7. Real-life bridge + Day 7 connected rehearsal.
8. Analytics/privacy verification.
9. Full build/typecheck/lint/test.
10. Manual mobile QA checklist.
11. Feature-flagged preview deploy only after user explicitly requests deployment.

POV/360°/VR R&D нь дээрх pilot дууссан гэж тооцох шалгуур биш.

## 11. Final verification command set

Repo-ийн package manager-ийг lockfile-оос тогтоож, түүнд тохирсон command хэрэглэнэ. Жишээ:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Hard-coded `npm` бүү ашигла; `pnpm-lock.yaml` эсвэл `yarn.lock` байвал түүнд нийцүүл.

## 12. Codex completion report format

```text
Outcome
- Ямар user flow ажилладаг болсон

Changed
- Файл/route/schema/API

Verified
- Build/typecheck/lint/tests
- Mobile/manual cases

Safety & privacy
- Raw audio policy
- Sensitive field visibility
- High-intensity behavior

Remaining
- Deferred items
- Known risks
```
