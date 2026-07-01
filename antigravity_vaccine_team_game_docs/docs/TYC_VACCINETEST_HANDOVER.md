# TYC_VaccineTest 單機版交接文件

## 2026-07-01 update - mobile fetch transport fix（修正手機端無法排行榜讀取與成績送出）

- Solo app version remains `0.1.1`.
- Root project version remains `0.7.46`.
- Cache identifier: `0.1.1-fetchfix-20260701-1`.
- **根本原因**：`callGasApi` 原本只使用 JSONP（動態注入 `<script>` 標籤）。GAS Web App 在回應前會對請求發出 HTTP 302 redirect；iOS Safari 與 Android Chrome 手機端對動態注入 script 標籤的 302 redirect 有更嚴格限制，直接觸發 `script.onerror`，導致所有 GAS 呼叫失敗（包含排行榜讀取與成績送出）。
- **修正方式**：`callGasApi` 改以 `fetch()` 為主要傳輸。`fetch()` 可正確跟隨 302 redirect。回應文字依 JSONP 格式 `callbackName({...})` 解析取得 JSON 資料。原 `<script>` 標籤 JSONP 路徑保留為備援（`fetch` 不可用時使用）。
- 新增 `AbortController` / `AbortSignal` 用於 `fetch` 路徑的逾時控制。
- 修改檔案：`frontend/student/dist/TYCVACCINETEST/app.js`、`index.html`。
- 本機測試通過：`node --check`、`npm run test:tycvaccinetest:smoke`、`npm run test:tycvaccinetest:mobile`。
- 還原方式：從 `backup/tycvaccinetest_goal_fix_20260701_150447/` 還原 `app.js` 與 `index.html`，再重新部署 Firebase Hosting `hosting:student`。

## 2026-07-01 update - solo 0.1.1 goal fix, leaderboard cache, and mobile summary

- Solo app version remains `0.1.1`.
- Root project version remains `0.7.46`.
- Cache identifier: `0.1.1-goalfix-20260701-1`.
- Mobile homepage command panel now uses full width; the operation buttons no longer render in a squeezed half-width column.
- Leaderboard still fetches latest GAS top-10 rows when the site enters. If the request fails, the app shows the last successful local cache while background retries continue.
- Leaderboard panels render from preloaded state and do not call GAS every time the user opens the panel.
- After closing the answer-result modal, mobile quiz scrolls the internal quiz card to the solution marker so long questions such as question 54 do not hide the answer box.
- After answering on mobile, the question frame is capped and scrollable; the solution box remains visible above the bottom next-action bar.
- Summary page now has two tabs: `結算` and `查看答題結果`.
- Mobile summary score tab hides the outer homepage header and fits within one viewport; regression check measured `scrollHeight 844 / viewportHeight 844`.
- Review tab keeps the 5-column question grid, status colors, filters, answer options, and explanation detail.
- Local tests passed: smoke, mobile, ui-audit, round2, and resume.
- Visual review screenshots: `screenshots/tycvaccinetest-ui-audit/01-home-mobile.png`, `screenshots/tycvaccinetest-ui-audit/06-answer-markers-main.png`, `screenshots/tycvaccinetest-goalfix/summary-score-mobile-after.png`.
- Real GAS `getSoloLeaderboard` check passed with HTTP 200 and returned rows.
- Real GAS `submitSoloResult` check passed with a summary-only low-score payload.
- Deployed on 2026-07-01 to Firebase Hosting `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/b5b7c5462209fb8f`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782890138819000`.
- Online tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`: smoke, mobile, and ui-audit.
- Online cache header check passed for `/TYCVACCINETEST/`, `app.js`, `styles.css`, and `config.js`.
- Online real mobile leaderboard check passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`; GAS returned 7 rows at verification time.
- GAS, Firebase Rules, and functions were not deployed.
- Rollback backup: `backup/tycvaccinetest_goal_fix_20260701_150447/`.

## 2026-07-01 update - solo 0.1.1 summary submit and preloaded leaderboard

- Solo app version remains `0.1.1`.
- Root project version remains `0.7.46`.
- Cache identifier: `0.1.1-summaryfix-20260701-1`.
- Leaderboard now preloads the latest top-10 rows once when the site is entered. Home leaderboard, utility leaderboard, and summary leaderboard render from that preloaded state instead of calling GAS every time the panel opens.
- Score submission now sends final-score summary only and omits per-question rows and item-use details to avoid overlong JSONP URLs. Per-question review remains local on the summary page.
- Summary page is now a one-page panel containing score, submit status, leaderboard, filters, question-number grid, and selected-question detail.
- Answer review uses 5 question numbers per row. Correct answers are green, wrong answers are red, and unanswered questions use neutral panel color.
- Filters remain `全部` and `看錯題`.
- Explanation panel now uses the same answer review detail format as the summary page and includes answer options.
- Challenge card animations are restored with result reveal, icon bounce, and number pop CSS animations.
- The duplicate `答案為 ...` line was removed from the main answer page after answering; the solution option box remains.
- Local tests passed: smoke, mobile, ui-audit, round2, and resume.
- Visual review screenshot: `screenshots/tycvaccinetest-summaryfix-mobile.png`.
- Real GAS submit check passed with a summary-only payload; a 60-row answer payload produced an overlong URL and is intentionally avoided.
- Deployed on 2026-07-01 to Firebase Hosting `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/28840cf8665edd8e`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782887647164000`.
- Online tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`: smoke, mobile, and ui-audit.
- Online cache header check passed for `/TYCVACCINETEST/`, `app.js`, `styles.css`, and `config.js`.
- Online real leaderboard preload check passed; GAS returned rows including `Test A` through `Test E` and the low-score `CodexSubmitCheck` submit check.
- GAS and Firebase Rules were not changed.
- Rollback backup: `backup/tycvaccinetest_summary_submit_fix_20260701_141459/`.

## 2026-07-01 update - solo 0.1.1 answer page, long question, and mobile leaderboard

- Solo app version remains `0.1.1`.
- Root project version remains `0.7.46`.
- Cache identifier: `0.1.1-answerfix-20260701-1`.
- After answering and closing the result modal, the main quiz page now shows only the correct solution option(s).
- The main quiz page no longer shows `你的答案` or `正確答案` badges after answering.
- The mobile question title no longer has a fixed max-height, so long questions such as question 24 are not clipped inside the question frame.
- Mobile leaderboard loading now tries JSONP `payload` format first, then falls back to `action + data`.
- Leaderboard failure state now includes a `重新讀取` retry button.
- UI audit expects solution-only answer display after answering.
- Mobile test now advances to question 24 and confirms the long title is not clipped or covered by the bottom action bar.
- Local tests passed: smoke, mobile, and ui-audit.
- Deployed on 2026-07-01 to Firebase Hosting `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/2eec592d3506b70d`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782885943361000`.
- Online tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`: smoke, mobile, and ui-audit.
- Online real mobile leaderboard check passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`; GAS returned 5 rows (`Test A` through `Test E`).
- Online cache header check passed for `/TYCVACCINETEST/`, `styles.css`, `app.js`, and `config.js`.
- GAS and Firebase Rules were not changed.
- Rollback backup: `backup/tycvaccinetest_answer_leaderboard_fix_20260701_135954/`.

## 2026-07-01 update - solo 0.1.1 mobile leaderboard and answer review

- Solo app version remains `0.1.1`.
- Root project version remains `0.7.46`.
- Cache identifier: `0.1.1-mobilefix-20260701-1`.
- Mobile leaderboard reads now retry `getSoloLeaderboard` with `action + data`, then fall back to JSONP `payload` format.
- Answer-choice modal no longer repeats the question text; it only shows answer choices and the confirm button.
- After answering and closing the result modal, the main quiz page marks options and shows `答案為 ...` instead of showing the full answer-result block again.
- Correct answers, selected correct answers, missed correct answers, and wrong selected answers use distinct visual states.
- Status panel metrics now keep value and unit on the same line.
- Long answer text has wrapping protection to avoid being clipped by pixel borders.
- UI audit screenshots include `screenshots/tycvaccinetest-ui-audit/06-answer-markers-main.png`.
- Local tests passed: smoke, mobile, resume, round2, and ui-audit.
- Deployed on 2026-07-01 to Firebase Hosting `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/94a814eb78525ac5`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782883949986000`.
- Online tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`: smoke, mobile, and ui-audit.
- Online real mobile leaderboard check passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`; GAS returned rows including `Test A`, `Test B`, and `Test C`.
- Online cache header check passed for `/TYCVACCINETEST/`, `styles.css`, `app.js`, and `config.js`.
- GAS and Firebase Rules were not changed.
- Rollback backup: `backup/tycvaccinetest_mobile_fix_20260701_132050/`.

## 2026-07-01 update - solo 0.1.1 mobile modal UI

- Solo app version remains `0.1.1`.
- Root project version remains `0.7.46`.
- Cache identifier: `0.1.1-modal-20260701-1`.
- Homepage is mobile-first and now has three operation buttons: `進入遊戲`, `排行榜`, and `載入上次進度`.
- Homepage title is `115年預防接種教育訓練測驗`; agency text is `桃園市政府衛生局`; the `單機闖關版` subtitle was removed.
- Version information is placed at the top right of the homepage header.
- `進入遊戲` opens a nickname modal; `排行榜` opens a leaderboard modal; `載入上次進度` resumes the browser local draft when available.
- Quiz flow now uses modals: bottom `開始作答`, answer-choice modal, answer-result modal, then next question or summary.
- Answer-result modal shows `本題得分`, offers `查看解析`, provides next action, and auto-closes after 10 seconds.
- Item timing remains unchanged: items can only be used after answering and before starting the next question.
- Mobile utility panels now use a fixed header, status dashboard, one-column item/treasure layout, claimed achievement color, and two-column answer summary.
- UI audit screenshots are generated at `screenshots/tycvaccinetest-ui-audit/`.
- Local tests passed: smoke, mobile, resume, round2, and ui-audit.
- Deployed on 2026-07-01 to Firebase Hosting `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/26c4092922a1b017`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782882452447000`.
- Online tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`: smoke, mobile, and ui-audit.
- Online cache header check passed for `/TYCVACCINETEST/`, `styles.css`, `app.js`, and `config.js`.
- GAS and Firebase Rules were not changed.
- Rollback backup: `backup/tycvaccinetest_mobile_modal_ui_20260701_124741/`.

## 2026-07-01 update - solo 0.1.1 UI and mobile flow

- Solo app version: `0.1.1`.
- Root project version remains `0.7.46`.
- Question bank path remains `soloQuestions/TYC_VaccineTest/v0_1_0`.
- Cache identifier: `0.1.1-ui-20260701-1`.
- Mobile quiz now shows only the question first; learners tap `開始作答` before answer options appear.
- Fixed mobile top spacing so the question frame is not covered by the fixed tool buttons.
- Restored red-dot badges for unopened treasure boxes and claimable achievements.
- Item panel now hides unowned items and shows an empty state when inventory is empty.
- Explanation and answer summaries no longer show per-question score.
- Mobile card controls now prefer side-by-side layouts: treasure opening, achievement claiming, item buttons, and challenge choices use 2 or 3 columns where possible.
- Leaderboard reads use GAS JSONP with `action=getSoloLeaderboard` and `data={ soloVersion, limit }`; score submission still uses `payload`.
- Added test command: `npm run test:tycvaccinetest:ui-audit`.
- Local tests passed: smoke, mobile, round2, resume, and ui-audit.
- Online GAS leaderboard connection passed for `soloVersion=0.1.1`; `rows` is empty until new `0.1.1` results are submitted.
- Online tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`: smoke, mobile, round2, resume, and ui-audit.
- Deployed on 2026-07-01 to `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/8e4f7720353f53a1`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782879159851000`.
- GAS and Firebase Rules were not deployed for this change.
- Rollback backup: `backup/tycvaccinetest_ui_0_1_1_20260701_115356/`.

## 版本

- 主專案版本：`0.7.46`
- 單機版版本：`0.1.1`
- 單機版資料夾：`frontend/student/dist/TYCVACCINETEST/`

## 網址

- 本機規劃網址：`http://localhost:5173/TYCVACCINETEST/`
- 本次測試網址：`http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1`
- Firebase Hosting 預計網址：`https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`

## 資料流

1. 題庫正式來源：
   `soloQuestions/TYC_VaccineTest/v0_1_0`
2. 題庫內容：
   只保留「疫苗教育訓練題庫」與「兒少虐待與疏忽測驗題」。
3. 成績與排行榜：
   由 GAS 處理 `submitSoloResult` 與 `getSoloLeaderboard`。
4. GAS 新增工作表：
   `TYC單機成績`、`TYC單機場次`、`TYC單機作答明細`。
5. 同一 `playerId` 多次遊玩：
   排行榜只保留最佳成績；暱稱改變時更新顯示名稱。

## 前端規則

1. 首頁有 3 個操作按鈕：`進入遊戲`、`排行榜`、`載入上次進度`。
2. 每題倒數從 60 秒開始。
3. 答題後、下一題前才能使用道具。
4. 保留道具：
   `+1`、`+3`、`+5`、`+10` 加分卡、加倍卡、挑戰卡、空寶箱。
5. 不保留：
   講師控制、戰隊排行、翻身卡、幸運箱、追加寶箱、落後寶箱。
6. 每次開始測驗會重置本局道具與成就，避免重玩累積道具影響最佳成績公平性。
7. 結算頁提供全部題目結果與 `只看錯題`。

## 維運指令

```powershell
npm run build:tycvaccinetest:questions
npm run check:tycvaccinetest:questions
npm run test:tycvaccinetest:smoke -- http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1
```

## 測試結果

- `node --check frontend\student\dist\TYCVACCINETEST\app.js`：通過。
- `node --check scripts\build-tycvaccinetest-question-seed.mjs`：通過。
- `node --check scripts\tycvaccinetest-smoke-test.mjs`：通過。
- JSON 檢查：通過。
- 題庫種子檢查：60 題，通過。
- GAS `Code.gs` 基本 JavaScript parse：通過。
- Playwright smoke test：通過，完成 60 題全流程與全對結算。

## 注意事項

1. 正式使用前，需把 `firebase/tycvaccinetest.soloQuestions.v0_1_0.json` 上傳到 Firebase 指定路徑。
2. 正式使用前，需部署 Firebase Database Rules。
3. 正式排行榜功能需部署 GAS `Code.gs`。
4. 本次使用 `5173` 連接埠既有本機伺服器測試。
5. 不得把 GAS Secret、Firebase 私鑰、Cookie 或個資寫進 `config.js`。

## 2026-06-30 線上部署紀錄

1. Firebase Database Rules 已部署到 `tychbniis-32af5`。
2. Firebase 題庫已上傳到 `soloQuestions/TYC_VaccineTest/v0_1_0`，共 60 題。
3. Student Hosting 已部署：
   `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/`
4. Student Hosting version：
   `projects/896193010112/sites/tychbniis-32af5-student/versions/b31810b6ad13ee09`
5. Student Hosting live release：
   `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782813269298000`
6. GAS 已推送並更新既有正式 Web App deployment 到 `@119`，正式 URL 不變：
   `https://script.google.com/macros/s/AKfycbzZ9gNIsS70ihBG0dWCgtFKh4wuJaM0ttYqwSfG6dqGDRBHtgq-Ui7UtC_1GDEYm4u5/exec`
7. 線上驗證已通過：
   - `/TYCVACCINETEST/` 顯示單機版。
   - `/` 仍顯示原互動式學員端。
   - Firebase 題庫路徑可讀取 60 題。
   - GAS `getSoloLeaderboard` 與 `submitSoloResult` 可正常回應。
   - 首頁排行榜按鈕可顯示 GAS 回傳資料。
   - 線上瀏覽器 smoke test 可完成 60 題流程。

## 還原方式

1. 使用 `backup/tycvaccinetest_solo_0_1_0_20260630_172543/` 中的檔案覆蓋回原檔。
2. 刪除 `frontend/student/dist/TYCVACCINETEST/`。
3. 刪除 `scripts/build-tycvaccinetest-question-seed.mjs`。
4. 刪除 `scripts/tycvaccinetest-smoke-test.mjs`。
5. 刪除 `firebase/tycvaccinetest.soloQuestions.v0_1_0.json`。
6. 若已部署 Firebase 或 GAS，需重新部署還原後版本。
## 2026-07-01 update - solo UI and local resume

- Project version: `0.7.45`; solo app version remains `0.1.0`.
- Solo app folder remains `frontend/student/dist/TYCVACCINETEST/`.
- Official path remains `/TYCVACCINETEST/`; do not use `/solo/` as the formal entry.
- Visible UI should use user-facing labels only. Do not show internal code names such as `TYC_VaccineTest`, `TYCVACCINETEST`, `Firebase`, or `GAS` in page text.
- Solo UI now follows the original interactive student pixel style: pixel panels, item icons, item box, answer feedback, explanation area, and treasure-open feedback.
- Local interrupted progress is stored only in browser `localStorage` key `tycVaccineTestSoloDraft`.
- The local draft includes progress, answers, item usage, achievements, score state, inventory, and last answered state. It is not sent to Firebase or GAS.
- `submitResult()` has an explicit incomplete-run guard. If `answers.length !== questions.length`, the score is not submitted.
- Items can only be used after answering and before starting the next question.
- Added test command: `npm run test:tycvaccinetest:resume`.
- Deployed on 2026-07-01 to `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/d2f96a6c2d8daf2f`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782869042453000`.
- Rollback backup: `backup/tycvaccinetest_ui_resume_20260701_090511/`.
## 2026-07-01 update - mobile panels and leaderboard rows

- Project version: `0.7.46`; solo app version remains `0.1.0`.
- Scope remains isolated to `frontend/student/dist/TYCVACCINETEST/`.
- Question, answer, and explanation text use readable block rendering.
- Mobile quiz operation uses utility buttons for `狀態`, `寶箱`, `成就`, `道具`, `解析`, and `排行`.
- Mobile side panel is hidden; after answering, options collapse and the answer result is brought into view.
- Homepage no longer shows fixed info labels `每題 60 秒` and `完成後送出排行榜`.
- GAS leaderboard compatibility: frontend accepts `rows` and `leaderboard`.
- Added test command: `npm run test:tycvaccinetest:mobile`.
- Deployed on 2026-07-01 to `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/8a264f1287ff0146`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782871092467000`.
- Rollback backup: `backup/tycvaccinetest_ui_mobile_panels_20260701_094500/`.
## 2026-07-01 update - cache control

- Solo app version remains `0.1.0`.
- Cache identifier: `0.1.0-cache-20260701-1`.
- `index.html` includes no-cache meta tags.
- `index.html` loads `styles.css`, `config.js`, and `app.js` with `v=` cache-busting query strings.
- Firebase Hosting student now sends `Cache-Control: no-cache, no-store, must-revalidate` for `*.css` and `*.json`, in addition to existing `*.html` and `*.js`.
- Firebase Hosting student now also sends `Cache-Control: no-cache, no-store, must-revalidate` for `/TYCVACCINETEST` and `/TYCVACCINETEST/**`, because `/TYCVACCINETEST/` is an extensionless route and does not match `*.html`.
- Deployed on 2026-07-01 to `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/57dd5f9d5989444c`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782876518323000`.
- Online cache header check passed for `/TYCVACCINETEST/`, `/TYCVACCINETEST`, `styles.css`, `app.js`, `config.js`, and `soloQuestions.v0_1_0.json`.
- Online smoke and mobile panel tests passed at `https://tychbniis-32af5-student.web.app/TYCVACCINETEST/?localQuestions=1`.
- Future cache-only releases should update the `v=` query string without changing `soloVersion`.
- Rollback backup: `backup/tycvaccinetest_cache_control_20260701_112304/`.
- Route header rollback backup: `backup/tycvaccinetest_cache_route_header_20260701_112755/`.

## 2026-07-01 update - round 2 fixes

- Solo app version remains `0.1.0`.
- Mobile answering mode locks body scrolling; quiz content and utility content stay within the phone viewport or overlay panel.
- Leaderboard loading uses longer timeout and retry for `getSoloLeaderboard`.
- Correct answers now create unopened treasure boxes. Users open boxes manually in the treasure panel.
- Achievement panel now shows progress and claim status. Claiming an achievement adds unopened treasure boxes.
- Challenge card now uses an in-app `猜大` / `猜小` / `不猜` panel based on the original interactive design concept.
- Added test command: `npm run test:tycvaccinetest:round2`.
- Deployed on 2026-07-01 to `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/70c3611dfcbeeea6`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782875349686000`.
- Online tests passed: smoke, resume, mobile, round2 behavior, and real GAS leaderboard.
- Rollback backup: `backup/tycvaccinetest_fix_round2_20260701_105547/`.

## 2026-07-01 update - mobile one-screen quiz

- Solo app version: `0.1.0`.
- The solo app version is independent from the root `package.json` version.
- Version note file: `frontend/student/dist/TYCVACCINETEST/VERSION.md`.
- Scope remains isolated to `frontend/student/dist/TYCVACCINETEST/`.
- Mobile answering mode hides the large top title/header to reduce vertical space.
- Mobile quiz status and utility buttons stay fixed near the top.
- Utility content opens as an overlay panel; it no longer keeps adding answer-page content downward.
- After answering on mobile, options collapse, the page remains near the top, and next-step controls stay fixed near the bottom.
- Item timing remains unchanged: items can only be used after answering and before starting the next question.
- Test command updated: `npm run test:tycvaccinetest:mobile` checks fixed controls, reduced scrolling, collapsed options, and overlay panel height.
- Deployed on 2026-07-01 to `hosting:student`.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/627e10bed365ced7`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782873503774000`.
- Online mobile viewport check passed: homepage shows `版本 0.1.0`, utility buttons stay fixed near the top before and after answering, and utility content opens as an overlay.
- Rollback backup: `backup/tycvaccinetest_mobile_one_screen_20260701_101000/`.
## 2026-07-01 update - solo 0.1.1 Firebase leaderboard snapshot

- Solo app version remains `0.1.1`.
- Root project version remains `0.7.46`.
- Cache identifier: `0.1.1-fbleaderboard-20260701-1`.
- Leaderboard now reads Firebase Realtime Database path `soloLeaderboards/TYC_VaccineTest/v0_1_1` when the site opens.
- Users no longer call GAS `getSoloLeaderboard` to load leaderboard rows on site entry.
- GAS `submitSoloResult` and `getSoloLeaderboard` now publish the latest top-10 leaderboard snapshot to Firebase.
- Firebase snapshot fields: `rank`, `nickname`, `score`, `correctCount`, `totalQuestions`, `totalResponseSeconds`, and `completedAt`.
- Firebase snapshot intentionally does not publish `playerId`.
- Firebase Database Rules allow public read for `soloLeaderboards/TYC_VaccineTest/v0_1_1` and restrict writes to approved admin/service accounts.
- Firebase Functions proxy is not used, so this change does not require upgrading the Firebase project to Blaze.
- Local tests passed: syntax checks, smoke, mobile, and ui-audit.
- Online mobile audit passed with `firebaseReads=1` and `gasLeaderboardReads=0`.
- GAS deployed to existing formal Web App deployment version `120`.
- Firebase Database Rules deployed.
- Firebase Hosting `hosting:student` deployed.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/4236aac59bfe48e6`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782894035474000`.
- Firebase snapshot verification returned HTTP 200, `source: gas`, and 8 rows after low-score submit verification.
- Rollback: revert this commit, redeploy previous GAS version `119` if needed, restore previous Firebase Database Rules, and redeploy previous Firebase Hosting version if needed.
## 2026-07-01 update - solo 0.1.1 UI flow refinements

- Solo app version remains `0.1.1`.
- Root project version remains `0.7.46`.
- Cache identifier: `0.1.1-uiflow-20260701-1`.
- Summary review question numbers now open a modal detail view instead of rendering inline detail below the grid.
- Answer-result modal and explanation panel now include `開啟寶箱`.
- Achievement claim refreshes the achievement modal content in place and preserves scroll position.
- Item utility button shows a red dot when unused items are available.
- Double card repeat use is blocked while already pending, with message `加倍卡套用中，無法重複使用`.
- Challenge card now shows the 0-9 flash animation before showing the result.
- Home command instructions were removed; the status box now shows previous completion score/correct count from local browser storage.
- Previous completion storage does not store nickname or per-question answer detail.
- Local tests passed: syntax check, smoke, mobile, ui-audit, round2, and custom Playwright UI-flow checks.
- Firebase Hosting `hosting:student` deployed successfully.
- Student Hosting version: `projects/896193010112/sites/tychbniis-32af5-student/versions/7023396d21cdce46`.
- Student Hosting live release: `projects/896193010112/sites/tychbniis-32af5-student/channels/live/releases/1782896411778000`.
- Online cache-id check and online smoke test passed.
- Rollback backup: `backup/tycvaccinetest_ui_flow_20260701_1625/`.
