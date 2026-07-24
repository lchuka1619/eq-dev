# EQ Dev — Дэлгэц ба хэрэглэгчийн урсгалын төлөвлөгөө v0.1

**Огноо:** 2026-07-24  
**Сүүлийн шинэчлэлт:** 2026-07-24 — flow router, mastery loop, event recording/360°/VR vision  
**Бүтээгдэхүүний ангилал:** Human Skills Simulation Coach  
**Үндсэн амлалт:** Хэрэглэгч зайлсхийж буй яриагаа аюулгүй орчинд богино хугацаагаар давтаж, сэтгэл хөдлөлөө зохицуулан, бодит амьдралд хэлэх үгээ бэлтгэнэ.

---

## 1. Архитектурын үндсэн шийдвэр

EQ Dev нь гурван тусдаа бүтээгдэхүүн шиг харагдах ёсгүй. Нэг суурь платформ дээр хэрэглэгчийн эрхээс хамаарч өөр workspace нээгдэнэ.

| Workspace | Хэн ашиглах | Үндсэн зорилго |
|---|---|---|
| Personal Practice | B2C хэрэглэгч, байгууллагын гишүүн | Өнөөдрийн дасгалаа хийх, ахицаа харах |
| Team Manager | Багийн ахлагч, сургалтын менежер | Challenge оноох, багийн оролцоо ба ахицыг харах |
| Partner Admin | White-label / сургалтын түнш | Байгууллага, контент, брэнд, хэл удирдах |

Эхний хувилбарт **Personal Practice** бүрэн ажиллана. **Team Manager**-ийн хамгийн жижиг ашигтай хувилбар pilot-д орно. **Partner Admin** нь төлбөртэй гадаад түнш батлагдсаны дараа хийгдэнэ.

---

## 2. Personal Practice navigation

Доод navigation дөрвөн item-тай байна:

1. **Өнөөдөр** — нэг санал болгосон дасгал
2. **Замнал** — 7/14/30 өдрийн journey
3. **Ахиц** — streak, давталт, чадварын өөрчлөлт
4. **Профайл** — тохиргоо, хэл, нууцлал, бүртгэл

`Arena`, `Library`, `Podcast Lab`, `Challenges`-ийг тусдаа tab болгохгүй. Эдгээр нь Өнөөдөр эсвэл Замнал дотроос нээгдэх **practice type** байна. Ингэснээр сонголтын ачаалал багасна.

---

## 3. Personal Practice — бүх дэлгэц

### A. Entry, onboarding, auth

| ID | Дэлгэц | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P01 | Splash / session restore | Лого, local/cloud session сэргээх | Тийм |
| P02 | Welcome | “Зайлсхийж буй яриагаа аюулгүй давт” амлалт; **Эхлэх**, **Нэвтрэх** | Тийм |
| P03 | Safety promise | Дарамтлахгүй, хүссэн үед pause/end, audio default-аар хадгалахгүй | Тийм |
| P04 | Goal selection | Ажил, ойрын харилцаа, шинэ хүнтэй харилцах | Байгаа |
| P05 | Difficulty selection | Гол хүндрэл: гацах, айх/ичих, уурлах, юу хэлэхээ мэдэхгүй байх | Байгаа/өргөтгөнө |
| P06 | Daily time | 3, 5, 10 минут | Байгаа |
| P07 | Plan preview | 7 өдрийн хувийн замнал, яагаад санал болгосны тайлбар | Байгаа |
| P08 | Notification opt-in | Тохиромжтой цаг; onboarding-ийг хаахгүй | Дараа |
| P09 | Auth choice | Google, email magic link, guest хэвээр үргэлжлүүлэх | Тийм |
| P10 | Save-progress prompt | Эхний дасгалын дараа local progress-ийг account-д хадгалах | Тийм |
| P11 | Magic-link sent | Email шалгах, дахин илгээх | Тийм |
| P12 | Local-to-cloud merge | Local ба cloud progress давхардвал сонголт/аюулгүй merge | Тийм |

**Чухал дүрэм:** бүртгэл onboarding-ийн өмнө хаалт болохгүй. Хэрэглэгч эхний үнэ цэнийг мэдэрсний дараа progress хадгалах санал авна.

### B. Today / Home

| ID | Дэлгэц | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P13 | Today | Нэг том “Өнөөдрийн дасгал” card; хугацаа, шалтгаан, streak, 3/7 progress | Байгаа |
| P14 | Change exercise | 2–3 өөр дасгал: хялбар, ижил түвшин, өөр нөхцөл | Байгаа/сайжруулна |
| P15 | Resume session | Тасалдсан дасгалаа үргэлжлүүлэх эсвэл шинээр эхлэх | Тийм |
| P16 | Team challenge card | Менежерээс ирсэн даалгавар; хугацаа, privacy тайлбар | B2B MVP |
| P17 | Recovery check-in | “Өнөөдөр ачаалалтай байна” үед 60–90 сек regulation practice | Дараа |
| P17A | Experience check | “Өмнөх ижил үйл явдлын ямар мөч одоо хүртэл нөлөөлж байна?”; алгасах боломжтой | Pilot |

### C. Practice preparation

| ID | Дэлгэц | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P18 | Exercise detail | Зорилго, 2–4 минут, ямар чадвар дадуулах | Тийм |
| P19 | Difficulty | Level 1–3; recommended түвшин, хэрэглэгч override хийж болно | Байгаа |
| P20 | Scenario brief | Хэн, хаана, зорилго, trigger preview, win condition | Байгаа |
| P21 | Pre-intensity | Одоогийн түгшүүр/ачаалал 0–10 | Байгаа |
| P22 | Input setup | Voice эсвэл text; mic permission; төхөөрөмжийн test | Тийм |
| P23 | Permission help | Browser/device mic хаалттай үед богино заавар | Тийм |
| P23A | Media preview | Зураг/дуу/богино POV клипийн агуулга ба intensity preview; autoplay үгүй | Pilot |

### D. Arena session

Arena нь open-ended chatbot биш: **3–5 минут, 2–3 богино turn, нэг recovery, нэг retry**.

| ID | Дэлгэц / төлөв | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P24 | Scene intro | Орчин, дүрүүд, эхний богино audio/text | Байгаа |
| P25 | Listen | AI дүрийн өгүүлбэр, replay нэг товч | Байгаа |
| P26 | Respond | Том mic, recording indicator, timer; text alternative | Байгаа |
| P27 | Processing | “Таны хариултыг сонсож байна”; cancel боломж | Тийм |
| P28 | Transcript confirm | Танилт алдаатай бол edit/re-record; үргэлж харуулах албагүй | Тийм |
| P29 | Micro-feedback | Яг **1 сайн зүйл + 1 сайжруулалт** | Байгаа |
| P30 | Retry | Зассан жишээ, дахин хэлэх | Байгаа |
| P31 | Recovery moment | Гацалт/таагүй хариу; амьсгал, hint, recovery phrase | Байгаа |
| P32 | Pause sheet | Үргэлжлүүлэх, hint, түвшин бууруулах, аюулгүй дуусгах | Байгаа |
| P33 | Network/API recovery | Retry, text mode, draft сэргээх; ахиц алдахгүй | Тийм |
| P34 | Safe finish | “Энд зогсох нь мөн дасгалын зөв сонголт”; буруутгахгүй | Тийм |
| P34A | Variation transition | Ижил чадварыг өөр дүр/үг/жижиг гэнэтийн нөхцөлөөр дахин оролдох санал | Pilot |

**1-click safety rule:** pause, hint, level down, safe finish нь дасгалын үеэс хамгийн ихдээ нэг товшилтоор хүрдэг байна.

### E. Session completion

| ID | Дэлгэц | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P35 | Session result | Дуусгасан алхам, Meaningful Repetition, Recovery Strength, XP | Байгаа |
| P36 | Post-intensity | Дараах ачаалал 0–10; өмнөхтэй харьцуулах | Байгаа |
| P37 | Reflection | Юу сайн болсон, нэг сайжруулалт, дахин хэлэх жишээ | Байгаа |
| P38 | Next action | Дуусгах, дахин нэг удаа, маргаашийн дасгал харах | Тийм |
| P39 | Share card | Зөвхөн achievement/level; дуу, transcript, эмзэг reflection үгүй | Дараа |
| P40 | Save progress | Guest хэрэглэгчид auth санал болгох | Тийм |
| P40A | Real-life bridge | Сонголттой, маш жижиг бодит алхам; 8–10 intensity үед нууж болно; streak penalty үгүй | Pilot |

### F. Journey

| ID | Дэлгэц | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P41 | Journey overview | 7 өдрийн map, өнөөдөр, completed, locked биш upcoming preview | Байгаа |
| P42 | Day detail | Өдрийн зорилго, дасгал, хугацаа, өмнөхтэй холбоо | Тийм |
| P43 | Journey choice | “Тайван холбогдох”, Real Estate Difficult Clients гэх мэт | Дараа |
| P44 | Journey checkpoint | 7/14 хоногийн өөрийн үнэлгээ, бодит амьдралын өөрчлөлт | Тийм |
| P45 | Journey completion | Before/after, хүчтэй болсон чадвар, дараагийн санал | Тийм |
| P45A | Past Event Repair overview | Өмнөх үйл явдлыг жижиг мөчүүдэд задлах; баримт, тухайн үеийн дүгнэлтийг салгах | Pilot |
| P45B | Moment selection | Нэг repair хийх мөч сонгох: автобус, багийн ажил, санаа давхцах, тайз гэх мэт | Pilot |
| P45C | Repair rehearsal | Өнгөрснийг “засаж бичих” биш; тухайн мөчид хэрэглэх нэг өөр response/recovery-г давтах | Pilot |

Journey нь календарийн өдөр алгассан гэж шийтгэхгүй. Нэг өдрийн дасгалыг олон дахин хийхэд plan day, streak зохиомлоор өсөхгүй.

### G. Progress

| ID | Дэлгэц | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P46 | Progress overview | Долоо хоногийн давталт, streak, journey progress | Байгаа |
| P47 | Skill profile | Calm entry, recovery, boundary, response clarity зэрэг чадвар | Дараа |
| P48 | Session history | Огноо, scenario, түвшин, completion; хувийн reflection | Байгаа |
| P49 | Session detail | Feedback, өөрийн үнэлгээ; transcript хадгалсан бол харах | Тийм |
| P50 | Real-life wins | “Бодит амьдралд хэрэглэсэн” тэмдэглэл | Дараа |
| P51 | Monthly reflection | Ямар нөхцөл хялбар/хэцүү болсон | Дараа |

Progress нь бусадтай өрсөлдүүлэх leaderboard биш. Өөрийн өмнөх төлөвтэй харьцуулна.

### H. Practice catalog and content types

| ID | Дэлгэц | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P52 | Explore / catalog | Goal, situation, skill шүүлтүүр; Journey дотроос нээгдэнэ | Дараа |
| P53 | Scenario detail | Түвшин, дүр, чадвар, хэрэглэгчийн үнэлгээ | Дараа |
| P54 | Podcast/Film Lab | 15–45 сек clip, notice, repeat, adapt | Туршилт |
| P55 | Phrase practice | Нэг өгүүлбэр сонсох → хэлэх → нөхцөлд ашиглах | Дараа |
| P56 | Solo regulation | Амьсгал, grounding, self-compassion, recovery | Дараа |

### I. Profile, settings, privacy, payment

| ID | Дэлгэц | Гол агуулга / үйлдэл | MVP |
|---|---|---|---|
| P57 | Profile | Нэр, goal, current journey, байгууллагын membership | Тийм |
| P58 | Preferences | Өдөрт зарцуулах хугацаа, difficulty, reminder | Тийм |
| P59 | Language | Монгол, English; цаашид tenant-ийн хэл | Архитектурт одоо |
| P60 | Voice settings | STT/TTS voice, speed, text fallback | Тийм |
| P61 | Privacy center | Audio, transcript, reflection хадгалалтын сонголт | Тийм |
| P62 | Data export/delete | Export, account болон өгөгдөл устгах | Launch-д |
| P63 | Subscription | Free/Premium plan, үнэ, trial | Орлого эхлэхэд |
| P64 | Paywall | Journey/usage limit дээр; дасгалын дундуур гаргахгүй | Орлого эхлэхэд |
| P65 | Billing | Plan, renewal, receipt, cancel | Орлого эхлэхэд |
| P66 | Help & safety | FAQ, mic help, AI limitation, support | Тийм |
| P67 | About/legal | Terms, privacy, content/safety disclaimer | Launch-д |
| P68 | Sign out | Local unsynced progress warning | Тийм |

---

## 4. Team member урсгал

Байгууллагын хэрэглэгч Personal Practice UI-г ашиглана. Тусдаа “employee app” хийхгүй.

Нэмэгдэх дэлгэцүүд:

| ID | Дэлгэц | Гол агуулга |
|---|---|---|
| T01 | Invite landing | Байгууллага, баг, journey, privacy summary |
| T02 | Join team | Existing account / шинэ account / guest эхлэл |
| T03 | Consent & visibility | Менежер юу харж болох, юу хэзээ ч харахгүй |
| T04 | Assigned challenge | Due date, зорилго, estimated time |
| T05 | Team progress summary | Хувийн completion; багийн aggregate мэдээлэл |
| T06 | Leave team | Personal progress хадгалагдах эсэх, байгууллагын data boundary |

**Privacy boundary:** Менежер individual audio, transcript, exact response, reflection үзэхгүй. Default-аар зөвхөн assigned/completed, practice count, aggregate skill movement харна.

---

## 5. Team Manager workspace

Desktop-first responsive web байна.

### Navigation

1. **Overview**
2. **Challenges**
3. **Team**
4. **Scenarios**
5. **Reports**
6. **Settings**

| ID | Дэлгэц | Гол агуулга | Pilot MVP |
|---|---|---|---|
| M01 | Manager onboarding | Team name, industry, size, goal | Тийм |
| M02 | Team setup | Member invite link/email | Тийм |
| M03 | Overview | Active members, completion, weekly trend, attention needed | Тийм |
| M04 | Create challenge | Journey/scenario сонгох, due date, бүх баг/segment | Тийм |
| M05 | Challenge detail | Invited, started, completed, aggregate improvement | Тийм |
| M06 | Team list | Member, invite state, completion; sensitive content үгүй | Тийм |
| M07 | Member summary | Assigned/completed, activity trend; raw answer үгүй | Дараа |
| M08 | Scenario catalog | Real estate/customer service scenario list | Тийм |
| M09 | Scenario preview | Employee experience, rubric, difficulty | Тийм |
| M10 | Request custom scenario | Script/material upload эсвэл guided form | Pilot-д form |
| M11 | Custom scenario builder | Persona, context, objections, rubric, language | Дараа |
| M12 | Report | 7/14/30 day aggregate; PDF/CSV export | Энгийн хувилбар |
| M13 | Pilot result | Baseline vs endline, usage, renew CTA | Тийм |
| M14 | Billing | Seats/team plan, invoice, renewal | Paid pilot-д |
| M15 | Roles & permissions | Owner, manager, facilitator, viewer | Дараа |
| M16 | Organization settings | Name, branding, privacy/contact | Тийм |
| M17 | Integrations | SSO/LMS/HRIS/API | Хожим |

---

## 6. Partner Admin / white-label workspace

Энэ хэсгийг Казахстан/Узбек зэрэг зах зээлд бодит төлбөртэй түнш батлагдахаас өмнө бүтээхгүй. Гэхдээ data model болон route architecture-д tenant ойлголтыг одооноос суулгана.

| ID | Дэлгэц | Гол агуулга |
|---|---|---|
| W01 | Partner dashboard | Нийт tenant, seats, usage, revenue/license |
| W02 | Organizations | Шинэ customer tenant үүсгэх, plan тохируулах |
| W03 | Localization | UI copy, scenario translation, locale status |
| W04 | Brand settings | Logo, color, domain, email template |
| W05 | Content library | Partner-owned journey/scenario |
| W06 | Scenario builder | Persona, script, rubric, safety boundary |
| W07 | Content review/publish | Draft → QA → published → archived |
| W08 | Language/voice QA | STT, TTS, mixed-language test cases |
| W09 | Partner users | Admin, content editor, trainer, analyst |
| W10 | Analytics | Organization/locale/content performance |
| W11 | License & billing | Setup fee, seats, revenue share |
| W12 | Audit log | Content, role, organization changes |

---

## 7. Гол хэрэглэгчийн урсгалууд

### Flow 1 — Guest хэрэглэгч анхны үнэ цэнэ мэдрэх

`Welcome → Safety promise → 3-question onboarding → Plan preview → Today → Exercise detail → Level → Brief → Voice/Text setup → Arena → Feedback → Retry → Result → Save progress prompt`

Амжилтын мөч: хэрэглэгч эхний 3–5 минутын дотор нэг хариултаа сайжруулж дахин хэлсэн байна.

### Flow 2 — Өдөр тутмын буцаж ирэлт

`Open app → Today → Continue today’s exercise → Arena → Result → Journey progress`

Home дээр catalog, олон recommendation, нийтлэл харуулахгүй. Нэг үндсэн CTA байна.

### Flow 3 — Хэт хэцүү болсон үед

`Arena → Pause → Hint / Recovery phrase / Level down / Safe finish → Result`

Safe finish нь failure биш; streak/effort-ийг бүрэн үгүй хийхгүй.

### Flow 4 — Speech recognition алдаа

`Respond → Processing → Low confidence → Transcript confirm → Edit / Re-record / Text mode → Continue`

Техникийн алдааг хэрэглэгчийн communication чадварын алдаа мэт feedback-д оруулахгүй.

### Flow 5 — Journey дуусгах

`Day 7 result → Checkpoint → Before/after self-rating → Journey completion → Next journey recommendation`

### Flow 6 — Байгууллагын урилга

`Invite landing → Privacy visibility → Join/create account → Baseline check-in → Assigned journey → Daily practices → Endline → Personal result`

### Flow 7 — Менежер pilot эхлүүлэх

`Manager onboarding → Team setup → Invite → Select 14-day journey → Launch challenge → Monitor aggregate completion → Pilot report → Renew/pay`

### Flow 8 — Custom scenario хүсэх

`Scenario catalog → Request custom → Business context + objections + success rubric → Admin review → Preview → Pilot publish`

Эхний үед fully self-service builder биш, guided request + танай гараар QA хийх нь зөв.

### Flow 9 — Premium conversion

`Free journey value moment → Journey limit/paywall → Plan comparison → Checkout → Return to exact next practice`

Paywall-ийг recording, recovery, эсвэл session-ийн дунд үзүүлэхгүй.

### Flow 10 — Хэл солих

`Profile → Language → Locale сонгох → Voice availability check → UI + compatible content switch`

Scenario бүр `content_language`, `locale`, `voice_support`, `cultural_variant` metadata-тай байна. Зөвхөн UI орчуулж unsupported scenario нээхгүй.

### Flow 11 — Өмнөх таагүй туршлагаас дараагийн эвентэд бэлтгэх

`Experience check → Өмнөх эвентийн мөчүүд → Нэг мөч сонгох → Баримт/дүгнэлт салгах → Repair rehearsal → Өөр хувилбартай давталт → Дараагийн эвентийн preview → Сонголттой real-life bridge`

Энд апп “trauma оношлохгүй”. Хэрэглэгчийн үгийг хүндэтгэн **хуримтлагдсан таагүй туршлага**, **нийгмийн шарх**, **өмнөх үйл явдлын хамгаалах дохио** гэсэн non-clinical хэллэг хэрэглэнэ.

### Flow 12 — Multimedia graded rehearsal

`Static image → Image + ambient audio → 5–15 сек POV clip → Guided response → Prompted response → Light surprise → Connected rehearsal`

Хэрэглэгч media бүрийг алгасах, mute хийх, text-only болгох, түвшин бууруулах боломжтой. Media autoplay хийхгүй.

### Flow 13 — Нэг чадварыг уйтгартай биш давтах

`Base scene → Controlled variation сонгох → 2–3 turn practice → Feedback → Ижил skill/өөр нөхцөл → Result`

Variation нь орчин, дүр, opening line, жижиг саад, зорилго, difficulty-г хяналттай сольж болно. Нэг session дотор нэгээс олон гол чадвар зэрэг үнэлэхгүй.

### Flow 14 — Хэрэглэгчийг зөв дасгалын зам руу оруулах

`Today → 1 богино readiness асуулт → Flow router → Past Repair / Future Rehearsal / Daily Skill Loop`

Router нь оношлохгүй. Хэрэглэгчид дараах 3 замын нэгийг тайлбартай санал болгоно:

| Дохио | Санал болгох зам | Яагаад |
|---|---|---|
| Өмнөх ижил эвентийн дурсамж одоо хүчтэй саад болж байна | Past Event Repair | Нэг хүнд мөчийг задлаад шинэ response давтах |
| Ойрын бодит эвент тодорхой байна | Future Event Rehearsal | Тэр эвентийн гол 1–3 мөчийг урьдчилан бэлтгэх |
| Тодорхой эвентгүй, нэг чадвараа сайжруулах хүсэлтэй | Daily Skill Loop | Нэг чадварыг бага өөрчлөлттэй тогтворжуулах |

Хэрэглэгч recommendation-ийг солих, Past Repair-ийг алгасах эрхтэй. Today дээр гурван ижил primary CTA харуулахгүй; нэг recommended CTA, нэг “Өөр дасгал сонгох” холбоос байна.

### Flow 15 — Mastery loop: давтах, зөөлрүүлэх, шат ахих

`Variant → Өөрийн хариулт → Micro-feedback → Stability check → Repeat / Soften / Progress → Дараагийн variant`

Шат ахилтыг зөвхөн session дууссан тоо эсвэл нэг self-rating-аар шийдэхгүй. Дараах дохиог хамтад нь хэрэглэнэ:

- 2–3 өөр variant дээр target skill-ийн гол үйлдлийг хийсэн эсэх;
- hint/recovery-ийн хэрэгцээ буурсан эсэх;
- хэрэглэгчийн difficulty ба confidence үнэлгээ;
- safe finish эсвэл abrupt quit гарсан эсэх;
- хамгийн сүүлийн амжилт өөр өдөр дахин батлагдсан эсэх.

Эхний heuristic:

- **Repeat:** чадвар зөв боловч тогтворжоогүй — ижил difficulty, 1 жижиг өөрчлөлт;
- **Soften:** хэт хүнд — support нэмэх эсвэл нэг хувьсагчийг зөөлрүүлэх;
- **Progress:** 2–3 variant дээр тогтвортой — support багасгах эсвэл зөвхөн 1 шинэ complication;
- **Consolidate:** шат ахисны дараа дахин нэг танил variant;
- **Pause:** intensity өндөр — progression хийхгүй, safe finish санал болгох.

Контентын харьцааг эхний туршилтад **70% танил бүтэц / 20% жижиг өөрчлөлт / 10% хөнгөн surprise** гэж авч үзнэ. Энэ нь хатуу хувь биш; analytics-аар тохируулна.

### Flow 16 — Event recording-аас VR social flight simulator хүртэл

`Curated text/voice scene → Static image + ambient audio → Branching POV clip → 360° event recording → VR interactive rehearsal → AI-generated interactive event world`

VR нь тусдаа learning logic биш. Өнөөдрийн ижил `scene → target skill → decision moment → user response → character reaction → feedback → variation` contract-ийг өөр media renderer-ээр ажиллуулна.

- Эвентийн бичлэгийг бүтнээр нь идэвхгүй үзүүлэхгүй; 6–8 decision moment болгон хуваана.
- Нэг чадварыг хадгалж, дүр/үг/дуу чимээ/хүмүүсийн тооноос 1–2-ыг л өөрчилнө.
- Pause, exit, intensity down, text/2D fallback үргэлж байна.
- Бодит хүмүүсийн дүрс, дуу, байгууллагын мэдээлэлд explicit consent, usage rights, retention policy шаардана.

---

## 8. Role ба permission matrix

| Өгөгдөл / үйлдэл | Personal user | Team member | Manager | Partner admin |
|---|:---:|:---:|:---:|:---:|
| Өөрийн audio/transcript | Өөрөө | Өөрөө | Үгүй | Үгүй |
| Өөрийн reflection | Өөрөө | Өөрөө | Үгүй | Үгүй |
| Completion | Өөрөө | Өөрөө | Assigned team | Aggregate/tenant |
| Skill trend | Өөрөө | Өөрөө | Aggregate default | Aggregate |
| Challenge үүсгэх | Үгүй | Үгүй | Тийм | Тийм |
| Scenario publish | Үгүй | Үгүй | Request only | Role-оос хамаарна |
| Billing | Өөрийн | Үгүй | Organization | Partner license |
| Branding/localization | Үгүй | Үгүй | Хязгаарлагдмал | Тийм |

---

## 9. State ба edge-case дэлгэцүүд

Дэлгэц бүр дараах төлөвийг санаатайгаар дизайнлана:

- Loading / restoring session
- Empty state
- Offline
- Network timeout
- AI feedback unavailable
- Microphone denied
- STT low confidence
- TTS unavailable
- Unsupported language/voice
- Session interrupted
- Unsynced local progress
- Invite expired
- Subscription expired
- Organization seat removed
- No safe content for selected level
- Data deletion pending/completed

Хамгийн чухал fallback дараалал:

`Voice → Re-record → Editable transcript → Text response → Safe finish`

---

## 10. Route structure санал

```text
/
/welcome
/onboarding/*
/today
/journeys
/journeys/:journeyId
/practice/:sessionId/brief
/practice/:sessionId/setup
/practice/:sessionId/play
/practice/:sessionId/result
/progress
/progress/sessions/:sessionId
/profile/*
/auth/*
/invite/:token
/team/*
/manager/*
/partner/*
```

Practice session нь state machine байна:

`created → briefed → ready → listening → recording → processing → feedback → retry → completed`

Side states:

`paused`, `recovering`, `safe_finished`, `interrupted`, `failed_recoverable`.

Past-event journey-ийн нэмэлт state:

`experience_check → moments_mapped → moment_selected → meaning_separated → repair_practiced → varied_rehearsal → bridge_offered`

Flow router state:

`readiness_checked → route_recommended → route_confirmed`

Mastery state:

`introduced → repeating → stabilizing → independent → adapting → consolidating`

Media renderer:

`text_voice | image_audio | pov_video | video_360 | vr_interactive`

---

## 11. MVP screen cut — дараагийн build-д яг юу орох вэ

Бүх дэлгэцийг нэг дор хийхгүй. Дараагийн бодит pilot-д дараах **24 дэлгэц/төлөв** хангалттай:

1. Welcome
2. Safety promise
3. Goal
4. Difficulty
5. Daily time
6. Plan preview
7. Today
8. Change exercise
9. Exercise detail
10. Level
11. Scenario brief
12. Pre-intensity
13. Voice/text setup
14. Listen/respond
15. Transcript recovery
16. Micro-feedback
17. Retry
18. Pause/recovery sheet
19. Result
20. Post-intensity/reflection
21. Journey overview
22. Progress overview/history
23. Auth/save progress
24. Profile/privacy/language settings

Шинэ insight-ийг батлах **Personal Pilot нэмэлт 6 төлөв**:

1. Experience check
2. Past event moment map
3. Fact vs conclusion
4. Repair rehearsal
5. Controlled variation
6. Optional real-life bridge

B2B pilot-д нэмэх хамгийн бага manager set:

1. Manager onboarding
2. Team invite
3. Challenge create
4. Overview
5. Challenge detail
6. Pilot report

---

## 12. Хэрэгжүүлэх дараалал

### Phase A — Personal core-г цэгцлэх

- Navigation-ийг 4 tab болгох
- Today → Practice → Result golden path-ийг нэг мөр болгох
- Permission, STT, network recovery states хийх
- Guest → save progress auth flow-г баталгаажуулах
- Privacy center болон transcript/audio policy-г UI болгох

### Phase B — Past Event Repair + Varied Simulation pilot

- Нэг flagship journey: “Байгууллагын эвентэд тайван оролцох”
- Нэг seed history: ideation day — автобус, багийн ажиллагаа, санаа давхцах, тайз, буцах үе
- 6–8 scene, scene бүр 3 controlled variant
- Эхний хувилбарт static image + optional ambient audio; video-г content pipeline батлагдсаны дараа
- Guided / Prompted / Light surprise гурван түвшин
- Before/after intensity, safe-finish, variation usefulness хэмжих
- Optional real-life bridge ба бодит амьдралын үр дүнгийн reflection
- Today flow router: Past Repair / Future Rehearsal / Daily Skill Loop
- Mastery decision: repeat / soften / progress / consolidate

### Phase C — 14 өдрийн Real Estate pilot

- Real Estate journey/scenario set
- Invite болон team consent
- Manager 6-screen MVP
- Baseline/endline measurement
- Aggregate report

### Phase D — Monetization

- Team plan/billing
- B2C paywall зөвхөн value moment-ийн дараа
- Usage болон AI cost dashboard

### Phase E — Multilingual validation

- `mn`, `en`, дараа нь `kk` locale
- 5 казах scenario demo
- Voice QA
- Нэг төлбөртэй partner pilot

### Phase F — White-label

- Tenant-level branding
- Partner content workflow
- Role/permission
- Organization/license management

### Phase G — Immersive social flight simulator R&D

- Зөвшөөрөлтэй жүжигчилсэн эвентийн branching POV prototype
- Утсаар үздэг 360° бичлэг дээр decision moments турших
- 2D ба 360° хувилбарын completion, intensity, transfer-to-real-life үр дүнг харьцуулах
- Үр дүн батлагдсаны дараа VR headset prototype
- Scene logic-ийг media renderer-ээс салангид хэвээр хадгалах

---

## 13. Product analytics events

Golden funnel:

`welcome_viewed → onboarding_completed → practice_started → first_response_submitted → retry_completed → session_completed → account_saved → day_2_returned → day_7_completed → paid/pilot_renewed`

Safety/quality events:

- `pause_used`
- `hint_used`
- `level_lowered`
- `safe_finish_used`
- `stt_low_confidence`
- `text_fallback_used`
- `feedback_helpful`
- `exercise_changed`
- `past_event_started`
- `past_event_moment_selected`
- `fact_conclusion_completed`
- `repair_rehearsal_completed`
- `variation_started`
- `variation_completed`
- `media_level_changed`
- `bridge_offered`
- `bridge_accepted`
- `bridge_reflected`

Менежерийн гол metric нь leaderboard биш:

- invite activation
- 3+ practice days
- journey completion
- baseline/endline change
- pilot renewal intent

---

## 14. Шийдвэрийн хураангуй

1. Үндсэн UX нь **нэг өдрийн нэг дасгал** байна.
2. Personal navigation нь **Өнөөдөр / Замнал / Ахиц / Профайл** гэсэн 4 tab байна.
3. Arena нь тусдаа tab биш, бүх journey-ийн нийтлэг practice engine байна.
4. Guest хэрэглэгч эхлээд дасгал хийж болно; auth нь progress хадгалах үед орно.
5. Voice primary боловч text fallback үргэлж байна.
6. Feedback нь нэг сайн зүйл, нэг сайжруулалттай богино байна.
7. Manager raw дуу, transcript, reflection харахгүй.
8. B2B manager dashboard-ийг personal app-аас тусдаа workspace болгон хийнэ.
9. Олон хэлний суурийг одоо тавина; бүтэн white-label UI-г төлбөртэй түншээс өмнө хийхгүй.
10. Дараагийн build-ийн зорилго “бүх дэлгэц” биш, **24-screen personal golden path + 6-screen manager pilot** байна.
11. Олон хүнтэй орчноос зайлсхийхийг тогтсон зан чанар гэж шууд ангилахгүй; олон жилийн хуримтлагдсан таагүй туршлага ба зайлсхийлтийн мөчлөг байж болохыг journey model-д тусгана.
12. Бүтээгдэхүүний ялгарах хөдөлгүүр нь **Past-event repair → controlled variation → multimedia graded rehearsal → optional real-life bridge** байна.
13. Дараагийн implementation priority нь manager workspace биш, нэг Personal Practice journey-ээр энэ хөдөлгүүрийн хэрэглэгчийн үнэ цэнэ ба аюулгүй байдлыг батлах явдал байна.
14. Today нь Past Repair, Future Rehearsal, Daily Skill Loop-ийн нэгийг readiness дээр тулгуурлан санал болгоно.
15. Progress нь completion count биш, олон variant ба олон өдөрт тогтвортой болсон target skill-ээр хэмжигдэнэ.
16. Урт хугацааны алсын хараа нь зөвшөөрөлтэй event recording, 360° video, VR ашигласан **social flight simulator**; эхлээд learning engine ба real-life transfer-ийг mobile дээр батална.
