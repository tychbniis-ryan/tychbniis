# CHANGELOG

## TYC_VaccineTest solo 0.1.1 - 2026-07-01 UI and mobile flow

### feat - pixel UI refinement and mobile answer flow

- Bumped the solo app version from `0.1.0` to `0.1.1`; root `package.json` remains `0.7.46`.
- Kept the question bank path at `soloQuestions/TYC_VaccineTest/v0_1_0`; this release does not change question content.
- Updated cache-busting query string to `0.1.1-ui-20260701-1`.
- Changed quiz flow so mobile learners first see the question only, then tap `開始作答` before answer options appear.
- Restored red-dot badges for unopened treasure boxes and claimable achievements.
- Hid unowned items from the item panel; empty inventory now shows a clear empty state.
- Removed the visible per-question score row from answer/explanation summaries.
- Tightened mobile pixel-card layouts so item, treasure, achievement, and challenge controls use 2 or 3 columns where screen width allows.
- Increased mobile quiz top spacing so the question frame is not covered by the fixed tool buttons.
- Changed `getSoloLeaderboard` JSONP calls to use GAS `action` + `data` query parameters while keeping score submission on `payload`.
- Added `npm run test:tycvaccinetest:ui-audit` for mobile UI regression checks.

### test

- `node --check frontend/student/dist/TYCVACCINETEST/app.js`
- `node --check scripts/tycvaccinetest-ui-audit-test.mjs`
- `npm run test:tycvaccinetest:smoke`
- `npm run test:tycvaccinetest:mobile`
- `npm run test:tycvaccinetest:round2`
- `npm run test:tycvaccinetest:resume`
- `npm run test:tycvaccinetest:ui-audit`
- Online GAS `getSoloLeaderboard` check passed for `soloVersion=0.1.1`; response was `ok: true` with an empty `rows` array because no `0.1.1` scores have been submitted yet.
- Online tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`: smoke, mobile, round2, resume, and ui-audit.
- Online cache header check passed for `/TYCVACCINETEST/`, `styles.css`, `app.js`, and `config.js`.

### deploy - 2026-07-01

- Firebase Hosting deployed only for `hosting:student`.
- Hosting URL: `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/8e4f7720353f53a1`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782879159851000`.
- GAS and Firebase Rules were not deployed for this change.

### rollback

- Restore files from `backup/tycvaccinetest_ui_0_1_1_20260701_115356/`.
- Revert the `0.1.1` UI commit and redeploy Firebase Hosting for `hosting:student` if already deployed.

## TYC_VaccineTest solo 0.1.0 - 2026-07-01 cache control

### fix - prevent stale mobile cache

- Kept solo app version as `0.1.0`; this change only updates cache control.
- Added no-cache meta tags to `frontend/student/dist/TYCVACCINETEST/index.html`.
- Added cache-busting query string `0.1.0-cache-20260701-1` to solo `styles.css`, `config.js`, and `app.js`.
- Added Firebase Hosting `Cache-Control: no-cache, no-store, must-revalidate` headers for student `*.css` and `*.json`.
- Added Firebase Hosting no-cache headers for `/TYCVACCINETEST` and `/TYCVACCINETEST/**` so the extensionless solo entry route does not keep an old mobile cache.

### test

- `node -e "JSON.parse(require('fs').readFileSync('firebase.json','utf8')); console.log('firebase.json OK')"`
- `node --check frontend/student/dist/TYCVACCINETEST/app.js`
- `npm run test:tycvaccinetest:smoke`
- `npm run test:tycvaccinetest:mobile`
- `npm run test:tycvaccinetest:round2`
- Online smoke test passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`.
- Online mobile panel test passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`.
- Online cache header check passed for `/TYCVACCINETEST/`, `/TYCVACCINETEST`, `styles.css`, `app.js`, `config.js`, and `soloQuestions.v0_1_0.json`.

### deploy - 2026-07-01

- Firebase Hosting deployed only for `hosting:student`.
- Hosting URL: `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/57dd5f9d5989444c`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782876518323000`.
- GAS and Firebase Rules were not deployed for this change.

### rollback

- Restore files from `backup/tycvaccinetest_cache_control_20260701_112304/`.
- If the route header patch must also be restored, use `backup/tycvaccinetest_cache_route_header_20260701_112755/`.
- Revert this cache-control commit and redeploy Firebase Hosting for `hosting:student` if already deployed.

## TYC_VaccineTest solo 0.1.0 - 2026-07-01 round 2 fixes

### fix - solo mobile flow, leaderboard, treasure, achievements, challenge card

- Kept the solo app version independently managed as `0.1.0`; the root project `package.json` version was not bumped.
- Locked the mobile quiz body during answering so the page itself does not scroll; long content is constrained inside quiz areas or modal panels.
- Improved leaderboard loading by increasing JSONP timeout and adding retry for `getSoloLeaderboard`.
- Changed treasure flow so correct answers create unopened treasure boxes; players must open boxes themselves before receiving items.
- Changed achievement flow to show achievement progress, claimable state, and claimed state; claiming achievements adds unopened treasure boxes.
- Changed challenge card flow to use an in-app panel with `猜大`, `猜小`, and `不猜`, matching the original interactive design concept instead of browser `confirm`.
- Added `npm run test:tycvaccinetest:round2` to cover no body scroll, manual treasure opening, challenge card panel, and achievement box claiming.

### test

- `node --check frontend/student/dist/TYCVACCINETEST/app.js`
- `node --check scripts/tycvaccinetest-round2-behavior-test.mjs`
- `npm run test:tycvaccinetest:round2`
- `npm run test:tycvaccinetest:mobile`
- `npm run test:tycvaccinetest:resume`
- `npm run test:tycvaccinetest:smoke`
- Online smoke, resume, mobile, and round2 behavior tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`.
- Online real GAS leaderboard check passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`.

### deploy - 2026-07-01

- Firebase Hosting deployed only for `hosting:student`.
- Hosting URL: `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/70c3611dfcbeeea6`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782875349686000`.
- GAS and Firebase Rules were not deployed for this change.

### rollback

- Restore files from `backup/tycvaccinetest_fix_round2_20260701_105547/`.
- Revert this round 2 fix commit and redeploy Firebase Hosting for `hosting:student` if already deployed.

## TYC_VaccineTest solo 0.1.0 - 2026-07-01

### feat - TYC_VaccineTest solo mobile one-screen quiz

- Kept the solo app version independently managed as `0.1.0`; the root project `package.json` version was not bumped for this solo-only adjustment.
- Added `frontend/student/dist/TYCVACCINETEST/VERSION.md` to document the solo version source and maintenance rule.
- Redesigned the solo quiz mobile answering screen so the top title/header is hidden while playing and the quiz status bar is compact.
- Changed mobile utility buttons to stay fixed near the top during answering, so tools do not scroll away.
- Changed mobile utility content to open in an overlay panel instead of extending the answer page downward.
- Kept item timing unchanged: items can only be used after answering and before starting the next question.
- Kept the original interactive student root path `/` unchanged; this change is isolated to `frontend/student/dist/TYCVACCINETEST/`.
- Strengthened `npm run test:tycvaccinetest:mobile` to verify fixed controls, reduced mobile scrolling, collapsed options after answer, and overlay panel height.

### test

- `node --check frontend/student/dist/TYCVACCINETEST/app.js`
- `node --check scripts/tycvaccinetest-mobile-panel-test.mjs`
- `npm run test:tycvaccinetest:smoke`
- `npm run test:tycvaccinetest:resume`
- `npm run test:tycvaccinetest:mobile`
- Online smoke, resume, and mobile tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`.
- Online mobile viewport check passed: homepage shows `版本 0.1.0`, topbar hidden during answering, utility buttons remain fixed near the top before and after answering, options collapse after answer, and utility panel opens as an overlay.
- Online path check passed: `/TYCVACCINETEST/` returns the solo app and `/` remains the original interactive student app.

### deploy - 2026-07-01

- Firebase Hosting deployed only for `hosting:student`.
- Hosting URL: `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/627e10bed365ced7`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782873503774000`.
- GAS and Firebase Rules were not deployed for this change.

### rollback

- Restore files from `backup/tycvaccinetest_mobile_one_screen_20260701_101000/`.
- Revert this solo mobile UI commit and redeploy Firebase Hosting for `hosting:student` if already deployed.

## 0.7.46 - 2026-07-01

### feat - TYC_VaccineTest solo mobile panels and readable text

- Improved solo quiz readability by rendering question, answer, and explanation text as separated readable blocks.
- Added utility buttons for `狀態`, `寶箱`, `成就`, `道具`, `解析`, and `排行`.
- On mobile, the side panel is hidden and the utility buttons open a bottom panel, reducing long scrolling during quiz operation.
- On mobile after answering, the option list collapses and the page scrolls to the answer result area.
- Removed the homepage fixed text labels for `每題 60 秒` and `完成後送出排行榜`; only the solo version remains visible.
- Fixed leaderboard rendering by accepting GAS responses that return leaderboard data in `rows` as well as `leaderboard`.
- Added `npm run test:tycvaccinetest:mobile` for mobile utility panel verification.

### test

- `node --check frontend/student/dist/TYCVACCINETEST/app.js`
- `node --check scripts/tycvaccinetest-smoke-test.mjs`
- `node --check scripts/tycvaccinetest-resume-test.mjs`
- `node --check scripts/tycvaccinetest-mobile-panel-test.mjs`
- `npm run test:tycvaccinetest:smoke`
- `npm run test:tycvaccinetest:resume`
- `npm run test:tycvaccinetest:mobile`
- Mobile screenshot verification: answer-page inline explanation count `0`, utility buttons `6`, options collapsed after answer.
- Online smoke, resume, and mobile panel tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`.
- Online path check passed: `/TYCVACCINETEST/` returns the solo app and `/` remains the original interactive student app.
- Online real GAS leaderboard check passed and rendered row data returned from `rows`.

### deploy - 2026-07-01

- Firebase Hosting deployed only for `hosting:student`.
- Hosting URL: `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/8a264f1287ff0146`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782871092467000`.
- GAS and Firebase Rules were not deployed for this change.

### rollback

- Restore files from `backup/tycvaccinetest_ui_mobile_panels_20260701_094500/`.
- Revert the `0.7.46` commit and redeploy Firebase Hosting for `hosting:student` if already deployed.

## 0.7.45 - 2026-07-01

### feat - TYC_VaccineTest solo UI and local resume

- Kept the solo app isolated in `frontend/student/dist/TYCVACCINETEST/`; the original interactive student root path `/` is unchanged.
- Updated the solo homepage so visible UI uses user-facing labels only and no longer shows internal project or URL code names.
- Restyled the solo app with the original interactive student app pixel-panel look, including item icons, treasure-open feedback, answer feedback, explanation, side status, and item box positions.
- Added local-only interrupted quiz resume using `localStorage` key `tycVaccineTestSoloDraft`.
- Draft progress stores nickname, answer progress, score, item use, achievements, inventory, and last answered state only in the browser; it is not sent to Firebase or GAS.
- Added an explicit guard so incomplete quizzes are never submitted to the score service.
- Kept item timing unchanged for solo mode: items can only be used after answering and before starting the next question.
- Added `npm run test:tycvaccinetest:resume` to verify local resume behavior.

### test

- `node --check frontend/student/dist/TYCVACCINETEST/app.js`
- `node --check scripts/tycvaccinetest-smoke-test.mjs`
- `node --check scripts/tycvaccinetest-resume-test.mjs`
- `py C:\Users\10024487\.agents\skills\webapp-testing\scripts\with_server.py --server "npm run dev:student" --port 5173 --timeout 30 cmd /c npm run test:tycvaccinetest:smoke`
- `py C:\Users\10024487\.agents\skills\webapp-testing\scripts\with_server.py --server "npm run dev:student" --port 5173 --timeout 30 cmd /c npm run test:tycvaccinetest:resume`
- Online browser smoke test passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`.
- Online browser resume test passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`.
- Online path check passed: `/TYCVACCINETEST/` returns the solo app and `/` remains the original interactive student app.
- Online homepage leaderboard check passed; visible rows are capped at 10.

### deploy - 2026-07-01

- Firebase Hosting deployed only for `hosting:student`.
- Hosting URL: `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/d2f96a6c2d8daf2f`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782869042453000`.
- GAS and Firebase Rules were not deployed for this change.

### rollback

- Restore the files from `backup/tycvaccinetest_ui_resume_20260701_090511/`.
- Revert this commit and redeploy Firebase Hosting for `hosting:student` if already deployed.

## 0.7.44 - 2026-06-30

### feat - TYC_VaccineTest solo app 0.1.0

- Added standalone solo quiz entry at `frontend/student/dist/TYCVACCINETEST/`.
- Future student Hosting URL: `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`.
- Local test URL: `http://localhost:5173/TYCVACCINETEST/`.
- Root student path `/` remains the original interactive student app.
- Added Firebase question path `soloQuestions/TYC_VaccineTest/v0_1_0`.
- Added question seed generator and generated 60-question seed from the existing vaccine and child protection bundled rows.
- Added GAS actions `submitSoloResult` and `getSoloLeaderboard`.
- Same `playerId` keeps the best solo score; nickname changes update the leaderboard display name.
- Updated the local static server so subfolder URLs such as `/TYCVACCINETEST/` serve their own `index.html`.
- Added `npm run test:tycvaccinetest:smoke` for local browser smoke testing.

### risk control

- The solo site is isolated in its own folder and does not replace existing student, instructor, or display entry files.
- No credentials, tokens, cookies, or personal data were added to source code.
- Firebase runtime questions still come from Firebase; local seed is only used when the URL includes `?localQuestions=1`.
- Smoke test passed on port `5183`; port `5173` was already occupied during this edit session.
- Rollback: restore modified files from `backup/tycvaccinetest_solo_0_1_0_20260630_172543`, delete `frontend/student/dist/TYCVACCINETEST/`, delete `scripts/build-tycvaccinetest-question-seed.mjs`, and delete the generated seed JSON files if needed.

### deploy - 2026-06-30

- Firebase Database Rules deployed for project `tychbniis-32af5`.
- Firebase Realtime Database solo question seed uploaded to `soloQuestions/TYC_VaccineTest/v0_1_0` with 60 questions.
- Firebase Hosting `hosting:student` deployed to `https://tychbniis-32af5-student.web.app`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/b31810b6ad13ee09`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782813269298000`.
- GAS `Code.gs` pushed with `clasp push`.
- Existing formal GAS Web App deployment `AKfycbzZ9gNIsS70ihBG0dWCgtFKh4wuJaM0ttYqwSfG6dqGDRBHtgq-Ui7UtC_1GDEYm4u5` updated to `@119`; URL unchanged.
- Online verification passed:
  - `/TYCVACCINETEST/` returns the solo app.
  - `/` still returns the existing interactive student app.
  - Firebase solo question path returns 60 questions from `vac_q001` to `vac_q060`.
  - GAS `getSoloLeaderboard` and `submitSoloResult` return `ok:true`.
  - Online homepage leaderboard button renders GAS rows.
  - Online browser smoke test passed using deployed solo assets.

## 0.7.43 - 2026-06-29

### fix - display tablet bottom clipping

- Projection page no longer locks the whole page to `100vh` with hidden overflow, preventing the question and final result screens from being cut off on 11.5 inch tablets.
- `Display.html` now loads `styles.css?v=0.7.43` so deployed tablets receive the corrected layout.
- Added a conservative landscape tablet rule for shorter viewports to reduce spacing and card height without changing scoring, Firebase, GAS, or question data.

### risk control

- Display-only CSS and cache update.
- No student flow, instructor control logic, scoring formula, Firebase rules, GAS backend, question bank content, credentials, or personal data handling were changed.
- Rollback: restore the files from `backup/v0_7_43_display_tablet_layout_20260629_150441`, or revert this commit and redeploy Firebase Hosting if already deployed.

### deploy

- Firebase Hosting deployed only for `hosting:instructor`.
- Hosting URL: `https://tychbniis-32af5-instructor.web.app`.
- Firebase Hosting version: `projects/896193010112/sites/tychbniis-32af5-instructor/versions/5e08c9d0cd108ee6`.
- Firebase live release: `projects/896193010112/sites/tychbniis-32af5-instructor/channels/live/releases/1782717131254000`.

## 0.7.42 - 2026-06-22

### feat - treasure plan supports 100 questions

- Student local per-question treasure plan limit increased from 50 to 100 questions.
- `TREASURE_PLAN_QUESTION_LIMIT` is now `100`.
- `buildStaticTreasurePlan()` default `maxQuestionSlots` is now `100`.
- Student `index.html` and changed module import cache parameters were updated to `0.7.42`.

### deploy

- GAS `Code.gs` was pushed with `clasp push`.
- Existing formal GAS Web App deployment `AKfycbzZ9gNIsS70ihBG0dWCgtFKh4wuJaM0ttYqwSfG6dqGDRBHtgq-Ui7UtC_1GDEYm4u5` was updated to version `@118`; URL unchanged.
- Student Firebase Hosting was deployed to `https://tychbniis-32af5-student.web.app`.
- Deployment verification passed:
  - Student HTML returns `200` and loads `app.js?v=0.7.42`.
  - Online `app.js` contains `TREASURE_PLAN_QUESTION_LIMIT = 100`.
  - Online `static-v4.js` defaults `maxQuestionSlots` to `100`.

### risk control

- No question bank content, scoring formula, instructor UI, projection UI, GAS backend, Firebase rules, or deployment settings were changed.
- This only expands the number of questions eligible for answer-correct treasure box planning.

## 0.7.41 - 2026-06-22

### feat - child protection questions in vaccine bank

- GAS bundled vaccine question bank now includes `兒少虐待與疏忽測驗題.md` as `vac_q051` to `vac_q060`.
- Instructor question bank UI is unchanged; selecting `疫苗題庫` already includes all enabled `vac_q###` questions, so the new questions appear after running the existing vaccine question bank update flow.
- `updateVaccineQuestionBankFromMenu()` now combines the original 50 vaccine education questions with the 10 child protection and neglect questions.

### risk control

- No student flow, instructor UI, scoring formula, Firebase rules, or deployment settings were changed.
- Existing `vac_q001` to `vac_q050` IDs remain unchanged.
- Old `vac_q` rows missing from the bundled source are still disabled rather than deleted, preserving the previous audit trail behavior.

## 0.7.40-final - 2026-06-12

### docs - V7 final release

- Marked `0.7.40` as the 第 7 版定版 baseline.
- Added `docs/23_v7_final_release.md` with formal URLs, deployment state, scoring rules, Blaze guidance, validation results, and rollback steps.
- Current formal baseline:
  - Git commit: `67274bf`
  - Firebase Hosting: student and instructor sites deployed with `0.7.40` assets.
  - GAS Web App: formal deployment updated to version `116`.
- Final audited score snapshot:
  - `AAA` answered 50 questions.
  - 42 answers were correct.
  - Answer score: `1010`.
  - Item score: `23`.
  - Personal total: `1033`.
  - Single-player team total: `1033`.

### risk control

- No runtime code was changed in this finalization step.
- Rollback remains available through Firebase Hosting release history, Apps Script deployment version selection, and Git commit history.

## 0.7.40 - 2026-06-12

### fix - legacy scoreboard resync after item use

- Legacy GAS close-question fallback now runs full Firebase answer synchronization and scores all opened answers before recalculating the public scoreboard.
- This fixes the case where item usage causes Firebase fast scoring to fall back to GAS / Sheets, but only the current question was synced, leaving earlier Firebase-only answers out of the leaderboard.
- Projection team leaderboard wording changed from `平均` to `答題平均分`.
- Student and projection cache parameters updated to `0.7.40`.

### validation

- Current public answer audit before the fix showed `AAA` had 50 answers, 42 correct, and `1010` answer points in `publicAnswers`.
- Current `publicScoreboards` showed only `340` answer points plus `23` item points, total `363`, confirming the public leaderboard snapshot was missing Firebase answer history.

### risk control

- Scoring formulas are unchanged. The fix only changes the legacy fallback data source completeness before recalculation.
- Firebase fast scoring remains unchanged when no item usage blocks it.

## 0.7.39 - 2026-06-12

### fix - student question color and correct-answer treasure awarding

- Student main question text now uses the same red-brown emphasis as the projection main question text, so it is visually distinct from grouped statement lines.
- Projection main question text uses the same red-brown emphasis for consistency.
- Student correct-answer treasure awarding now runs after answer reveal as well as immediate submit-time scoring. This covers Firebase fast-submit cases where the client only confirms correctness after the instructor closes the question.
- Student and projection cache parameters updated to `0.7.39`.

### risk control

- Treasure chance remains `30%`; item weights, score rules, Firebase rules, GAS, and leaderboard calculation are unchanged.
- Duplicate treasure awarding is still blocked by the existing `boxId` check, so the same question cannot add the same local question treasure twice.

## 0.7.38 - 2026-06-12

### fix - grouped statement font and explanation hanging layout

- Student and projection grouped statement text now uses a rounded Traditional Chinese font stack (`GenSenRounded TW`, `GenSenRounded`, `源泉圓體`, `Noto Sans TC`, Microsoft JhengHei fallback).
- Grouped statement text is now about `2pt` smaller than the main question text.
- Grouped statement numbers now inherit the same color as the statement text.
- Projection answer explanations now use a hanging layout for labels such as `A：` and `敘述 3：`, aligning multi-line explanation copy under the explanation text instead of the label.
- Student and projection cache parameters updated to `0.7.38`.

### risk control

- Display-only typography and layout update. Answer submission, scoring, Firebase rules, GAS, items, treasure boxes, and leaderboards are unchanged.

## 0.7.37 - 2026-06-12

### fix - grouped statement typography

- Removed the colored guide lines before grouped question statements on both student and projection pages.
- Grouped statement numbers now use one unified accent color instead of rotating green, blue, and orange.
- Grouped statement text now uses a serif Traditional Chinese font stack (`Noto Serif TC`, `Source Han Serif TC`, MingLiU fallbacks) to distinguish scenario statements through typography and layout instead of background blocks.
- Student and projection cache parameters updated to `0.7.37`.

### risk control

- CSS-only visual adjustment plus cache version bump. Question parsing, answer submission, scoring, Firebase rules, GAS, items, treasure boxes, and leaderboards are unchanged.

## 0.7.36 - 2026-06-12

### fix - pixel-style question readability

- Student answer options were restored to the previous plain option-button text rendering.
- Student grouped question statements no longer use colored background boxes; they now use pixel-style text hierarchy, colored numbering, and left-side pixel guide lines.
- Projection grouped question statements now use colored numbering and pixel guide lines, making numbered scenario statements easier to scan without adding card-like backgrounds.
- Student and projection cache parameters updated to `0.7.36`.

### risk control

- Display-only correction after `0.7.35`. Answer submission, scoring, Firebase rules, GAS, item use, treasure boxes, and leaderboard data are unchanged.

## 0.7.35 - 2026-06-12

### fix - student question readability

- Student answer page now renders long scenario questions as separate readable lines when the text contains numbered statements like `1.`、`2.`、`3.`.
- Student answer dialog uses the same readable question renderer as the page, so learners can read grouped questions before choosing an answer.
- Answer option buttons now separate the option label and answer text, with distinct label colors for easier scanning on mobile.
- Student `index.html` cache parameters updated for `styles.css` and `app.js` to `0.7.35`.

### risk control

- Display-only readability fix. Answer submission payloads, scoring, Firebase rules, GAS, items, treasure boxes, and leaderboards are unchanged.

## 0.7.34 - 2026-06-12

### fix - display question and explanation readability

- Projection page now renders long question stems as separate lines when the text contains numbered scenario statements like `1.`、`2.`、`3.`.
- Projection page now renders answer explanations as separate lines when the text contains option labels like `A：`、`B：`、`C：`、`D：`.
- Instructor projection `Display.html` cache parameters updated for `styles.css` and `display.js` to `0.7.34`.

### risk control

- Display-only readability fix. Student flow, instructor scoring, Firebase rules, GAS, item scoring, and leaderboard data are unchanged.

## 0.7.33 - 2026-06-11

### fix - student challenge card dialog

- Challenge card dialogs can now be closed while a challenge result is settling, without cancelling the in-flight item-use write.
- Challenge card results now auto-close after a short confirmation window, preventing the student UI from staying on "settling" and blocking the treasure or answer flow.
- Student `app.js` and stylesheet cache parameters updated to `0.7.33`.

### risk control

- UI-state fix only. Item-use scoring payloads, Firebase rules, GAS, scoreboards, and settlement logic are unchanged.

## 0.7.32 - 2026-06-11

### fix - student dialogs during new question

- Student client now closes utility, leaderboard, and challenge dialogs automatically when a new question opens, preventing achievement or treasure panels from blocking the answer flow.
- Student `app.js` and stylesheet cache parameters updated to `0.7.32`.

### risk control

- UI-state fix only. Scoring, Firebase rules, GAS, treasure data, achievement data, and item scoring are unchanged.

## 0.7.31 - 2026-06-11

### fix - student utility dialog opacity

- Student treasure and achievement dialogs now disable the dialog fade-in animation, preventing the panel from appearing semi-transparent over the final result area during real-browser operation and screenshots.
- Student stylesheet cache parameter updated to `0.7.31`.

### risk control

- CSS-only fix. Scoring, Firebase rules, GAS, treasure logic, achievement logic, and item-use logic are unchanged.

## 0.7.30 - 2026-06-11

### fix - student utility dialog readability

- Student utility dialogs now force an opaque panel background and isolated stacking context, preventing the finalized result area from visually bleeding through the achievement and treasure panels.
- Student stylesheet cache parameter updated to `0.7.30`.

### risk control

- CSS-only fix. Scoring, Firebase rules, GAS, treasure logic, achievement logic, and item-use logic are unchanged.

## 0.7.29 - 2026-06-11

### fix - final score, team balance, treasure audit

- GAS `finalizeCompetition` now syncs Firebase answers into the answer ledger and scores only unscored answer rows before final scoreboard recalculation. This prevents final settlement from publishing `answerScore = 0` when close-question scoring used the Firebase fast path.
- Student auto team assignment now reads `publicPlayers/{gameId}` instead of protected `players/{gameId}`, so sequential real-browser joins can pick the least-loaded team instead of falling back to hash distribution.
- Student achievement claims and all treasure box openings now write lightweight Firebase request records for backend audit.
- Realtime Database rules allow `publicAnswers/{gameId}` reads during `question_closed`, `finalizing_countdown`, and `finalized` states for settlement verification.
- Firebase Hosting deployed `0.7.29`; GAS Web App deployment updated to `@115`, official URL unchanged.

### risk control

- Scoring is keyed by `gameId + questionId + playerId`; existing scored rows are not recalculated, preventing duplicate scoring after a student leaves and rejoins.
- Student `clientVersion` remains `0.7.27-score-source-consistency`; only cache query parameters changed to `0.7.29` to avoid unnecessary local reset.

## 0.7.28 - 2026-06-10

### fix - treasure state preserve

- 修正講師端用 Firebase 直接發送追加寶箱或落後寶箱後，GAS 開題、關題、背景計分或最終結算整包寫回 `gameState` 時，可能用試算表舊狀態覆蓋 Firebase 最新寶箱欄位的問題。
- 新增 GAS 共用保護：發布 `gameState` 前合併 Firebase 最新 `additionalTreasureBoxLevel`、`additionalTreasureBoxSlots`、`additionalTreasureBoxUpdatedAt`、`laggingTreasureBoxTeams`、`laggingTreasureBoxUpdatedAt`。
- 開題、重新開題、關題揭示、關題計分、最終倒數與最終結算都套用寶箱欄位保留邏輯；重置與新開場仍維持清空設計。
- 本次檢查目前已結算資料：GAS `getScoreboard` 與 Firebase `publicScoreboards/{gameId}` 的 `teams` / `players` 一致。`team_1 = 答題 120 + 道具 89 = 總分 209`；AAA `120 + 54 = 174`；Bbb `120 + 35 = 155`。

### risk control

- 未修改答題分數公式、道具效果分數、翻身卡公式與排行榜計算公式。
- 學員端 `clientVersion` 保留 `0.7.27-score-source-consistency`，只更新靜態檔查詢參數，避免既有學員重新加入時被清成新資料。
- 已執行前端與 GAS 語法檢查。
- Firebase Hosting 已部署 `0.7.28`；GAS Web App deployment 已更新為 `@114`，正式 URL 不變。

## 0.7.27 - 2026-06-10

### fix - score source consistency

- 修正 GAS 同步 Firebase 答案時只讀私有 `answers` 的問題；現在會合併 `answers` 與 `publicAnswers`，公開作答資料可作為正式結算備援來源。
- 修正 Firebase 已送出的 `responseSeconds` 被 GAS 再次 `normalizeV4ResponseSeconds()` 的問題；學生端送出的秒數已是有效秒數，GAS 直接使用，避免 11 秒被轉成 6 秒而錯算成 30 分。
- 修正既有答案列若與 Firebase 公開資料的答案、隊伍或秒數不同，會清空該列分數欄位，讓關題結算重新計算。
- 講師端 Firebase 暫時計分移除首答額外 +5；首答加分目前正式規則為 0。
- 修正學員端 `config.js` 仍停在 `0.6.6` 與舊 GAS Web App URL 的問題，改為 `0.7.27-score-source-consistency` 與目前 V7 GAS Web App。

### risk control

- 不改答題分級表，只修正秒數來源與同步來源。
- 以目前線上公開資料驗證：11 秒應為 25 分；同一學員 Q1、Q2 作答應兩題都納入。
- Firebase Hosting 已部署 `0.7.27`；GAS Web App deployment 已更新為 `@113`。

## 0.7.26 - 2026-06-10

### fix - question ledger item scoring

- Open-order rule: scoring uses the real `openedQuestionIds` order, not numeric question order. If the instructor opens Q1, Q3, then Q5, closing Q5 includes item scores from Q1 and Q3, excludes item scores used after Q5, and dedupes by `itemId`.

- 修正道具分帳本規則：關題後使用的道具分歸屬於當題，例如 Q1 關題後使用道具即記為 Q1 道具分。
- 修正排行榜納入時點：Q1 道具分不在 Q1 關題當下刷新排行榜，而是在 Q2 關題結算時納入，因此 Q2 關題後排行榜應為 `Q1 答題分 + Q1 道具分 + Q2 答題分`。
- 講師端 Firebase 暫時計分改為讀取 `itemUses/{gameId}`，依 `settleAtCloseSequence` 判斷是否已到排行榜納入時點，並把道具分加到個人 `itemScore` 與戰隊 `teamBonusScore`。
- GAS 同步 Firebase 道具使用紀錄時，保留道具原本歸屬題號，不再因為於下一題關題時同步而改寫成下一題題號。
- 移除講師端暫時計分以舊排行榜較高分覆蓋新結果的保底行為，避免掩蓋題目帳本計算錯誤。

### risk control

- Verified skip-order fixture: with `openedQuestionIds = q1,q3,q5`, closing q5 includes q1/q3 item scores, excludes q5 item scores, and counts duplicated `itemId` only once.
- Firebase Hosting deployed `0.7.26`; GAS Web App deployment updated to `@112`.

- 不改答題基本分公式，不改寶箱抽取流程，不改正式排行榜排序規則。
- `targetQuestionId` 表示道具分歸屬題號；`settleAtCloseSequence` 表示何時納入排行榜。
- 已用假資料驗證：Q1 答題 30 分、Q1 道具 10 分、Q2 答題 25 分，Q2 問題後排行榜為 65 分。

## 0.7.25 - 2026-06-10

### fix - scoreboard refresh timing and player ID duplicate answer guard

- 學員端排行榜彈窗若已開啟，現在只會在每題 `question_closed` 與 `finalized` 時自動刷新；學員使用道具當下不刷新排行榜。
- GAS 正式排行榜合併同一身份玩家時，同一學員同一題只取最早送出的 1 筆作答，避免換裝置、無痕模式或清除瀏覽器資料後重新加入造成同題重複計分。
- 講師端 Firebase 快速暫定排行榜也依正規化暱稱合併同一學員，並對同一身份同一題去重，讓暫定榜與正式榜一致。

### risk control

- 0.7.25 最終採用 playerId/clientKey 為身份依據；相同姓名可以加入，姓名只作畫面顯示，不作分數合併。
- 同一 playerId 同一題若重送多筆答案，只取最早 1 筆計分，避免重新整理或網路重送造成重複計分。
- Firebase Hosting 已部署 `0.7.25`；GAS Web App deployment 已更新為 `@111`。
- 不改作答寫入路徑，不改道具結算時序。
- 同一台裝置同一瀏覽器原本就會用固定 `clientKeyHash` 產生同一 `playerId`；本次補強的是換裝置或清除資料後的重複身份風險。
- 正式活動仍建議要求學員使用唯一且固定的暱稱。

## 0.7.24 - 2026-06-10

### fix - cumulative temporary scoreboard

- 修正講師端 Firebase 快速暫定排行榜只計算當題作答，可能覆蓋累積排行榜分數的問題。
- 快速暫定排行榜改為累積 `publicAnswers` 中所有可計分題目，並補上首位答對加分，讓暫定榜與 GAS 快速計分公式一致。
- 寫入暫定快照前會讀取既有 `publicScoreboards/{gameId}`，若既有快照屬於目前場次且分數較高，暫定快照不會把戰隊或個人分數往下覆蓋。

### risk control

- 未改 Firebase rules，避免公開讀取 `itemUses`。
- 未改 GAS 正式排行榜公式；GAS 背景結算仍會覆寫正式快照。
- 備份位置：`backup/v0_7_24_scoreboard_floor_20260610_105118/`。
- Firebase Hosting 已部署 `0.7.24`；GAS 同一 Web App deployment 已更新到 `@110`。

## 0.7.23 - 2026-06-10

### fix - official scoreboard sync

- 修正學員端排行榜與投影端排行榜不一致：學員端不再把本地暫算個人分數合併進戰隊排行榜，統一以 Firebase `publicScoreboards/{gameId}` 官方快照顯示。
- 修正學員端戰隊排行榜顯示分數來源，改用與投影端相同的 `weightedAverageScore / finalScore / totalScore` 順序。
- 修正翻身卡計分來源：使用翻身卡時，優先讀取 Firebase 官方排行榜快照，依該題關題後排行榜結果決定翻身卡分數；快照尚未到位時才退回 `gameState.comebackControl`。
- 修正學員中途離開後重新加入分數歸零：加入後會嘗試從 Firebase 官方排行榜快照找回該學員既有分數，再更新學員端本地分數。
- 修正投影端關題後又突然回到倒數：同一題已關題後，如果又收到較舊的 `question_open` 狀態，投影端會忽略該舊狀態。

### risk control

- 未改作答寫入、寶箱發放、GAS 主計分公式。
- 排行榜以 Firebase 官方快照為準；學員端不再用本地暫算分數改寫戰隊排行。
- Firebase Hosting 已部署 `0.7.23`；GAS 同一 Web App deployment 已更新到 `@109`。
- 還原方式：回復本次 commit，重新部署 Firebase Hosting；GAS 可切回前一版 deployment `@108`。

## 0.7.22 - 2026-06-09

### fix - comeback card immediate apply

- 修正學員端翻身卡按下使用後，只停在送出流程，沒有立即標記為已套用與刷新分數的問題。
- 翻身卡送出 Firebase 成功後，前端會立即呼叫 `markItemUseApplied()`，把本題、加分、套用訊息寫入本地道具使用紀錄。
- 翻身卡套用後會立即刷新本地背包、道具紀錄、成就提示與個人分數，不需要重新整理頁面。
- 使用中會先顯示「正在使用翻身卡，請稍候。」，避免使用者誤以為畫面無反應。

### risk control

- 未改變第 6 版翻身卡分數規則：最後一名隊伍 30 分、一般 5 分、同隊第 2 次 10 分、同隊最多 2 張。
- 未改 GAS 計分同步邏輯；Firebase `itemUses` 仍保留給講師結算與最終同步使用。
- Firebase Hosting 已部署 `0.7.22`；GAS 同一 Web App deployment 已更新到 `@108`。
- 還原方式：回復本次 commit，重新部署 Firebase Hosting；GAS 可切回前一版 deployment `@106`。

## 0.7.21 - 2026-06-09

### fix - live treasure grant state timing

- 修正講師發送追加寶箱、落後寶箱後，學員端可能沒有在輪詢時立即套用的問題。
- Root Cause：GAS 發送寶箱時只更新 `additionalTreasureBoxUpdatedAt` / `laggingTreasureBoxUpdatedAt`，未同步更新 `gameState.updatedAt`；學員端舊狀態保護主要比較 `updatedAt`，可能把寶箱事件視為舊快照略過。
- 講師端追加寶箱與落後寶箱改為 Firebase 直接更新 `gameState`，GAS `grantTreasureBoxes` 保留作為備援，降低 Apps Script 延遲。
- GAS `grantTreasureBoxes` 現在發送追加寶箱或落後寶箱時會同步更新 `updatedAt`。
- 學員端 `shouldIgnoreStaleGameState()` 現在會把 `additionalTreasureBoxUpdatedAt`、`laggingTreasureBoxUpdatedAt` 一起納入新舊狀態判斷。
- 修正投影端戰隊排行榜快照保護：正式排行榜不再預設標為 temporary；投影端遇到 temporary、舊場次或不完整快照時會保留最後一份有效戰隊總排行，避免跳成單題結果或空排行。
- 修正翻身卡使用時機：學員按下道具前會先主動讀取最新 Firebase `gameState`，避免尚未輪詢到關題或 `comebackControl` 時誤判不能使用。

### risk control

- 保留既有 slot 去重與本機已領取紀錄，避免同一追加寶箱或同一落後寶箱重複發放。
- 不改寶箱內容抽取規則、不改道具計分公式、不改 Firebase rules。
- Firebase Hosting 已部署，GAS Web App 沿用既有網址並更新至 deployment `@106`。
- 還原方式：回退本次 commit 後重新部署 Firebase Hosting；GAS 可切回 deployment `@105`。

## 0.7.20 - 2026-06-09

### fix - student reward and item notices

- 修正學員端寶箱、成就與道具使用後的提示同步：每次更新回答頁提示時，都會重新讀取本機寶箱與成就狀態，避免舊快取造成「點開成就後才看到通知」。
- 追加寶箱與落後寶箱套用後會同步重繪本機寶箱、道具清單、成就面板與回答頁提示，降低學員端必須重新整理才看到寶箱的情況。
- 道具使用、佇列送出、補送 Firebase `itemUses`、以及加倍卡套用後，都會同步重算成就提示與回答頁提醒。
- 修正學員端加分卡使用後的道具列文字，避免 `+1/+3/+5/+10` 這類直接加分卡誤顯示為「下一題套用」。
- 已確認並保留第 6 版定版道具計分分類：`+1/+3/+5/+10` 加分卡、挑戰卡、翻身卡為當下計入道具分；加倍卡是唯一下一題套用，下一題答對時加倍本題分。

### risk control

- 本次不改 Firebase rules、不改 GAS 計分公式、不改寶箱或道具資料結構。
- 學員端 `clientVersion` 仍維持 `0.6.6`，避免現場學員被迫重新報到；僅更新靜態檔快取參數到 `0.7.20`。
- Firebase Hosting 已部署，GAS Web App 沿用既有網址並更新至 deployment `@105`。
- 還原方式：回退本次 commit 後重新部署 Firebase Hosting；若 GAS deployment 已更新，可切回前一版 `@104`。

## 0.7.19 - 2026-06-09

### fix - restore v6 item flow and clear stale snapshots

- 學員端寶箱與翻身卡流程回復第 6 版 `0.6.13` 設計，只保留第 7 版 Firebase 資料來源。
- 移除上一版新增的學員端與投影端 Firebase `EventSource` 即時推播監聽，回到第 6 版較穩定的輪詢流程。
- 翻身卡等待本題結算時，回復第 6 版 15 秒後自動再確認，不再使用 3 秒重新讀取改造。
- 重新啟用場次或回到等待開題時，學員端會清空上一題畫面，避免看到舊題目快照。
- 投影端與學員端排行榜會略過早於目前場次啟用時間的舊 `publicScoreboards` 快照，避免重新啟用後仍顯示上一場排行榜。

### risk control

- 不修改追加 10 箱、落後 5 箱、翻身卡分數規則、題庫、Firebase rules 或核心計分公式。
- 學員端 `clientVersion` 仍維持 `0.6.6`，避免現場學員被迫重新報到；僅更新靜態檔快取參數到 `0.7.19`。
- Firebase Hosting 已部署，GAS Web App 沿用既有網址並更新至 deployment `@104`。
- 還原方式：回退本次 commit，或回復 `frontend/student/dist/app.js`、`frontend/instructor/dist/display.js` 與版本參數後重新部署。

## 0.7.18 - 2026-06-09

### fix - live treasure, display scoreboard, comeback card

- 修正講師清空資料後，講師端追加寶箱與落後寶箱按鈕沒有立即回到未啟用狀態的問題。
- 修正投影端仍載入舊版 `config.js` / `display.js` 快取參數，可能導致排行榜讀到舊 GAS 設定或舊排序邏輯的問題。
- 投影端排行榜排序與顯示改為優先使用 `weightedAverageScore`，再退回 `finalScore` / `totalScore`。
- 修正學員端收到追加寶箱或落後寶箱狀態後，只顯示通知但沒有立即重繪寶箱清單的問題。
- 翻身卡在 `comebackControl` 抵達後會立即重繪道具狀態；若學員太早按翻身卡，會改為 3 秒後重新讀取狀態並重試。

### risk control

- 不修改題庫、Firebase rules 或基礎答題計分公式。
- 學員端 `clientVersion` 仍維持 `0.6.6`，避免現場學員被迫重新報到。
- Firebase Hosting 已部署，GAS Web App 沿用既有網址並更新至 deployment `@103`。
- 還原方式：回退本次 commit，或回復 `frontend/student/dist/app.js`、`frontend/instructor/dist/app.js`、`frontend/instructor/dist/display.js`、`frontend/instructor/dist/Display.html` 後重新部署。

## 0.7.17 - 2026-06-09

### fix - scoreboard and treasure state

- 修正學員端排行榜彈窗分數可能低於上方「個人積分」的問題。
- 學員端讀取 Firebase `publicScoreboards` 後，會把目前學員本機／GAS 已知較高分數合併到個人排行榜顯示，避免快照落後造成分數不一致。
- 修正第 7 版 Firebase 直接開題／關題與 GAS 背景開題／關題可能覆蓋寶箱狀態的問題。
- `grantTreasureBoxes` 發布寶箱狀態前會先合併 Firebase 最新 `gameState`，避免 GAS 試算表狀態落後時覆蓋目前開題／關題畫面。
- 開題、關題與計分後重新發布 `gameState` 時，會保留：
  - `additionalTreasureBoxLevel`
  - `additionalTreasureBoxUpdatedAt`
  - `additionalTreasureBoxSlots`
  - `laggingTreasureBoxTeams`
  - `laggingTreasureBoxUpdatedAt`
- 學員端 `clientVersion` 不變，避免現場學員被清除報到資料；僅更新 `app.js` 查詢參數為 `0.7.17`。
- Firebase Hosting 已部署，GAS Web App 沿用既有網址並更新至 deployment `@102`。

### risk control

- 不修改題庫、作答資料、計分公式與 Firebase rules。
- 寶箱仍由講師端透過 GAS `grantTreasureBoxes` 發布，學員端只讀 Firebase `gameState` 套用。
- 還原方式：回退本次 commit，或回復 `frontend/student/dist/app.js`、`frontend/instructor/dist/app.js`、`gas/Code.gs` 後重新部署。

## 0.7.16 - 2026-06-09

### fix - V7 Firebase direct start

- 修正第 7 版講師端「啟動場次／開場啟用」可能失敗或等待過久的問題。
- V7 講師端新增 `enableFirebaseDirectStart` 開關；只有 `InstructorV7.html` 會啟用 Firebase 直接開場，一般講師入口維持原流程。
- 講師按「啟動場次」時，前端會先呼叫 `prepareFirebaseInstructorControl` 建立 Firebase proof 所需控制資料，再直接寫入 `gameState/{gameId}` 為 `created`。
- Firebase 直接啟動成功後，GAS `createGame` 改為背景同步 Google Sheets、題庫與管理控制資料。
- 若 Firebase 直接啟動失敗，前端會回退原本 GAS `createGame` 流程。
- 背景 GAS `createGame` 新增 `firebaseFirst` 風險控制：如果 Firebase 已進入開題或關題狀態，GAS 不再覆蓋 `gameState`，避免講師快速開題後被背景同步退回開場狀態。
- Firebase Hosting 已部署；GAS 既有 Web App deployment 已更新到 `@100`，正式 URL 不變。

### risk control

- 不修改學員端作答、題庫內容、計分公式與排行榜公式。
- 不儲存、不輸出管理密碼。
- 第 6 版一般講師入口不啟用 Firebase 直接開場。
- 還原方式：回退本次 commit，或將 `frontend/instructor/dist/config-v7-test.js` 的 `enableFirebaseDirectStart` 改為 `false` 後重新部署 Hosting。

### test

- 已通過 `node --check frontend/instructor/dist/app.js`。
- 已通過 `node --check scripts/v7-pressure-test.mjs` 與 `node --check scripts/v7-batch-status.mjs`。
- 已通過 GAS 語法檢查與 `npm run check:functions`。
- 已通過 JSON 檢查：`package.json`、`package-lock.json`、`firebase/database.rules.json`。
- 已完成線上檔案檢查：`InstructorV7.html`、`config-v7-test.js`、`app.js` 均回應 HTTP 200 且包含 `0.7.16` / `enableFirebaseDirectStart`。
- GAS smoke test 未完成：本機終端連線 `script.google.com:443` 逾時；`clasp deployments` 已確認正式 deployment 為 `@100`。

## 0.7.15 - 2026-06-09

### perf - Firebase first local provisional scoring

- 第 7 版講師端改為 Firebase 優先：開題、關題、公布答案先直接寫入 Realtime Database，GAS 改為背景補算。
- 新增講師端 Firebase 本機快速暫定排行榜：關題後讀取 `publicPlayers` 與 `publicAnswers` 精簡資料，在瀏覽器計分後寫入 `publicScoreboards/{gameId}`。
- 新增 `publicPlayers/{gameId}/{playerId}`：只保存 `playerId`、暱稱、隊伍與報到時間，不保存 `clientKeyHash`。
- 新增 `publicAnswers/{gameId}/{questionId}/{playerId}`：只保存公開計分所需答題欄位，不保存 `clientKeyHash`；只在 `gameState.status === question_closed` 時可讀。
- `players` 與原始 `answers` 仍維持私有讀取，降低公開個資與雜湊欄位外洩風險。
- `publicScoreboards` 新增 proof-protected direct write，講師端必須先寫入私有 `adminProofs`，且 proof 必須符合 `adminSecrets`。
- 學員端改用 Firebase EventSource 監聽 `gameState`，保留 5 秒輪詢作為備援。
- GAS `resetGameData` 清除測試資料時同步清除 `publicPlayers`、`publicAnswers`、`adminSecrets`、`adminProofs`。
- GAS Web App 已更新同一 deployment ID 到 `@98`，網址不變。
- Firebase Hosting 已部署：
  - 學員端：`https://tychbniis-32af5-student.web.app/`
  - 講師端 V7：`https://tychbniis-32af5-instructor.web.app/InstructorV7.html`
  - 投影端：`https://tychbniis-32af5-instructor.web.app/Display.html`

### test

- 已通過 `node --check`：講師端 `api.js`、`app.js`、學員端 `api.js`、`app.js`、`scripts/v7-pressure-test.mjs`。
- 已通過 JSON 檢查：`firebase/database.rules.json`、`package.json`、`package-lock.json`。
- 已通過 `firebase deploy --only database --dry-run`。
- 已部署 Firebase Realtime Database rules。
- 已通過 `npm run test:v7:fast-score`。
- 已通過 `npm run check:functions`。
- 已通過部署後 `npm run test:v7:pressure:smoke`，確認 GAS `@98` 可回應。
- 尚未執行本輪 `0.7.15` 的 100 / 200 人完整壓測，原因：目前終端環境未設定 `V7_TEST_ADMIN_SECRET`，依資安規則不把管理密碼寫入指令或檔案。

### risk control

- Firebase 直接寫入使用私有 proof 路徑，公開 `gameState` 與 `publicScoreboards` 不保存管理密碼。
- `adminSecrets` 與 `adminProofs` 均不可讀；測試清除時會刪除。
- `publicPlayers` 與 `publicAnswers` 是精簡公開資料，避免開放原始 `players` / `answers`。
- 快速排行榜標記為 `isTemporary: true`，GAS 背景補算完成後會覆寫正式快照。
- 若 Firebase 本機計分失敗，講師端會保留 GAS 背景補算，不阻擋活動流程。

## 0.7.14 - 2026-06-02

### perf - inline close scoring

- 新增 GAS 管理 action `closeAndScoreQuestionInline`，讓講師關題可用一次呼叫完成公布答案與 Firebase 快速計分。
- 講師端第 7 版關題流程改為優先呼叫 `closeAndScoreQuestionInline`；若合併計分成功，不再補打一個 `scoreClosedQuestion`。
- 合併計分會把關題時已取得的 `closeSequence` 傳入快速計分路徑，減少一次 Firebase `gameState` 讀取。
- GAS 已建立測試 deployment `@95`，描述為 `0.7.14 v7 inline close known sequence 2026-06-09`。
- `frontend/instructor/dist/config-v7-test.js`、`scripts/v7-pressure-test.mjs`、`scripts/v7-batch-status.mjs` 已改指向 `@95`，講師端 Hosting 已重新部署。
- 線上 `config-v7-test.js` 已確認 HTTP 200，且包含 `@95` deployment ID 與 `0.7.14-inline-close`。
- `@95` 100 人壓測完成：`gameId=v7_perf_20260609031503`、100 名假玩家、100 份假作答、concurrency 25，`submittedCount=100`、`scoredCount=100`、批次狀態 `done`。
- `@95` 100 人壓測完整流程約 27.7 秒；講師實際關題合併呼叫約 14.2 秒；GAS 內部合併處理約 5.7 秒。
- `@95` 200 人壓測完成：`gameId=v7_perf_20260609031756`、200 名假玩家、200 份假作答、concurrency 25，`submittedCount=200`、`scoredCount=200`、批次狀態 `done`。
- `@95` 200 人壓測完整流程約 29.7 秒；講師實際關題合併呼叫約 15.3 秒；GAS 內部合併處理約 7.2 秒。
- 100 / 200 人壓測結束後皆已呼叫 `resetGameData`，清理測試 gameId 的 Firebase 測試路徑。
- 本次仍保留 GAS 作為管理端可信後端；未放寬 Firebase rules，未部署 Cloud Functions，未開通 Blaze。

### feat - firebase fast scoring

- `scoreClosedQuestion` 新增 Firebase 快速計分路徑。
- 一般選擇題、Firebase 玩家與 Firebase 作答資料齊全時，直接從 Firebase 計算成績與排行榜。
- 修正 0 份作答時誤判 `missing_firebase_answers` 而回退舊 GAS / Sheets 路徑的問題。
- 0 份作答時仍會走 `mode=firebase_fast`，產生 0 分排行榜並發布 `publicScoreboards/{gameId}`。
- 快速計分前的 Firebase 讀取改用 `UrlFetchApp.fetchAll` 批次平行讀取 `publicQuestions`、`players`、`answers` 與 `itemUses`，降低 0 人或 1 人也需等待的固定讀取延遲。
- `ensureGameSheetsReady` 新增 Script Property 版本戳記，工作表結構已確認後可跳過完整建表掃描。
- 新增管理用 `warmupGameSheets` action，壓測可在正式計時前先暖機，不清資料、不改遊戲狀態。
- Firebase 快速計分路徑可用已知 `closeSequence` 直接更新 `settlementBatches`，減少重複讀取整個批次節點。
- 快速路徑會發布 `publicScoreboards/{gameId}`，並更新 `settlementBatches` 狀態為 `firebase_fast`。
- 創作題、道具使用或 Firebase 資料不足時，自動回退既有 GAS / Google Sheets 計分路徑。
- `publishScoreboardSnapshotToFirebase` 支援傳入 `awards: []`，讓快速路徑不讀取 Sheets 獎項資料。

### test - firebase read

- 新增 `scripts/v7-firebase-read-test.mjs`。
- 新增 `scripts/v7-fast-score-unit-test.mjs`。
- 新增 `npm run test:v7:fast-score`。
- 新增 `npm run test:v7:read`。
- 已完成 Firebase 快速計分純計算測試：`submittedCount=2`、`scoredCount=2`、產生 5 隊排行榜。
- 已補上 0 作答快速計分測試：0 作答有玩家與 0 作答無玩家均可產生 5 隊排行榜。
- 已完成 100 人公開節點讀取測試：900 requests，0 failures，p95 約 154 ms。
- 已完成 200 人公開節點讀取測試：1800 requests，0 failures，p95 約 156 ms。

### risk control

- Firebase Hosting 已於 2026-06-02 重新部署學員端與講師端；第 7 版講師測試入口為 `https://tychbniis-32af5-instructor.web.app/InstructorV7.html`。
- 線上檢查已確認學員端、講師端第 7 版入口與投影端均回應 HTTP 200。
- `config-v7-test.js` 線上檢查已確認指向 GAS `@93`。
- 100 人公開節點只讀測試完成：900 requests、0 failures、p50 約 58 ms、p95 約 70 ms。
- 100 人完整壓測完成：`gameId=v7_perf_20260602075820`、100 名假玩家、100 份假作答、concurrency 25。
- 完整流程約 44.9 秒；關題公布答案約 10.7 秒，計分 API 外層約 5.9 秒，GAS 內部快速計分約 3.0 秒。
- 計分結果 `submittedCount=100`、`scoredCount=100`、批次狀態 `done`；測試資料已自動清理。
- GAS 已建立加速測試 deployment `@93`，描述為 `0.7.14 v7 warmup fast setup and batch status 2026-06-02`。
- `frontend/instructor/dist/config-v7-test.js`、`scripts/v7-pressure-test.mjs`、`scripts/v7-batch-status.mjs` 已改指向 `@93`，講師端 Hosting 已重新部署。
- `@93` 100 人完整壓測完成：`gameId=v7_perf_20260602090348`、100 名假玩家、100 份假作答、concurrency 25。
- 加速後完整流程約 33.6 秒；開題外層約 6.0 秒，關題公布答案約 11.2 秒，計分 API 外層約 5.3 秒，GAS 內部快速計分約 2.9 秒。
- 相較 `@91`，完整流程約減少 11.3 秒，主要改善來自開題階段。
- GAS 已建立診斷用測試 deployment `@88`，描述為 `0.7.14 fast scoring diagnostics 2026-06-02`。
- GAS 已建立 0 作答快速計分測試 deployment `@89`，描述為 `0.7.14 zero answer fast scoring 2026-06-02`。
- GAS 已建立批次讀取快速計分測試 deployment `@90`，描述為 `0.7.14 firebase batch read scoring 2026-06-02`。
- GAS 已建立安全狀態讀取測試 deployment `@91`，描述為 `0.7.14 firebase batch read scoring safe state 2026-06-02`。
- `frontend/instructor/dist/config-v7-test.js`、`scripts/v7-pressure-test.mjs`、`scripts/v7-batch-status.mjs` 已改指向 `@91`。
- `gameState` 保留在發布前重新讀取，避免講師快速切題時用舊狀態覆蓋新狀態。
- `@90` 是中間測試版，不作為目前實機測試入口。
- `@89` 保留為上一個可還原測試版本。
- `getSettlementBatchStatus` 會回傳 `mode` 與 `fastPathFallbackReason`。
- 講師端第 7 版測試入口會在批次監看文字追加 `mode=` 與 `fallback=`。
- `frontend/instructor/dist/config-v7-test.js`、`scripts/v7-pressure-test.mjs`、`scripts/v7-batch-status.mjs` 已改指向 `@88`。
- GAS 已建立測試 deployment `@87`，描述為 `0.7.14 firebase fast scoring 2026-06-02`。
- `frontend/instructor/dist/config-v7-test.js` 已改指向 `@87`。
- `scripts/v7-pressure-test.mjs` 與 `scripts/v7-batch-status.mjs` 已改用 `@87`。
- `@87` smoke test 通過，回傳 `ok:true`、`status:draft`，未寫入假資料。
- `test:v7:batch-status` 未設定管理密碼時會拒絕執行，確認管理查詢不接受命令列密碼。
- 本次未部署 Firebase rules。
- 本次未開通 Blaze。
- 本次未切換正式入口。

## 0.7.13 - 2026-06-02

### docs - firebase primary gas worker

- 將第 7 版最終架構收斂為「Firebase 即時主資料層 + GAS 背景工作者 / 行政後端」。
- 明確標記 Cloud Functions 不列入必要架構，相關功能先由 GAS 替代。
- GAS 替代功能包含自動計分、資料校驗、排行榜彙整、批次狀態、管理 API 與活動後資料封存。
- 本機 `firebase/database.rules.json` 補上 `settlementBatches`、`activityLogs`、`exports` 管理節點規則。
- `cloud_functions` 模組狀態改為 `not_used_replaced_by_gas_worker`。

### risk control

- 本次不部署 Firebase rules。
- 本次不開通 Blaze。
- 本次不部署 Cloud Functions。
- 本次不切換正式入口。

## 0.7.12 - 2026-06-02

### docs - firebase primary architecture

- 新增 `docs/21_v7_firebase_primary_architecture.md`。
- 正式定義第 7 版架構方向為「Firebase 為主、GAS 為輔」。
- 明確分工：Realtime Database 承擔即時開題、關題、報到、作答、排行榜快照；GAS 保留題庫、報表、備份、稽核與行政維護。
- 將遷移拆成階段 A 到 E，下一步建議先檢查 Realtime Database rules。
- `app/config/modules.json` 新增 `v7_firebase_primary_architecture`。

### risk control

- 本次不修改前端執行邏輯。
- 本次不修改 GAS。
- 本次不部署 Firebase Hosting、Realtime Database rules 或 Cloud Functions。
- 第 6 版正式入口仍保留為 50 人左右活動與回復方案。

## 0.7.11 - 2026-06-02

### docs - blaze-ready spark default

- 新增 `docs/20_v7_blaze_ready_plan.md`。
- 將第 7 版定位為「Blaze-ready、Spark 預設」維運模式。
- 明確記錄：未經承辦人確認，不開通 Blaze、不部署 Cloud Functions、不改 Firebase 帳務方案。
- 補充 50 人活動維持 Spark、第 200 人活動建議開通 Blaze 的判斷條件。
- `app/config/modules.json` 新增 `v7_blaze_ready_plan`，並將 `cloud_functions` 狀態改為 `blaze_ready_not_enabled`。

### risk control

- 本次不連線 Firebase。
- 本次不部署 Firebase Hosting、Realtime Database rules 或 Cloud Functions。
- 本次不修改 GAS。
- 本次不保存或處理任何付款資訊。

## 0.7.10 - 2026-06-02

### test - realtime database traffic estimate

- 新增 `scripts/v7-traffic-estimate.mjs`，可離線估算 50 / 100 / 200 人活動的 Realtime Database 上傳、下載與儲存量。
- 新增 npm script：`npm run test:v7:traffic-estimate`。
- 估算涵蓋報到、報到時讀取玩家清單、作答、題庫下載、每 5 秒 `gameState` 輪詢與排行榜快照讀取。

### risk control

- 工具不連線 Firebase，不需要管理密碼，不讀寫雲端資料。
- 輸出為估算值，不取代 Firebase Console Usage 或正式帳單資料。
- 明確提醒 Spark 方案仍受 100 個 Realtime Database 同時連線限制影響。

## 0.7.9 - 2026-06-02

### feat - instructor v7 test entry

- 新增講師端第 7 版測試入口 `frontend/instructor/dist/InstructorV7.html`。
- 新增測試設定 `frontend/instructor/dist/config-v7-test.js`，指向 GAS 測試 deployment `@86`。
- `api.js` 新增 `enableSettlementMonitor` 與 `settlementMonitorPollMs` 設定。
- `app.js` 在 `enableSettlementMonitor` 啟用時，關題後會查詢 `getSettlementBatchStatus`，並於 `scoreboardStatus` 顯示批次狀態。

### risk control

- 正式入口 `Instructor.html` 不切換。
- 正式設定 `config.js` 仍指向既有正式 GAS `@81`。
- 批次狀態顯示只在 `config-v7-test.js` 啟用，正式入口不會呼叫第 7 版 action。
- 本次不部署 Firebase Hosting、Cloud Functions 或 Firebase rules。

## 0.7.8 - 2026-06-01

### feat - open and close reveal timing

- GAS `openQuestion` 新增 `timingSummary`，量測 `ensureGameSheetsReady`、`getGameState`、`readQuestionRows`、`upsertGameState`、`publishGameStateToFirebase`。
- GAS `closeQuestionAndRevealAnswer` 新增 `timingSummary`，量測 `ensureGameSheetsReady`、`readQuestionRows`、`getGameState`、`buildClosedQuestionAnswerReveal`、`ensureSettlementBatchPending`、`upsertGameState`、`publishGameStateToFirebase`。
- Apps Script Logger 新增 `openQuestionTiming` 與 `closeQuestionRevealTiming` 摘要。
- GAS 測試 deployment `@86` 已建立，描述為 `0.7.8 open close reveal timing 2026-06-01`。
- `scripts/v7-pressure-test.mjs` 與 `scripts/v7-batch-status.mjs` 改用 `@86`。

### risk control

- 本次只增加耗時量測與回傳摘要，不改計分公式、不改正式前端、不部署 Firebase Hosting。
- 量測摘要只包含階段名稱、毫秒數、`gameId`、`questionId`，不記錄姓名、身分證、電話、答案內容、Token 或管理密碼。

### test

- `node --check` 檢查 GAS 暫存 JS。
- `node --check scripts/v7-pressure-test.mjs`
- `node --check scripts/v7-batch-status.mjs`
- JSON 檢查 `package.json` 與 `app/config/modules.json`
- `npm run check:functions`
- `npm run test:v7:pressure:smoke`
- `npm run test:v7:pressure -- --players 50`
- 50 人壓測摘要：`gameId=v7_perf_20260601100325`、`questionId=q001`、`submittedCount=50`、`scoredCount=50`、`timingTotalMs=19602ms`、`totalMs=57595ms`。
- 開題外層耗時 `10826ms`，GAS 內部 `openQuestionTiming.totalMs=2437ms`。
- 關題關閉公布答案外層耗時 `12053ms`，GAS 內部 `closeRevealTiming.totalMs=3488ms`。
- 批次狀態仍可監看：`pending → processing → done`。
- 初步判斷：速度仍偏慢，但主要差距來自 Apps Script Web App 端到端呼叫延遲；GAS 內部開題與公布答案已落在約 2.4 至 3.5 秒。

## 0.7.7 - 2026-06-01

### test - pressure test batch status checks

- 將 `scripts/v7-pressure-test.mjs` 預設 GAS 測試 deployment 改為 `@85`。
- 壓測流程新增批次狀態查詢：
  - 關題關閉後查詢 `batchStatusAfterClose`。
  - 後台計分啟動後查詢 `batchStatusDuringScoring`。
  - 後台計分完成後查詢 `batchStatusAfterScoring`。
- 壓測摘要會記錄批次 `status`、`closeSequence`、`submittedCount`、`scoredCount`、`timingTotalMs` 與查詢時間。

### risk control

- 壓測仍限制 `gameId` 必須以 `v7_perf_` 開頭。
- 管理密碼仍只讀取 `V7_TEST_ADMIN_SECRET`。
- 測試結束仍預設呼叫 `resetGameData` 清理測試資料。
- 本次不改正式前端、不部署 Firebase Hosting、Cloud Functions 或 Firebase rules。

### test

- `node --check scripts/v7-pressure-test.mjs`
- JSON 檢查 `package.json` 與 `app/config/modules.json`
- `npm run check:functions`
- `npm run test:v7:pressure:smoke`
- `npm run test:v7:pressure -- --players 50`
- 50 人壓測摘要：`gameId=v7_perf_20260601095247`、`questionId=q001`、`submittedCount=50`、`scoredCount=50`、`timingTotalMs=15049ms`、`totalMs=49139ms`。
- 批次狀態驗證：關題後為 `pending`，計分中為 `processing`，計分後為 `done`。

## 0.7.6 - 2026-06-01

### test - batch status CLI monitor

- 新增 `scripts/v7-batch-status.mjs`，用於本機查詢第 7 版批次狀態。
- 新增 npm script：`npm run test:v7:batch-status`。
- 工具預設只允許查詢 GAS 測試 deployment `@85`。
- 管理密碼只允許由環境變數 `V7_TEST_ADMIN_SECRET` 讀取，不接受命令列密碼。
- 支援 `--game-id`、`--question-id`、`--close-sequence` 篩選。

### risk control

- 此工具只讀取 `getSettlementBatchStatus`，不寫入 Firebase 或 Google Sheets。
- 本次不改 GAS 後端、不改正式前端、不部署 Firebase Hosting、Cloud Functions 或 Firebase rules。
- 因正式講師端仍指向第 6 版 GAS `@81`，暫不把監看功能接進正式講師端，避免前端呼叫尚不存在的 action。

### test

- `node --check scripts/v7-batch-status.mjs`
- JSON 檢查 `package.json` 與 `app/config/modules.json`
- `npm run check:functions`
- 未設定 `V7_TEST_ADMIN_SECRET` 時，`npm run test:v7:batch-status` 正確拒絕執行。
- 設定 `V7_TEST_ADMIN_SECRET` 後，`npm run test:v7:batch-status` 可正常查詢 `@85`，目前預設場次無殘留批次，`count=0`。

## 0.7.5 - 2026-06-01

### feat - settlement batch status API

- 新增 GAS 管理 action `getSettlementBatchStatus`。
- 可查詢 `settlementBatches/{gameId}` 批次狀態摘要，並支援用 `questionId` 或 `closeSequence` 篩選。
- 回傳欄位只包含批次狀態、時間、筆數、耗時、錯誤摘要與版本，不包含姓名、身分證、電話、答案內容、道具明細、Token 或管理密碼。
- GAS 後端版本常數更新為 `0.7.5`。

### risk control

- `getSettlementBatchStatus` 需帶管理密碼，未授權不可查詢。
- 本次不改計分公式、不改正式前端入口、不部署 Firebase Hosting、Cloud Functions 或 Firebase rules。
- 目的為正式活動前建立批次狀態監看配套，避免背景計分尚未完成時誤判流程已完成。

### test and deploy

- `node --check` 檢查 GAS 暫存 JS。
- `npm run check:functions`
- `git diff --check`
- GAS 已建立測試 deployment `@85`，描述為 `0.7.5 settlement batch status API 2026-06-01`。
- `@85 getGameState` smoke test 回應 `ok:true`。
- `@85 getSettlementBatchStatus` 未帶管理密碼時回「管理操作授權失敗」。
- `@85 getSettlementBatchStatus` 帶管理密碼時回應 `ok:true`，目前預設場次無殘留批次，`count=0`。

## 0.7.4 - 2026-06-01

### test - 100 and 200 player pressure baseline

- 完成 `npm run test:v7:pressure -- --players 100`。
  - `gameId`: `v7_perf_20260601093129`
  - `questionId`: `q001`
  - `submittedCount`: `100`
  - `scoredCount`: `100`
  - `scoreClosedQuestion`: `41677ms`
  - `timingTotalMs`: `35181ms`
  - `totalMs`: `71513ms`
  - `settlementStatus`: `done`
- 完成 `npm run test:v7:pressure -- --players 200`。
  - `gameId`: `v7_perf_20260601093256`
  - `questionId`: `q001`
  - `submittedCount`: `200`
  - `scoredCount`: `200`
  - `scoreClosedQuestion`: `24542ms`
  - `timingTotalMs`: `18858ms`
  - `totalMs`: `55253ms`
  - `settlementStatus`: `done`
- 兩次壓測結束後皆已呼叫 `resetGameData`，清理 `players`、`answers`、`itemUses`、`settlementBatches`、`publicScoreboards` 等測試路徑。

### risk control

- 壓測仍只使用 GAS 測試 deployment `@84`。
- 測試 `gameId` 皆使用 `v7_perf_` 前綴。
- 管理密碼只從 `V7_TEST_ADMIN_SECRET` 環境變數讀取，未寫入檔案。
- 未修改正式前端、GAS 後端邏輯、Firebase Hosting、Cloud Functions 或 Firebase rules。

## 0.7.3 - 2026-06-01

### fix - pressure test question default

- 修正 `scripts/v7-pressure-test.mjs` 預設題號，由不存在的 `test_q001` 改為目前公開題庫已存在的 `q001`。
- 保留 `--question-id` 參數，後續仍可手動指定其他題目壓測。
- 只調整本機壓測工具與版本文件，未修改 GAS 後端、正式前端或 Firebase rules。
- 已完成 50 人隔離壓測：50 筆假答題全數送出與計分，`settlementStatus` 為 `done`，完整流程約 49.9 秒。

### risk control

- 50 人完整壓測仍限制使用 GAS 測試 deployment `@84`。
- 測試 `gameId` 仍必須以 `v7_perf_` 開頭。
- 管理密碼仍只從環境變數 `V7_TEST_ADMIN_SECRET` 讀取，不寫入檔案。
- 測試結束後已呼叫 `resetGameData` 清理 `players`、`answers`、`itemUses`、`settlementBatches` 等測試路徑。

### test

- `node --check scripts/v7-pressure-test.mjs`
- `npm run check:functions`
- `git diff --check`
- `npm run test:v7:pressure:smoke`
- `npm run test:v7:pressure -- --players 50`
- 50 人壓測摘要：`gameId=v7_perf_20260601092639`、`questionId=q001`、`submittedCount=50`、`scoredCount=50`、`scoreClosedQuestion=24246ms`、`timingTotalMs=17842ms`、`totalMs=49863ms`。

## 0.7.2 - 2026-06-01

### test - isolated pressure test runner

- 新增 `scripts/v7-pressure-test.mjs`，用於第 7 版 50 / 100 / 200 人假資料壓測前置作業。
- 新增 npm scripts：
  - `npm run test:v7:pressure:smoke`
  - `npm run test:v7:pressure`
- 腳本預設只允許對 GAS 測試 deployment `@84` 執行，並限制測試 `gameId` 必須以 `v7_perf_` 開頭。
- 管理密碼只允許由環境變數 `V7_TEST_ADMIN_SECRET` 讀取，不接受命令列參數，也不寫入任何檔案。
- 未設定 `V7_TEST_ADMIN_SECRET` 時，腳本只執行 `getGameState` smoke test，不寫入假資料。
- 壓測資料使用假暱稱 `測試學員001` 這類資料，不使用真實姓名、身分證、電話或其他個資。
- 完整壓測結束時，腳本會呼叫管理 API `resetGameData` 清理測試 `gameId`。
- GAS `clearFirebaseGameData()` 已納入 `settlementBatches/{gameId}`，避免測試批次狀態殘留。

### risk control

- 本次只建立本機壓測工具，未執行 50 / 100 / 200 人資料灌入。
- 腳本預設會透過 `resetGameData` 清理測試場次資料；若後續使用 `--skip-cleanup`，需人工確認資料用途。
- 正式前端仍指向第 6 版 `@81`，未切換正式入口。
- GAS 已建立測試 deployment `@84`，描述為 `0.7.2 pressure test runner cleanup support 2026-06-01`。
- `@84 getGameState` smoke test 回應 `200`。

## 0.7.1 - 2026-06-01

### feat - settlement batch status tracking

- 新增 Firebase `settlementBatches/{gameId}/{closeSequence}` 批次狀態紀錄，先支援關題與後台計分流程追蹤，不改計分公式。
- 關題關閉公布答案時建立或沿用批次，狀態為 `pending`。
- 後台計分開始時將批次更新為 `processing`；完成後更新為 `done`，並記錄 `timingTotalMs`、作答筆數、新計分筆數與排行榜列數。
- 若後台計分發生錯誤，批次更新為 `failed`，只保存錯誤訊息摘要，不記錄個資、答案內容、道具明細、Token 或管理密碼。
- 若同一題已有批次，會沿用既有 `closeSequence`，避免重複關題建立新批次。

### risk control

- 正式學員端與講師端仍指向第 6 版 `@81`，不切換正式入口。
- 本次不部署 Firebase Hosting、Cloud Functions 或 Firebase rules。
- 若 Firebase 批次狀態寫入失敗，回傳 `skipped` 結果，不阻斷原本計分流程。

### test and deploy

- `node --check` 檢查 GAS 暫存 JS。
- `npm run check:functions`
- `git diff --check`
- GAS 已建立測試 deployment `@83`，描述為 `0.7.1 settlement batch status tracking 2026-06-01`。
- `@83 getGameState` smoke test 回應 `200`。
- `@83 scoreClosedQuestion` 未帶管理密碼時回「管理操作授權失敗」。
- 前端 `gasWebAppUrl` 仍指向正式 `@81`，未切換到 `@83`。

## 0.7.0 - 2026-06-01

### feat - close question timing measurement

- 開始第 7 版第 1 階段「現況量測」，先量測 GAS 關題結算慢在哪裡，不改計分公式與前端操作流程。
- `scoreClosedQuestionNow()` 新增 `timingSummary`，記錄 `ensureGameSheetsReady`、Firebase 玩家同步、Firebase 答案同步、道具同步、答案與道具工作表讀寫、分數計算、排行榜重算、排行榜快照發布與 gameState 發布等階段耗時。
- GAS `Logger.log()` 會寫入 `closeQuestionTiming` JSON 摘要，只包含 `gameId`、`questionId`、筆數與毫秒數，不記錄姓名、身分證、電話、答案內容、道具明細、Token 或管理密碼。
- 修正 `scoreClosedQuestionNow()` 回傳中 `playerSync` 未宣告的問題，改為保留 `syncFirebasePlayersToSheet()` 的回傳結果。

### test

- `node --check` 檢查 GAS 暫存 JS。
- `npm run check:functions`
- `git diff --check`
- GAS 已建立測試 deployment `@82`，描述為 `0.7.0 close question timing measurement 2026-06-01`。
- `@82` smoke test：`getGameState` 回應 `200`。
- `@82` 權限測試：`scoreClosedQuestion` 未帶管理密碼時回「管理操作授權失敗」，確認不是公開管理操作。
- 本次未更新前端 `gasWebAppUrl`，學員端與講師端仍指向正式 `@81`。
- 本次未部署 Firebase Hosting、Cloud Functions 或 Firebase rules。

## 0.6.13-final - 2026-06-01

### docs - mark version 6 final

- 將 `0.6.13` 定為第 6 版定版。
- 第 6 版定版後，Firebase 即時計分遷移不再納入第 6 版，改列為第 7 版工作事項。
- 新增 `docs/19_v6_final_and_v7_roadmap.md`，記錄第 7 版主要任務：降低現場延遲、減少 GAS 大量回應壓力、避免 Google Sheets 寫入造成關題逾時或中斷。

### v7 scope

- 即時計分、排行榜快照、學員答題與道具使用暫存移到 Firebase。
- GAS 改為讀取 Firebase 已鎖定批次，並背景整批寫入 Google Sheets。
- Google Sheets 定位為賽後稽核、報表與備份，不作為現場高頻即時運算主體。

### test

- `git diff --check`
- 文件修改，未部署 GAS、Firebase Hosting、Cloud Functions 或 Firebase rules。

## 0.6.13 - 2026-06-01

### feat - expand instructor treasure grants

- 確認學員端一般答題獎池已支援 50 題：`TREASURE_PLAN_QUESTION_LIMIT = 50`，`buildStaticTreasurePlan()` 預設 `maxQuestionSlots = 50`。
- 講師端追加寶箱由第 1 至第 5 箱擴增為第 1 至第 10 箱，GAS `grantTreasureBoxes` 同步接受 1 至 10。
- 講師端落後寶箱由單一按鈕擴增為每隊第 1 至第 5 箱，GAS 以 `teamId:slot` 記錄，學員端依戰隊與箱號同步補入本機獎池。
- 學員端保留舊資料相容：既有 `laggingTreasureBoxTeams=team_1` 會視為 `team_1:1`。

### assessment - Firebase scoring migration

- 現況確認：學員作答已先寫入 Firebase，GAS 關題結算時會同步該題 Firebase answers 到 Google Sheets，排行榜快照也已可發布至 Firebase。
- 本次未直接將即時計分核心搬移，原因是此調整會影響關題去重、道具結算次序、排行榜與最終結算一致性，應獨立成下一階段版本。
- 建議下一階段採分段方式：Firebase 建立即時計分暫存與排行榜快照，GAS 關題結算只讀 Firebase 已鎖定批次並背景整批寫入 Sheets；Google Sheets 只作稽核與賽後報表來源。

### test

- `node --check frontend/student/dist/app.js`
- `node --check frontend/student/dist/static-v4.js`
- `node --check frontend/instructor/dist/app.js`
- `node --check frontend/instructor/dist/api.js`
- `node --check frontend/instructor/dist/display.js`
- `node --check frontend/student/dist/api.js`
- GAS `Code.gs` 複製為暫存 `.js` 後通過 `node --check`。
- `npm run check:functions`
- `git diff --check`
- 待部署後確認線上講師端載入 `app.js?v=0.6.13`，並顯示追加第 10 箱與落後第 5 箱。

### deploy

- GAS Web App 已部署為 deployment `@81`，前端 `gasWebAppUrl` 已更新到新版 deployment。
- Firebase Hosting 已部署學員端與講師端。
- 線上檢查：學員端與講師端回應 `200`；學員端載入 `app.js?v=0.6.13` 且保留 `clientVersion: "0.6.6"`；講師端載入 `app.js?v=0.6.13`，包含追加第 10 箱與落後第 5 箱。

## 0.6.12 - 2026-06-01

### fix - replace vaccine question bank source

- GAS 內建疫苗題庫改由 `d:\GAS\GitHub\疫苗教育訓練題庫.md` 產生，共 50 題，題號維持 `vac_q001` 至 `vac_q050`。
- `updateVaccineQuestionBankFromMenu()` 改為替換模式：新檔內存在的 `vac_q` 會更新或新增；新檔不存在的舊 `vac_q` 會停用並標記，不直接刪除資料列。
- 保留講師端「疫苗題庫」選擇規則，無需重新部署學生端。

### assessment - GAS split and Firebase migration

- GAS 拆成多個 `.gs` 檔有助於交接與維護，但 Apps Script 執行時仍會載入同一專案的全部檔案，不能視為效能優化手段。
- 關題關閉速度的主要改善方向是把即時計算與快照放在 Firebase，GAS 改成背景批次落 Google Sheets；需搭配同步狀態、重試、人工補同步與最終成績鎖定機制。

### test

- 新檔解析結果：50 題。
- GAS 暫存 `.js` 語法檢查。
- `npm run check:functions`
- `git diff --check`

### deploy

- GAS 正式 Web App 已更新到 deployment `@80`。
- 講師端與學員端 Hosting、Cloud Functions、Firestore rules、Realtime Database rules 未重部署。

## 0.6.11 - 2026-06-01

### feat - question bank selection and vaccine bank

- GAS 新增 `updateTestQuestionBankFromMenu()` 與 `updateVaccineQuestionBankFromMenu()`，可由 Google Sheet 選單建立測試題庫與疫苗題庫。
- 疫苗題庫由 `d:\GAS\GitHub\疫苗題庫.md` 轉為內建 `vac_q001` 至 `vac_q050`，使用 upsert，不刪除既有題庫列。
- 講師端新增題庫選擇下拉選單，可切換「測試題庫、臺灣生活、疫苗題庫」並依 `questionId` 前綴過濾開題清單。
- GAS 題庫驗證改為同一題庫內檢查 `order` 重複，允許不同題庫各自從第 1 題開始。

### assessment - close scoring speed

- 確認學員作答目前已先寫入 Firebase；關題慢的主要瓶頸在 GAS 關題關閉時仍同步 Firebase 到 Google Sheets、讀寫整批工作表並重新計算排行榜。
- 建議下一階段採「Firebase 即時計分快照 + GAS 背景批次落 Sheet」，搭配同步狀態、重試與人工補同步，避免 Sheet 延遲造成成績未落地。

### test

- `node --check frontend/instructor/dist/app.js`
- `node --check frontend/instructor/dist/api.js`
- `node --check frontend/instructor/dist/display.js`
- GAS 暫存 `.js` 語法檢查
- `npm run check:functions`
- `git diff --check`
- 線上講師端 `Instructor.html` 回應 `200`，已載入 `app.js?v=0.6.11`，並包含「測試題庫、臺灣生活、疫苗題庫」選單。
- Playwright 講師端 smoke test 回應 `200`，無 page error / console error。

### deploy

- GAS 正式 Web App 已更新到 deployment `@79`。
- 講師端 Firebase Hosting 已部署到 `https://tychbniis-32af5-instructor.web.app`。
- 學員端 Hosting、Cloud Functions、Firestore rules、Realtime Database rules 未重部署。

## 0.6.7-maintenance - 2026-06-01

### fix - remove instructor question deletion import

- 已用非破壞式 `git revert` 退回 `0.6.8` 至 `0.6.10` 題庫匯入／同步 UI 變更，版本維持 `0.6.7`。
- 移除講師端「匯入臺灣題庫」按鈕，避免講師端出現會清空／覆寫題庫的操作入口。
- 移除 Web App action `replaceQuestionBankWithTaiwanQuestions`，避免前端或外部 API 觸發題庫清空覆寫。
- Apps Script 選單改為「更新臺灣生活趣味題庫」，執行 `updateTaiwanQuestionBankFromMenu()`；此函式依內建 `臺灣生活趣味問答.md` 內容 upsert `q001` 至 `q020`，並停用舊 `demo_q` 測試題，不刪除資料列。

### test

- GAS 語法、講師端 `app.js` 語法、JSON 檢查、`npm run check:functions`、`git diff --check` 通過。
- `clasp run updateTaiwanQuestionBankFromMenu` 因 Apps Script API executable 權限限制無法由終端執行；已移除暫測的 `executionApi` 設定，未使用無授權公開 action 硬開更新入口。
- 線上講師端 `Instructor.html` 與 `app.js?v=0.6.7` 回應 `200`，已確認沒有「匯入臺灣題庫」按鈕與匯入 action。
- 線上 `replaceQuestionBankWithTaiwanQuestions` 回「未知 action」，確認 Web App 題庫覆寫 action 已移除。
- Playwright 講師端 smoke test 回應 `200`，匯入按鈕不存在，無 page error / console error。

### deploy

- GAS 正式 Web App 已更新到 deployment `@78`；講師端 Firebase Hosting 已部署到 `https://tychbniis-32af5-instructor.web.app`。
- 學員端 Hosting、Cloud Functions、Firestore rules、Realtime Database rules 未重部署。

## 0.6.7 - 2026-05-29

### fix - question bank replacement and close scoring scope

- 將 GAS 預設題庫改為 `臺灣生活趣味問答.md` 的 20 題，空白題庫初始化時不再建立 `demo_q001` 至 `demo_q011` 測試題。
- 新增管理密碼保護的 `replaceQuestionBankWithTaiwanQuestions` action，並新增 Apps Script 選單「匯入臺灣生活趣味題庫」，可用 20 題正式題庫取代現有題庫並同步 Firebase 公開題庫。
- 講師端新增「匯入臺灣題庫」按鈕，會用已套用的管理密碼呼叫後端匯入 action，並在執行前顯示確認視窗。
- 講師端備用題目清單改為臺灣生活趣味題庫，避免 Firebase 尚未載入時顯示測試題。
- 關題關題計分時，道具同步由 `syncFirebaseItemUsesForFinalSettlement()` 改為只同步本題 `syncFirebaseItemUsesForQuestionToSheet()`，避免每次關題掃描最終結算範圍。
- 關題關題計分的 Firebase 玩家同步加入 5 分鐘短暫快取，減少每題重複讀取全體玩家資料。
- 排行榜發布可沿用本次重算取得的玩家清單，減少同一輪關題中的重複玩家資料彙整。

### risk and mitigation

- 風險：執行題庫取代 action 會覆寫 Google Sheets `題庫` 工作表。配套：action 需管理密碼，Apps Script 選單需試算表權限；本次備份已保留修改前程式檔。
- 風險：玩家同步 5 分鐘快取期間，若關題後才有新學員報到但尚未作答，該學員可能暫時不列入排行榜有效人數。配套：正式活動開始後才出題；若臨時加入大量學員，可先清空資料重新啟動場次，或等待快取過期後再關題。

### test

- `node --check frontend/instructor/dist/app.js`
- `node --check frontend/instructor/dist/api.js`
- `node --check frontend/instructor/dist/display.js`
- GAS 暫存 `.js` 語法檢查
- `npm run check:functions`
- `git diff --check`
- GAS 內建題庫檢查：`q001` 至 `q020` 共 20 題，`gas/Code.gs` 不含 `demo_q`。
- 線上 `replaceQuestionBankWithTaiwanQuestions` 未帶管理密碼時回授權失敗，未回「未知 action」。
- 線上講師端 `Instructor.html` 與 `app.js?v=0.6.7` 回應 `200`，已載入 `0.6.7`、臺灣題庫備用清單與匯入按鈕。
- Playwright 講師端 smoke test 回應 `200`，無 page error / console error。
- Firebase CLI 以獨立測試場次批次寫入 50 名假學員與 50 筆假答案後清除：單次 root update 約 14.4 秒，清除約 5.8 秒。此測試含 Firebase CLI 啟動與授權開銷，實際學員端 SDK 寫入不應以此數字等同使用者體感。

### deploy

- GAS 已推送並更新既有正式 Web App deployment 至 `@71`，正式 `/exec` URL 不變。
- 講師端 Firebase Hosting 已部署至 `https://tychbniis-32af5-instructor.web.app`。
- 學員端 Hosting、Cloud Functions、Firestore rules 與 Realtime Database rules 未部署。
- `clasp run replaceQuestionBankWithTaiwanQuestionsFromMenu` 仍受 Apps Script API executable 設定限制，終端無法直接覆寫 Sheet；請使用講師端「匯入臺灣題庫」按鈕或 Google Sheets 選單執行。

## 0.6.6 - 2026-05-29

### fix - student treasure plan and close scoring

- 學員端寶箱仍維持原本 deterministic 本機獎池作法：同一場次、同一位學員獎池固定；不同學員或不同場次會有不同獎池。
- 學員端題目寶箱計畫支援最多 50 題，未來題庫擴充時會自動補齊新增題目的獎池列。
- 已存在的本機寶箱計畫不重抽既有題目，只合併缺少的新題目，避免已取得寶箱或道具被洗掉。
- GAS 關題關題計分不再執行答題寶箱補發；答題寶箱由學員端已決定的本機獎池處理，降低 200 人關題時的後台負擔。

### risk and mitigation

- 風險：背景報表中的 GAS `寶箱紀錄` 不再代表每一個答題寶箱來源。配套：正式計分仍以答題分、道具使用紀錄與排行榜為準；若未來需要完整寶箱報表，應改由學員端開箱 / 道具使用事件同步，不在關題時計算。
- 風險：同一場次同一學員獎池固定，不會因重新整理改變。配套：這是預期行為，避免學員刷新頁面洗寶箱。

### test

- `node --check frontend/student/dist/app.js`
- `node --check frontend/student/dist/api.js`
- `node --check frontend/student/dist/static-v4.js`
- GAS 暫存 `.js` 語法檢查
- `npm run check:functions`
- `git diff --check`
- 線上學員端首頁回應 `200`，已載入 `0.6.6`。
- 線上學員端 `app.js?v=0.6.6` 回應 `200`，已包含 50 題獎池上限與本機獎池合併邏輯。
- GAS Web App `scoreClosedQuestion` 未帶管理密碼時回授權失敗，未回「未知 action」。
- Playwright 學員端 smoke test 回應 `200`，無 page error / console error。

### deploy

- GAS 已推送並更新既有正式 Web App deployment 至 `@70`，正式 `/exec` URL 不變。
- 學員端 Firebase Hosting 已部署至 `https://tychbniis-32af5-student.web.app`。
- 講師端 Hosting、Cloud Functions、Firestore rules 與 Realtime Database rules 未部署。

## 0.6.5 - 2026-05-29

### fix - close scoring performance

- 關題：1 名測試學員關題後仍可能等待 10-30 秒，代表 200 人正式場次有 GAS 逾時風險。
- `syncFirebaseAnswersForQuestionToSheet()` 改為一次讀取翻卷紀錄並建立查詢表，避免每一筆答案都用 `TextFinder` 查一次 Google Sheet。
- 正確答題掉寶改為批次處理：預配寶箱獎勵池一次讀取、一次寫回；新寶箱一次整批 append；未開寶箱上限一次批次判斷。
- `scoreClosedQuestionNow()` 移除結算中間階段的重複 Firebase `gameState` 發布，只保留含排行榜控制資料的最後一次發布。
- 講師端關題流程改為「先公布答案，再背景結算」，結算完成後自動更新排行榜，避免講師端畫面長時間停等。

### risk and mitigation

- 風險：背景結算尚未完成時，排行榜可能短暫顯示舊分數。配套：畫面會在結算完成後更新排行榜；正式講解答案時可等待狀態文字變更後再開下一題。
- 風險：若 200 人同時答對且寶箱掉落率很高，仍會增加 Sheet 寫入量。配套：已把逐筆寫入改為批次寫入；若正式壓測仍超過 30 秒，下一步應把關題計分拆成「先關題、背景分批計分」。
- 風險：本次保留原有寶箱規則，但批次化後需在正式前做 30-50 名測試學員壓測。配套：測試時確認答對者、寶箱數、排行榜與道具紀錄一致。

### test

- `node --check frontend/instructor/dist/app.js`
- `node --check frontend/instructor/dist/api.js`
- `node --check frontend/instructor/dist/display.js`
- GAS 暫存 `.js` 語法檢查
- `npm run check:functions`
- `git diff --check`
- 線上講師端 `Instructor.html` 與 `app.js?v=0.6.5` 回應 `200`，已載入 `0.6.5` 與背景結算流程。
- GAS Web App `scoreClosedQuestion` 未帶管理密碼時回授權失敗，未回「未知 action」。
- Playwright 講師端 smoke test 回應 `200`，無 page error / console error。

### deploy

- GAS 已推送並更新既有正式 Web App deployment 至 `@69`，正式 `/exec` URL 不變。
- 講師端 Firebase Hosting 已部署至 `https://tychbniis-32af5-instructor.web.app`。
- 學員端 Hosting、Cloud Functions、Firestore rules 與 Realtime Database rules 未部署。

## 0.6.4 - 2026-05-29

### fix - clear data label and management performance

- 講師端按鈕文字由「清空測試資料」改為「清空資料」。
- `setupGameSheets()` 不再於啟動場次或清空資料時重建「題庫欄位說明」與整欄資料驗證，避免每次管理操作都進行高成本格式化；題庫說明改由「建立／編輯題庫」按鈕的 `getQuestionBankInfo` 建立或更新。
- `createGame()` 移除重複的 `setupGameSheets()` 呼叫，避免啟動場次時初始化工作表執行 2 次。
- `resetGameData()` 不再同步題庫，只負責清空玩家、作答、排行榜、寶箱、道具與獎項等活動資料；題庫同步由「啟動場次」或「重新讀取題目清單」負責。
- Firebase 清理改用 `UrlFetchApp.fetchAll()` 批次刪除多個路徑，降低清空資料時連續 9 次網路往返的等待時間。

### risk and mitigation

- 風險：清空資料後若講師只改題庫但未啟動場次或重新讀取題目清單，Firebase 公開題庫可能仍是舊版。配套：題庫更新後按「重新讀取題目清單」，正式開始時再按「啟動場次」。
- 風險：批次刪除 Firebase 路徑時若部分路徑失敗，回傳結果會標示該路徑 `skipped: true`。配套：若清空後畫面仍有舊資料，請再按一次「清空資料」。

### test

- `node --check frontend/instructor/dist/app.js`
- `node --check frontend/instructor/dist/api.js`
- `node --check frontend/instructor/dist/display.js`
- GAS 暫存 `.js` 語法檢查
- `npm run check:functions`
- `git diff --check`
- 線上講師端 `Instructor.html` 與 `app.js?v=0.6.4` 回應 `200`，已載入 `0.6.4`，包含「清空資料」且不含「清空測試資料」。
- GAS Web App `resetGameData` 與 `refreshQuestionBank` 未帶管理密碼時回授權失敗，未回「未知 action」。
- Playwright 講師端 smoke test 回應 `200`，無 page error / console error。

### deploy

- GAS 已推送並更新既有正式 Web App deployment 至 `@68`，正式 `/exec` URL 不變。
- 講師端 Firebase Hosting 已部署至 `https://tychbniis-32af5-instructor.web.app`。
- 學員端 Hosting、Cloud Functions、Firestore rules 與 Realtime Database rules 未部署。

## 0.6.3 - 2026-05-29

### fix - instructor question bank refresh

- 講師端若本機已保存管理密碼，重新進入頁面時直接進入控制流程，不再每次先呼叫後台驗證。
- 題庫連結第一次取得後會保存在本機；再次進入頁面時直接顯示連結，點擊按鈕只開啟 Google Sheet，不重複驗證。
- 「重新讀取題目清單」改為先呼叫 GAS `refreshQuestionBank`，將 Google Sheets 最新題庫同步到 Firebase，再清除講師端 sessionStorage 題庫快取後重新讀取。
- 修正講師端題庫清單可能讀到 10 分鐘內舊快取，造成更新題庫後前端清單不變的問題。

### test

- `node --check frontend/instructor/dist/app.js`
- `node --check frontend/instructor/dist/api.js`
- `node --check frontend/instructor/dist/display.js`
- GAS 暫存 `.js` 語法檢查
- `npm run check:functions`
- `git diff --check`
- 線上講師端 `Instructor.html`、`app.js?v=0.6.3`、`api.js?v=0.6.3` 回應 `200`，且已包含 `refreshQuestionBank`、`forceRefresh` 與本機題庫連結快取。
- GAS Web App `refreshQuestionBank` 回應 `200`，已確認不是未知 action，且未帶管理密碼時會拒絕管理操作。
- Playwright 線上講師端 smoke test 回應 `200`，無 page error / console error。

### deploy

- GAS 已推送並更新既有正式 Web App deployment 到 `@67`，正式 `/exec` URL 不變。
- 已部署 Firebase Hosting 講師端：`https://tychbniis-32af5-instructor.web.app`。
- 本次未部署學員端 Hosting、Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.6.2 - 2026-05-29

### feat - v6 final question bank link

- 講師端新增「建立／編輯題庫」按鈕，輸入管理密碼後會取得正式 Google Sheets 題庫連結。
- GAS 新增 `getQuestionBankInfo` 管理 API，會回傳題庫主表與中文欄位說明工作表連結。
- GAS 會建立「題庫欄位說明」工作表，使用中文說明各欄位、必填規則、填寫範例與可填內容。
- 題庫主表維持系統欄位名稱，不改成中文欄名，避免破壞現有讀題與計分邏輯；中文提示改以說明工作表與欄位備註提供。
- 第 6 版定版版本標記為 `0.6.2`。

### test

- `node --check frontend/instructor/dist/app.js`
- `node --check frontend/instructor/dist/api.js`
- `node --check frontend/instructor/dist/display.js`
- GAS 暫存 `.js` 語法檢查
- `npm run check:functions`
- `git diff --check`
- 線上講師端 `Instructor.html`、`app.js?v=0.6.2`、`config.js?v=0.6.2` 回應 `200`，且已包含「建立／編輯題庫」按鈕。
- GAS Web App `getQuestionBankInfo` 回應 `200`，已確認不是未知 action，且未帶管理密碼時會拒絕管理操作。
- Playwright 線上講師端 smoke test 回應 `200`，無 page error / console error。

### deploy

- GAS 已推送並更新既有正式 Web App deployment 到 `@66`，正式 `/exec` URL 不變。
- 已部署 Firebase Hosting 講師端：`https://tychbniis-32af5-instructor.web.app`。
- 本次未部署學員端 Hosting、Cloud Functions、Firestore rules 或 Realtime Database rules。
- `clasp run setupGameSheets` 因 Apps Script API executable 設定限制無法直接執行；「題庫欄位說明」會在講師端按鈕呼叫 `getQuestionBankInfo` 或後續執行 `setupGameSheets` 時建立。

## 0.6.1 - 2026-05-29

### fix - double card log display

- 修正學員端加倍卡道具使用紀錄顯示：使用當下顯示「等候下一題結果，已使用」。
- 下一題回答並套用後，改顯示「第 N 題 加倍分，已套用 +X 分」。
- 若加倍卡使用後沒有下一題或直接進入系統結算，改顯示「無下一題，未加分」。
- 本次只修正前端顯示，不變更 GAS 後台計分。

### test

- `node --check frontend/student/dist/app.js`
- `node --check frontend/student/dist/api.js`
- `git diff --check`
- `npm run check:functions`
- 線上學員端首頁、`config.js?v=0.6.1`、`app.js?v=0.6.1` 回應 `200`，且 `app.js` 已包含 3 種加倍卡紀錄文字。
- Playwright 線上學員端 smoke test 回應 `200`，無 page error / console error。

### deploy

- 已部署 Firebase Hosting 學員端：`https://tychbniis-32af5-student.web.app`。
- 本次未部署 GAS Web App、講師端 Hosting、Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.6.0 - 2026-05-29

### fix - v6 score sequence settlement

- 第 6 版最終優化：計分改以「第 N 次關題」為基準，不再只依題目題號判斷先後。
- 學員端送出 Firebase `itemUses` 時新增 `usedAfterQuestionId`、`usedAfterQuestionSequence`、`settleAtCloseSequence`，方便 GAS 判斷道具應在哪一次關題後結算。
- GAS 同步 pending `itemUses` 時會檢查 `settleAtCloseSequence`，第 1 次關題只算第 1 題回答分，第 2 次關題才納入第 1 次關題後使用的道具分。
- 修正加倍卡 `next:` 目標題判斷，改以實際開題次序解析下一題，避免講師不照題號順序出題時算錯題。
- GAS 計分流程中的加倍卡與挑戰卡狀態更新改為記憶體整理後整批寫回 Sheet，降低 200 人遊戲時逐格寫入造成的延遲。
- 講師誤觸同一題關題時，GAS 與本機端都以去重後的 `openedQuestionIds` 判斷次序，同一題號不會增加關題次數。

### test

- `node --check frontend/student/dist/app.js`
- `node --check frontend/student/dist/api.js`
- `node --check frontend/instructor/dist/app.js`
- `node --check frontend/instructor/dist/display.js`
- GAS 語法以暫存 `.js` 檔執行 `node --check`
- `git diff --check`
- `npm run check:functions`
- 線上 smoke test：學員端、講師端、投影端皆回應 `200`，無 page error / console error。

### deploy

- GAS 已推送並更新既有穩定 Web App deployment 至 `@65`。
- 另曾建立未被前端使用的新 deployment `@64`；正式前端仍使用既有穩定 URL。
- Firebase Hosting 已部署：
  - `https://tychbniis-32af5-student.web.app`
  - `https://tychbniis-32af5-instructor.web.app`

## 0.5.24-final - 2026-05-29

### docs - v5 final release

- 第 5 版正式定版，定版版本為 `0.5.24`。
- 定版 commit：`f270e52`。
- GAS Web App deployment：`@63`。
- Firebase Hosting 已部署學員端、講師端與投影端。
- 新增 `docs/18_v5_final_release.md` 作為第 5 版最終交接與還原依據。
- 後續小修請使用 `0.5.25` 之後版本；大型流程新增建議另開第 6 版。

## 0.5.24 - 2026-05-29

### fix - item use timing and sync

- 學員端道具使用視窗改為只在 `question_closed` 或最後結算倒數期間開放，開題期間一律不可使用道具。
- 學員端使用道具時只寫入 Firebase `itemUses`，不主動呼叫 GAS 重算排行榜，避免伺服器因多人操作而增加負擔。
- GAS 在講師關題計分與最終結算時，同步所有 pending 道具使用紀錄，再重算排行榜。
- GAS 同步完成後會將 Firebase `itemUses` 標記為 `synced`，降低重複同步與重複計分風險。
- 空寶箱提示改為趣味回應，移除「不扣分」類型文字，道具紀錄也不再顯示 `+0 分`。

### test

- `node --check frontend/student/dist/app.js`
- `node --check` 檢查 GAS 暫存 JS


## 0.5.23 - 2026-05-29

### fix - item score flow review

- 重新檢視道具計分：開題中不可使用，道具使用視窗維持在關題後到結算前。
- 加分卡、挑戰卡維持本機端即時加分，並寫入 Firebase `itemUses` 供 GAS 後續同步。
- 加倍卡改為下一題型道具：關題後使用只在本機排程，下一題開題才送出，下一題關題時計分；無下一題時記為 `+0`。
- 翻身卡改為讀取指定題號的 `comebackControl`，避免沿用上一題翻身狀態；該題尚未結算時會等待 15 秒再確認。
- GAS 關題計分後會依排行榜發布該題各隊翻身卡效果：第 1 至第 4 名 `+5`，第 5 名起 `+30`。
- 加倍卡與翻身卡第二次取得時改為 `+5 分卡`。
- GAS 同步 Firebase `itemUses` 時尊重 `targetQuestionId`，避免道具被算到錯誤題號。

### fix - challenge card score sync

- 挑戰卡維持與加分卡一致的本機端即時加分邏輯，不交由 GAS 即時計算。
- 修正挑戰卡使用後未寫入 Firebase `itemUses` 的問題，讓 GAS 結算與排行榜可納入挑戰卡已決定的 `effectScore`。
- 補上舊版已在本機標記為 `sent`、但尚未同步到 Firebase 的挑戰卡紀錄同步流程，學員讀取最後成績前會先補送一次。
- 還原學員頂欄分數為原本的本機與後端較大值邏輯，避免後端尚未同步時少顯示挑戰卡分數。
- 學員端快取參數更新為 `0.5.23-challenge-sync1`，不變更 `clientVersion`，避免要求玩家重新報到。

### fix

- 挑戰卡數字牌改用全新 `challenge-number-v523-*.png`，每張牌四邊保留透明安全距離，避免數字 8、9 切到旁邊卡片邊框。
- 挑戰卡流程改為選擇猜大或猜小後進入 5 秒抽號動畫，可手動停止或自動停止，停在預設號碼 3 秒後自動結算。
- 挑戰卡結算畫面會同時顯示成功或失敗圖，以及剛才停到的數字牌；選擇不猜時直接結算，不顯示數字牌。
- 追加寶箱恢復為講師點第 N 箱只啟用第 N 箱，不再自動啟用前面箱號。
- 追加寶箱與落後寶箱改用場次、玩家、箱號或戰隊作為種子，依寶箱權重抽取內容物，避免全員拿到一致獎勵。
- 個人排行圖像改為全新 `award-player-medal-v523-*.png` 獎牌，第 1 至第 5 名依序使用彩色、紫、金、銀、黃，中央數字放大。
- 挑戰卡抽號動畫高亮改為藍色對比底與外框，停住結果改為綠色確認狀態，避免黃色數字牌在黃色底色上不明顯。
- 結算後學員端頂欄個人積分改以後端最終分數為準，避免本機估算道具分數與排行榜快照不一致。
- 最後成績查詢改為只讀取已結算結果，不在每位學員讀取時重跑同步與重算，避免非第 1 名學員出現空範圍錯誤。

### test

- 已檢查新數字牌與獎牌 PNG 邊界透明度。
- 已檢查 JS 語法、設定檔 JSON 與 functions。
- GAS 與 Firebase Hosting 已部署。

## 0.5.20 - 2026-05-28

### fix

- 修正講師端根網址 `/` 仍顯示舊控制台的問題，已同步為與 `/Instructor.html` 相同的控制 UI。
- 根網址控制台現在會顯示第 1 箱至第 5 箱追加寶箱按鈕，以及落後寶箱戰隊選擇與啟用按鈕。
- 重製個人排名第 1 名至第 5 名獎盃 PNG，改為透明背景且移除綠色底圖元素。

### test

- 已檢查個人獎盃 PNG 角落透明度與綠色背景像素。
- 已部署 Firebase Hosting；本版未修改 GAS 邏輯，GAS Web App deployment 維持 `@57`。

## 0.5.19 - 2026-05-28

### fix

- 修正未開題時啟用追加寶箱會讓學員端誤判為新場次，導致玩家被踢回報到畫面的問題。
- 將講師端追加寶箱改為第 1 箱至第 5 箱的明確按鈕，講師可依序啟用，每箱只寫入公開狀態開關，不逐筆計算玩家資料。
- 新增講師端「啟用落後寶箱」功能，可選擇指定戰隊，由該戰隊學員端自行依固定規則產生已預分配寶箱，避免講師端等待大量運算。
- 重新處理未開啟寶箱與個人排名獎盃 PNG 的亮綠色鍵色，移除殘留綠底與綠邊。
- 放大投影端即時排行榜與結算排行榜文字，提升遠距投影可讀性。
- 調整學員端排行榜彈窗，將「更新」按鈕移到標題列，避免「戰隊排行榜」文字與按鈕互相卡位。

### test

- 已執行學員端、講師端、投影端 JavaScript 語法檢查。
- 已執行 GAS `Code.gs` 語法檢查。
- 已部署 GAS Web App deployment `@57` 與 Firebase Hosting，並確認正式頁面載入 `0.5.19`。

## 0.5.18 - 2026-05-28

### fix

- 移除 `0.5.17` 的試玩題、試玩題送出與清除試玩紀錄功能，回到正式題既有流程；未來若需要試玩，由講師自行設定試玩題，試玩後使用原本清空資料流程再進正式題。
- 講師端「發送寶箱」改為「啟用追加寶箱」，後端只更新 Firebase 公開狀態中的追加寶箱層級，不再逐一寫入每位學員寶箱紀錄。
- 學員端依 Firebase `additionalTreasureBoxLevel` 本機補入第 1 至第 5 個追加寶箱，寶箱內容依固定槽位預先決定。
- 修正個人排名第 1 至第 5 名圖示與未開啟寶箱圖示的綠幕底色，改為透明背景。
- 調整學員端個人排行榜圖示尺寸，避免第 2 名圖示切到第 1 名獎盃。
- 自由選隊卡片的隊名改成上 2 字、下 3 字顯示，避免「隊」字單獨斷行。

### test

- 已執行學生端、講師端與投影端 JavaScript 語法檢查、GAS `.js` 語法檢查、Cloud Functions build、`git diff --check`。
- 已執行 `clasp push`，並將 GAS Web App 既有正式 deployment 更新為 `@56`。
- 已執行 Firebase Hosting 部署，線上學員端與講師端載入 `0.5.18`。

## 0.5.17 - 2026-05-28

### feat

- 講師端新增「開放試玩題」、「發送寶箱」、「清除試玩紀錄」三個控制功能。
- 試玩題沿用正式開題與作答流程，但題號會以 `trial_` 前綴隔離，避免直接混入正式題號。
- 學員端答對試玩題後，立即計入個人與戰隊排行，並取得 1 個待開啟寶箱。
- 講師端可清除試玩題造成的答題紀錄、試玩寶箱、試玩道具使用紀錄與分數影響，再進入正式題。
- 講師端可即時發送寶箱，所有已報到學員會各取得 1 個待開啟寶箱，可重複發送。

### test

- 已完成學生端與講師端 JavaScript 語法檢查、GAS `.js` 語法檢查、Cloud Functions build、`git diff --check`。
- 已執行 `clasp push`，並將 GAS Web App 既有正式 deployment 更新為 `@54`。
- 已執行 Firebase Hosting 部署，線上學員端與講師端已載入 `app.js?v=0.5.17`。

## 0.5.16 - 2026-05-28

### fix

- 學員端道具清單與道具使用紀錄縮短文字，改用卡片右側分數標籤顯示 `+N 分`、`x2` 或 `+0 分`，避免手機畫面出現省略號。
- 修正加倍卡使用紀錄文字，不再誤顯為空寶箱；有下一題時顯示「已裝備，下題答對 x2」，無下一題時顯示未加分。
- 挑戰卡彈窗改為手機優先單欄排版，縮短猜大、猜小、不猜的說明文字，避免文字卡到按鈕。
- 挑戰結果卡改為滿寬像素風卡片，避免結果畫面偏在左側。
- 學員端排行榜精簡為戰隊、分數與前 5 名個人榜，並加入序位獎盃圖示。
- 競賽結算後隱藏作答區塊，只保留最後成績與道具使用紀錄；讀取最終結果後同步更新頂欄個人分數。

### test

- 已執行學生端與講師端 JavaScript 語法檢查、Cloud Functions build、版本參數檢查、Firebase Hosting 部署與線上 `0.5.16` 載入檢查。

## 0.5.15 - 2026-05-28

### fix

- 講師端結算競賽、清空測試資料與重新開題，改為遊戲內像素風確認視窗，不再使用瀏覽器原生 `confirm()`。
- 講師端確認視窗加入遮罩、像素風面板、危險操作提示色與固定雙按鈕排列，避免瀏覽器網址通知破壞遊戲感。

### test

- 已執行講師端 JavaScript 語法檢查、Cloud Functions build、`window.confirm` 搜尋、Firebase Hosting 部署與線上 `0.5.15` 載入檢查。

## 0.5.14 - 2026-05-28

### fix

- 講師端重新載入時，若目前 GAS 場次已初始化為 `draft`，自動回到「啟動場次」頁面，避免卡在「題目控制」。
- 講師端流程標題移除標號，顯示為「啟動場次」與「題目控制」。
- 學生端成就狀態標籤改為水平與垂直置中。
- 挑戰卡抽號後先停留在號碼揭曉畫面，學員可點擊「揭曉結果」，或等待 5 秒後自動顯示結果。

### test

- 已執行前端 JavaScript 語法檢查、Cloud Functions build、Firebase Hosting 部署與 GAS Web App deployment `@53`。

## 0.5.13 - 2026-05-28

### fix

- 將學生端送出答案與放棄創作的瀏覽器原生確認視窗，改為遊戲內像素風確認視窗，避免畫面出現網站網址提示。
- 調整寶箱獎勵機率：空寶箱 5%、翻身卡 5%、挑戰卡 20%，並同步靜態設定與 GAS 預設規則。
- 翻身卡改為每位學員最多抽到 1 張；若同隊第 2 次使用翻身卡，效果改為 +10 分。
- 調整投影端結算獎項區塊，避免全對獎名單換行時被畫面裁切。

### test

- 預計執行前端 JavaScript 語法檢查、Cloud Functions build 與 0.5.13 畫面截圖。

## 0.5.12 - 2026-05-28

### fix

- 投影端開題與等待畫面的戰隊排行榜改為較緊湊的即時排行列，避免第 5 隊被畫面裁切。
- 學員端等待開題時只保留一行小字提示，移除中間重複的大字提示。
- 學員端關題後把「第 N 題已關題」移到下方對話框，與已選擇答案、花費秒數放在同一區。
- 空寶箱開啟後顯示大型醒目訊息，不再只更新隱藏狀態文字。
- 獎勵提示文案改為「請點上方寶箱或成就按鈕處理」。
- 成就狀態標籤「已領取」、「進行中」、「完成」置中顯示。
- 答題彈窗內文移除重複題號，只顯示題目本身。
- 學員端排行榜彈窗改為手機優先的像素風清單，並隱藏不必要的快照更新說明。

### test

- 已執行前端 JavaScript 語法檢查與 Cloud Functions TypeScript build。

## 0.5.11 - 2026-05-28

### fix

- 學員端報到改為自由選隊時隱藏「進入報到」按鈕，輸入暱稱後直接點選戰隊完成報到。
- 精簡學員端作答、排行榜、寶箱與成就彈窗文字，移除本機同步、後台檔案與系統內部狀態描述。
- 未開啟寶箱改用關閉狀態圖示；空寶箱開啟後列入道具使用紀錄，並使用原本開箱圖示。
- 道具使用紀錄加入道具圖示，文字改為單行摘要。
- 作答送出後改為「防線已部署」等候畫面，不再持續顯示不可修改的題目與選項。
- 投影端結算畫面壓縮上方區塊，個人排名最多顯示 5 名，且每一名使用含數字意象的圖片。

### chore

- 講師端「初始化遊戲資料」文案改為「清空測試資料」，採用既有刪除舊資料流程，不在本版導入場次版本控制。
- 確認挑戰卡已存在於前端靜態寶箱權重、範例設定與 GAS 獎勵機率表。

### test

- 已執行 `node --check frontend/student/dist/app.js`、`node --check frontend/instructor/dist/app.js`、`node --check frontend/instructor/dist/display.js`。

## 0.5.10 - 2026-05-28

### fix

- 移除專案 UI 中的循環箭頭 loading 圖示，不再於「目前狀態」、狀態文字或停用按鈕旁顯示該圖示。
- 移除狀態文字與流程狀態中的綠橘條紋等待動畫，等待狀態改為純文字呈現。

### test

- 已移除 `frontend/` 內的 `reload.svg` 靜態圖示檔，並確認不再引用 `--icon-reload`、`var(--icon-reload)` 或 `loading-stripes`。

## 0.5.9 - 2026-05-27

### feat

- 學員端改用真實戰隊名稱，報到選隊與 HUD 不再顯示 `team_1` 或「第 1 隊」這類內部代碼。
- 新增 GPT 產生並去背的像素圖資：成就 7 張、道具 8 張、挑戰卡數字 0 到 9、挑戰結果 3 張、挑戰選項 3 張、排名獎盃 5 張、全對獎與幸運獎專用圖。
- 成就彈窗改為固定欄位排版，每個成就顯示對應任務圖示，狀態按鈕不再壓到文字。
- 道具清單改為每種道具使用不同圖片，包含 +1、+3、+5、+10、加倍、翻身、挑戰與空箱。
- 挑戰卡流程改為圖片化：猜大、猜小、放棄猜測使用獨立圖示，抽號碼使用 0 到 9 圖卡，結果顯示成功、失敗或放棄圖片。
- 投影端排行榜獎盃規則改為第 1 名彩虹、第 2 名紫色、第 3 名金色、第 4 名銀色、第 5 名銅色；全對獎與幸運獎改用獨立專用圖。
- 移除頁面上「學員端」、「講師端」、「大螢幕投影端」等端點標示，降低使用者看到系統內部分類的機率。

### test

- 已執行 `node --check` 檢查學員端、講師端與投影端 JavaScript。
- 已執行 `npm run check:functions`，Cloud Functions TypeScript build 通過。
- 已產生 `screenshots/v5_0_5_9/`，包含成就、道具、挑戰卡與投影端排行榜畫面。

## 0.5.8 - 2026-05-27

### fix

- 修正翻身卡判定：只有「唯一最後 1 名」取得 30 分，非最後 1 名與並列最後名次均改為 5 分。
- 學員端移除分數列的「道具加分」欄位，避免學員答題時看到不必要的計分細節。
- 精簡學員端與講師端狀態文字，移除「本機」、「待同步」、「後台正式結算」等偏系統內部的描述。

### feat

- 新增 `pixelarticons` 套件並把必要 SVG 圖示複製到學員端與講師端靜態資源。
- 學員端報到、送出、等候等讀取狀態改用 PixelArt Icons 圖示與條紋等待效果，不再使用自轉方塊。
- 學員端答題區移除不必要圖片，右下快捷按鈕改為圖示化像素按鈕。
- 成就清單每個成就加入圖示，並優化「領取」、「已領取」、「進行中」、「完成」狀態樣式。
- 挑戰卡加入 0 到 9 抽號碼動畫，並補上成功、失敗、放棄猜測三種結果圖示。
- 投影端改為像素風格背景、卡片、選項、排行榜與得獎名單樣式，讓學員端、講師端與投影端風格一致。
- 排行榜顯示使用「冷鏈守護隊」等正式隊名，不再把 `team_1` 這類內部代碼顯示給使用者。

### test

- 已通過學員端、講師端與投影端 JavaScript 語法檢查。
- 已通過 GAS 語法檢查。
- 產生功能畫面快照至 `screenshots/v5_0_5_8/`。
- Firebase Hosting 線上檢查通過：學員端載入 `app.js?v=0.5.8`，講師端載入 `app.js?v=0.5.8`，投影端載入 `display.js?v=0.5.8`。

### deploy

- 已推送 GAS 並更新既有 Web App deployment 到 `@52`，描述為 `v0.5.8 comeback card fix 2026-05-27`。
- 已部署 Firebase Hosting：學員端 `https://tychbniis-32af5-student.web.app`、講師端與投影端 `https://tychbniis-32af5-instructor.web.app`。

## 0.5.7 - 2026-05-27

### chore

- 收斂第 5 版視覺優化版號與前端快取參數至 `0.5.7`。
- 更新 README、`docs/17_v5_visual_release.md` 與 `docs/AI_HANDOVER.md`，標記第 5 版視覺優化階段完成。
- 保留本機功能狀態快照，供檢視寶箱、等候、講師控制、投影排行、結算與戰隊識別畫面。

### test

- 執行 `npm run check:functions`。
- 產生回歸快照至 `screenshots/v5_0_5_7/`。
- Firebase Hosting 線上檢查通過：學員端載入 `app.js?v=0.5.7`，講師端載入 `app.js?v=0.5.7`，投影端載入 `display.js?v=0.5.7`。

### deploy

- 已部署 Firebase Hosting：學員端 `https://tychbniis-32af5-student.web.app`、講師端與投影端 `https://tychbniis-32af5-instructor.web.app`。
- 本次未修改 GAS，未推送 GAS，GAS Web App 維持既有 deployment。

## 0.5.6 - 2026-05-27

### feat

- 學員端戰隊選擇按鈕依 `data-team-id` 套用不同隊徽色票。
- 學員進入遊戲後，戰隊文字與遊戲畫面會保留 `data-team-id`，方便後續延伸戰隊美術。
- 分數列補齊「道具加分」欄位並修正手機與橫向螢幕版面。

### test

- 快照改為戰隊選擇與手機版遊戲狀態截圖，輸出至 `screenshots/v5_0_5_6/`。

## 0.5.5 - 2026-05-27

### feat

- 投影端戰隊排行榜與個人排名資料加入 `rank-*` class，冠亞季軍可套用穩定視覺樣式。
- 投影端名次加入像素獎牌區塊，改善大螢幕遠距可讀性。
- 投影端得獎名單改為獎項卡片，區分幸運獎與全對獎。

### test

- 快照改為排行榜與結算狀態截圖，輸出至 `screenshots/v5_0_5_5/`。

## 0.5.4 - 2026-05-27

### feat

- 講師端後端設定、啟動場次與題目控制面板加入流程階段高亮。
- 講師端模式徽章依 GAS 後端或示範模式切換視覺狀態。
- 啟動、開題、關題、結算與初始化資料按鈕加入不同視覺層級，降低正式操作誤觸風險。

### test

- 快照改為講師控制流程狀態截圖，輸出至 `screenshots/v5_0_5_4/`。

## 0.5.3 - 2026-05-27

### feat

- 學員端狀態文字在「正在、讀取、等待、確認、送出、結算、同步、稍候」等後台回應情境，會自動顯示像素風轉圈與進度條。
- 講師端後端設定、開題、關題、排行榜、電腦學員與結算狀態加入一致的等候動畫。
- 投影端等待開題、讀取與結算文字加入等候動畫，降低大螢幕停等時的空白感。

### test

- 快照改為功能狀態截圖，已規劃輸出至 `screenshots/v5_0_5_3/`。

## 0.5.2 - 2026-05-27

### feat

- 強化題目文字與作答視窗可讀性。
- 答案選項改為像素卡片，加入選中與已送出狀態。
- 答對、答錯、等待判定訊息加入狀態圖示與短轉場。

### fix

- 修復 `0.5.2` 開發途中 Windows 檔案鎖定造成的前端 HTML 編碼破壞，已從 Git 回復後重新套用小範圍修改。

### test

- 已產生快照：`screenshots/v5_0_5_2/`。

## 0.5.1 - 2026-05-27

### feat

- 強化學員端寶箱與道具卡片視覺，加入寶箱、道具、加倍、翻身與挑戰卡的 CSS pixel icon。
- 寶箱開啟時加入短促搖晃動畫，開啟完成後淡出移除。
- 道具卡片依 `itemType` 與 `status` 加上狀態 class，方便後續擴充視覺。

### test

- 已產生快照：`screenshots/v5_0_5_1/`。
- 4 個本機頁面無 console error、無資源載入失敗。

## 0.5.0 - 2026-05-27

### feat

- 新增第 5 版像素風視覺優化，套用 `docs/ANTIGRAVITY_CODEX_FULL.md` 的 Pixel Art Retro Game UI 規格。
- 新增 Hero 美術圖與等候空狀態美術圖，存放於 `frontend/shared/assets/images/` 與各端 `dist/assets/images/`。
- 學員端加入 Hero 圖、空狀態圖、像素風按鈕、卡片陰影、短轉場與 disabled 等候動作。
- 講師端與投影端加入像素風 Hero、卡片框線、短轉場與按鈕等候動作。
- 修正投影端「戰隊排行榜」標題斷字問題。

### docs

- 將 `ANTIGRAVITY_CODEX_FULL.md` 複製到專案 `docs/` 目錄，方便後續 AI 接手。
- 新增 `docs/17_v5_visual_release.md`。
- 更新 README、AI_HANDOVER 與 `app/config/modules.json`。

### safety

- 本版未修改 GAS、Firebase rules、API 行為、題庫、計分、道具或結算邏輯。
- 已建立修改前備份：`backup/v5_visual_20260527/`。

## 0.4.28-final - 2026-05-27

### docs

- 第 4 版以 `0.4.28` 定版。
- 新增 `docs/16_v4_final_release.md`，整理定版結論、部署資訊、功能範圍、資料責任、測試清單、已知限制與還原方式。
- 重建 `data/v4_static_game_config.example.json`，更新為 `0.4.28` 可解析範本，並補齊計分、寶箱、成就、道具、去重與後端責任資料。
- 更新 README、AI 交接文件、路線圖、規則文件、Realtime Database schema、Firestore 狀態與部署檢查表。
- `app/config/modules.json` 模組狀態改為 `v4_0_4_28_final`。

## 0.4.28 - 2026-05-27

### fix

- 學員端道具紀錄調整為「前端已立即加分的道具直接顯示已套用」，避免一般加分卡或挑戰卡顯示為待套用。
- 加倍卡與翻身卡維持待套用邏輯，待下一題或後端確認後再轉為已套用。
- 講師端按下結算後會先發布 `finalizing_countdown` 狀態，投影端顯示 15 秒最後道具使用倒數。
- 講師端會在按下結算後約 20 秒才正式呼叫 GAS `finalizeCompetition`，保留最後道具同步緩衝。

### deploy

- 已推送 GAS，Apps Script Web App deployment 更新為 `@51`。
- 已部署 Firebase Hosting，學員端、講師端與投影端線上頁面皆載入 `0.4.28`。

### test

- 已通過學員端、講師端、投影端 JavaScript 語法檢查與 Functions build。
- 已用 Playwright 打開線上學員端、講師手機端、投影端，3 個頁面皆回應 `200` 並載入 `0.4.28`。
- 線上 GAS `getGameState` 回應 `ok:true`。

## 0.4.27 - 2026-05-27

### fix

- GAS 在競賽結算前會再次同步 Firebase pending 道具使用紀錄，讓最後 1 題關題後、結算前送出的加分卡、挑戰卡、翻身卡可納入最終成績。
- 加倍卡若在最後 1 題後才使用，學員端紀錄明確標示 0 分且不顯示為待套用。
- 投影端與公開排行榜獎項清單過濾 `perfect_candidate` 候選紀錄，正式全對獎產生後不再重複顯示同一位學員。
- 空寶箱提示改為明確說明「沒有取得道具、不扣分、不需再操作」。
- 學員端頂端狀態列只顯示個人積分總分，避免與排行榜總分口徑混淆。

### deploy

- 已推送 GAS，Apps Script Web App deployment 更新為 `@50`。
- 已部署 Firebase Hosting，學員端、講師端與投影端線上頁面皆載入 `0.4.27`。

### test

- 已通過學員端、講師端、投影端 JavaScript 語法檢查與 Functions build。
- 已用 Playwright 打開線上學員端、講師手機端、投影端，3 個頁面皆回應 `200` 並載入 `0.4.27`。
- 已用線上 GAS 讀取目前 finalized 場次，確認現有排行榜中個人積分等於答題分加道具分，戰隊積分等於平均分加道具分。
- 未執行清空正式場次並重新開局的完整活動測試；此動作會覆寫目前 finalized 場次資料，需由講師確認後再做。

## 0.4.26 - 2026-05-26

### fix

- 學員端頂端狀態列移除「道具使用分」欄，只保留學員、戰隊與個人積分。
- 投影端開題後重新顯示答題倒數，倒數時間與學員端一致採 65 秒。
- 修正 65 秒緩衝秒數換算：剩餘 65 到 60 秒記為 1 秒；剩餘 59 秒起才依 60 秒倒推計算。
- 成就題目清單改為合併靜態題庫與已載入公開題目，避免連續 3 題完成後連續 5 題進度卡在 3 / 5。
- GAS 道具加分彙整改用 itemId 去重，並避免 Firebase pending 道具使用重複同步成多列 used 紀錄，降低最終結算分數高於學員端的情形。

### deploy

- 已推送 GAS，Apps Script Web App deployment 更新為 `@49`。
- 已部署 Firebase Hosting，學員端、講師端與投影端線上頁面皆載入 `0.4.26`。

### test

- 已通過學員端、講師端、投影端 JavaScript 語法檢查、Functions build、本機 Playwright 載入檢查與線上 Hosting 載入檢查。
- 線上 GAS `getGameState` 回應 `ok:true`。

## 0.4.25 - 2026-05-26

### fix

- 學員端頂端狀態列改為「個人積分(答題/道具)」，格式為 `200分（180/20）`。
- 排行榜移除答對率顯示，個人排名改以個人積分排序，個人榜保留總作答秒數。
- 戰隊積分改為每題答題平均分加總後，再加上全隊道具加分。
- 連續答對成就改用布林正規化判斷，避免 `true` / `false` 字串造成進度不重算。
- 學員端作答倒數改為 65 秒，剩餘秒數大於 60 秒者，送出的使用秒數固定為 1 秒。
- 新增講師端「重新開題」功能，已作答學員仍由前端與後端去重鎖定，未作答學員可重新作答。

### deploy

- 已推送 GAS，Apps Script Web App deployment 更新為 `@48`。
- 已部署 Firebase Hosting，學員端、講師端與投影端線上頁面皆載入 `0.4.25`。

### test

- 已通過學員端、講師端、投影端 JavaScript 語法檢查、Functions build、本機 Playwright 載入檢查與線上 Hosting 載入檢查。
- 線上 GAS `getGameState` 回應 `ok:true`；`reopenQuestion` 未帶管理密碼時回覆授權失敗，確認 action 已部署且不是未知 action。

## 0.4.24 - 2026-05-26

### deploy

- 已推送 GAS，Apps Script Web App deployment 更新為 `@47`。
- 已部署 Firebase Hosting，學員端、講師端與投影端線上頁面皆載入 `0.4.24`。

### fix

- 學員端改為講師開題後自動載入題目並以 `questionOpenedAt` 開始本機倒數，不再等學員按「開始作答」才計時。
- 學員端「開始作答」改為只打開作答視窗，重複點擊不會重設作答秒數。
- 修正舊題 `scoreClosedQuestion` 背景計分完成較晚時，可能把已開的新題 Firebase 狀態覆蓋成 `question_closed` 的問題。
- 修正連續答對成就顯示：完成連續 3 題只鎖定該成就，不影響連續 5 題繼續計算。
- 修正學員端關題後本機分數計算，將加倍卡、翻身卡等本機套用的道具分數納入個人分數。
- 學員端作答視窗顯示目前題號，頂端分數會吸收排行榜快照中的後端個人分數。

### docs

- 更新第 4 版目前狀態，標記 `0.4.24` 仍屬測試修正版，尚未定版。

### test

- 已通過學員端、投影端、講師端 JavaScript 語法檢查、GAS 語法檢查、JSON 檢查與 Functions build。

## 0.4.23 - 2026-05-26

### deploy

- 已推送 GAS，Apps Script Web App deployment 更新為 `@46`。
- 已部署 Firebase Hosting，學員端、講師端與投影端線上頁面皆載入 `0.4.23`。
- 線上檢查通過：學員端、講師端、投影端皆回應 `200`。

### fix

- 投影端自動更新改為優先使用 Firebase Realtime Database 串流通知，低頻備援也只讀 Firebase，不再自動輪詢 GAS。
- 投影端手動刷新才允許讀取 GAS 作為補救來源，避免課堂中長時間等待 GAS 回應。
- 學員端開題後翻開試卷時，若收到較舊的 `question_closed` 狀態會忽略，避免剛開題就被舊關題狀態蓋掉。
- 學員端倒數歸零不再自動關閉作答，實際停止作答只依講師關題狀態。
- 學員端頂端狀態列新增學員姓名。
- 學員端結算訊息只在取得幸運獎時顯示上台領獎，不再顯示「沒有幸運獎」。

### test

- 已通過 JavaScript 語法檢查、GAS 語法檢查、JSON 檢查、Functions build 檢查與線上頁面載入檢查。

## 0.4.22 - 2026-05-26

### deploy

- ??? GAS?Apps Script Web App deployment ??? `@45`?
- ??? Firebase Hosting???????????????? `0.4.22`?

### fix

- ??????????????????????????????????
- ??????????? 1 ?????????????????????????????????????????????
- ?? `gameSessionSeed`????????????????????? seed??????????????????

### test

- ??? JavaScript ?????GAS ?????JSON ????? Functions build?

## 0.4.21 - 2026-05-26

### deploy

- 已部署 GAS，Apps Script Web App deployment 更新為 `@44`。
- 已部署 Firebase Hosting，學員端、講師端與投影端皆更新至 `0.4.21`。

### fix

- 新增場次層級 `sessionStartedAt`，初始化或開啟場次時建立，開題、關題與結算時沿用，避免學員端沿用上一場本機資料。
- 學員端報到資料會比對 `sessionStartedAt`，若偵測到新場次，會要求重新報到。
- 學員端本機作答、寶箱、道具與成就資料改用 `sessionStartedAt` 隔離，不再跨場次讀取舊資料。
- 個人排行榜資料新增 `totalResponseSeconds`，學員端與投影端個人排名會顯示作答總秒數。

### test

- 已通過 JavaScript 語法檢查、GAS 語法檢查、JSON 檢查、Functions 檢查與線上頁面載入檢查。
- 已確認 3 個線上頁面皆回應 `200` 並載入 `0.4.21`。

## 0.4.20 - 2026-05-26

### deploy

- 已部署 Firebase Hosting，學員端、講師端與投影端皆更新至 `0.4.20`。
- 本次未修改 GAS 主程式，Apps Script Web App 維持 deployment `@43`。

### fix

- 投影端不再顯示題目倒數，改以狀態文字呈現「已開題」、「已關題」、「已結算」。
- 學員端 Firebase 快速報到改為先讀取現有玩家分隊人數，再分配到目前人數最少的戰隊；人數相同時用學員裝置種子分散。
- 修正本機作答、道具、寶箱與成就資料 key 使用會變動的 `updatedAt`，導致關題後累積答題成就讀不到舊作答紀錄的問題。
- 關題公布答案後會立即重算本機成就與紅點，避免累積答對進度停在 `0 / 3` 或 `0 / 5`。

### test

- 已通過學員端與投影端 JavaScript 語法檢查、JSON 檢查、Functions 檢查。
- 已確認 3 個線上頁面皆回應 `200` 並載入 `0.4.20`。

## 0.4.19 - 2026-05-26

### deploy

- 已推送 GAS，Web App deployment 更新為 `@43`。
- 已部署 Firebase Hosting，學員端、講師端與投影端皆更新至 `0.4.19`。
- GitHub `main` 提交已建立，commit hash 以 `git log -1 --oneline` 為準。

### fix

- 修正講師開題後，投影端仍停在「等待講師開題」的問題。
- GAS `openQuestion()` 改為參考關題流程，開題時同步寫入 Firebase `gameState/{gameId}`，包含目前題號、開題時間與公開題目資料。
- 投影端保留 GAS 狀態補救讀取，用於修復已開題但 Firebase 仍停在舊狀態的場次。

### test

- 已通過 JavaScript 語法檢查、JSON 檢查、Functions 檢查、Firebase Hosting 部署後線上頁面載入檢查。
- Playwright 未執行，原因是本專案未安裝 `playwright` 套件；本次以 HTTP 線上載入與語法檢查替代。

## 0.4.18-deploy - 2026-05-26

### deploy

- 已推送 GitHub `main`，提交為 `734f795`。
- 已部署 Firebase Hosting 學員端與講師端。
- 本次未修改 GAS，GAS Web App 維持 deployment version `42`。
- 線上確認 `Student App`、`Instructor.html`、`Display.html` 皆回應 `200` 並載入 `0.4.18`。

### test

- 已用 Playwright 實際開啟線上學員端、講師手機端、大螢幕顯示端。
- 3 個頁面均無 console error 與 page error。
- 線上學員登入畫面的道具使用紀錄已隱藏。
- 線上大螢幕端在 1366×768 檢查中無水平或垂直捲動，得獎名單位於可視範圍內。

## 0.4.18 - 2026-05-26

### fix

- 學員登入前隱藏回答頁下方的道具使用紀錄，報到後才顯示。
- 大螢幕投影端改為較快輪詢，並在開題或關題時強制補讀目前題目，避免開題後畫面停在舊狀態。
- 連續答對成就改為「未完成前看目前連續題數」，失敗後回到 `0 / 3` 或 `0 / 5`；已完成的門檻維持完成狀態。
- 大螢幕排行榜與結算畫面改為更緊湊的固定版面，避免戰隊排行與得獎名單被切掉。

## 0.4.17-deploy - 2026-05-26

### deploy

- 已推送 GitHub `main`，提交為 `96252af`。
- 已部署 Firebase Hosting 學員端與講師端。
- 本次未修改 GAS，GAS Web App 維持 deployment version `42`。
- 線上確認 `Student App`、`Instructor.html`、`Display.html` 皆回應 `200` 並載入 `0.4.17`。

### test

- 已用 Playwright 實際開啟線上學員端、講師手機端、大螢幕顯示端。
- 3 個頁面均無 console error 與 page error。
- 大螢幕顯示端在 1366×768 檢查中無水平或垂直捲動。

## 0.4.17 - 2026-05-26

### fix

- 投影端開題時顯示「已開題」提示、題目與選項；關題後直接在選項上以紅框強調正確答案，並在下方顯示解析。
- 投影端版面改為固定投影視窗配置，避免向下或向右捲動。
- 學員端挑戰卡結果改在彈窗內顯示，修正「猜?」亂碼。
- 學員端道具使用紀錄修正亂碼，挑戰卡顯示為已套用，不再顯示待套用。
- 成就系統移除幸運箱成就顯示。
- 全對獎改為檢查所有正式題目都已作答且無錯題，不再用答對題數累積判斷。
- 連續答對獎改為依正式題目順序檢查，中間錯題或未答會中斷連續。
- 成就完成後顯示進度鎖定在目標值，例如 `3 / 3`，不再繼續增加為 `4 / 3`。

## 0.4.16-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main`，提交為 `f5d3325`。
- 已推送 GAS 並更新既有 Web App deployment 到 version `42`，正式 URL 不變。
- 已部署 Firebase Hosting 學員端與講師端。
- 線上確認 `Student App`、`Instructor.html`、`Display.html` 皆回應 `200` 並載入 `0.4.16`。

### test

- 已用 Playwright 實際開啟線上學員端、講師手機端、大螢幕顯示端。
- 3 個頁面均無 console error 與 page error。
- 大螢幕端在目前已結算狀態下，已確認隱藏目前題目與即時排行榜，只顯示結算畫面。

## 0.4.16 - 2026-05-25

### feat

- 大螢幕端開題時改由 `publicQuestions` 快取補齊目前題目，避免只在關題後才更新。
- 大螢幕端結算後隱藏目前題目與排行榜，只保留戰隊排名、個人排名與得獎名單。
- 學員端翻開試卷後改用彈窗選答案，作答後頁面只保留已選選項與花費秒數。
- 學員端道具紀錄移到回答頁最下方，改為可展開／收合。
- 挑戰卡改為前端猜大小，0 到 4 為小、5 到 9 為大；猜中 10 分、猜錯 0 分、不猜 3 分。
- 取消道具 3 分鐘限制，改為講師關題後到競賽結算前可使用。

### fix

- 講師端隱藏排行榜區塊，排行榜資訊改由大螢幕端顯示。
- 加倍卡重複抽到時改為大加分卡。
- 學員端最終結果只對幸運獎得主顯示「請上台領獎」。
- Firebase 排行榜快照新增公開得獎名單，供大螢幕端結算顯示。

## 0.4.15-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main`，提交為 `b397f5b`。
- 已部署 Firebase Hosting 學員端與講師端。
- 線上確認 `Student App`、`Instructor.html`、`Display.html` 皆回應 `200` 並載入 `0.4.15`。
- 本次未部署 GAS，GAS Web App 維持既有版本。

### test

- 已用 Playwright 實際開啟線上學員端、講師手機端、大螢幕顯示端。
- 3 個頁面均無 console error 與 page error。

## 0.4.15 - 2026-05-25

### feat

- 學員端回答頁新增「道具使用紀錄」，顯示使用卡片、獲得分數、套用題目與待同步狀態。
- 學員端將道具使用倒數移到回答頁下方，不再只放在寶箱面板內。
- 學員端回答頁新增寶箱與成就提示，成就可領取時同步顯示紅點。
- 講師端新增 `Instructor.html` 手機控制端與 `Display.html` 大螢幕顯示端。

### fix

- 學員端結算獎項顯示改為中文名稱，不再顯示 `perfect_candidate` 等內部代碼。
- 學員端道具分改讀本機道具使用紀錄的 `effectScore`，並支援加倍卡、翻身卡在下一題關題後套用。

## 0.4.14-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main`，提交為 `67281e8`。
- 已部署 Firebase Hosting 學員端與講師端。
- 本次未修改 GAS，GAS Web App 維持 deployment version `41`。

### test

- 已用 Playwright 實際開啟線上學員端，確認載入 `config.js?v=0.4.14`、`app.js?v=0.4.14`、`static-v4.js?v=0.4.14`。
- 線上學員端 console 無錯誤，原 `Identifier 'buildAchievementDefinitions' has already been declared` 已消失。
- 目前 GAS 場次狀態為 `draft`，線上學員端正確顯示等待講師啟動。

## 0.4.14 - 2026-05-25

### fix

- 修正學員端 `app.js` 重複宣告 `buildAchievementDefinitions`，避免瀏覽器以 ES module 載入時中斷執行。
- 保留完整成就規則合併邏輯，避免修正重複宣告後造成成就項目缺漏。
- 統一前端快取版本為 `0.4.14`，避免 `index.html`、`config.js`、`app.js` 混用不同版本。

### test

- 已用 Playwright 實際開啟本機學員端頁面，確認 console 無錯誤。
- 目前 GAS 場次狀態為 `draft`，因此本機畫面正確顯示「講師尚未啟動場次」。

## 0.4.13 - 2026-05-25

### fix

- 優化學員端開局狀態讀取邏輯 `getStartupGameState`：當 Firebase 為 `draft` 延遲狀態但 GAS 確認場次已啟動時，會正確進入遊戲，不再誤顯「講師尚未啟動」。
- 修復學員報到或重整時，若 GAS 讀取失敗且 Firebase 仍為 `draft`，會噴出明確錯誤提示「無法確認場次狀態」，而非回傳 `draft` 導致畫面誤踢。
- 修復 `renderPublicGameState` 監控機制：新增 Firebase 狀態過時判定（staleness check），防止監看過程收到過時的 `draft` 封包而將已在遊戲中的學員踢回報到頁。
- 前端資源版本更新為 `0.4.13`，強制重新載入修正後的邏輯。

## 0.4.12-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main`，程式修正提交為 `5debc26`。
- 已部署 Firebase Hosting 學員端與講師端。
- 本次未修改 GAS，GAS Web App 維持 deployment version `41`。

### test

- 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.12` 與 `config.js?v=0.4.12`。
- 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.12` 與 `config.js?v=0.4.12`。
- 線上 HTML 中文標題正常。

## 0.4.12 - 2026-05-25

### fix

- 修正學員端重整後若 Firebase 公開 `gameState` 仍停在 `draft`，會直接判定場次未開啟而無法進入遊戲的問題。
- 學員端開局狀態讀取改為：Firebase 若為非 `draft` 則直接使用；若 Firebase 為 `draft`、空值或暫時不可用，會再查詢 GAS `getGameState` 作為正式狀態來源。
- 前端版本更新為 `0.4.12`，避免瀏覽器沿用舊版 `0.4.11` 快取。

## 0.4.11-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main`，程式修正提交為 `58e1b8e`。
- 已更新 GAS Web App deployment 至 version `41`，正式 `/exec` URL 不變。
- 已部署 Firebase Hosting 學員端與講師端。

### test

- 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.11` 與 `config.js?v=0.4.11`。
- 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.11` 與 `config.js?v=0.4.11`。
- 線上 HTML 中文標題正常。
- GAS `getGameState` 回應 `ok:true`。

## 0.4.11 - 2026-05-25

### fix

- 講師端關題改為先顯示解答，再由背景呼叫 `scoreClosedQuestion` 結算本題成績與排行榜。
- GAS `closeAndScoreQuestion` 改為只關題、寫入答案公布狀態與同步 Firebase，不再等待完整計分。
- 學員端道具使用後會寫回本機道具狀態，重新開啟寶箱與道具面板時不再顯示為未使用。
- 學員端成就補齊累積答對 10 題、連續答對 5 題、使用 3 張道具、幸運箱得主與個人全對。
- 學員端若沒有 `v4-static-config.json`，會由 Firebase 公開題庫建立第 4 版執行期設定，保留本機寶箱預配。
- GAS 結算競賽取消整場 Firebase answers 掃描，玩家同步與答案同步改採批次寫入，降低逐列讀寫造成的等待。

## 0.4.10-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main`，程式修正提交為 `ef6959b`。
- 已更新 GAS Web App deployment 至 version `40`，正式 `/exec` URL 不變。
- 已部署 Firebase Hosting 學員端與講師端。

### test

- 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.10` 與 `config.js?v=0.4.10`。
- 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.10` 與 `config.js?v=0.4.10`。
- GAS `getGameState` 回應 `ok:true`。

## 0.4.10 - 2026-05-25

### fix

- 修正 GAS 後段實際生效的 `recalculateScoreboard` 未宣告 `validPlayerIds`，導致講師關題與結算競賽失敗。
- 學員端登入後依靜態設定、`gameSeed`、`playerId`、`questionId` 建立本機寶箱計畫。
- 一般寶箱開啟改為前端本機處理，不再呼叫 GAS；只有幸運箱會回傳 `recordLuckyBoxOpened` 做最終結算紀錄。
- 個人成就改為前端本機計算與領取，完成後立即發放本機寶箱，不再呼叫 GAS 領取成就。
- 道具清單新增使用說明，並維持使用後立即顯示送出或待同步狀態。
- 靜態設定範本補上幸運箱機率與 `itemUse` 成就規則。

### architecture

- 第 4 版重構方向確認為「前端即時體驗、後端延後確認」。
- GAS 保留去重、作答結果、道具使用結果、挑戰卡、排行榜快照、幸運箱、全對獎與賽後報表。

## 0.4.9-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main` 至 commit `3f3b995`。
- GAS 已執行 `clasp push`。
- GAS 已更新既有正式 Web App deployment 至 version `39`，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端。
- 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

### test

- 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.9` 與 `config.js?v=0.4.9`，並包含道具倒數區塊。
- 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.9` 與 `config.js?v=0.4.9`，並包含結算結果彈出頁。
- GAS `getGameState` 回應 `ok:true`。

## 0.4.9 - 2026-05-25

### fix

- 學員端本機積分與道具佇列 key 加入場次 `updatedAt`，同一個固定 `gameId` 初始化新場次後不再讀取前一場本機分數。
- 學員端改為關題後才把暫存答案納入本機積分，避免送答當下提前顯示分數。
- 學員端恢復低頻 Firebase 場次狀態監看，只處理關題、道具倒數與結算，不顯示講師開題即時提示。
- 學員端新增關題後 3 分鐘道具使用倒數提示。
- 學員端道具使用改為關題後 3 分鐘內立即送出 Firebase 紀錄，不再等待下一題開放才背景送出。
- 成就領取改為優先呼叫 GAS `claimAchievementReward` 立即發放寶箱，成功後同步更新成就與寶箱清單。
- 講師開題不再寫入 Firebase `gameState`，降低開放題目等待時間；學員翻卷時若 Firebase 沒有開題狀態，會改由 GAS 讀取目前題目。
- 講師關題改為同一次 GAS 呼叫內完成同步、計分與排行榜快照發布，不再先回傳排程後由前端補打第二次計分 API。
- 關題計分不再為未作答玩家補空白答案列，降低關題大量寫入 Google Sheets 的時間。
- 修正 `getFinalResults` 使用未定義 `questionId` 導致學員端結算頁讀取失敗。
- 排行榜快照新增個人排行榜資料。
- 戰隊排行改為依總分排序，顯示總分、平均分、道具分、戰隊人數、整體正確率與當前題目正確率。
- 講師端結算競賽後新增彈出式結算結果頁。

### perf

- 減少開題 Firebase 寫入。
- 減少關題補空白答案列與第二次計分 API 往返。

## 0.4.8-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main` 至 commit `9894e51`。
- GAS 已執行 `clasp push`。
- GAS 已更新既有正式 Web App deployment 至 version `38`，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端。
- 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

### test

- 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.8` 與 `config.js?v=0.4.8`。
- 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.8` 與 `config.js?v=0.4.8`。
- GAS `getGameState` 回應 `ok:true`。

## 0.4.8 - 2026-05-25

### fix

- 講師端「關題公布」面板改為開放題目後才顯示，並補上「已開放回答」、「關題中」、「已關題結算成績」狀態。
- 修正第 4 版結算競賽仍執行創作題與票選加分流程，導致結算競賽失敗的問題。
- 初始化遊戲時同步清除 Firebase Realtime Database 的玩家、作答、道具、寶箱、成就請求與排行榜暫存，避免帶到前一場資料。
- 學員端停止輪詢講師是否開題，改為只預載題庫，學員依講師畫面提示後手動翻卷。
- 學員端送答改以 Firebase 成功寫入為準；`HTTP 401` 或 `HTTP 403` 視為重複送出或規則阻擋，不再回退 GAS 寫入造成雙軌紀錄。
- 學員端本機計分改讀公開題庫的答案與第 4 版規則，送答成功後立即更新本機積分摘要。
- 學員端排行榜、寶箱與成就讀取時保留既有畫面資料，新資料載入完成後才置換。
- GAS 公開題庫輸出補上 `correctAnswer` 與 `explanation`，供第 4 版靜態前端計分與說明使用。

### perf

- 講師開題不再執行全體玩家寶箱預配，降低開下一題等待時間。
- 學員登入後背景預載寶箱與成就，第一次打開面板時可沿用已載入資料。

### test

- 已執行學員端與講師端 JavaScript 語法檢查、GAS 語法檢查、JSON 解析、`npm run check:functions` 與 `git diff --check`。

## 0.4.7-deploy - 2026-05-25

### deploy

- 已推送 GitHub `main`。
- 已推送 GAS 原始碼，並更新既有正式 Web App deployment 至 version `37`，正式 `/exec` URL 不變。
- 已部署 Firebase Hosting 學員端與講師端。
- 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

### test

- 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.7`。
- 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.7`。
- GAS `getGameState` 回應 `ok:true`。
- GAS `recordLuckyBoxOpened` 與 `recordPerfectAwardCandidate` 已存在；未帶 `playerId` 時回覆欄位檢核錯誤，非未知 action。

## 0.4.7 - 2026-05-23

### docs

- 新增 `docs/15_v4_0_4_7_checklist.md`，整理 `0.4.1` 至 `0.4.7` 完成項目、未部署項目與下一步。
- 更新 README、AI 交接文件、工作日誌、模組狀態與 package 版本至 `0.4.7`。
- 學員端與講師端靜態資源版本參數更新至 `0.4.7`。

### test

- 已執行學員端與講師端 JavaScript 語法檢查。
- 已執行 GAS 語法檢查。
- 已執行 JSON 設定檔解析與靜態設定範本解析。
- 已執行 `npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。

## 0.4.6 - 2026-05-23

### feat

- GAS `FIRST_CORRECT_BONUS` 改為 `0`，取消首答 +5 分。
- GAS 新增 `recordLuckyBoxOpened`，供學員端開啟幸運箱時回傳紀錄。
- GAS 新增 `recordPerfectAwardCandidate`，供學員端完成最後 1 題且全對時回傳候選紀錄。
- 學員端開啟幸運箱會嘗試回傳 GAS；學員送答判斷全對候選時會嘗試回傳 GAS。
- Firebase 開箱請求新增 `itemType`、`isLuckyBox` 與 `clientOpenId`。

### test

- 已執行學員端 JavaScript 語法檢查、GAS 語法檢查、JSON 設定檔解析、`npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。

## 0.4.5 - 2026-05-23

### changed

- 學員端排行榜維持浮動工具按鈕，點開時才讀取 Firebase `publicScoreboards/{gameId}`。
- 無排行榜快照時，畫面明確提示不呼叫 GAS 即時排行榜。
- 更新學員端資源版本參數至 `0.4.5`。

### test

- 已確認學員端程式沒有 `getScoreboard` 或 `getPlayerLeaderboard` 的 GAS 排行榜備援呼叫。
- 已執行學員端 JavaScript 語法檢查、JSON 設定檔解析、`npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。

## 0.4.4 - 2026-05-23

### feat

- 學員端新增關題後 3 分鐘道具使用期判斷。
- 道具排程資料新增 `clientItemUseId`、`effectScore` 與 `useWindowClosesAt`。
- Firebase `itemUses` 寫入新增第 4 版道具送出欄位，供 GAS 彙整與去重。
- 道具與挑戰卡超過 3 分鐘使用期時，前端會拒絕送出。

### test

- 已執行學員端 JavaScript 語法檢查、JSON 設定檔解析、`npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。

## 0.4.3 - 2026-05-23

### feat

- 學員端新增 `static-v4.js`，支援載入 `v4-static-config.json` 靜態遊戲設定。
- 學員端啟動時會優先嘗試載入第 4 版靜態題庫，並保留 Firebase 公開題庫作備援。
- 學員送答時會帶入 `clientSubmitId`、`responseSeconds`、本機正誤、基本分、題目分數與個人全對候選旗標。
- `submitFastAnswer` 會把第 4 版本機計算欄位寫入 Firebase `answers/{gameId}/{questionId}/{playerId}`，供後續 GAS 去重與彙整。

### test

- 已執行學員端 JavaScript 語法檢查、JSON 設定檔解析、`npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。

## 0.4.2 - 2026-05-23

### feat

- 新增 `data/v4_static_game_config.example.json`，定義第 4 版靜態資料格式。
- 靜態資料格式包含題庫、答案、計分規則、寶箱機率、幸運箱限制、成就規則、3 分鐘道具使用期與重複送出鍵值。
- 明確標記首答加分為 `0`，並區分學員端可計算道具與 GAS 仍需計算的挑戰卡。

### test

- 已執行 JSON 設定檔解析、`npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。

## 0.4.1 - 2026-05-23

### feat

- 學員端移除創作題隊內初選與匿名全體投票畫面。
- 講師端移除創作題審核與投票操作入口。
- 講師端題目清單排除 `creative` 題型，示範題不再顯示 `demo_q011` 創作題。
- 學員端排行榜改為浮動工具按鈕，開啟時只讀取 Firebase `publicScoreboards/{gameId}` 快照，不再回退呼叫 GAS 排行榜 API。

### test

- 已執行前端 JavaScript 語法檢查、JSON 設定檔解析、`npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。
## 0.4.0-planning - 2026-05-23

### docs

- 補充第 4 版獎項規劃：幸運箱全場最多 1 名預配，也可無人預配；開啟幸運箱需回傳 GAS，無人中獎時最終結算指定 1 名現有玩家。
- 補充個人全對獎規劃：最後 1 題完成後，由學員端判斷全對並回傳 GAS 紀錄。
- 第 4 版取消首答 +5 分，避免 GAS 額外排序與計算全場最早答對者。
- 補充第 4 版排行榜規劃：排行榜只在導師每次關題後更新，學員端改為懸浮按鈕，點開時才讀取快照。
- 修正第 4 版機率表設計：機率表由 GAS 事前建立與維護，導師開啟遊戲時只讀取既有表，避免開場等待。
- 依使用者指定方向重寫第 4 版路線圖：改為靜態 HTML5 優先、降低 GAS 呼叫、遊戲開啟時載入題庫與機率表、學員端預配寶箱與成就內容。
- 規劃關題後 3 分鐘道具送出期，加倍卡與翻身卡由學員端先計算，挑戰卡保留 GAS 計算。
- 規劃移除創作題、隊內初選、講師審核代表作品與匿名全體票選。
- 補上第 3 版未完成 BUG 與風險的第 4 版處理策略，包含重複送出、網路延遲與後端去重。
- 啟動第 4 版開發規格，新增 `docs/14_v4_roadmap.md`。
- 第 4 版定位為正式活動維運與安全檢查版，優先處理活動前健康檢查、操作手冊、賽後保存與交接流程。
- 更新 README、AI 交接文件、工作日誌、模組狀態與 package 版本。
- 本次未修改學員端、講師端、GAS、Firebase rules 或部署設定。

## 0.3.22-final - 2026-05-23

### docs

- 第 3 版以 `0.3.22` 定版，新增 `docs/13_v3_final_release.md`。
- 整理 `docs/tasks/OPTIMIZATION_PLAN_0.3.21.md`，記錄免費方案效能優化收斂結果。
- 定版狀態：Firebase Hosting 學員端與講師端已部署，GAS Web App deployment 為 version `36`。
- 確認未啟用 Cloud Functions、Cloud Run、Blaze 或任何需付費帳務的服務。
## 0.3.22 - 2026-05-23

### changed

- 學員端頂端不再顯示戰隊積分，改為顯示「個人得分」與「道具使用分」。
- 學員端隱藏排行榜入口，避免學員端讀取戰隊排行資料。
- 學員端以本機已送答紀錄、關題後公開解答與本機道具排程估算頂端分數，不再為頂端資訊呼叫 `getPlayerSummary` 或排行榜資料。
- 講師關題改為先關閉題目並立即回傳正確答案與解題說明，再由講師端自動觸發一次 GAS 後台計分與排行榜更新。
- 講師端在關題後顯示「後台計分中」，並由講師端少量延遲刷新排行榜，不讓學員端產生集中呼叫。
## 0.3.21 - 2026-05-23

### fix

- 學員端道具改為「關題後排程、下一題開放時背景送出」，避免使用道具時等待 GAS 或重新計算排行榜。
- 第 1 次開題時先同步 Firebase players，並為當時所有玩家建立預配寶箱獎勵池 TreasureRewardPool。
- 後續才加入的玩家在報到或匯入 Firebase players 時補建立預配寶箱獎勵池，仍可加入戰隊。
- 寶箱發放時即寫入已決定的 itemType，開箱時只讀取既有結果，不再臨時計算機率。
- 幸運箱若未被開啟，結算競賽時改由系統從玩家名單中隨機指定幸運獎。
- 排行榜戰隊成績改為「每題戰隊平均分加總 + 道具加分」，避免後加入玩家拉低已關閉題目的平均分。
- 挑戰卡答對率改以該題已納入結算的作答列為分母，不再使用目前戰隊總人數回推舊題。
- 修正寶箱與成就紅點因 CSS display 覆蓋 hidden 而常態顯示的問題。
- 移除學員端在關題後自動呼叫 refreshPlayerSummary 的 500 ms 集中刷新，降低 200 人同時關題時的 GAS 壓力。
### perf

- **GAS 讀取優化**: 重構 `getPlayerSummary` 與 `getPlayerNoticeSummary`，將多個 sheet 讀取動作整合為單次 pre-fetch，大幅減少 GAS 在高併發下的 Google Sheets 讀取次數，提升系統載入速度。
- **即時寶箱同步**: 優化 `openBox` 流程，由原本依賴結算同步改為直接呼叫 GAS API 並立即刷新本地 `inventory`，實現「秒開、秒用」道具卡。
- **紅點通知優化**: 整合 `refreshPlayerSummary` 與 `refreshInventory`，確保成就領取與寶箱開啟後的紅點通知狀態能正確且即時更新。

### deploy

- 已更新版本標記至 `0.3.21`。
- 本次包含 GAS `Code.gs` 與學生端 `app.js` 之重大更新。

### fix

- 創作題資料再加上「本次開題時間」過濾；同一題號重複測試時，舊投稿、舊隊內投票與舊全體投票不再混入目前題目。

- 學員端一般選擇題送答若 Firebase 回覆 `HTTP 401`，會自動回退呼叫 GAS `submitAnswer`，避免畫面停在送出失敗。
- GAS 創作投稿與創作投票新增 `questionId` 欄位，投稿池、隊內投票、講師候選、決選與結果只讀目前創作題資料，避免代入舊題或測試資料。
- GAS `finalizeCompetition` 不再同步整場 Firebase `answers`，避免講師按結算競賽時掃描過多資料造成緩慢；正式完整重算仍保留給賽後 GAS 報表流程。
- 學員端個人摘要讀取失敗時會清除寶箱與成就紅點，避免無可操作內容仍顯示警示。

### deploy

- 已更新版本標記至 `0.3.20`。
- 本次仍維持免費方案，不啟用 Cloud Functions、Cloud Run 或 Blaze。

## 0.3.18 - 2026-05-23

### fix

- GAS `closeAndScoreQuestion` 計分前會先同步 Firebase `players` 與當題 `answers` 到 Google Sheets，修正講師關題後收到 0 筆作答或分數計算失敗。
- GAS 創作題讀取投稿池、投票、講師讀取候選、選出代表、全體投票、結算競賽前會同步 Firebase 創作投稿與投票暫存資料，修正創作題送出後卡住不動。
- GAS `findPlayer` 找不到 Google Sheets 玩家時，會從 Firebase `players` 匯入該玩家，修正寶箱、成就、成績結算出現「找不到玩家」。
- 學員端寶箱或成就讀取失敗時會先隱藏紅點，避免沒有可操作內容仍顯示警示。

### deploy

- 已更新版本標記至 `0.3.18`。
- 本次仍維持免費方案，不啟用 Cloud Functions、Cloud Run 或 Blaze。

## 0.3.17 - 2026-05-23

### perf

- GAS `closeAndScoreQuestion` 關題計分後，會將目前戰隊排行榜發布到 Realtime Database `publicScoreboards/{gameId}`。
- 學員端排行榜可繼續只讀 Firebase 快照，避免送答、用道具、開寶箱後重算或刷新全體排行榜。
- GAS `finalizeCompetition` 結算後，會發布 `source: gas_final` 的正式排行榜快照。

### changed

- 暫時排行榜快照標示 `isTemporary: true`、`source: instructor_close_question`、`questionId`。
- 正式結算快照標示 `isTemporary: false`、`source: gas_final`。

### limitation

- 暫時快照仍由講師關題時觸發，尚未改成完全 Firebase 端批次結算。
- 正式成績仍以賽後 GAS 重新計分與報表為準。

### test

- 已執行學生端、講師端 JavaScript 語法檢查。
- 已執行 GAS 語法檢查、JSON 設定檔解析、`git diff --check` 與 `npm run check:functions`。
- 已完成本機與線上 Hosting 頁面檢查。

### deploy

- 已部署 GAS。
- 已部署 Firebase Hosting。
- 未部署 Cloud Functions、Firestore rules、Cloud Run，未啟用 Blaze。

## 0.3.16 - 2026-05-23

### perf

- 學員端創作題投稿改為優先寫入 Realtime Database `creativeSubmissions/{gameId}/{questionId}/{playerId}`。
- 學員端隊內初選投票改為優先寫入 `creativeTeamVotes/{gameId}/{questionId}/{playerId}`。
- 學員端匿名全體投票改為優先寫入 `creativeFinalVotes/{gameId}/{questionId}/{playerId}`。
- 投稿或投票成功後立即顯示完成狀態，不再等待 GAS 重新讀取投稿池或決選作品。
- Firebase 寫入失敗時保留 GAS action 備援。

### security

- Realtime Database rules 新增 `creativeSubmissions`、`creativeTeamVotes`、`creativeFinalVotes` 寫入限制。
- 同一玩家同一題投稿或投票路徑只能建立一次，避免重複點擊造成多筆有效資料。

### limitation

- 講師端讀取候選、選代表作品與讀投票結果仍走 GAS。
- 正式創作題加分與匿名投票驗證仍需後續 GAS 從 Firebase 匯出並重新結算。

### test

- 已執行學生端、講師端 JavaScript 語法檢查。
- 已執行 GAS 語法檢查、JSON 設定檔解析、`git diff --check` 與 `npm run check:functions`。
- 已測試 `creativeSubmissions`、`creativeTeamVotes`、`creativeFinalVotes` 第一次寫入成功、同一路徑重複寫入被拒絕。

### deploy

- 已部署 Firebase Hosting 學員端與講師端。
- 已部署 Realtime Database rules。
- 未部署 GAS、Cloud Functions、Firestore rules、Cloud Run，未啟用 Blaze。

## 0.3.15 - 2026-05-23

### perf

- 學員報到改為優先寫入 Realtime Database `players/{gameId}/{playerId}`，成功後立即進入遊戲畫面。
- 報到成功後不再自動呼叫 GAS 個人摘要，避免登入時同時刷新排行榜、寶箱、成就與分數資料。
- 若 Firebase 快速報到失敗，仍保留 GAS `joinGame` 備援，避免現場因 rules 或網路異常完全無法報到。
- 未開放自由選隊時，前端以 `clientKey` 雜湊穩定分配戰隊；正式平衡分隊仍可由後續管理流程調整。

### security

- Realtime Database rules 新增 `players` 寫入限制：同一路徑只能建立一次，且不得由學生端覆寫既有 player。
- 學生端仍未接 Firebase Auth；本階段 rules 只能限制資料形狀與管理節點，不能視為完整身分驗證。

### limitation

- 尚未完成同暱稱跨裝置去重；目前以同一裝置 `clientKey` 穩定沿用同一 playerId。
- 報到資料已進 Firebase，但正式名冊、賽後報表與正式成績仍需後續 GAS 匯出與重新計分流程整合。

### test

- 已執行學生端、講師端 JavaScript 語法檢查。
- 已執行 GAS 語法檢查、JSON 設定檔解析、`git diff --check` 與 `npm run check:functions`。
- 已測試 Realtime Database `players` 第一次寫入成功、同一路徑重複寫入被拒絕。

### deploy

- 已部署 Firebase Hosting 學員端與講師端。
- 已部署 Realtime Database rules。
- 未部署 GAS、Cloud Functions、Firestore rules、Cloud Run，未啟用 Blaze。

## 0.3.14 - 2026-05-23

### perf

- 學員送答改為優先寫入 Firebase Realtime Database `answers/{gameId}/{questionId}/{playerId}`，送出後立即顯示「已送出，等待講師關題」，不再等待 GAS / Google Sheets 計分。
- 學員翻開已同步到 Firebase 的公開題目時，不再呼叫 GAS `openPaper`；作答時間改由 Firebase 暫存資料與賽後正式重算處理。
- 道具使用改為寫入 Firebase `itemUses/{gameId}/{itemId}`，狀態為 `pending`，前端立即顯示「已使用，將於關題後結算」。
- 排行榜改為優先讀取 Firebase `publicScoreboards/{gameId}` 快照，避免學員查看排行榜時即時掃描 GAS / Google Sheets。
- 成就領取與寶箱開啟改為先寫入 Firebase 請求節點，前端立即回饋，不同步刷新全部成就、寶箱、排行榜與個人摘要。

### security

- Realtime Database rules 新增 `answers`、`itemUses`、`treasureBoxOpenRequests`、`achievementClaimRequests` 輕量節點規則。
- 學員端仍不可寫入 `gameState`、`publicQuestions`、`publicScoreboards` 等管理節點。
- `answers` 採同一題同一玩家路徑只允許建立一次，避免重複送答覆寫最早送出時間。

### limitation

- 本階段未啟用 Cloud Functions、Cloud Run 或 Blaze。
- 本階段尚未把報到、創作投稿、隊內投票、匿名全體投票全面改為 Firebase 寫入。
- 既有寶箱資料仍未在取得時預先決定 `rewardType`，因此開箱先採快速請求與 UI 回饋；正式獎勵需在下一階段由 Firebase 預先獎勵資料或賽後 GAS 重算補齊。
- 學員端目前尚未接 Firebase Auth，Realtime Database rules 只能限制資料形狀與管理節點，不能做到完整身分驗證。

### test

- 已完成 GAS 語法檢查、學員端與講師端 JavaScript 語法檢查、JSON 解析、`git diff --check`、`npm run check:functions`。
- 本機學員端與講師端靜態頁面回應 `200`，皆載入 `app.js?v=0.3.14`。
- 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.14`。
- Realtime Database rules 已通過 Firebase CLI dry run。
- 線上 Realtime Database 測試：`answers/codex_perf_test_20260523/q001/player001` 第一次寫入成功，第二次覆寫被拒絕；測試資料已移除。

### deploy

- 已部署 Firebase Hosting 學員端與講師端。
- 已部署 Realtime Database rules。
- 本次未部署 GAS、Cloud Functions、Firestore rules、Cloud Run 或任何需付費帳務的服務。

## 0.3.13 - 2026-05-23

### feat

- 講師端新增 `finalizeCompetition` 結算競賽功能。
- 學員端新增最後成績區，競賽結算後顯示戰隊排名、個人排名、最後積分與上台領獎提示。
- GAS 新增 `getFinalResults`，供學員讀取個人最後成績與獎項。
- 創作決選第一名戰隊結算時取得創作加分。

### changed

- 學員端登入後不再自動讀取寶箱、成就與匿名決選資料，降低大量學員同時進場時的 GAS 壓力。
- 關題關閉後不再自動讀取排行榜、寶箱、成就與匿名決選資料，只更新個人摘要與紅點。
- 創作題倒數改為單一階段倒數，避免一般題倒數與創作倒數同時更新造成閃爍。
- 戰隊積分顯示改為無條件進位到整數。
- 學員端避免用暫時性的 0 分覆蓋既有戰隊積分。
- 寶箱紅點只看未開啟寶箱，成就紅點只看可領取成就寶箱。

### docs

- 更新 README、遊戲規則、工作日誌、AI 交接文件、GAS README 與模組版本。

### test

- 已完成 GAS 語法檢查、前端 JavaScript 語法檢查、JSON 解析、`git diff --check`、`npm run check:functions`、本機學員端與講師端頁面 `200` 檢查。
- 線上檢查通過：學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.13`；GAS `getGameState` 回應 `ok:true`；`finalizeCompetition` 與 `getFinalResults` 已不再回覆「未知 action」。

### deploy

- GAS 已推送並更新既有 Web App deployment 到 version 30，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.3.12 - 2026-05-22

### feat

- 講師端新增電腦學員測試控制，可加入電腦學員並讓電腦作答目前題目。
- 創作題改為 3 分鐘作答，可提交或放棄回答；全員完成或時間到後進入 30 秒隊內投票。
- 匿名全體投票改為講師選出代表作品後開放 30 秒，逾時未投票視同放棄。

### changed

- 學員端最上方戰隊積分改顯示含道具加分後的排名分。
- 寶箱與道具列表移除來源、時間與內部題目 ID 等資訊。
- 寶箱開啟後不再顯示該寶箱列。
- 空寶箱改顯示「寶物被偷走了」、「發現空寶箱」等現場短句。

### docs

- 更新 README、遊戲規則、工作日誌、AI 交接文件、GAS README 與模組版本。

### test

- 本機檢查通過：GAS 語法、學員端與講師端 JavaScript 語法、JSON 解析、`git diff --check`、`npm run check:functions`。
- 本機靜態頁面檢查通過：學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.12`；學員端包含放棄創作回答按鈕，講師端包含電腦學員控制按鈕。
- 線上檢查通過：學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.12`；GAS `getGameState` 回應 `ok:true`；`addComputerPlayers` 與 `submitComputerAnswers` 已不再回覆「未知 action」。

### deploy

- GAS 已推送並更新既有 Web App deployment 到 version 28，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端。
- 本次未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.3.11 - 2026-05-22

### feat

- GAS 新增 `claimAchievementReward`，成就完成後需由學員點「領取」才建立寶箱。
- 排行榜新增當前題目答對率，與整體答對率分開顯示。
- 學員端使用挑戰卡時才顯示挑戰戰隊選擇，並改用方塊按鈕。

### changed

- 學員端與講師端排行榜顯示「戰隊人數」，不顯示「報到人數」。
- 答對率顯示改為「整體答對率」與「當前題目答對率」，只顯示百分比。
- 成就紅點只在有可領取成就寶箱時顯示；寶箱紅點只在有未開啟寶箱時顯示。
- 講師端移除答對率說明區塊。
- 學員端題目狀態提示改用「第 N 題」，避免直接顯示題目 ID。

### docs

- 更新遊戲規則、README、工作日誌、AI 交接文件、GAS README 與模組版本。

### test

- 本機檢查通過：GAS 語法、學員端與講師端 JavaScript 語法、JSON 解析、`git diff --check`、`npm run check:functions`。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `app.js?v=0.3.11`；GAS `getGameState` 回應 `ok:true`；`claimAchievementReward` 已不再回覆「未知 action」。

### deploy

- GAS 已推送並更新既有 Web App deployment 到 version 26，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端。
- 本次未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.3.10 - 2026-05-22

### feat

- 學員端改為講師啟動場次後才能報到。
- 學員端報到頁移除下拉式選隊；若講師開放自由選隊，改用方塊按鈕選隊。
- 學員端選隊方塊加入 `.art-slot` 美術替換區，保留未來替換戰隊圖像的結構。
- 排行榜新增答對率欄位，未作答、逾時未送出與關題後作答皆視同錯誤。

### changed

- 加倍卡每位學員只能取得或使用 1 次；重複抽到加倍卡時，系統改給大加分卡。
- 講師端自由選隊設定只可在啟動場次前決定，場次啟動後鎖定。
- 戰隊排名分改以報到人數計算平均分，不再使用有效人數作為顯示與排名依據。
- 講師端排行榜說明改為答對率設計說明。

### docs

- 更新遊戲規則、README、GAS README、工作日誌、AI 交接文件與模組版本。

### test

- GAS 語法檢查通過。
- 學員端與講師端 JavaScript 語法檢查通過。
- JSON 解析檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端靜態頁面回應 `200`，皆載入 `0.3.10` 資源。

### deploy

- GAS `Code.gs` 已推送到 Apps Script。
- 既有正式 GAS Web App deployment 已更新為 version 24，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端，線上 HTML 已載入 `app.js?v=0.3.10`。
- 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.3.9 - 2026-05-22

### feat

- 預設題庫改為 11 題，其中 `demo_q011` 為創作題。
- 新增 `getPlayerAchievements` API，回傳累積答對、連續答對、使用道具與寶箱成就狀態。
- 學員端新增浮動選單，將寶箱、道具與成就放入懸浮視窗。
- 學員端寶箱或成就有待處理狀態時，功能鈕顯示紅點提示。
- 講師端控制台改為同一頁面顯示主要操作區，流程檢查維持可收合。
- 講師端排行榜新增有效人數與報到人數的設計說明。

### changed

- 加分卡改為立即套用戰隊加成，不需選擇題目。
- 加倍卡改為使用後自動套用下一題，答對時分數直接乘以 2。
- 挑戰卡改為使用時只選擇挑戰戰隊，並自動套用下一題結果。
- 已經沒有下一題時，GAS 會阻擋加倍卡與挑戰卡，只允許加分卡與翻身卡。
- 創作題回答區只在講師開放創作題時顯示。
- 匿名全體投票只在講師選出代表作品後顯示。
- 賽後報表 API 保留，但講師端 UI 不顯示。

### test

- GAS 語法檢查通過。
- 學員端與講師端 JavaScript 語法檢查通過。
- JSON 解析檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端靜態頁面回應 `200`，皆載入 `0.3.9` 資源。

### deploy

- GAS `Code.gs` 已推送到 Apps Script。
- 既有正式 GAS Web App deployment 已更新為 version 22，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端，線上 HTML 已載入 `app.js?v=0.3.9`。
- 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。
- 線上 GAS `getGameState` 回應 `ok:true`；`getPlayerAchievements` 已不再回覆「未知 action」。

## 0.3.8-deployed - 2026-05-22

### deploy

- GAS `Code.gs` 已推送到 Apps Script。
- 既有正式 GAS Web App deployment 已更新為 version 20，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端。
- 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

### test

- GAS `getGameState` 回應 `ok:true`。
- GAS `getPlayerLeaderboard` 回應 `ok:true`。
- GAS 第 3 版管理 action 已不再回傳「未知 action」，未帶管理密碼時正確回傳授權失敗。
- 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.3.7`。
- 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.3.8`，並包含 `exportGameReport`。

## 0.3.8-final-check - 2026-05-22

### docs

- 標記第 3 版 `0.3.8` 本機總檢查完成。
- 確認本次未部署 GAS Web App、Firebase Hosting、Cloud Functions 或 Firebase rules。
- 補充下一步需由使用者明確確認後，才可進行雲端部署與端到端測試。

### test

- GAS 語法檢查通過。
- 學員端與講師端 JavaScript 語法檢查通過。
- `app/config/modules.json` 與 `package.json` JSON 解析通過。
- `npm run check:functions` 通過。
- `git diff --check` 通過。

## 0.3.8 - 2026-05-22

### feat

- GAS 新增 `exportGameReport` API，可由講師建立賽後報表試算表。
- 賽後報表包含報表摘要、戰隊排行榜、個人排行榜、作答紀錄、寶箱紀錄、道具紀錄、獎項紀錄、創作投稿、創作投票與創作決選結果。
- 匯出前會重新計算排行榜並結算幸運獎與全對獎。
- 講師端新增「匯出賽後報表」按鈕，匯出完成後顯示報表試算表連結。
- 報表避開管理密碼、Token 與服務帳戶資訊；創作投票報表不輸出 voterPlayerId。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

## 0.3.7 - 2026-05-22

### feat

- GAS 新增 `getTeamCreativeCandidates` API，供講師讀取各隊隊內初選候選。
- GAS 新增 `selectCreativeFinalists` API，供講師每隊選出代表作品並指定匿名代號。
- GAS 新增 `getCreativeFinalists` API，供學員讀取匿名決選作品。
- GAS 新增 `voteCreativeFinal` API，限制學員不可投自己戰隊作品，且每位學員只能投 1 票。
- GAS 新增 `getCreativeVoteResult` API，供講師讀取匿名全體投票結果。
- 講師端新增創作題審核與投票區塊。
- 學員端新增匿名全體投票區塊。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

## 0.3.6 - 2026-05-22

### feat

- GAS 新增 `submitCreativeAnswer` API，限制每位學員每場只能提交 1 則創作答案。
- GAS 新增 `getTeamCreativePool` API，只回傳同隊投稿池，不回傳投稿者暱稱與 playerId。
- GAS 新增 `voteTeamCreative` API，限制隊內初選只能投同隊投稿，且每位學員每場只能投 1 票。
- `創作投稿` 新增 `selectedByInstructor` 欄位，預留給 `0.3.7` 講師審核代表作品。
- 學員端新增「創作題隊內初選」區塊，可提交創作答案、刷新同隊投稿池與投票。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

## 0.3.5-ui - 2026-05-22

### fix

- 補做 `0.3.5` 原應完成的學員端寶箱與道具 UI。
- 學員端新增「寶箱與道具」區塊，可讀取自己的寶箱與道具。
- 學員端可開啟自己的未開啟寶箱，結果由 GAS `openTreasureBox` 決定。
- 學員端可使用已支援道具，送出目標題目與挑戰戰隊，效果由 GAS `useItem` 決定。
- 特殊道具只顯示幸運獎狀態，不在前端套用效果。
- 示範模式補齊寶箱、開箱與道具使用資料。

### docs

- 更新 README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態，標記 `0.3.5` 補作完成。

## 0.3.5 - 2026-05-22

### feat

- GAS 排行榜新增 `effectivePlayerCount` 欄位，區分報到人數與有效參與人數。
- `recalculateScoreboard` 改以至少完成 1 題已計分作答的有效參與人數計算 `averageScore`。
- `weightedAverageScore` 維持為 `averageScore + teamBonusScore`，作為第 3 版戰隊排名分。
- 排行榜保留啟用中的戰隊，即使尚無有效參與者也會顯示 0 分，避免畫面缺隊伍。
- 學員端排行榜顯示排名分、有效人數與道具加成。
- 講師端排行榜顯示排名分、有效人數、答題總分、答題平均、道具加成與最終總分。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- 前端 JavaScript 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.4 - 2026-05-22

### feat

- GAS 新增 `finalizeAwards` API，可由講師結算幸運獎與全對獎。
- GAS 新增 `getAwardList` API，可讀取該場次得獎名單。
- 幸運獎以第一位抽中特殊道具者為得主。
- 全對獎以全部正式題目皆答對者排序，依完成最後一題時間取前 3 名。
- 特殊道具出現後會關閉特殊道具獎池；若正式題目開放進度達 70% 仍未出現，特殊道具機率由 3% 提高為 10%。
- `道具紀錄` 新增 `createdAt` 欄位，供幸運獎排序使用。
- `獎項紀錄` 新增暱稱、分數、完成時間與來源道具欄位。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.3 - 2026-05-22

### feat

- GAS 新增 `useItem` API，支援小加分卡、中加分卡、大加分卡、超級加分卡、加倍卡、翻身卡與挑戰卡。
- 加分卡會立即寫入戰隊加成，每隊同一題同類加分卡限用 1 張。
- 加倍卡可指定目標題，關題計分時若答對，個人分數額外加成，上限 20 分。
- 翻身卡會依使用當下戰隊排序判定：本隊最後一名加 30 分，否則加 5 分；每隊最多觸發 2 次。
- 挑戰卡可指定目標題與對手戰隊，目標題關題後依本隊答對率是否高於對方，給本隊 +10 或 +3。
- 新增 `getTeamBonusLedger` API 讀取戰隊道具加成明細。
- 新增 `recalculateV3Scoreboard` API，並讓排行榜保留原始總分，同時新增 `teamBonusScore`、`finalScore`、`weightedAverageScore`。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.2 - 2026-05-22

### feat

- GAS 新增 `openTreasureBox` API，可開啟指定玩家自己的未開啟寶箱。
- 開箱後會更新 `寶箱紀錄`：`status=opened`、`openedAt`、`itemType`。
- 開箱抽到非空寶箱時，會新增 `道具紀錄`，道具狀態為 `available`。
- `getPlayerInventory` 回傳寶箱的 `itemType`、`itemLabel`，以及道具的來源寶箱、狀態與目標欄位。
- `規則設定` 新增寶箱獎項機率預設值，供後續調整。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.1 - 2026-05-22

### feat

- GAS 新增第 3 版基礎工作表：`寶箱紀錄`、`道具紀錄`、`獎項紀錄`、`創作投稿`、`創作投票`、`規則設定`。
- `resetGameData` 會清除第 3 版活動紀錄，保留題庫、戰隊設定與規則設定。
- 關題計分後，答對者會依規則取得寶箱：每題答對 30% 機率、累積答對 3 題、5 題、10 題、連續答對 3 題、5 題。
- 每位學員最多保留 3 個未開啟寶箱；超過時自動將最早未開啟寶箱標記為 `discarded`。
- 新增 `getPlayerInventory` API，供後續學員端 UI 讀取自己的寶箱與道具狀態。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.0-planning - 2026-05-22

### docs

- 啟動第 3 版製作規格，新增 `docs/12_v3_roadmap.md`。
- 依 `docs/01_game_rules.md` 拆解寶箱、道具、幸運獎、全對獎、戰隊加權平均分與創作票選題。
- 更新 `app/config/modules.json`，新增 `v3_game_rules` 模組狀態。
- 更新 README、AI 交接文件與工作日誌，標記第 3 版目前為規格製作階段。

### test

- 本次未修改前端、GAS 或 Firebase rules 功能邏輯。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.2.11-final - 2026-05-22

### docs

- 第 2 版定版完成，定版版本保留為 `0.2.11`。
- 更新 README、AI 交接文件、工作日誌、第 2 版路線圖與模組狀態。
- 明確記錄正式架構：Firebase Hosting 作入口，Realtime Database 作公開狀態與公開題庫快取，GAS / Google Sheets 作正式資料與計分來源。
- 補正式活動前檢查：初始化遊戲資料、確認題庫與戰隊設定、確認 Script Properties、要求學員使用可區分暱稱。

### test

- JSON 設定檢查通過。
- 前端 JavaScript 語法檢查通過。
- GAS 語法檢查通過。
- `npm run check:functions` 通過。
- 本次為文件與狀態收尾，未改功能邏輯，未部署雲端。

## 0.2.11 - 2026-05-21

### fix

- 修正學員端關題後最上方「個人積分」未更新的問題；前端改用 `playerScore` 欄位更新畫面與本機暫存。
- 學員確認送出答案後，倒數計時會立即停止，避免畫面看起來仍在倒數。
- 報到頁會先讀取講師是否開放自由選隊；讀取完成前暫停報到按鈕，未開放時直接採系統自動分隊。

### perf

- GAS 自動分隊改用啟用中的戰隊清單與合併後玩家數計算，優先分配到人數最少的隊伍，讓各隊人數盡量接近。

### test

- 本機 JavaScript 語法檢查通過。
- 本機 GAS 語法檢查通過。
- JSON 設定檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.11`。
- GAS 已推送並更新既有 Web App deployment 到 version 18，正式 URL 不變。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.11`；GAS `getGameState`、`getScoreboard`、`getPlayerLeaderboard` 回應 `ok:true`。

## 0.2.10 - 2026-05-21

### fix

- GAS `joinGame` 新增 `clientKey` 與同場次暱稱去重；同一學員重新報到時回傳原玩家資料，不再新增玩家列。
- 戰隊排行榜與個人排行榜改為合併同一人資料後再計算，避免每題作答後重複玩家造成戰隊平均分下降。
- `getPlayerSummary` 會合併同一人的作答紀錄後加總個人積分，修正學員端個人積分顯示為 0 的問題。

### feat

- 學員端預設取消選擇隊伍，改由系統自動分配戰隊。
- 講師端新增「開放學員自由選隊」切換，開啟後學員端才會顯示戰隊選單。
- 學員端排行榜開啟時不再等待個人積分更新完成，降低操作停等時間。

### test

- 本機 JavaScript 語法檢查通過。
- 本機 GAS 語法檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.10`。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- GAS 已推送並更新既有 Web App deployment 到 version 17，正式 URL 不變。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.10`；GAS `getGameState` 回應 `ok:true` 且 `allowFreeTeamChoice:false`；`getScoreboard` 與 `getPlayerLeaderboard` 回應 `ok:true`。

## 0.2.9 - 2026-05-21

### fix

- GAS `openQuestion` 新增 `openedQuestionIds` 場次紀錄，已開放過的題目不可再次開放，避免講師誤送同一題。
- 前端 API 區分「GAS 業務錯誤」與「連線錯誤」；重複作答、題目狀態錯誤會直接顯示 GAS 回傳訊息，不再誤顯示為無法連線到 GAS。
- 學員端個人積分改由作答紀錄加總，避免玩家表分數未同步時只更新戰隊積分。

### feat

- 講師端改為分段流程：未設定管理密碼時顯示後端設定；已設定時顯示啟動場次；啟動後進入題目控制，重新開啟視窗也會回到題目控制。
- 講師端在啟動場次畫面與題目控制畫面都提供初始化按鈕。
- 講師端流程檢查改為半隱藏的 `details` 區塊。
- 學員端排行榜改為彈出視窗查看。
- 學員端隱藏遊戲中的目前狀態區塊。

### test

- 本機 JavaScript 語法檢查通過。
- 本機 GAS 語法檢查通過。
- JSON 設定檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.9`。
- GAS 已推送並更新既有 Web App deployment 到 version 15，正式 URL 不變。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.9`，GAS `getGameState` 回應 `ok:true` 並包含 `openedQuestionIds`。

## 0.2.8 - 2026-05-21

### feat

- 學員端新增「戰隊排行榜」與「個人排行榜」，採手動更新按鈕與關題後自動更新，避免高頻輪詢造成 GAS 流量壓力。
- GAS 新增 `getPlayerLeaderboard` 只讀 API，只回傳暱稱、戰隊與分數，不回傳帳密、Token 或個資欄位。
- 講師端改為更寬的電腦與投影版面，桌機寬度下分成控制區、答案公布區與排行榜區。

### fix

- 學員端啟動時會先確認場次狀態；若講師已初始化遊戲，且本機舊報到時間早於場次初始化時間，會清除舊報到資料並要求重新報到。
- 學員端與講師端 GAS 呼叫增加快取破壞參數、重試次數、逾時時間與 JSONP 備援，降低手機端偶發性無法連線風險。

### test

- 本機 JavaScript 語法檢查通過。
- 本機 GAS 語法檢查通過。
- JSON 設定檢查通過。
- `npm run check:functions` 通過。
- GAS 已推送並更新既有 Web App deployment 到 version 14，正式 URL 不變。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.8`，GAS `getGameState` 與 `getPlayerLeaderboard` 回應 `ok:true`。

## 0.2.7 - 2026-05-21

### feat

- 學員端改為報到前只顯示報到功能，完成報到後才切換到遊戲頁。
- 學員遊戲頁最上方新增戰隊、個人積分與戰隊積分。
- 學員送出答案後不立即顯示正誤與分數，改為講師關題後才更新分數，降低學員互相提示答案的風險。
- 學員端沿用 Firebase `gameState` 低頻公開狀態輪詢，偵測到關題後才向 GAS 查詢一次個人與戰隊分數。
- 講師端新增投影用「關題公布」區塊，關題計分後顯示正確答案、說明與排行榜。
- GAS 新增 `getPlayerSummary`，供學員端在關題後更新個人與戰隊分數。

### test

- 本機前端 JavaScript 語法檢查通過。
- 本機 GAS 暫存語法檢查通過。
- 本機 JSON 設定檔解析通過。
- `npm run check:functions` 通過。
- GAS 已更新既有 Web App deployment 到 version 13，正式 URL 不變。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- 線上學員端與講師端回應 `200`，HTML 已載入 `v=0.2.7`。
- 線上 GAS `getGameState` 回應 `ok:true`。

## 0.2.6 - 2026-05-21

### feat

- 學員端作答前新增「確認送出」提示，避免誤觸後不能修改。
- 學員端翻開試卷後新增倒數計時器，依題目 `timeLimitSec` 顯示剩餘秒數。
- GAS `submitAnswer` 改為送出當下立即判斷正誤並回傳 `baseScore`、`firstCorrectBonus`、`score` 與 `remainingSeconds`，學員答對後可立即看到本題得分。
- 講師端題目控制改為從公開題庫載入題目清單，講師用下拉選單選題，不再手動輸入題目 ID。

### test

- 本機前端 JavaScript 語法檢查通過。
- 本機 GAS 暫存語法檢查通過。
- 本機 JSON 設定檔解析通過。

## 0.2.5 - 2026-05-21

### fix

- 修正手機端無法連線到 GAS 的風險：前端呼叫 GAS 時改為優先使用 `fetch GET`，失敗才退回 JSONP。
- 保留 JSONP 作為舊瀏覽器備援，但避免手機瀏覽器因跨網域 `<script>` 載入失敗而直接報到失敗。
- 前端版本更新為 `v=0.2.5`，強制手機重新載入新版 API 模組。

### test

- 已完成本機 JavaScript 語法檢查、JSON 設定檢查、`npm run check:functions` 與本機頁面回應檢查。
- 已只部署 Firebase Hosting；未推送 GAS、Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端回應 `200`，HTML 已載入 `app.js?v=0.2.5`，`api.js` 已包含 `callFetchGet`，GAS `joinGame` 測試成功。

## 0.2.4 - 2026-05-21

### fix

- 前端 `config.js`、`app.js`、`api.js` 加入版本參數，避免手機瀏覽器混用新舊模組造成講師端卡在「正在讀取後端設定...」。
- Firebase Hosting 對 HTML 與 JavaScript 增加 `Cache-Control: no-cache, no-store, must-revalidate`，降低後續更新後載入舊檔案的風險。
- 學員端新增 `clientVersion` 檢查；前端版本更新時會清除舊報到資料與公開題庫暫存，避免繼續載入舊玩家資料。

### feat

- 學員端新增手機橫式版面，橫放手機時改為左右欄操作，減少作答時上下捲動。

### test

- 已完成本機 JavaScript 語法檢查、JSON 設定檢查、`npm run check:functions` 與本機頁面回應檢查。
- 已只部署 Firebase Hosting；未推送 GAS、Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.4`，JavaScript 回應標頭為 `no-cache, no-store, must-revalidate`。
- 線上 GAS `joinGame` 測試成功。

## 0.2.3 - 2026-05-21

### fix

- 修正學員端可能因瀏覽器保留舊 `vaccineGameGasUrl` 而報到失敗的問題。
- 學員端與講師端改為固定使用 `config.js` 的正式 GAS Web App URL，不再讓 `localStorage` 覆蓋後端網址。
- 講師端隱藏 GAS Web App URL 欄位，只保留管理密碼輸入。
- 講師端按「套用設定」後，明確顯示「講師已完成設定」。

### test

- 已確認線上 GAS `joinGame` 可成功建立假資料測試學員。
- 已完成本機 JavaScript 語法檢查、JSON 設定檢查與本機頁面回應檢查。
- 已只部署 Firebase Hosting；未推送 GAS、Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端回應 `200`、講師端回應 `200`、講師端已隱藏 GAS URL 欄位並保留管理密碼欄位。

## 0.2.2 - 2026-05-21

### feat

- 新增講師端「初始化遊戲資料」按鈕，明確清空玩家、作答、翻卷與排行榜資料，保留題庫與戰隊設定。
- GAS 新增 `resetGameData` 管理 API 與 Apps Script 選單入口，用於正式活動前清除測試資料。
- 預設測試題由 1 題增加為 3 題，方便第 2 版流程測試。
- `data/game_config.example.json` 新增低 token 工作流設定，要求功能改善時只讀必要文件與相關檔案。

### perf

- GAS 快取 Firebase service account access token，降低開題與同步公開資料時的重複取 token 成本。
- GAS 快取玩家、翻卷紀錄與重複作答檢查結果，降低翻卷與作答時重複讀取 Google Sheets 的次數。
- 學員端公開題庫加入 10 分鐘瀏覽器工作階段快取，降低重複讀取 Firebase `publicQuestions` 的時間。

### deploy

- GAS 已更新既有 Web App deployment `AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC` 到 version 12，正式 URL 不變。
- Firebase 已只部署 Hosting：學員端與講師端皆更新完成；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

### test

- 已在本機執行 GAS 暫存語法檢查、前端 JavaScript 語法檢查、JSON 設定檔解析、`npm run check:functions`。
- 已啟動本機靜態伺服器檢查學員端與講師端頁面，兩者皆回應 `200`。
- 線上檢查通過：學員端 Hosting 回應 `200`、講師端 Hosting 回應 `200`、講師端已出現「初始化遊戲資料」按鈕、GAS `getGameState` 回應 `200`。

## 0.2.1 - 2026-05-21

### feat

- GAS `createGame` 會將公開題庫預先同步到 Firebase Realtime Database `publicQuestions/{gameId}`。
- `openQuestion` 仍由 GAS 驗證題目存在，但同步到 `gameState` 時會附帶當題公開資訊，方便學員端快速顯示。
- GAS 新增 `openPaper` action，專門記錄學員翻開試卷時間，不再需要用 `getCurrentQuestion` 回傳題目內容。
- 學員端啟動時會先預載 Firebase 公開題庫，學員按「翻開試卷」時優先從 Firebase 快取取得題目。
- Firebase Realtime Database rules 新增 `publicQuestions` 公開讀取路徑，前端仍無寫入權限。
- 學員端與講師端 JSONP 呼叫新增逾時與最多 3 次重試，降低 GAS 偶發回傳 HTML 錯誤頁造成的操作中斷。

### security

- 公開題庫只包含題目、選項、時間限制與題型旗標，不包含 `correctAnswer` 與 `explanation`。

## 0.2.0 - 2026-05-21

### feat

- 第 1 版正式結案，確認主流程與 Firebase `gameState` 同步皆可用。
- 新增 `docs/11_v2_roadmap.md`，整理第 2 版工作項目與優先順序。
- GAS 加入第 2 版第一階段速度最佳化：工作表初始化、題庫與場次狀態短時間快取。

### perf

- `getCurrentQuestion`、`openQuestion`、`submitAnswer` 等流程改用 `ensureGameSheetsReady`，避免每次呼叫都重跑完整工作表初始化。
- 題庫資料快取 300 秒。
- 場次狀態快取 300 秒，開題與關題時同步更新快取。

## 0.1.1 - 2026-05-21

### feat

- 講師端改為手機優先單欄控制台，依現場操作順序排列後端設定、啟動場次、題目控制與排行榜。
- 學員端新增 Firebase Realtime Database `gameState` 公開狀態讀取。
- 學員端會依 `gameState/{gameId}` 顯示「講師已開放題目」提示，但不自動取得題目，仍需學員手動按「翻開試卷」。
- 前端設定新增 `firebaseDatabaseUrl` 與 `firebaseGameStatePollMs`。
- Realtime Database rules 調整為 `gameState` 與 `publicScoreboards` 可公開讀取、不可由前端寫入。
- 講師端改為完整第 1 版控制台，可啟動場次、開題、關題計分與讀取排行榜。
- GAS 新增 `getScoreboard` action。
- `setupGameSheets` 會在題庫空白時建立 `demo_q001` 預設測試題。
- 獨立 Apps Script 專案若未設定 `SPREADSHEET_ID`，GAS 會自動建立資料試算表並寫回 Script Properties。
- Firebase `gameState` 寫入改為支援 Firebase 服務帳戶短效 access token，Realtime Database rules 只允許部署帳號或本專案服務帳戶寫入，前端維持唯讀。

### docs

- 更新 Firebase database 在第 1 版中的定位：只作公開狀態與公開排行榜，不作正式資料庫與計分依據。
- 記錄第 1 版端到端流程測試結果與 Firebase `gameState` 尚未同步的原因。
- 記錄 Firebase 服務帳戶設定完成後，`gameState` 開題與關題同步測試通過。

## 0.1.0 - 2026-05-20

### feat

- 建立第 1 版最小可執行系統骨架。
- 新增學員端本機測試頁面。
- 新增講師端本機測試頁面。
- 新增 Cloud Functions TypeScript 骨架。
- 新增本機靜態伺服器啟動指令。
- 新增 Firebase 專案設定範例 `.firebaserc.example`。
- 新增 `app/config/modules.json` 作為功能模組登記表。
- 新增根目錄 `firebase.json`，讓 Firebase CLI 可直接從專案根目錄部署。
- 建立 Firebase Hosting site：`tychbniis-32af5-student` 與 `tychbniis-32af5-instructor`。
- 完成學員端與講師端 Hosting 部署。
- 建立 Realtime Database instance：`tychbniis-32af5-default-rtdb`。
- 完成 Realtime Database rules 部署。
- 建立 Firestore database：`(default)`，位置 `asia-east1`。
- 完成 Firestore rules 部署。
- 新增 GAS 免費方案後端骨架，取代第 1 版 Cloud Functions 判斷流程。
- GAS 後端支援報到、自動分隊、開題、作答、關題與基本計分。
- 新增學員端 GAS API 封裝與前端設定檔。
- 新增講師端 GAS API 封裝、GAS URL 設定與管理密鑰輸入。
- 重新部署 Firebase Hosting，更新學員端與講師端線上頁面。
- 新增 GAS `doGet` JSONP 入口，前端預設使用 JSONP 呼叫 GAS Web App。
- 新增 GAS `getCurrentQuestion` API，學員端只能取得目前開放題目的公開資訊，不下發正確答案。
- 新增學員端「更新題目」功能，報到後可讀取講師目前開放的題目並送出該題答案。
- 學員端題目取得改為「翻開試卷」手動操作，避免自動更新造成競賽起跑時間差。
- 學員端版面改為手機優先 RWD，並保留未來美化按鈕與選單的 CSS 主題入口。
- GAS 新增 `試卷開啟紀錄`，由伺服端記錄學員翻開試卷時間。
- 計分改為基本分加「第一個提交且答對者」獎勵 5 分。
- GAS 可選擇同步公開 `gameState` 到 Firebase Realtime Database。
- 新增 `clasp` 設定，已將 GAS 程式推送到使用者建立的 Apps Script 專案。
- GAS 新增 `SPREADSHEET_ID` 支援，獨立 Apps Script 專案可指定資料試算表。
- 前端正式寫入 GAS Web App URL，學員端與講師端預設切換為 GAS 模式。

### docs

- 新增 `docs/AI_HANDOVER.md`，供下一位維護者或 AI 接手。
- 新增 `docs/WORK_LOG.md`，記錄工作日誌、測試紀錄、阻塞點與下一步。
- 記錄 Firebase project 與 Hosting URL。
- 記錄 Cloud Functions 因 Blaze 方案限制尚未部署，並改採 GAS Web App 作為第 1 版後端。
- 新增 `docs/10_gas_web_app_deployment.md`。

### fix - per-game question sync and @99 pressure verification

- 修正 `createGame` 與 `syncGameSettingsToFirebase` 固定使用預設 `GAME_ID` 的問題，現在會依傳入 `gameId` 建立測試場次。
- 修正 `syncQuestionsToFirebase`，支援將公開題庫同步到指定 `gameId`，避免 `v7_perf_*` 壓測場次缺少 `publicQuestions`。
- GAS Web App 已更新同一 deployment ID 到 `@99`，網址不變。
- `scripts/v7-pressure-test.mjs` 與 `scripts/v7-batch-status.mjs` 已同步標示 `@99`。
- `@99` 100 人壓測完成，log：`logs/v7_pressure_100_firebase_local_score_20260609_131937.log`：
  - `gameId=v7_perf_20260609051943`
  - `directOpenFirebase=3553ms`
  - `directCloseFirebase=296ms`
  - `directLocalScoreboardFirebase=287ms`
  - `submittedCount=100`
  - `scoredCount=100`
  - GAS 背景正式計分 `timingTotalMs=3867ms`
  - `exitCode=0`
- `@99` 200 人壓測完成，log：`logs/v7_pressure_200_firebase_local_score_20260609_131937.log`：
  - `gameId=v7_perf_20260609052054`
  - `directOpenFirebase=3418ms`
  - `directCloseFirebase=277ms`
  - `directLocalScoreboardFirebase=281ms`
  - `submittedCount=200`
  - `scoredCount=200`
  - GAS 背景正式計分 `timingTotalMs=2555ms`
  - `exitCode=0`
- 結論：100 / 200 人壓測下，使用者等待的 Firebase 開題小於 5 秒；關題與快速暫定排行榜合計小於 1 秒。GAS 背景計分不阻擋活動顯示。
