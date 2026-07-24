# Codex Task — Public Landing ба Personal Practice App Shell

Доорх prompt-ийг `lchuka1619/eq-dev` repository дээрх дараагийн Codex task болгон ашиглана.

```text
Энэ repository-ийн бодит current main baseline:

- repo: lchuka1619/eq-dev
- verified commit: b73b056 (Add mastery routing and graded media)
- framework: Next.js 16 + React 19 + vinext/Vite
- auth/persistence: Supabase, local-first progress + cloud sync

Эхлээд current HEAD болон dirty worktree-г өөрөө дахин шалга. HEAD өөр болсон бол шинэ diff-ийг inspect хийж төлөвлөгөөг түүнд нийцүүл. User-ийн unrelated өөрчлөлтийг устгахгүй.

Бодит UX gap:

- app/page.tsx login state-ээс үл хамааран public hero + Today + Arena + practice + progress бүхий нэг урт page render хийдэг;
- AuthProvider session хадгалж modal хаадаг боловч route солихгүй;
- AccountMenu дээр cloud-save button avatar болдог ч authenticated app shell байхгүй;
- /auth/callback default destination /;
- /today, /journey, /progress, /profile route байхгүй.

Тиймээс login амжилттай ч page landing хэвээр харагдаж байна. Энэ нь Supabase-ийн login failure биш; public landing болон practice app-ийн routing/application-shell separation хэрэгжээгүйгээс болсон.

Зорилго:

Public landing болон Personal Practice app-ийг route түвшинд салгаж, guest/authenticated/session restore бүрийн дараа practice-first UX гаргах. Одоогийн Today router, Past Event Repair, variation/mastery, graded media, voice/text practice, 7-day plan, streak protection, local + Supabase progress-ийг эвдэхгүй.

Required route contract:

1. `/`
   - нэвтрээгүй шинэ visitor-д богино public landing;
   - value proposition;
   - primary CTA: `Дасгал эхлэх` → `/today`;
   - secondary CTA: `Нэвтрэх`;
   - Today dashboard, readiness check, Arena, progress UI-г render хийхгүй.

2. `/today`
   - guest болон authenticated хэрэглэгчид нээлттэй;
   - Personal Practice app shell;
   - first viewport-д нэг recommended Today card;
   - Today router-ийн Past Repair / Future Rehearsal / Daily Skill actions reachable.

3. `/journey`
   - current 7-day plan, today/completed/next state.

4. `/progress`
   - streak, sessions, meaningful repetitions/mastery/progress.

5. `/profile`
   - account, local/cloud sync state, privacy, login/sign-out.

App navigation:

- mobile bottom nav: Өнөөдөр / Замнал / Ахиц / Профайл;
- active route ялгарна, `aria-current="page"` хэрэглэнэ;
- desktop дээр ижил information architecture;
- marketing hero app shell дотор харагдахгүй;
- dead navigation эсвэл хоосон placeholder page бүү хий.

Auth destination rules:

- anonymous `/` → public landing;
- `/` дээр `Дасгал эхлэх` → `/today` guest;
- `/` дээр login success → `/today`;
- app route дотроос login хийвэл тухайн safe internal route руу буцна;
- authenticated user `/` нээвэл `/today`;
- refresh `/today` → `/today`, progress/session restore;
- sign out `/today` → `/today` guest mode, practice хаагдахгүй;
- invalid/external `next` → `/today`, open redirect үгүй;
- auth error → safe route дээр non-blocking message, guest practice боломжтой;
- session restore үед landing/app content flash гаргахгүй.

Implementation constraints:

- app/page.tsx-ийн 1,900+ мөрийг нэг дор дахин зохиож functionality алдахгүй;
- reusable practice component/layout руу үе шаттай extract хий;
- current storage keys, completion logic, streak/day rules, Supabase merge semantics-г өөрчлөхгүй;
- database migration бүү хий; үнэхээр шаардлагатай бол код бичихээс өмнө тайлбарла;
- new global state library/dependency бүү нэм;
- Past Event feature flag-аас route separation-ийг хамааралгүй болго;
- raw audio/transcript хадгалалтын privacy policy-г өөрчлөхгүй;
- public copy/design-ийг бүхэлд нь дахин хийхгүй;
- commit, push, deploy бүү хий.

Эхлээд надад богино audit гарга:

- current HEAD/dirty state;
- current route/auth behavior;
- refactor/extraction boundary;
- өөрчлөх файлууд;
- schema change шаардлагатай эсэх;
- baseline test/build result.

Blocking ambiguity байхгүй бол audit-ийн дараа өөрөө үргэлжлүүлэн хэрэгжүүл.

Acceptance tests:

1. Anonymous `/` дээр landing харагдаж practice dashboard render хийхгүй.
2. `Дасгал эхлэх` `/today` руу орж guest onboarding/practice ажиллана.
3. Login from `/` → `/today`.
4. Login from `/progress` → `/progress`.
5. Authenticated direct visit `/` → `/today`.
6. `/auth/callback?next=https://evil.example` external redirect хийхгүй, `/today` fallback.
7. `/today` refresh хийхэд plan/progress сэргээнэ.
8. `/today` sign-out хийхэд guest mode болж practice үргэлжилнэ.
9. Дөрвөн navigation destination ажиллаж active state зөв байна.
10. Today router-ийн гурван practice route reachable.
11. Repeat practice streak/day progress-ийг хиймлээр нэмэхгүй.
12. Local + Supabase merge regression үгүй.
13. iPhone Safari хэмжээтэй viewport-д content ба bottom nav давхцахгүй.
14. Keyboard focus, route title, `aria-current` basic accessibility.

Verify:

- npm run lint
- npm run test:unit
- npm run build
- npm test
- шаардлагатай auth/routing integration эсвэл E2E tests

Package scripts-д тусдаа typecheck байхгүй бол `tsc --noEmit` эсвэл build-ийн type validation-ийг ашиглаж яг юу ажиллуулснаа тайлагна.

Төгсгөлд:

- Outcome
- Changed routes/files
- Auth destination behavior
- Preserved functionality
- Test/build results
- Manual mobile/auth cases
- Remaining risks
- Next small milestone

гэсэн товч тайлан өг.
```

