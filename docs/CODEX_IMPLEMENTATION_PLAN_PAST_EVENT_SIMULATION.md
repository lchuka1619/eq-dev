# Codex Implementation Plan — Past Event Repair + Varied Simulation

## Repository architecture adaptation — 2026-07-24

Энэ plan-ийг EQ Dev-ийн одоогийн Sprint 6 кодод дараах байдлаар тааруулна:

- Personal Practice vertical slice-ийг одоогийн monolithic `app/page.tsx` дотор том rewrite хийхгүйгээр тусдаа `components/personal-practice/` feature component болгон холбоно.
- Existing React state + localStorage + Supabase local-first загварыг хадгална; шинэ state management dependency нэмэхгүй.
- Existing `practice_sessions` болон 7-day completion semantics-ийг өөрчлөхгүй. Pilot attempt нь тусдаа idempotent record байна; нэг өдөр олон удаа давтсан ч plan day/streak нэмэгдэхгүй.
- Past Event Repair draft нь default-аар local-only. `past_event_repairs` table-д зөвхөн хэрэглэгч “Cloud-д хадгалах” сонголтыг ил тод хийсэн үед бичнэ.
- Variation engine нь pure, seeded TypeScript module байна. Нэг attempt-д хамгийн ихдээ хоёр dimension өөрчилж, target skill ID-г тогтвортой хадгална.
- AI endpoint нь feedback enhancement хэвээр; scenario-ийн үндсэн content deterministic static fallback тул `/api/coach` доголдсон ч pilot тасрахгүй.
- Эхний slice-д Guided ба Prompted architecture/variants, before/after anxiety, reflection, optional bridge орно. Independent, Light surprise, Connected rehearsal stage ID болон progression-д тооцогдох боловч том multimedia/video UI deferred.
- Энэ pass Personal Practice-only. Team Manager, Partner Admin, manager analytics, multimedia authoring scope-д орохгүй.

**Огноо:** 2026-07-24
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

## 7. Analytics ба privacy

### Events

```text
past_event_started
past_event_moment_selected
fact_conclusion_completed
repair_rehearsal_completed
variation_started
variation_completed
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
5. Static image + optional ambient audio.
6. Real-life bridge + Day 7 connected rehearsal.
7. Analytics/privacy verification.
8. Full build/typecheck/lint/test.
9. Manual mobile QA checklist.
10. Feature-flagged preview deploy only after user explicitly requests deployment.

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
