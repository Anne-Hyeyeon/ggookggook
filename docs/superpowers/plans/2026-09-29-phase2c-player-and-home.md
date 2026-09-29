# Phase 2C: Routine Player, Repeats, and a Livelier Home

> For agentic workers: execute with superpowers:subagent-driven-development. Read the files each task names and `docs/code-conventions.md` before editing.

**Goal:** Make running a routine feel like a real player (play/pause, previous/next point, repeat rounds, a short get-ready countdown, safe behavior when the app goes to the background) and turn the Today screen into a home that suggests what to do now and groups the 31 routines so they are easy to scan.

**Owner request (2026-09-29):** 재생/일시정지로 루틴을 재생, 루틴 반복 횟수를 스스로 정하기, 사용자 입장에서 필요한 것 고민, 메인페이지가 밋밋함, 개발 가능한 것은 알아서 개선.

## Global Constraints

- Plan 2A/2B Global Constraints apply (colors, fonts, hairlines, radius ≤ 4 except circular markers, polite Korean copy, no em dashes, no efficacy claims, `npm_config_os=darwin`, no `src/app/`, no `npx expo lint`, route tests in `__tests__/`, src tests next to source, TDD, Co-Authored-By trailer naming the model).
- Repeat count: integer 1–5, default 1.
- Everything keeps working offline and on the web screenshot harness.

---

### Task 1: Content groups and time-of-day suggestions

- Add `group` to the symptom schema (`packages/shared/src/content.ts`): one of `head-eyes` (머리·눈), `neck-back` (목·어깨·허리), `digestion` (속·소화), `sleep-mind` (잠·마음), `women` (여성), `limbs` (손발·다리), `daily` (생활). Validator: every symptom has a group.
- Assign groups in `content/data/symptoms.json` (all 31), rebuild and sync the app bundle.
- Pure `suggestFor(date: Date, symptoms, usage: Record<string, number>): Symptom[]` in `packages/shared/src/suggest.ts` returning up to 2 suggestions by local hour: 05–10 → 기운이 없을 때, 목이 뻐근할 때; 10–12 and 14–18 → 눈이 뻑뻑할 때, 어깨가 뭉쳤을 때; 12–14 and 18–20 → 속이 더부룩할 때, 체했을 때; 20–23 → 잠이 안 올 때, 스트레스 받을 때; 23–05 → 잠이 안 올 때, 머리가 아플 때. The user's most-used symptom replaces the second suggestion when it has ≥ 3 completed sessions and is not already first. Tests for each window and the usage rule.

### Task 2: Engine support for rounds and seeking

- `buildGuideSegments(steps, lookup, rounds = 1)`: segments repeated `rounds` times, each segment gains `round` (1-based) and keeps `stepIndex`.
- Pure seek helpers in `packages/shared/src/guide.ts`: `seekSegment(progress, segments, index)` (clamped, elapsed 0, not finished) and `previousSegmentIndex`/`nextSegmentIndex` that move by acupoint step (both sides of a sequential point move together) and cross round boundaries.
- Store: migration 3 adds `repeat INTEGER NOT NULL DEFAULT 1` to `user_routines`; `UserRoutine.repeat` (validated 1–5). Symptom repeat preference in kv (`repeat:<symptomId>`), with `getSymptomRepeat`/`setSymptomRepeat`. Tests.

### Task 3: The player

- `GuideView` controls in the thumb zone: 이전 (previous point), a large 재생/일시정지 toggle, 다음 (next point). All ≥ 56pt tall, labeled; 이전 disabled on the first point of round 1, 다음 on the last point of the last round becomes "마치기" (finishes and records).
- Round indicator in the header when rounds > 1: "2회차 / 3".
- Get-ready: before the first press, a 3-second "준비" countdown ("곧 시작해요 3") that can be skipped by tapping 재생; a setting "시작 전 준비 시간" (on by default) in 설정.
- Background: when the app goes to the background (AppState), pause automatically and show "잠시 멈췄어요" with the play button; never keep counting in the background.
- Recorded duration is the time actually spent (skips do not add time). Sessions finished with 마치기 early still record, with the actual duration.
- Tests for each control, rounds, get-ready, and the background pause.

### Task 4: Choosing repeats

- Symptom preview and my-routine preview: a "반복" stepper row (1–5회) above 시작; the summary line shows the total ("3곳 · 2회 · 약 8분").
- Symptom previews remember the last repeat per symptom; my routines store `repeat` (editor gets the same stepper).
- The chosen repeat is passed to the guide (`?rounds=`), validated and clamped there.

### Task 5: A home that suggests and groups

- Header: date line, a greeting by time of day ("좋은 아침이에요", "오후도 잠깐 쉬어 가요", "편안한 밤 되세요"), the title, and the small line-drawn cat at the right of the title (about 72pt, decorative, hidden from screen readers). 설정 link stays.
- "지금 해 보기" block under the search: up to 2 suggestions from `suggestFor` as larger rows with name, acupoint names, minutes, and a clear 시작 action that goes straight to the guide (repeat 1), plus tapping the row opens the preview.
- My routines quick row when the user has any: horizontal list of their routines as text chips (ink border, radius 2) → routine preview.
- Group filter: a horizontal row of group chips ("전체" + the 7 groups); the list below shows routines grouped under small caption headers in "전체" and filtered when a chip is selected; search overrides grouping.
- Recent row and 나아졌어요 count stay.
- Screenshots: update 03-today.png and add 22-today-filter.png.

### Task 6: QA, docs, review

- Regenerate all screenshots; controller review; fix visual issues.
- Update `docs/store-listing.md` feature bullets (player, repeats, suggestions) in the owner's style.
- Final whole-branch review and one fix wave.
