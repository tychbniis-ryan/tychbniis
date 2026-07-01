# TYC_VaccineTest 單機版交接文件

## 版本

- 主專案版本：`0.7.44`
- 單機版版本：`0.1.0`
- 單機版資料夾：`frontend/student/dist/TYCVACCINETEST/`

## 網址

- 本機規劃網址：`http://localhost:5173/TYCVACCINETEST/`
- 本次測試網址：`http://127.0.0.1:5183/TYCVACCINETEST/?localQuestions=1`
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

1. 首頁有 2 個區塊：`進入遊戲`、`查看排行`。
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
npm run test:tycvaccinetest:smoke -- http://127.0.0.1:5183/TYCVACCINETEST/?localQuestions=1
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
4. 本次 `5173` 連接埠已有其他程序占用，因此測試改用 `5183`。
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
## 2026-07-01 update - round 2 fixes

- Solo app version remains `0.1.0`.
- Mobile answering mode locks body scrolling; quiz content and utility content stay within the phone viewport or overlay panel.
- Leaderboard loading uses longer timeout and retry for `getSoloLeaderboard`.
- Correct answers now create unopened treasure boxes. Users open boxes manually in the treasure panel.
- Achievement panel now shows progress and claim status. Claiming an achievement adds unopened treasure boxes.
- Challenge card now uses an in-app `猜大` / `猜小` / `不猜` panel based on the original interactive design concept.
- Added test command: `npm run test:tycvaccinetest:round2`.
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
