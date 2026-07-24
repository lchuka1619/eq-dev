# Codex Implementation Plan — App Shell + Past Event Simulation

**Огноо:** 2026-07-24  
**Сүүлийн шинэчлэлт:** 2026-07-24 — бодит `main` (`b73b056`) дээрх landing/app-shell gap болон auth routing-ийг тусгав
**Зорилго:** Public landing ба Personal Practice app-ийг route түвшинд салгаж, login/guest/session restore бүрийн дараа хэрэглэгчийг practice-first урсгалд зөв оруулах; одоо байгаа 7 өдрийн plan, Today router, Past Event Repair, controlled variation, mastery, graded media, local + Supabase progress-ийг эвдэхгүй хадгалах.

## 0. Одоогийн кодын баталгаажсан baseline

2026-07-24-нд `lchuka1619/eq-dev` repository-ийн `main` branch, commit `b73b056`-г шалгасан.

| Чадвар | Одоогийн төлөв |
|---|---|
| Supabase auth, local/cloud progress | Хэрэгжсэн |
| 7 өдрийн plan, streak protection | Хэрэгжсэн |
| Today readiness router | Хэрэгжсэн |
| Past Event Repair pilot | Хэрэгжсэн |
| Deterministic variation/mastery суурь | Хэрэгжсэн |
| Static graded media | Хэрэгжсэн |
| Public landing ба authenticated app route салгалт | **Хийгдээгүй** |
| Login амжилтын дараах `/today` destination | **Хийгдээгүй** |
| Personal Practice app shell + bottom navigation | **Хийгдээгүй** |

Бодит шалтгаан:

- `app/page.tsx` нь login төлвөөс үл хамааран ижил урт single-page landing/practice UI render хийдэг.
- `AuthProvider` session-ийг state-д хадгалж, modal хаадаг боловч route солихгүй.
- `AccountMenu`-д cloud-save товч avatar болохоос үндсэн дэлгэц солигдохгүй.
- `app/auth/callback/route.ts`-ийн default destination `/`.
- `/today`, `/journey`, `/progress`, `/profile` route болон app shell байхгүй.

Иймээс дараагийн ажил нь Past Event feature нэмэхээс өмнөх **routing correction milestone** байна.

## 1. Codex-д өгөх үндсэн заавар

> Existing auth, local + Supabase progress, Today router, Past Event Repair, mastery/variation, graded media, 7-day plan, streak protection, voice/text fallback, safety controls-ийг хадгал. Public landing болон Personal Practice app shell-ийг route түвшинд салга. Том rewrite хийхгүй; одоогийн monolithic page-ийг зан төлөв өөрчлөхгүйгээр үе шаттай extract хий. Login, OAuth callback, magic link, guest mode, refresh, sign-out бүрд destination-ийг deterministic болго. Raw audio default-аар бүү хадгал. Build, lint, unit/integration/E2E tests-ийг төгсгөлд ажиллуул.

Feature flag:

```text
NEXT_PUBLIC_PAST_EVENT_PILOT=true
```

## 2. Нэн тэргүүний milestone — Public landing → Personal Practice app shell

### 2.1 Route contract

| Route | Хэн | Үндсэн үүрэг |
|---|---|---|
| `/` | Нэвтрээгүй шинэ visitor | Богино public landing: value proposition, `Дасгал эхлэх`, `Нэвтрэх` |
| `/today` | Guest болон authenticated user | Practice-first home; эхний viewport-д нэг Today card |
| `/journey` | Guest болон authenticated user | 7 өдрийн замнал |
| `/progress` | Guest болон authenticated user | Streak, session, mastery/progress |
| `/profile` | Guest болон authenticated user | Account, sync, privacy, sign-in/sign-out |
| `/auth/callback` | Auth provider callback | Safe `next` resolve хийгээд зөв app destination руу буцаах |

`/today` нь authenticated-only route биш. Guest хэрэглэгч дасгалаа local-first хийж чадна.

### 2.2 Destination rules

| Нөхцөл | Хүлээгдэж буй destination |
|---|---|
| Нэвтрээгүй хүн `/` нээх | Public landing |
| `/` дээр `Дасгал эхлэх` дарах | `/today` guest mode |
| `/` дээр login эхлүүлж амжилттай нэвтрэх | `/today` |
| `/today`, `/journey`, `/progress`, `/profile` дээр login эхлүүлэх | Эхэлсэн safe internal route руугаа буцах |
| Authenticated хэрэглэгч `/` нээх | `/today` |
| `/today` дээр refresh хийх | `/today`; progress/session restore |
| `/today` дээр sign out хийх | `/today` guest mode; practice хаагдахгүй |
| Invalid/external `next` | `/today`; open redirect хийхгүй |
| Auth error | Эхэлсэн safe route дээр non-blocking error; guest practice боломжтой |

Session шалгаж байх үед landing болон app хоёрын хооронд content flash гаргахгүй. Боломжтой бол server-side session redirect ашиглана; runtime limitation байвал client guard + neutral loading state ашиглаж, regression test нэмнэ.

### 2.3 Public landing requirements

- Marketing үүрэгтэй, богино байна.
- Hero дээр нэг value proposition, нэг primary CTA (`Дасгал эхлэх`), нэг secondary CTA (`Нэвтрэх`).
- Authenticated хэрэглэгчийн Today card, readiness check, progress dashboard, Arena, Past Event UI-г `/` дээр render хийхгүй.
- Public landing дотор anchor navigation-тай хуучин урт practice page үлдээхгүй.
- Login амжилттай болсон эсэхийг зөвхөн avatar-аар таалгах UX бүү ашигла.

### 2.4 Personal Practice app shell requirements

- First viewport: app header + **нэг** recommended Today card.
- Mobile-first bottom navigation:
  - Өнөөдөр
  - Замнал
  - Ахиц
  - Профайл
- Active item route-аар ялгарна; keyboard focus болон `aria-current="page"` байна.
- Desktop дээр ижил information architecture-г side/top navigation хэлбэрээр харуулж болно.
- Marketing hero, public testimonials, урт тайлбар app shell дотор байхгүй.
- Account/sync state нь Profile болон compact app header-ээс хүрдэг байна.
- Existing practice components-ийн дотоод state, persistence key, Supabase table/schema-г энэ milestone-д өөрчлөхгүй.
- Existing functionality-г `/today` болон холбогдох route-уудаас reachable хэвээр үлдээнэ; dead navigation бүү үүсгэ.

### 2.5 Refactor constraints

- `app/page.tsx`-ийн 1,900+ мөрийг нэг дор дахин бичихгүй.
- Одоогийн practice experience-г reusable client component/layout руу extract хийж болно.
- Route separation хийхдээ session completion, streak/day calculation, local storage key, cloud merge semantics-г өөрчлөхгүй.
- Database migration шаардлагагүй. Schema өөрчлөх бол зогсоож, яагаад зайлшгүйг эхлээд тайлбарлана.
- New state-management dependency нэмэхгүй.
- Public landing/app shell салгалтыг Past Event feature flag-аас хамааралгүй ажиллуул.

### 2.6 Acceptance tests

Заавал шалгах:

1. Anonymous `/` → landing; practice dashboard render хийхгүй.
2. `Дасгал эхлэх` → `/today`; guest onboarding/practice ажиллана.
3. Login from `/` → `/today`.
4. Login from `/progress` → `/progress`.
5. Authenticated direct visit `/` → `/today`.
6. `/auth/callback?next=https://evil.example` → `/today`; external redirect үгүй.
7. Refresh `/today` → current plan/progress restore.
8. Sign out `/today` → guest mode; local practice үргэлжилнэ.
9. Bottom navigation дөрвөн destination бүгд ажиллана, active state зөв.
10. Existing Today router → Past Repair/Future Rehearsal/Daily Skill actions reachable.
11. Repeat practice нь streak/day progress-ийг хиймлээр нэмэхгүй.
12. Local + Supabase merge regression үгүй.
13. iPhone Safari хэмжээтэй viewport-д CTA болон bottom nav давхцахгүй.
14. Keyboard/focus/`aria-current` basic accessibility.

### 2.7 Explicit non-goals

- Энэ milestone-д B2B manager workspace хийхгүй.
- Past Event/mastery algorithm дахин зохиохгүй.
- POV video, 360°, VR runtime хийхгүй.
- Visual redesign system бүхэлд нь солихгүй.
- Commit, push, deploy-ийг хэрэглэгч тусад нь хүсээгүй бол хийхгүй.

## 3. Эхлэхийн өмнөх repository audit

### Ажил

- `AGENTS.md`, README, package scripts, route structure, Supabase migrations шалгах.
- `app/page.tsx`, `AuthProvider`, `AuthModal`, `AccountMenu`, `/auth/callback`-ийн одоогийн behavior-г map хийх.
- Existing flow: onboarding → Today router → practice/Past Repair → result → persistence-г map хийх.
- Route refactor-т дахин ашиглах component/state boundary-г тогтоох.
- Dirty working tree байвал user changes-г хадгалж, давхцах файлыг тэмдэглэх.

### Deliverable

- Одоогийн route/auth state diagram эсвэл богино хүснэгт
- Өөрчлөх файлын бодит жагсаалт, extraction boundary
- Existing test/build baseline result

### Gate

- Baseline build failure байвал эхлээд scope-д хамаарах blocker-ийг засна.
- Repo олдохгүй, branch/remote тодорхойгүй бол код бичихээс өмнө зогсоно.
- Auth session болон local/cloud merge semantics ойлгомжгүй бол mutation хийхээс өмнө тайлбарлана.

## 4. Өмнөх pilot milestone-уудын лавлах төлөвлөгөө

Доорх Past Event/variation/media хэсгүүдийн ихэнх нь `4c5e429` болон `b73b056` commit-уудад хэрэгжсэн. Routing milestone-ийн үеэр эдгээрийг дахин implementation scope болгохгүй; regression contract болгон ашиглана.

### 4.1 Sprint 7A — Content contract ба deterministic variants

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

### 4.2 Sprint 7B — Past Event Repair vertical slice

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

### 4.3 Sprint 7C — Varied rehearsal

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

### 4.4 Sprint 7C.1 — Today flow router

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

### 4.5 Sprint 7D — Graded media

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

### 4.6 Sprint 7E — Real-life bridge ба Day 7

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

### 4.7 Post-pilot R&D — Event recording → 360° → VR

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

## 5. Analytics ба privacy

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

## 6. Migration strategy

- Additive migrations only.
- Existing Sprint 6 sessions/plan progress-г өөрчлөхгүй.
- New nullable columns эсвэл тусдаа tables.
- RLS: owner-only for past event/moment/bridge private data.
- Migration rollback note бичих; destructive rollback ажиллуулахгүй.
- Feature flag off үед current production flow яг хэвээр.

## 7. QA matrix

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
| Routing | anonymous/authenticated `/`, safe callback, deep link, refresh, sign-out |
| App shell | first viewport, active nav, mobile bottom inset, no landing content |

## 8. Codex execution order

1. Audit current repo, route/auth behavior, dirty state, baseline tests.
2. Public landing ба reusable Personal Practice app boundary-г салгах.
3. `/today` app shell + route-aware navigation хийх.
4. `/journey`, `/progress`, `/profile` destination-уудыг dead screen үүсгэхгүй холбоно.
5. Auth modal/callback/session restore destination contract хэрэгжүүлэх.
6. Existing Today/Past Repair/mastery/media/persistence regression tests ажиллуулах.
7. Full build/lint/test; тусдаа `typecheck` script байхгүй бол `tsc --noEmit` эсвэл build-ийн type validation-ийг тайлагнах.
8. Manual mobile/auth matrix шалгах.
9. Дараагийн milestone болгон Real-life bridge/Day 7-ийн үлдсэн ажлыг тусад нь тайлагнах.

POV/360°/VR R&D нь дээрх pilot дууссан гэж тооцох шалгуур биш.

## 9. Final verification command set

Repo-ийн package manager-ийг lockfile-оос тогтоож, түүнд тохирсон command хэрэглэнэ. Жишээ:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Hard-coded `npm` бүү ашигла; `pnpm-lock.yaml` эсвэл `yarn.lock` байвал түүнд нийцүүл.

## 10. Codex completion report format

```text
Outcome
- Public landing, guest start, auth return, app shell-ийн ямар flow ажилладаг болсон

Changed
- Файл/route/schema/API

Verified
- Anonymous/authenticated route matrix
- Build/typecheck/lint/tests
- Mobile/manual cases, deep link, refresh, sign-out

Safety & privacy
- Raw audio policy
- Sensitive field visibility
- High-intensity behavior

Remaining
- Deferred items
- Known risks
```
