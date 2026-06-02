# 第 7 版作業狀態

作業日期：2026-06-01

目前版本：`0.7.14`

## 0.7.14 交接摘要：Firebase 快速計分

1. 本次新增 `scoreClosedQuestion` 的 Firebase 快速計分路徑。
2. 快速路徑適用條件：
   - 一般選擇題。
   - Firebase `players/{gameId}` 有報到玩家。
   - Firebase `answers/{gameId}/{questionId}` 有當題作答。
   - `itemUses/{gameId}` 沒有待處理或已使用道具。
3. 快速路徑行為：
   - 不同步 Firebase players 到 Sheets。
   - 不同步 Firebase answers 到 Sheets。
   - 不寫入答案表、玩家表或排行榜表。
   - 直接計算 Firebase 作答資料。
   - 直接發布 `publicScoreboards/{gameId}`。
   - `settlementBatches` 會標記 `mode: firebase_fast`。
   - 0 份作答時也會走快速路徑，產生 0 分排行榜，不再回退舊 GAS / Sheets 路徑。
4. 自動回退條件：
   - 創作題。
   - Firebase 題庫與 Sheets 題庫都找不到題目。
   - Firebase 玩家或當題作答資料不足。
   - 偵測到道具使用資料。
5. 新增讀取測試：
   - `npm run test:v7:fast-score`
   - `npm run test:v7:read -- --players 100 --rounds 3 --concurrency 25`
   - `npm run test:v7:read -- --players 200 --rounds 3 --concurrency 50`
6. 已完成本機讀取測試：
   - 快速計分純計算：`submittedCount=2`、`scoredCount=2`、產生 5 隊排行榜。
   - 100 人：900 requests，0 failures，p95 約 154 ms。
   - 200 人：1800 requests，0 failures，p95 約 156 ms。
7. GAS 已建立測試 deployment：
   - `@89`：目前第 7 版測試入口使用版本，修正 0 作答誤回退舊路徑。
   - deployment ID：`AKfycbx-qtMI3nQWOx5V7NFpoUdJFX7LxxT_tY13BhTFkYJAZR1dHtj4NnIAeRIVKG_twVI`
   - 描述：`0.7.14 zero answer fast scoring 2026-06-02`
   - 0 份作答時仍走 `mode=firebase_fast`。
8. 前一個診斷 deployment：
   - `@88`
   - deployment ID：`AKfycbwsK9CJf--uSIR31G4OoDTtJHUwm79YgkaO1MEpgTQcsWFSlvQIrhzQTcjft6fPk95t`
   - 描述：`0.7.14 fast scoring diagnostics 2026-06-02`
   - 會回傳 `mode` 與 `fastPathFallbackReason`，用於判斷是否走 Firebase 快速計分。
9. 更早的測試 deployment：
   - `@87`
   - deployment ID：`AKfycby90HyCTWcCBprkkhabjRRF4xWn8G0ASszw6mqtEack0xScF8QI-zR9xZ667MhuqXv8`
   - 描述：`0.7.14 firebase fast scoring 2026-06-02`
10. 第 7 版測試入口與壓測腳本已改指向 `@89`：
   - `frontend/instructor/dist/config-v7-test.js`
   - `scripts/v7-pressure-test.mjs`
   - `scripts/v7-batch-status.mjs`
11. `@87` smoke test 已通過：
   - `ok:true`
   - `status:draft`
   - 未寫入假資料。
12. `test:v7:batch-status` 未設定管理密碼時會拒絕執行。
13. 本次未部署 Firebase rules 或 Hosting，正式入口仍未切換。
14. 下一步若要實機測試，可用第 7 版測試入口與 `@89`。若關題仍需約 20 秒，請看講師端批次文字中的 `mode=` 與 `fallback=`。

## 0.7.13 交接摘要：Cloud Functions 由 GAS 替代

1. 第 7 版最終架構收斂為：
   - Firebase Realtime Database：即時主資料層。
   - GAS：背景工作者與行政後端。
   - Google Sheets：題庫、報表與人工可讀資料。
2. Cloud Functions 不列入必要架構：
   - 模組狀態改為 `not_used_replaced_by_gas_worker`。
   - 不部署 `firebase deploy --only functions`。
3. GAS 替代 Cloud Functions 的功能：
   - 關題後自動計分。
   - 防作弊與作答資料校驗。
   - 排行榜彙整。
   - `settlementBatches` 批次狀態。
   - 管理 API。
   - 活動後資料封存與匯出。
4. 本機 `firebase/database.rules.json` 已補上管理節點：
   - `settlementBatches/{gameId}/{closeSequence}`
   - `activityLogs/{gameId}/{logId}`
   - `exports/{gameId}`
5. 新增 rules 檢查文件：
   - `docs/22_v7_firebase_rules_audit.md`
6. 本次沒有部署 rules，未影響線上 Firebase。
7. 下一步建議：
   - 本機複核 Realtime Database rules。
   - 確認 GAS 管理 API 是否已能完整寫入第 7 版所需節點。
   - 再建立不影響正式入口的 V7 Firebase 主控測試入口。

## 0.7.12 交接摘要：Firebase 為主、GAS 為輔

1. 新增文件：`docs/21_v7_firebase_primary_architecture.md`。
2. 第 7 版正式架構方向：
   - Firebase Realtime Database 是現場即時主資料層。
   - GAS / Google Sheets 是題庫、報表、備份、稽核與行政維護層。
3. Firebase 主責：
   - `gameState/{gameId}`：開題、關題、公開答案。
   - `publicQuestions/{gameId}/{questionId}`：公開題庫。
   - `players/{gameId}/{playerId}`：學員報到。
   - `answers/{gameId}/{questionId}/{playerId}`：學員作答。
   - `publicScoreboards/{gameId}`：排行榜快照。
   - `settlementBatches/{gameId}`：批次計分狀態。
4. GAS 保留用途：
   - 題庫匯入。
   - 發布公開題庫。
   - 活動後匯出 Firebase 資料。
   - 產出 Google Sheets 賽後報表。
   - 備份與稽核。
5. 本次沒有：
   - 修改前端執行邏輯。
   - 修改 GAS。
   - 部署 Firebase Hosting。
   - 部署 Realtime Database rules。
   - 部署 Cloud Functions。
6. 下一步建議：
   - 先做「階段 B：Firebase rules 檢查」。
   - 不要直接大改前端或 GAS。
   - 正式入口仍保留第 6 版流程作為回復方案。
7. 0.7.13 起，Cloud Functions 已改為非必要路線，相關功能由 GAS 替代。

## 0.7.11 交接摘要：Blaze-ready、Spark 預設

1. 新增文件：`docs/20_v7_blaze_ready_plan.md`。
2. 專案狀態改為「Blaze-ready、Spark 預設」：
   - 平常仍以 Spark 免費方案維運。
   - 第 6 版正式入口仍適合 50 人左右活動。
   - 需要 200 人同時在線時，再由承辦人手動開通 Blaze。
3. 本次沒有：
   - 開通 Blaze。
   - 部署 Cloud Functions。
   - 修改 Firebase 帳務方案。
   - 修改 GAS。
   - 修改線上 Realtime Database rules。
4. `app/config/modules.json` 新增：
   - `v7_blaze_ready_plan`
5. `cloud_functions` 模組狀態改為：
   - 0.7.11：`blaze_ready_not_enabled`
   - 0.7.13 起：`not_used_replaced_by_gas_worker`
6. 重要維運原則：
   - Codex 不應代替承辦人開通付費方案。
   - 未經明確確認，不執行 `firebase deploy --only functions`。
   - GAS 保留題庫、報表、備份、行政維護用途。
   - Firebase Realtime Database 作為 200 人活動即時主資料層。
7. 200 人活動前必須：
   - 設定 Google Cloud 預算提醒。
   - 執行 `npm run test:v7:traffic-estimate`。
   - 先做 100 / 200 人測試。
   - 確認 Realtime Database rules。

## 0.7.10 交接摘要：Firebase 流量估算工具

1. 新增工具：`scripts/v7-traffic-estimate.mjs`。
2. 新增 npm script：`npm run test:v7:traffic-estimate`。
3. 工具用途：
   - 離線估算 50 / 100 / 200 人活動的 Realtime Database 上傳量。
   - 離線估算 Realtime Database 下載量。
   - 離線估算 Realtime Database 儲存量。
   - 對照 Blaze 免費額度：10 GB/月下載、1 GB 儲存。
4. 估算範圍包含：
   - 學員報到 PUT 與 Firebase 回傳 echo。
   - 報到時為分配戰隊讀取 `players/{gameId}`。
   - 每題作答 PUT 與 Firebase 回傳 echo。
   - 每位學員下載一次公開題庫。
   - 學員端每 5 秒輪詢 `gameState/{gameId}`。
   - 每位學員查看排行榜快照。
5. 工具限制：
   - 不連線 Firebase。
   - 不讀取 Firebase Console Usage。
   - 不等於正式帳單。
   - 只能估算資料流量，不能解除 Spark 方案 100 同時連線限制。
6. 使用指令：
   - `npm run test:v7:traffic-estimate`
   - `npm run test:v7:traffic-estimate -- --players 200 --questions 20 --minutes 60`

## 0.7.9 交接摘要：講師端第 7 版測試入口

1. 新增測試入口：`frontend/instructor/dist/InstructorV7.html`。
2. 新增測試設定：`frontend/instructor/dist/config-v7-test.js`。
3. `app/config/modules.json` 新增 `instructor_v7_test`，正式 `instructor_mobile` 仍指向 `Instructor.html`。
4. `config-v7-test.js` 指向 GAS 測試 deployment `@86`。
5. `config-v7-test.js` 設定：
   - `enableSettlementMonitor: true`
   - `settlementMonitorPollMs: 1500`
6. `frontend/instructor/dist/api.js` 已支援讀取上述設定。
7. `frontend/instructor/dist/app.js` 會在測試入口啟用時：
   - 顯示 `V7 測試` 徽章。
   - 關題關閉後查詢批次狀態。
   - 背景計分中查詢批次狀態。
   - 計分完成後顯示作答筆數、計分筆數與 GAS 耗時。
8. 正式入口未切換：
   - `frontend/instructor/dist/Instructor.html` 仍載入 `config.js`。
   - `frontend/instructor/dist/config.js` 仍指向正式 GAS `@81`。
9. 本次不部署 Firebase Hosting、Cloud Functions 或 Firebase rules。

## 0.7.8 交接摘要：開題與關題公布答案耗時量測

1. GAS `openQuestion` 已新增 `timingSummary`。
2. GAS `closeQuestionAndRevealAnswer` 已新增 `timingSummary`。
3. Logger 會寫入：
   - `openQuestionTiming`
   - `closeQuestionRevealTiming`
4. 壓測腳本會把 `openQuestionTiming` 與 `closeRevealTiming` 寫入 JSON 摘要。
5. GAS 測試 deployment 已建立為 `@86`。
6. `scripts/v7-pressure-test.mjs` 與 `scripts/v7-batch-status.mjs` 已改用 `@86`。
7. 此版本目的：判斷目前前台開題與關題公布答案約 10 秒以上的主要慢點。
8. 本次不改計分公式、不改正式前端、不部署 Firebase Hosting。
9. 50 人壓測結果：
   - `gameId`: `v7_perf_20260601100325`
   - `questionId`: `q001`
   - `openQuestion` 外層耗時：`10826ms`
   - `openQuestionTiming.totalMs`: `2437ms`
   - `closeAndReveal` 外層耗時：`12053ms`
   - `closeRevealTiming.totalMs`: `3488ms`
   - `scoreClosedQuestion`: `25951ms`
   - `timingTotalMs`: `19602ms`
   - 批次狀態：`pending → processing → done`
10. 速度判斷：仍偏慢。GAS 內部開題 / 關題公布約 2.4 至 3.5 秒，但 Web App 外層端到端等待約 10 至 12 秒，代表主要等待可能來自 Apps Script Web App 執行環境、網路往返或啟動延遲。若要達成前台 3 至 8 秒目標，單純微調 GAS 內部讀寫可能不足。

## 0.7.7 交接摘要：壓測流程整合批次監看

1. `scripts/v7-pressure-test.mjs` 預設 GAS 測試 deployment 已改為 `@85`。
2. 完整壓測流程新增 3 個批次狀態查詢點：
   - `batchStatusAfterClose`：關題公布答案後。
   - `batchStatusDuringScoring`：後台計分啟動後約 1.5 秒。
   - `batchStatusAfterScoring`：後台計分完成後。
3. 批次狀態摘要包含：
   - `count`
   - `status`
   - `closeSequence`
   - `timingTotalMs`
   - `submittedCount`
   - `scoredCount`
   - `updatedAt`
   - `checkedAt`
4. 安全限制維持：
   - `gameId` 必須以 `v7_perf_` 開頭。
   - 管理密碼只讀取 `V7_TEST_ADMIN_SECRET`。
   - 預設清理測試 Firebase 路徑。
5. 本次仍不修改正式前端、不部署 Firebase Hosting、不切換正式活動入口。
6. 已完成 50 人壓測驗證：
   - `gameId`: `v7_perf_20260601095247`
   - `questionId`: `q001`
   - `submittedCount`: `50`
   - `scoredCount`: `50`
   - `timingTotalMs`: `15049ms`
   - `totalMs`: `49139ms`
   - `batchStatusAfterClose`: `pending`
   - `batchStatusDuringScoring`: `processing`
   - `batchStatusAfterScoring`: `done`
7. 壓測結束後已呼叫 `resetGameData` 清理測試 Firebase 路徑。

## 0.7.6 交接摘要：批次狀態本機監看工具

1. 新增本機只讀工具：`scripts/v7-batch-status.mjs`。
2. 新增 npm script：`npm run test:v7:batch-status`。
3. 用途：查詢 GAS 測試 deployment `@85` 的 `getSettlementBatchStatus`，讓正式前端切換前也能人工確認批次狀態。
4. 可用參數：
   - `--game-id`
   - `--question-id`
   - `--close-sequence`
5. 安全限制：
   - 只允許查詢 `@85`。
   - 管理密碼只讀取 `V7_TEST_ADMIN_SECRET`。
   - 不接受命令列密碼。
   - 不寫入 Firebase 或 Google Sheets。
6. 暫不接正式講師端原因：目前 `frontend/instructor/dist/config.js` 仍指向第 6 版 GAS `@81`；若直接加前端監看，正式畫面會呼叫 `@81` 不存在的 action。
7. 測試結果：
   - `node --check scripts/v7-batch-status.mjs` 通過。
   - JSON 檢查通過。
   - `npm run check:functions` 通過。
   - 未設定 `V7_TEST_ADMIN_SECRET` 時，工具會拒絕執行。
   - 設定 `V7_TEST_ADMIN_SECRET` 後可查詢 `@85`，目前預設場次沒有殘留批次，`count=0`。

## 0.7.5 交接摘要：結算批次狀態監看 API

1. 新增 GAS 管理 action：`getSettlementBatchStatus`。
2. 用途：查詢 Firebase `settlementBatches/{gameId}` 中的關題結算批次狀態，支援正式活動時確認背景計分是否已完成。
3. 查詢條件：
   - `gameId`：未提供時使用 GAS 預設 `GAME_ID`。
   - `questionId`：選填，可查指定題目批次。
   - `closeSequence`：選填，可查指定關題序號。
4. 回傳內容：
   - `status`
   - `lockedAt`
   - `processingStartedAt`
   - `doneAt`
   - `failedAt`
   - `updatedAt`
   - `timingTotalMs`
   - `submittedCount`
   - `scoredCount`
   - `challengeAppliedCount`
   - `scoreboardRows`
   - `errorMessage`
   - `version`
5. 資安限制：此 API 需管理密碼，不回傳姓名、身分證、電話、答案內容、道具明細、Token 或管理密碼。
6. 本次未修改計分公式、正式前端、Firebase Hosting、Cloud Functions 或 Firebase rules。
7. GAS 已建立測試 deployment `@85`，描述為 `0.7.5 settlement batch status API 2026-06-01`。
8. 測試結果：
   - `@85 getGameState` 回應 `ok:true`。
   - `@85 getSettlementBatchStatus` 未帶管理密碼時回「管理操作授權失敗」。
   - `@85 getSettlementBatchStatus` 帶管理密碼時回應 `ok:true`，目前預設場次沒有殘留批次，`count=0`。

## 0.7.4 交接摘要：100 / 200 人壓測基準

1. 已完成 100 人隔離壓測：
   - `gameId`: `v7_perf_20260601093129`
   - `questionId`: `q001`
   - `submittedCount`: `100`
   - `scoredCount`: `100`
   - `openQuestion`: `17379ms`
   - `writeFirebasePlayers`: `3804ms`
   - `writeFirebaseAnswers`: `662ms`
   - `closeAndReveal`: `7991ms`
   - `scoreClosedQuestion`: `41677ms`
   - `timingTotalMs`: `35181ms`
   - `totalMs`: `71513ms`
   - `settlementStatus`: `done`
2. 已完成 200 人隔離壓測：
   - `gameId`: `v7_perf_20260601093256`
   - `questionId`: `q001`
   - `submittedCount`: `200`
   - `scoredCount`: `200`
   - `openQuestion`: `15771ms`
   - `writeFirebasePlayers`: `4408ms`
   - `writeFirebaseAnswers`: `1360ms`
   - `closeAndReveal`: `9172ms`
   - `scoreClosedQuestion`: `24542ms`
   - `timingTotalMs`: `18858ms`
   - `totalMs`: `55253ms`
   - `settlementStatus`: `done`
3. 兩次壓測都已由腳本呼叫 `resetGameData` 清理測試 Firebase 路徑。
4. 初步判斷：`@84` 測試 deployment 可完成 200 人單題壓測；但 `openQuestion` 與 `scoreClosedQuestion` 仍有明顯等待時間，正式活動前應保留操作間隔，並監看 `settlementBatches` 狀態是否進入 `done`。
5. 本次只記錄壓測結果，未修改 GAS 後端、正式前端、Firebase Hosting、Cloud Functions 或 Firebase rules。

## 0.7.3 交接摘要：壓測預設題號修正

1. 修正 `scripts/v7-pressure-test.mjs` 預設題號。
2. 原本預設 `test_q001`，實測完整 50 人壓測時 GAS 回覆「找不到題目」。
3. 目前公開題庫可用題號包含 `q001`，因此預設改為 `q001`。
4. 若後續要測特定題目，可執行：

```powershell
npm run test:v7:pressure -- --players 50 --question-id q001
```

5. 本次未修改 GAS 後端、正式前端、Firebase Hosting、Cloud Functions 或 Firebase rules。
6. 壓測安全限制仍維持：`gameId` 必須以 `v7_perf_` 開頭，GAS URL 只能指向測試 deployment `@84`，管理密碼只讀取 `V7_TEST_ADMIN_SECRET`。
7. 已完成 50 人隔離壓測：
   - `gameId`: `v7_perf_20260601092639`
   - `questionId`: `q001`
   - `submittedCount`: `50`
   - `scoredCount`: `50`
   - `scoreClosedQuestion`: `24246ms`
   - `timingTotalMs`: `17842ms`
   - `totalMs`: `49863ms`
   - `settlementStatus`: `done`
8. 壓測結束後已呼叫 `resetGameData`，清理 `players`、`answers`、`itemUses`、`settlementBatches`、`publicScoreboards` 等測試路徑。

## 0.7.2 交接摘要：隔離壓測工具

1. 新增本機壓測腳本：
   - `scripts/v7-pressure-test.mjs`
2. 新增 npm scripts：
   - `npm run test:v7:pressure:smoke`
   - `npm run test:v7:pressure`
3. 腳本用途：
   - 後續可用 GAS 測試 deployment `@84` 執行 50 / 100 / 200 人假資料壓測。
   - 測試流程設計為開題、寫入 Firebase 假學員、寫入 Firebase 假作答、關題公布答案、執行後台計分。
4. 安全限制：
   - 預設只允許對 `@84` 執行。
   - `gameId` 必須以 `v7_perf_` 開頭。
   - 管理密碼只從環境變數 `V7_TEST_ADMIN_SECRET` 讀取，不接受命令列密碼。
   - 未設定管理密碼時，只執行 smoke test，不寫入假資料。
   - 測試資料使用 `測試學員001` 這類假資料。
5. 預設清理：
   - 完整壓測結束時，腳本會呼叫管理 API `resetGameData` 清理測試 `gameId`。
   - GAS `clearFirebaseGameData()` 已納入 `settlementBatches/{gameId}`，避免壓測批次狀態殘留。
   - 若使用 `--skip-cleanup`，需人工確認保留測試資料的原因。
6. GAS 已推送並建立測試 deployment `@84`，描述為 `0.7.2 pressure test runner cleanup support 2026-06-01`。
7. 本次已執行 smoke test，尚未執行 50 / 100 / 200 人完整壓測。

## 0.7.1 交接摘要：Firebase 關題結算批次

1. 第 7 版第 2 個小任務已先完成 GAS 端基礎配套。
2. 新增 Firebase 路徑：
   - `settlementBatches/{gameId}/{closeSequence}`
3. 批次欄位包含：
   - `gameId`
   - `questionId`
   - `closeSequence`
   - `status`
   - `lockedAt`
   - `updatedAt`
   - `version`
   - 完成時的 `timingTotalMs`、`submittedCount`、`scoredCount`、`challengeAppliedCount`、`scoreboardRows`
4. 狀態流程：
   - `pending`：講師按下關題並公布答案時建立或沿用。
   - `processing`：後台 `scoreClosedQuestionNow()` 開始計分時更新。
   - `done`：後台計分完成後更新。
   - `failed`：後台計分發生錯誤時更新，僅保存錯誤訊息摘要。
5. 同一題若已存在批次，會沿用既有 `closeSequence`，避免重複關題建立新批次。
6. 批次紀錄不保存姓名、身分證、電話、答案內容、道具明細、Token 或管理密碼。
7. 若 Firebase 批次狀態寫入失敗，回傳 `skipped` 結果，不阻斷原本計分流程。
8. 正式學員端與講師端仍指向第 6 版 `@81`，尚未切換正式活動入口。
9. GAS 已推送並建立測試 deployment `@83`，描述為 `0.7.1 settlement batch status tracking 2026-06-01`。
10. `@83` 驗證：
   - `getGameState` 回應 `200`。
   - `scoreClosedQuestion` 未帶管理密碼時回「管理操作授權失敗」，確認管理操作未公開。
11. 本次未部署 Firebase Hosting、Cloud Functions 或 Firebase rules。

## 0.7.0 交接摘要：關題效能量測

1. 第 7 版先從「現況量測」開始，不直接搬移計分架構。
2. GAS `scoreClosedQuestionNow()` 新增關題結算階段耗時摘要：
   - `ensureGameSheetsReady`
   - `syncFirebasePlayersToSheet`
   - `syncFirebaseAnswersForQuestionToSheet`
   - `syncFirebaseItemUsesForFinalSettlement`
   - `readQuestionRows`
   - `readAnswerSheet`
   - `readItemSheet`
   - `calculateAnswerScores`
   - `writeAnswerSheet`
   - `applyPendingChallengeCards`
   - `writeItemSheet`
   - `applyPlayerScoreDeltas`
   - `getGameState`
   - `recalculateScoreboard`
   - `getScoreboard`
   - `publishScoreboardSnapshotToFirebase`
   - `buildComebackControl`
   - `publishGameStateToFirebase`
3. GAS 回傳新增 `timingSummary`，講師端目前不顯示，但可由 API 回應或 GAS 執行紀錄查看。
4. GAS `Logger.log()` 會寫入 `closeQuestionTiming` JSON 摘要，只包含 `gameId`、`questionId`、筆數與毫秒數，不記錄姓名、身分證、電話、答案內容、道具明細、Token 或管理密碼。
5. 同步修正 `scoreClosedQuestionNow()` 回傳中 `playerSync` 未宣告的問題，改為接住 `syncFirebasePlayersToSheet()` 的回傳結果。
6. GAS 已推送並建立測試 deployment `@82`，描述為 `0.7.0 close question timing measurement 2026-06-01`。
7. 學員端與講師端正式 `gasWebAppUrl` 仍指向第 6 版 `@81`，未切換正式活動入口。
8. `@82` 驗證：
   - `getGameState` 回應 `200`。
   - `scoreClosedQuestion` 未帶管理密碼時回「管理操作授權失敗」，確認管理操作未公開。
9. 本次未部署 Firebase Hosting、Cloud Functions 或 Firebase rules。
10. 下一步建議用 50 人、100 人、200 人假資料各執行關題，收集 `closeQuestionTiming` 摘要，再決定第 7 版第 2 階段是否先做 Firebase 關題結算批次。

# 第 6 版最終優化狀態

作業日期：2026-05-29

第 6 版定版版本：`0.6.13`

## 0.6.13 交接摘要：講師寶箱擴增與 Firebase 計分遷移評估

1. 學員端答題獎池已確認支援 50 題：
   - `frontend/student/dist/app.js`：`TREASURE_PLAN_QUESTION_LIMIT = 50`
   - `frontend/student/dist/static-v4.js`：`buildStaticTreasurePlan()` 的 `maxQuestionSlots` 預設為 50
2. 追加寶箱已由 5 箱擴增到 10 箱：
   - 講師端 `Instructor.html` / `index.html` 顯示第 1 至第 10 箱。
   - GAS `ADDITIONAL_TREASURE_BOX_LIMIT = 10`。
   - 學員端 `ADDITIONAL_TREASURE_BOX_LIMIT = 10`，依 Firebase `gameState.additionalTreasureBoxSlots` 補入本機寶箱。
3. 落後寶箱已由單一箱擴增到每隊 5 箱：
   - 講師端改為選戰隊後點選「落後第 1 箱」至「落後第 5 箱」。
   - GAS `LAGGING_TREASURE_BOX_LIMIT = 5`，並以 `teamId:slot` 寫入 `gameState.laggingTreasureBoxTeams`。
   - 學員端可解析新格式 `team_1:3`，也保留舊格式 `team_1` 為第 1 箱。
4. Firebase 計分遷移評估：
   - 現況已是學員作答先寫 Firebase，GAS 關題結算再同步該題 answers 到 Google Sheets。
   - 排行榜快照已有 `publishScoreboardSnapshotToFirebase()`。
   - 下一階段建議把「即時計分暫存、關題鎖定批次、排行榜快照」放在 Firebase；GAS 只讀 Firebase 已鎖定批次，背景整批寫入 Google Sheets。
   - 不建議在寶箱擴增同版直接改核心計分，避免關題去重、道具分數次序與最終結算產生不可追蹤差異。


5. 部署狀態：
   - GAS 已部署為 Web App deployment @81。
   - 學員端與講師端 Firebase Hosting 已部署。
   - 前端 gasWebAppUrl 已更新為 @81 對應 Web App URL。
   - 學員端 clientVersion 保留 .6.6，只更新靜態資源查詢參數為 .6.13，避免要求既有學員重新報到。
## 0.6.12 交接補充：疫苗教育訓練題庫替換

1. 使用者重新提供 `d:\GAS\GitHub\疫苗教育訓練題庫.md`，格式為章節式 Markdown，不是舊版表格。
2. GAS `getVaccineQuestionRows()` 已改由新檔解析後產生，共 50 題，題號仍為 `vac_q001` 至 `vac_q050`。
3. `updateVaccineQuestionBankFromMenu()` 已改成替換模式：
   - 新檔存在的 `vac_q`：更新或新增。
   - 新檔不存在的舊 `vac_q`：設為停用並標記 `Disabled during question bank replacement; kept for audit trail.`
   - 不直接刪除 Google Sheet 資料列，避免誤刪後無法追溯。
4. 架構評估：拆成多個 `.gs` 檔可改善維護性，但不會讓 GAS 執行時只載入需要的檔案；效能瓶頸仍在 Sheet 讀寫與同步。若要縮短關題等待，應把即時計分與快照移到 Firebase，GAS 改為背景批次落 Sheet。
5. 部署：GAS 正式 Web App 已更新到 deployment `@80`；前端 Hosting、Cloud Functions 與 Firebase rules 未重部署。

## 0.6.11 交接補充：多題庫與疫苗題庫

1. GAS 題庫維護選單新增：
   - `updateTestQuestionBankFromMenu()`：建立 `test_q001` 至 `test_q003`，供活動前流程測試。
   - `updateTaiwanQuestionBankFromMenu()`：維持臺灣生活 `q001` 至 `q020`。
   - `updateVaccineQuestionBankFromMenu()`：建立疫苗題庫 `vac_q001` 至 `vac_q050`，來源為 `d:\GAS\GitHub\疫苗題庫.md`。
2. 題庫不共用同一批 `questionId`。目前約定：
   - 測試題庫：`test_q` 或舊 `demo_q`
   - 臺灣生活：`q001` 至 `q020`
   - 疫苗題庫：`vac_q001` 至 `vac_q050`
3. `validateQuestions()` 已改為同一題庫內檢查 `order`，允許不同題庫各自從第 1 題開始。
4. 講師端 `Instructor.html` / `index.html` 新增 `questionBankSelect`，`app.js` 會依題庫選擇過濾開題清單，並將講師選擇存在 `localStorage.vaccineGameInstructorQuestionBank`。
5. 關題關閉效能評估：學員作答已先進 Firebase，慢點在 GAS 關題關閉時仍進行 Sheet 同步、整批讀寫與排行榜重新發布。下一階段若要大幅縮短關題等待，建議改為 Firebase 即時計分快照，GAS 背景批次落 Sheet，並新增同步狀態、重試與人工補同步。
6. 部署：GAS 正式 Web App 已更新到 deployment `@79`；講師端 Firebase Hosting 已部署；學員端、Cloud Functions 與 Firebase rules 未重部署。

## 0.6.7 維護補充：移除講師端題庫刪除入口

1. 已用非破壞式 `git revert` 退回 `0.6.8` 至 `0.6.10` 題庫匯入／同步 UI 變更，版本維持 `0.6.7`。
2. 講師端「匯入臺灣題庫」按鈕已移除；Web App action `replaceQuestionBankWithTaiwanQuestions` 已移除。
3. GAS 保留維運函式 `updateTaiwanQuestionBankFromMenu()`，Google Sheet 上方選單顯示「更新臺灣生活趣味題庫」。
4. 此維運函式不會清空題庫；它依內建 `臺灣生活趣味問答.md` 的 `q001` 至 `q020` 更新或新增資料列，並將舊 `demo_q` 測試題設為停用。
5. 終端嘗試 `clasp run updateTaiwanQuestionBankFromMenu` 受 Apps Script API executable 權限限制失敗；已移除暫測的 `executionApi` 設定，未開啟無授權公開 action。若需由本機直接執行，需先在 Apps Script 專案安全設定中允許目前帳號執行 API executable。
6. 部署：GAS 正式 Web App 已更新到 deployment `@78`；講師端 Firebase Hosting 已部署到 `https://tychbniis-32af5-instructor.web.app`；學員端未重部署。
7. 驗證：線上講師端無「匯入臺灣題庫」按鈕；`replaceQuestionBankWithTaiwanQuestions` 回「未知 action」；Playwright 講師端 smoke test 無 page error / console error。

第 6 版主軸：計分與 GAS 寫入效能最佳化。

## 0.6.7 交接補充：臺灣生活題庫與關題同步縮小範圍

1. 題庫：
   - 使用者提供的 `d:\GAS\GitHub\臺灣生活趣味問答.md` 已轉為 GAS 預設題庫，共 20 題。
   - `setupGameSheets()` 不再自動補回 `demo_q001` 至 `demo_q011` 測試題。
   - 新增 `replaceQuestionBankWithTaiwanQuestions` Web App action，需管理密碼；新增 Apps Script 選單「匯入臺灣生活趣味題庫」。
   - 講師端新增「匯入臺灣題庫」按鈕，會使用已套用的管理密碼呼叫上述 action，執行前會出現確認視窗。
   - 執行匯入會清空 `題庫` 工作表資料列，寫入 20 題臺灣生活趣味題，並同步 Firebase 公開題庫。
2. 關題關題效能：
   - `scoreClosedQuestionNow()` 的道具同步改為只同步本題 `syncFirebaseItemUsesForQuestionToSheet(gameId, questionId, currentCloseSequence)`。
   - 不再於每次關題呼叫最終結算用的 `syncFirebaseItemUsesForFinalSettlement()`，降低掃描 pending 道具與跨題同步範圍。
   - `syncFirebasePlayersToSheet()` 支援 `useRecentSyncCache`，同一場次 5 分鐘內已同步玩家時，後續關題可略過全體玩家 Firebase 讀取。
   - `publishScoreboardSnapshotToFirebase()` 可接收本輪重算後的 `playerRows`，避免發布排行榜時再次彙整玩家清單。
3. 風險：
   - 題庫取代會覆寫 Google Sheets `題庫` 工作表，必須由管理密碼 action 或 Apps Script 權限選單執行。
   - 玩家同步快取期間若有新學員在出題中途加入且未作答，排行榜人數可能暫時未納入；正式活動應在出題前完成報到。
4. 測試重點：
   - GAS 語法檢查需通過。
   - `replaceQuestionBankWithTaiwanQuestions` 未帶管理密碼時應拒絕，不可公開無驗證覆寫題庫。
   - 題庫匯入後，講師端需按「重新讀取題目清單」確認 Firebase 題庫已更新。
5. 部署：
   - GAS 已推送並更新既有正式 Web App deployment 到 `@71`，正式 `/exec` URL 不變。
   - 講師端 Firebase Hosting 已部署至 `https://tychbniis-32af5-instructor.web.app`。
   - 學員端 Hosting、Cloud Functions、Firestore rules 與 Realtime Database rules 未部署。
6. 驗證：
   - GAS 語法檢查、講師端 JS 語法檢查、`npm run check:functions`、`git diff --check` 通過。
   - GAS 內建題庫為 `q001` 至 `q020` 共 20 題，`gas/Code.gs` 不含 `demo_q`。
   - 線上 `replaceQuestionBankWithTaiwanQuestions` 與 `scoreClosedQuestion` 未帶管理密碼時回授權失敗，未回「未知 action」。
   - 線上講師端 `Instructor.html` 與 `app.js?v=0.6.7` 回應 `200`，已載入 `0.6.7`、臺灣題庫備用清單與匯入按鈕。
   - Playwright 講師端 smoke test 回應 `200`，無 page error / console error。
   - Firebase CLI 以獨立測試場次批次寫入 50 名假學員與 50 筆假答案後清除：單次 root update 約 14.4 秒，清除約 5.8 秒。此測試包含 CLI 啟動與授權開銷，不能直接等同學員端 SDK 體感。
7. 限制：
   - `clasp run replaceQuestionBankWithTaiwanQuestionsFromMenu` 仍受 Apps Script API executable 設定限制，終端無法直接覆寫 Sheet。
   - 實際更新正式題庫請用講師端「匯入臺灣題庫」按鈕，或在 Google Sheets 上方選單「互動遊戲管理」執行「匯入臺灣生活趣味題庫」。

## 0.6.6 交接補充：學員端獎池 50 題與關題減載

1. 寶箱獎池規則：
   - 仍由學員端本機 deterministic 計算，不從 GAS 讀取大型獎池表。
   - 同一場次、同一位學員獎池固定，重新整理不會洗獎池。
   - 不同學員因 `playerId` 不同會有不同獎池。
   - 不同場次因 `gameSessionSeed` 不同會有不同獎池。
2. 題庫擴充：
   - `frontend/student/dist/static-v4.js` 的 `buildStaticTreasurePlan()` 支援 `maxQuestionSlots`，預設 50 題。
   - `frontend/student/dist/app.js` 的 `ensureLocalTreasurePlan()` 會合併缺少的新題目，不重抽既有題目。
3. 關題關題減載：
   - GAS `scoreClosedQuestionNow()` 不再呼叫 `awardTreasureBoxesForCorrectAnswers()` 進行答題寶箱補發。
   - 回傳 `treasureAwardSync.skipped = true`，原因為 `student_local_treasure_plan_handles_question_boxes`。
   - 關題關題只處理答題分、加倍卡、挑戰卡、玩家分數、排行榜與 Firebase 狀態。
4. 注意：
   - GAS `寶箱紀錄` 不再代表每一個答題寶箱來源；若未來需要完整寶箱報表，應同步學員端開箱 / 道具使用事件，而不是在關題時計算。
5. 部署：
   - Git commit：`9921687`
   - GAS 已推送並更新既有正式 Web App deployment 到 `@70`，正式 `/exec` URL 不變。
   - 學員端 Firebase Hosting 已部署至 `https://tychbniis-32af5-student.web.app`。
   - 講師端 Hosting、Cloud Functions、Firestore rules 與 Realtime Database rules 未部署。
6. 驗證：
   - 線上學員端首頁回應 `200`，已載入 `0.6.6`。
   - 線上學員端 `app.js?v=0.6.6` 回應 `200`，已包含 50 題獎池上限與本機獎池合併邏輯。
   - GAS `scoreClosedQuestion` 未帶管理密碼時回授權失敗，未回「未知 action」。
   - Playwright 學員端 smoke test 回應 `200`，無 page error / console error。

## 0.6.5 交接補充：關題結算效能

1. 使用者回報 1 名測試學員在關題後仍等待 10-30 秒，判斷 200 人正式場次存在 GAS 執行逾時風險。
2. 慢速主因：
   - `syncFirebaseAnswersForQuestionToSheet()` 每筆答案都呼叫 `getPaperOpenedAt()`，後者會用 `TextFinder` 查翻卷表，200 人時會放大成大量 Sheet 查詢。
   - `awardTreasureBoxesForCorrectAnswers()` 逐位答對者呼叫掉寶流程；原流程會多次讀寫寶箱表、預配獎勵池與未開寶箱上限。
   - `scoreClosedQuestionNow()` 在結算中間與結算完成各發布一次 Firebase `gameState`。
   - 講師端關題按鈕會等待整段後台結算完成，造成畫面停等。
3. 修正方式：
   - 新增 `buildPaperOpenMap()`，關題結算時一次讀取該題翻卷紀錄。
   - `awardTreasureBoxesForCorrectAnswers()` 改為批次產生寶箱、批次更新 `TreasureRewardPool`、批次處理未開寶箱上限。
   - `scoreClosedQuestionNow()` 移除中間階段的重複 Firebase 發布。
   - 講師端 `closeQuestion` 流程改為先公布答案，`scoreClosedQuestion` 在背景執行，完成後更新排行榜。
4. 配套：
   - 背景結算完成前，排行榜可能短暫是舊分數；講師可先講解答案，等狀態文字更新後再進下一題。
   - 若 30-50 名測試仍超過 30 秒，下一步應把計分拆成分批任務，避免單次 GAS 執行承擔 200 人全部結算。
5. 部署：
   - Git commit：`692c6f3`
   - GAS 已推送並更新既有正式 Web App deployment 到 `@69`，正式 `/exec` URL 不變。
   - 講師端 Firebase Hosting 已部署至 `https://tychbniis-32af5-instructor.web.app`。
   - 學員端 Hosting、Cloud Functions、Firestore rules 與 Realtime Database rules 未部署。
6. 驗證：
   - 線上講師端 `Instructor.html` 與 `app.js?v=0.6.5` 回應 `200`，已載入 `0.6.5` 與背景結算流程。
   - GAS `scoreClosedQuestion` 未帶管理密碼時回授權失敗，未回「未知 action」。
   - Playwright 講師端 smoke test 回應 `200`，無 page error / console error。

## 0.6.4 交接補充：清空資料文案與管理流程效能

1. 講師端按鈕文字由「清空測試資料」改為「清空資料」。
2. 慢速主因：
   - `createGame()` 先呼叫 `setupGameSheets()`，接著 `syncGameSettingsToFirebase()` 又呼叫一次，造成啟動場次重複初始化工作表。
   - `setupGameSheets()` 在 `0.6.2` 後每次都會重建「題庫欄位說明」、寫入欄位備註、套用整欄資料驗證與自動欄寬，這些 Google Sheets 格式化操作耗時明顯。
   - `resetGameData()` 清空資料時還會同步題庫到 Firebase，但清空資料本身不需要同步題庫。
   - `clearFirebaseGameData()` 原本逐一路徑刪除 Firebase 暫存資料，會造成多次網路往返。
3. 修正方式：
   - `setupGameSheets()` 不再自動呼叫 `ensureQuestionBankGuidance()`；中文題庫說明改由 `getQuestionBankInfo()` 也就是「建立／編輯題庫」按鈕建立或更新。
   - `createGame()` 移除重複的 `setupGameSheets()`。
   - `resetGameData()` 不再呼叫 `syncQuestionsToFirebase()`，只清活動資料。
   - Firebase 路徑清理改用 `UrlFetchApp.fetchAll()` 批次刪除。
4. 配套：
   - 題庫更新後請按「重新讀取題目清單」，或在正式開始時按「啟動場次」，這兩個流程會同步最新題庫。
   - 若清空資料後仍看到舊玩家或舊排行榜，請再按一次「清空資料」，因 Firebase 批次刪除可能回報個別路徑失敗。
5. 部署：
   - Git commit：`d163178`
   - GAS 已推送並更新既有正式 Web App deployment 到 `@68`，正式 `/exec` URL 不變。
   - 講師端 Firebase Hosting 已部署至 `https://tychbniis-32af5-instructor.web.app`。
   - 學員端 Hosting、Cloud Functions、Firestore rules 與 Realtime Database rules 未部署。
6. 驗證：
   - 線上講師端 `Instructor.html` 與 `app.js?v=0.6.4` 回應 `200`，已載入 `0.6.4`，包含「清空資料」且不含「清空測試資料」。
   - GAS `resetGameData` 與 `refreshQuestionBank` 未帶管理密碼時回授權失敗，未回「未知 action」。
   - Playwright 講師端 smoke test 回應 `200`，無 page error / console error。

## 0.6.3 交接補充：講師端題庫快取修正

1. 講師端若本機已有 `vaccineGameAdminSecret`，重新開頁會直接進入控制流程，不再先用 `getGameState` 做後台驗證。
2. 題庫連結取得後會保存於 `vaccineGameQuestionBankUrl`；下次進入頁面先直接使用本機連結，避免每次點題庫前重複驗證。
3. 「重新讀取題目清單」現在會呼叫 GAS `refreshQuestionBank`，由後台先同步 Google Sheets 題庫到 Firebase。
4. 同步完成後，講師端 `getPublicQuestions({ forceRefresh: true })` 會清除 sessionStorage 的 `vaccineGamePublicQuestions:*` 快取，再以 `no-store` 重新讀 Firebase。
5. GAS 已推送並更新既有正式 Web App deployment 到 `@67`，正式 `/exec` URL 不變。
6. 講師端 Firebase Hosting 已部署至 `https://tychbniis-32af5-instructor.web.app`，線上檢查已確認 `Instructor.html`、`app.js?v=0.6.3`、`api.js?v=0.6.3` 回應 `200`。
7. GAS `refreshQuestionBank` 已確認不是未知 action，且未帶管理密碼時會拒絕管理操作。
8. 本次未部署學員端 Hosting、Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.6.2 交接補充：第 6 版定版與題庫入口

1. 第 6 版定版版本為 `0.6.2`。
2. 講師端 `frontend/instructor/dist/Instructor.html` 與 `index.html` 在題目控制區新增「建立／編輯題庫」按鈕。
3. 講師輸入管理密碼後，`frontend/instructor/dist/app.js` 會呼叫 GAS `getQuestionBankInfo`，取得正式 Google Sheets 題庫連結。
4. GAS `getQuestionBankInfo` 會建立或更新「題庫欄位說明」工作表，欄位以中文顯示，包含系統欄位、必填狀態、範例、可填內容與說明。
5. 題庫主表仍保留 `questionId`、`order`、`type` 等英文系統欄位，避免破壞 `readQuestionRows()`、`buildOptions()` 與既有計分流程；中文說明以說明工作表與欄位備註提供。
6. GAS 已推送並更新既有正式 Web App deployment 到 `@66`，正式 `/exec` URL 不變。
7. 講師端 Firebase Hosting 已部署至 `https://tychbniis-32af5-instructor.web.app`。
8. 線上檢查已確認講師端載入 `0.6.2`，頁面有「建立／編輯題庫」按鈕；GAS `getQuestionBankInfo` 已不是未知 action，且未帶管理密碼時會拒絕管理操作。
9. 本次未部署學員端 Hosting、Cloud Functions、Firestore rules 或 Realtime Database rules。
10. `clasp run setupGameSheets` 因 Apps Script API executable 設定限制無法直接執行；中文欄位說明會在講師按鈕呼叫 `getQuestionBankInfo` 或後續執行 `setupGameSheets` 時建立。

## 0.6.1 交接補充：加倍卡紀錄顯示

1. 本次只修正學員端顯示，不變更 GAS 計分。
2. `frontend/student/dist/app.js` 的 `getItemUseLogSummary()` 會依加倍卡狀態顯示：
   - 尚未套用：`等候下一題結果，已使用`
   - 已套用：`第 N 題 加倍分，已套用 +X 分`
   - 無下一題或已進入系統結算仍未套用：`無下一題，未加分`
3. `markItemUseApplied()` 原本已寫入 `appliedQuestionId` 與 `effectScore`，本次修正重點是讓道具使用紀錄正確讀取這些欄位。
4. 已部署學員端 Firebase Hosting，正式網址仍為 `https://tychbniis-32af5-student.web.app`。
5. 本次未部署 GAS Web App、講師端 Hosting、Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.6.0 交接補充：關題序號計分

1. 第 6 版計分以「第 N 次關題」為主，不以題目題號排序為主。講師可不照題號順序出題。
2. 學員端寫入 Firebase `itemUses` 時會帶：
   - `usedAfterQuestionId`
   - `usedAfterQuestionSequence`
   - `settleAtCloseSequence`
3. 第 1 次關題計分時只處理第 1 題回答分；第 2 次關題計分時處理第 2 題回答分，並同步第 1 次關題後使用、應於第 2 次關題結算的道具分。
4. GAS `syncFirebaseItemUsesForFinalSettlement()` 會用 `settleAtCloseSequence` 過濾 pending 道具，避免道具在同一次關題被提早同步。
5. 加倍卡的 `next:` 目標題會依實際開題次序解析，不依題號大小解析。
6. `道具紀錄` 新增欄位：`usedAfterQuestionId`、`usedAfterQuestionSequence`、`settleAtCloseSequence`。既有資料不會刪除，舊資料缺少序號時仍保留相容行為。
7. `scoreClosedQuestionNow()` 仍只同步本題 `answers`，不掃描整場 answers；道具狀態更新改為整批寫回 Sheet，降低 200 人遊戲時逐格寫入造成的延遲。
8. 若講師誤觸同一題關題 2 次，GAS 與本機端都以去重後的 `openedQuestionIds` 判斷次序；同一題號不會讓關題次序增加。

## 0.6.0 部署紀錄

1. 部署日期：2026-05-29。
2. Git commit：`c42f26c`。
3. GAS 已推送並更新既有穩定 Web App deployment 至 `@65`。
4. `clasp deploy` 曾另外建立 `@64`，但前端未使用該新 URL；正式使用仍是既有穩定 Web App URL。
5. Firebase Hosting 已部署學員端與講師端。
6. 線上檢查：
   - 學員端 `https://tychbniis-32af5-student.web.app` 回應 `200`，已載入 `0.6.0`。
   - 講師端 `https://tychbniis-32af5-instructor.web.app/Instructor.html` 回應 `200`，已載入 `0.6.0`。
   - 投影端 `https://tychbniis-32af5-instructor.web.app/Display.html` 回應 `200`，已載入 `0.6.0`。
   - GAS `getGameState` 回應 `ok:true`。
   - Playwright smoke test 無 page error / console error。

# 第 5 版定版狀態

定版日期：2026-05-29

定版版本：`0.5.24`

定版 commit：`f270e52`

GAS Web App deployment：`@63`

第 5 版定版文件：`docs/18_v5_final_release.md`

後續維護請先閱讀本文件、`CHANGELOG.md` 與 `docs/18_v5_final_release.md`。若只是修正錯誤，版本號從 `0.5.25` 之後延續；若要新增大型玩法或流程，建議另開第 6 版。

# 0.5.24 交接補充：道具使用與計分同步

1. 學員端道具使用由 `frontend/student/dist/app.js` 的 `getItemUseWindow()` 控制，目前只有 `question_closed` 與 `finalizing_countdown` 可使用，`question_open` 一律不開放。
2. 學員端使用加分卡、挑戰卡、翻身卡時，只寫入 Firebase `itemUses`，不主動呼叫 GAS 重算排行榜。
3. GAS 只在講師關題計分 `scoreClosedQuestionNow()`、舊流程 `closeAndScoreQuestion()`、`finalizeCompetition()` 與 `getFinalResults()` 同步 pending 道具使用並重算排行榜。
4. `syncFirebaseItemUsesForFinalSettlement()` 會整理所有 pending itemUses 的題號，再逐題呼叫 `syncFirebaseItemUsesForQuestionToSheet()`。
5. `syncFirebaseItemUsesForQuestionToSheet()` 同步完成後會把 Firebase itemUse 標記為 `synced`，避免下一次重複計分。
6. 空寶箱只保留趣味回應與「沒有取得道具」概念，不再顯示「不扣分」。

# 疫苗守護戰隊挑戰賽 AI 交接文件

## 0.5.23 挑戰卡、寶箱分配與個人獎牌修正
1. 挑戰卡數字牌改用 `challenge-number-v523-0.png` 至 `challenge-number-v523-9.png`，每張牌四邊保留透明安全距離，避免切到旁邊卡片。
2. 學員端挑戰卡流程在 `frontend/student/dist/app.js`：選大或選小後顯示 0 至 9 依序亮起的 HTML 動畫，可手動停止或 5 秒自動停止，停在預設號碼 3 秒後自動結算。
3. 挑戰卡結算畫面會顯示成功或失敗圖，以及抽中的數字牌；不猜直接結算，不顯示數字牌。
4. GAS `grantTreasureBoxes` 恢復為只啟用講師點選的追加寶箱箱號，不再自動啟用前面箱號。
5. 學員端 `parseEnabledSlots()` 只讀 `additionalTreasureBoxSlots`，不再用 `additionalTreasureBoxLevel` 補齊前面箱號。
6. 追加寶箱與落後寶箱都改用 `drawWeightedItem()`，種子包含場次、玩家、箱號或戰隊，依寶箱權重抽取內容物，避免全員一致。
7. 落後寶箱仍保留固定種子 30% 發放率；通過率判斷與內容物抽取是兩個不同種子。
8. 個人排行改用 `award-player-medal-v523-1.png` 至 `award-player-medal-v523-5.png` 獎牌，第 1 至第 5 名依序為彩色、紫、金、銀、黃，中央數字放大。
9. 新獎牌同步建立於 `student`、`instructor`、`shared` 三份 assets；學員端與投影端已改讀新檔名。
10. 挑戰卡抽號動畫高亮樣式在 `frontend/student/dist/styles.css`，目前使用藍色對比底與外框顯示移動中的卡片，停住結果使用綠色確認狀態；`index.html` 的 CSS 查詢參數為 `0.5.23-highlight1`，不更動 `clientVersion`，避免學員被登出。
11. 結算後學員端 `updateLocalScoreSummary()` 會以後端最終分數為準，不再用本機估算分數與後端分數取最大值，避免頂欄個人積分與排行榜不同。
12. GAS `getFinalResults()` 已改為只讀取已結算結果，不再於每位學員讀取最後成績時重跑 Firebase 同步與排行榜重算，避免非第 1 名學員觸發空範圍錯誤。
13. 學員端 `index.html` 的快取參數更新為 `0.5.23-finalscore1`，不更動 `clientVersion`，避免學員被登出。
14. GAS Web App deployment 更新為 `@59`；Firebase Hosting 已部署。
15. 還原方式：回退本次 `0.5.23` commit，重新部署 Firebase Hosting；若需還原 GAS，將 Web App deployment 回退至 `@58`。

## 0.5.20 講師端入口與個人獎盃修正
1. 修正講師端根網址 `/` 與 `/Instructor.html` 顯示內容不一致的問題。根網址現在同樣包含第 1 箱至第 5 箱追加寶箱按鈕，以及落後寶箱戰隊選擇與啟用按鈕。
2. 個人排名第 1 名至第 5 名獎盃 PNG 已重製為透明背景，並移除綠色底圖元素；同步更新 `student`、`instructor`、`shared` 三份 assets。
3. 本版未修改 GAS 邏輯，GAS Web App deployment 維持 `@57`。只需部署 Firebase Hosting。
4. 還原方式：回退本次 `0.5.20` commit，重新部署 Firebase Hosting。

## 0.5.19 寶箱開關與排行榜修正
1. 追加寶箱改為講師端 5 個明確按鈕，第 1 箱至第 5 箱各自啟用。GAS `grantTreasureBoxes` 接收 `grantType: "additional"` 與 `slot`，只更新 `gameState.additionalTreasureBoxSlots`、`additionalTreasureBoxLevel`、`additionalTreasureBoxUpdatedAt`。
2. 為避免學員端被誤判為新場次，追加寶箱與落後寶箱啟用時不再更新 `gameState.updatedAt`。學員端 `isSavedPlayerStale()` 已補上同一 `sessionStartedAt` 不清除玩家資料的保護。
3. 新增落後寶箱：講師端選擇戰隊後呼叫 `grantTreasureBoxes`，帶入 `grantType: "lagging"` 與 `teamId`。GAS 只更新 `laggingTreasureBoxTeams` 與 `laggingTreasureBoxUpdatedAt`，不逐筆寫入玩家寶箱，避免等待大量運算。
4. 學員端收到 Firebase 公開狀態後，依本機固定種子建立追加寶箱與落後寶箱；晚加入的學員也會依已啟用狀態取得對應寶箱。
5. 已重新處理 `item-chest-closed.png` 與 `award-player-rank-1..5.png` 的亮綠色鍵色，三份資產路徑 `student`、`instructor`、`shared` 都已同步。
6. 投影端排行榜與結算排行榜文字已放大，學員端排行榜彈窗的「更新」按鈕移到標題列，避免文字與按鈕卡位。
7. 版本更新為 `0.5.19`，已部署 GAS Web App deployment `@57` 與 Firebase Hosting。
8. 還原方式：回退本次 `0.5.19` commit，重新部署 Firebase Hosting；若 GAS 已部署，將 Web App deployment 切回上一版 `@56`。

## 0.5.18 取消試玩功能與追加寶箱優化

1. 本版移除 `0.5.17` 的「開放試玩題」與「清除試玩紀錄」功能，原因是試玩題使用 `trial_` 題號會增加正式題外的狀態分支，並造成學員端清除後被判定為需重新報到的風險。
2. 正式操作改回保守流程：若講師需要試玩，請在題庫自行放入試玩題，試玩後使用原本「清空測試資料」，重新載入後再開始正式題。
3. 講師端保留追加寶箱需求，但按鈕改為「啟用追加寶箱」。GAS 只更新 `gameState.additionalTreasureBoxLevel` 與 `additionalTreasureBoxUpdatedAt`，不再逐一寫入每位學員的 Google Sheets 寶箱紀錄。
4. 學員端看到 `additionalTreasureBoxLevel` 後，會依本機預先定義的第 1 至第 5 個追加寶箱補入未開啟寶箱；後報到的學員也會依目前層級取得已啟用的追加寶箱。
5. 個人排名第 1 至第 5 名圖示與未開啟寶箱圖示已移除綠幕底色，學員端排行榜圖示尺寸縮小，避免圖示互相裁切。
6. 學員端自由選隊隊名改為上 2 字、下 3 字顯示，避免「隊」字單獨換行。
7. 版本更新為 `0.5.18`，已部署 GAS Web App deployment `@56` 與 Firebase Hosting。
8. 還原方式：回退本次 `0.5.18` commit，重新部署 Firebase Hosting；若 GAS 已部署，將 Web App deployment 切回 `@54`。

## 0.5.17 試玩題與即時發送寶箱

1. 講師端 `Instructor.html` 與 `index.html` 已新增「開放試玩題」、「發送寶箱」、「清除試玩紀錄」。
2. `openTrialQuestion` 會把講師選定的正式題建立成 `trial_` 題號，發布到 Firebase `gameState.publicQuestion`，但不列入正式已開題清單。
3. 學員端看到 `isTrial` 或 `trialMode` 時，會改呼叫 GAS `submitTrialAnswer`，答對後立即計分並取得 1 個待開啟寶箱。
4. `grantTreasureBoxes` 會對所有已報到且非電腦學員發送 1 個寶箱，並透過 Firebase `treasureGrantId` 讓學員端補入本機寶箱。
5. `clearTrialData` 只清除試玩造成的答題紀錄、試玩寶箱、試玩道具使用紀錄與分數影響，不清正式玩家、正式題庫與正式寶箱。
6. 清除試玩紀錄後，GAS 會重算玩家分數與排行榜，並把場次狀態回到 `created`，讓講師可直接進入正式題。
7. 已執行 `clasp push`，並將正式 GAS Web App deployment 更新到 `@54`。
8. 已部署 Firebase Hosting；線上學員端與講師端已載入 `0.5.17`。
9. 還原方式：回退本次 `0.5.17` commit，重新部署 Firebase Hosting，並將 GAS Web App deployment 切回上一個穩定版本 `@53`。

## 0.5.16 學員端結算、道具文字與排行榜修正

1. 學員端道具清單與道具使用紀錄改為短文案，分數效果移到卡片右側標籤顯示，例如「挑戰卡 +10 分」、「空寶箱 +0 分」。
2. 加倍卡使用紀錄修正為「已裝備，下題答對 x2」或「無下一題，未加分」，不再誤用空寶箱文字。
3. 挑戰卡彈窗改為單欄排版，縮短猜大、猜小與不猜說明，避免手機上文字卡到按鈕。
4. 挑戰結果卡改為滿寬像素風結果卡，避免偏左且不符合像素風。
5. 學員端排行榜只顯示必要資訊：戰隊名稱、積分、個人前 5 名與所屬戰隊，並加入序位獎盃圖示。
6. 競賽結算後，學員端會隱藏作答區，只保留最後成績與道具使用紀錄；讀取最終結果時會同步更新頂欄個人分數。
7. 本版只修改前端顯示，不修改 GAS；已部署 Firebase Hosting，線上學員端確認載入 `0.5.16`。

## 0.5.15 講師端確認視窗修正

1. 講師端結算競賽、清空測試資料與重新開題，已由瀏覽器原生 `confirm()` 改為遊戲內像素風確認視窗。
2. 本次修正避免講師操作時出現瀏覽器網址提示，讓講師端與學生端確認流程的視覺語言一致。
3. 新增的確認視窗由 `frontend/instructor/dist/app.js` 動態產生，不新增後端 API，不修改 GAS 計分邏輯。
4. `frontend/instructor/dist/styles.css` 新增對話框、遮罩、危險操作提示與按鈕排列樣式。
5. 前端版本、快取參數、`package.json`、`package-lock.json` 與 `app/config/modules.json` 已更新到 `0.5.15`。
6. 本版已部署 Firebase Hosting，線上講師端與投影端已載入 `0.5.15`；本版不需推送 GAS。

## 0.5.14 講師端初始化、挑戰卡揭曉與標籤置中修正

1. 講師端重新載入時會向 GAS 查詢目前場次狀態；若狀態為 `draft`，會清除本機「已啟動」旗標並直接回到「啟動場次」頁面。
2. 講師端流程標題移除數字標號，顯示為「啟動場次」與「題目控制」。
3. 學生端成就狀態標籤改用水平與垂直置中的 flex 排版，改善「已領取」與「進行中」視覺對齊。
4. 挑戰卡抽號後不再立即跳成功或失敗；改為先顯示抽中號碼，讓學員點「揭曉結果」，或等待 5 秒自動顯示結果。
5. 前端版本、快取參數、`package.json`、`package-lock.json` 與 `app/config/modules.json` 已更新到 `0.5.14`。
6. Firebase Hosting 已部署；GAS Web App 已部署到既有 deployment `@53`。

## 0.5.13 遊戲確認視窗、寶箱機率與全對獎區塊修正

1. 學生端送出答案與放棄創作，已由瀏覽器原生 `confirm()` 改為遊戲內像素風確認視窗，避免瀏覽器標題列顯示網址。
2. 寶箱獎勵機率更新為空寶箱 5%、翻身卡 5%、挑戰卡 20%；同步調整 `data/` 範例、學生端靜態抽獎與 GAS 預設規則。
3. 翻身卡抽取限制改為每位學員最多 1 張；同隊第 2 次使用翻身卡時，效果分數為 +10 分。
4. 投影端結算獎項區塊允許換行與內容高度延展，避免全對獎名單人數較多時被裁切。
5. 前端版本、快取參數、`package.json`、`package-lock.json` 與 `app/config/modules.json` 已更新到 `0.5.13`。
6. 驗證方式：`node --check frontend/student/dist/app.js`、`node --check frontend/instructor/dist/display.js`、`node --check frontend/instructor/dist/app.js`、`npm run check:functions`。
7. 還原方式：回退本次 `0.5.13` commit，重新部署 Firebase Hosting；若 GAS 已推送，需以同一 commit 前版本重新推送 GAS。

## 0.5.11 UI 文字、寶箱流程與投影端結算修正

1. 本版重點是依現場使用者視角精簡文案與修正視覺流程，不修改 GAS 資料表結構。
2. 初啟化遊戲維持既有 `resetGameData` 刪除本場舊資料流程，按鈕文案改為「清空測試資料」。本版不導入場次版本控制，原因是目前 GAS、Firebase 路徑、排行榜快照與前端本機快取仍以固定 `gameId` 為主要索引，直接改成多場次版本會牽涉資料模型與報表範圍。
3. 學員端自由選隊時會隱藏「進入報到」按鈕，輸入暱稱後直接點選戰隊完成報到。
4. 學員端作答、排行榜、寶箱與成就彈窗已移除偏系統內部的同步、後台、檔案與本機狀態描述。
5. 未開啟寶箱改用關閉寶箱圖；空寶箱開啟後會寫入道具使用紀錄，使用原本開箱圖示並顯示「空寶箱」。
6. 道具使用紀錄加入圖示並改成單行摘要；道具說明改為「可立即增加個人道具分 3 分」等使用者可讀文字。
7. 作答送出後改為「防線已部署，等待講師公布結果」畫面，不再顯示已不可修改的題目與選項。
8. 投影端結算畫面在 `finalized` 狀態會隱藏上方主視覺圖，避免幸運獎與全對獎被裁切；個人排名限制為前 5 名，並使用第 1 到第 5 名專用圖片。
9. 已確認挑戰卡存在於 `frontend/student/dist/app.js` 靜態寶箱權重、`data/v4_static_game_config.example.json` 與 `gas/Code.gs` 的 `TREASURE_ITEM_RATES`。
10. 前端版本、快取參數、`package.json`、`package-lock.json` 與 `app/config/modules.json` 已更新到 `0.5.11`。
11. 本版截圖位於 `screenshots/v5_0_5_11/`，包含自由選隊、送出作答、關閉寶箱、道具紀錄、成就與投影端結算畫面。
12. 驗證方式：`node --check frontend/student/dist/app.js`、`node --check frontend/instructor/dist/display.js`、`node --check frontend/instructor/dist/app.js`、`npm run check:functions`。
13. 還原方式：回退本次 `0.5.11` commit，重新部署 Firebase Hosting。GAS 未修改，無需回退 GAS deployment。

## 0.5.10 狀態顯示簡化修正

1. 本版重點是移除使用者指定不要出現的循環箭頭圖示與綠橘條紋等待動畫，不修改 GAS 計分邏輯。
2. 投影端「目前狀態」前方已不再顯示循環箭頭圖示。
3. 學員端、講師端與投影端的 `is-loading` 狀態不再產生 `::before` 圖示，且 `frontend/` 內已移除 `reload.svg` 靜態圖示檔。
4. 狀態文字下方不再顯示綠橘條紋進度條。
5. 講師端流程步驟的啟用狀態不再使用綠橘垂直條紋動畫，改為單色高亮。
6. 前端版本、快取參數、`package.json`、`package-lock.json` 與 `app/config/modules.json` 已更新到 `0.5.10`。
7. 驗證方式：`node --check frontend/student/dist/app.js`、`node --check frontend/instructor/dist/display.js`、`node --check frontend/instructor/dist/app.js`、`npm run check:functions`。
8. 需確認線上部署後，`https://tychbniis-32af5-instructor.web.app/Display.html` 的「目前狀態」前方沒有小圖示。

## 0.5.9 視覺資產、成就排版與挑戰卡圖像修正

1. 本版重點是視覺資產完整化與像素 UI 排版修正，不修改 GAS 計分邏輯。
2. 學員端戰隊顯示已改為真實隊名：冷鏈守護隊、安全接種隊、疫苗尖兵隊、衛教溝通隊、接種品質隊。
3. 成就頁每個成就都有獨立 GPT 像素圖示，並改成固定三欄排版，避免圖示、文字與狀態按鈕重疊。
4. 道具卡每種道具有獨立圖片，包含 +1、+3、+5、+10、加倍、翻身、挑戰與空箱。
5. 挑戰卡已補齊猜大、猜小、放棄猜測、0 到 9 抽號碼卡、成功、失敗、放棄結果圖。
6. 投影端排行榜獎盃規則為：第 1 名彩虹、第 2 名紫色、第 3 名金色、第 4 名銀色、第 5 名銅色。
7. 全對獎與幸運獎是獨立獎項圖，不與排名獎盃共用；全對獎使用勾選清單與皇冠，幸運獎使用幸運草、骰子與紫色獎盃。
8. 正式截圖在 `screenshots/v5_0_5_9/`。正式圖資在 `frontend/student/dist/assets/images/` 與 `frontend/instructor/dist/assets/images/`，來源拼圖保留於 `frontend/shared/assets/images/`。
9. 驗證方式：`node --check frontend/student/dist/app.js`、`node --check frontend/instructor/dist/display.js`、`node --check frontend/instructor/dist/app.js`、`npm run check:functions`。

## 0.5.8 學員體驗、像素圖示與翻身卡修正

1. 前端版本、快取參數、`package.json` 與 `app/config/modules.json` 已更新到 `0.5.8`。
2. 新增 `pixelarticons` npm 依賴，已將需要的 SVG 圖示複製到學員端與講師端靜態資源目錄。
3. 學員端報到、同步、送答等候狀態不再使用自轉方塊，改用 PixelArt Icons 圖示與條紋等候效果。
4. 學員答題區移除不必要圖片；右下快捷按鈕改為像素圖示按鈕。
5. 學員端分數列移除「道具加分」欄位，避免學員看到非必要計分欄位。
6. 成就清單每筆成就均有圖示，且「領取」、「已領取」、「進行中」、「完成」狀態已重新樣式化。
7. 挑戰卡已加入 0 到 9 抽號碼動畫，並提供成功、失敗、放棄猜測三種結果圖示。
8. 投影端已改為像素風格背景、卡片、選項、排行榜與獎項樣式。
9. 排行榜對使用者顯示正式隊名，例如「冷鏈守護隊」，不顯示 `team_1` 這類內部代碼。
10. GAS `useComebackItem()` 已修正翻身卡判定：只有唯一最後 1 名取得 30 分，非最後 1 名與並列最後名次取得 5 分。
11. 功能狀態快照位於 `screenshots/v5_0_5_8/`。
12. GAS 已推送並更新既有 Web App deployment 到 `@52`，描述為 `v0.5.8 comeback card fix 2026-05-27`。
13. Firebase Hosting 已部署完成，線上學員端、講師端與投影端均載入 `0.5.8` 前端資源。
14. 還原方式：回退本次 `0.5.8` commit，重新部署 Firebase Hosting，並用 `clasp deploy -i AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC` 指向上一個穩定版本。

## 0.5.7 第 5 版視覺優化收斂

1. 前端版本、快取參數、`package.json` 與 `app/config/modules.json` 已收斂到 `0.5.7`。
2. 第 5 版視覺優化已完成 `0.5.1` 至 `0.5.7` 的分段提交。
3. 本版未修改 GAS、Firebase rules、API、資料庫、計分規則或權限流程。
4. 回歸快照位於 `screenshots/v5_0_5_7/`。
5. Firebase Hosting 已部署完成，線上學員端、講師端與投影端均載入 `0.5.7` 前端資源。
6. 若要還原第 5 版視覺收斂，可從 Git 回退 `0.5.1` 至 `0.5.7` 相關 commit；後端不需回退。

## 0.5.6 戰隊識別與 RWD 視覺補強

1. 學員端戰隊選擇按鈕已依 `data-team-id` 套用隊伍色票。
2. `.art-slot` 已由美術占位改為 CSS 像素隊徽。
3. `showGameView()` 會把 `player.teamId` 同步到 `gameView.dataset.teamId` 與 `playerTeam.dataset.teamId`。
4. 分數列新增 `teamScore` 顯示道具加分，並調整手機與橫向版面。
5. 功能狀態快照位於 `screenshots/v5_0_5_6/`。

## 0.5.5 投影端排行榜與結算視覺

1. 投影端 `renderTeams()` 與 `renderPlayers()` 已為名次列加入 `display-rank-item` 與 `rank-*` class。
2. `rank-1`、`rank-2`、`rank-3` 分別對應冠亞季軍視覺樣式。
3. `renderAwards()` 已改為輸出 `award-card`，幸運獎與全對獎可用不同圖示呈現。
4. 本版沒有修改排行榜資料來源、計分公式或後端結算流程。
5. 功能狀態快照位於 `screenshots/v5_0_5_5/`。

## 0.5.4 講師端控制流程視覺

1. 講師端 `backendPanel`、`startPanel`、`questionPanel` 已加入 `flow-step` 階段 class。
2. `showPanel()` 會同步更新 `is-flow-active`、`is-flow-complete` 與 `modeBadge.dataset.stage`。
3. `modeBadge.dataset.mode` 會依 GAS 後端或示範模式切換。
4. 初始化遊戲資料按鈕已用危險操作樣式與其他主流程按鈕分開。
5. 功能狀態快照位於 `screenshots/v5_0_5_4/`。

## 0.5.3 後台回應等候動畫

1. 學員端、講師端與投影端已加入 `initializeLoadingStateObserver()`。
2. 該函式只監看既有狀態文字，不呼叫新 API，不修改 GAS 或 Firebase 規則。
3. 狀態文字包含「正在、讀取、等待、確認、送出、結算、同步、稍候」時，會自動加上 `is-loading`。
4. 對應 CSS 已加入像素風轉圈與條紋進度動畫。
5. 功能狀態快照位於 `screenshots/v5_0_5_3/`。

## 0.5.1 寶箱與道具視覺

1. 學員端寶箱與道具卡片已加入 CSS pixel icon。
2. 寶箱開啟時有 `is-opening` 搖晃動畫，移除時有 `is-opened` 淡出。
3. 道具依 `itemType` 產生 `item-type-*` class，後續可擴充圖示。
4. 快照位於 `screenshots/v5_0_5_1/`。

## 0.5.2 題目與答題回饋

1. 作答選項按鈕已加入 `data-option-id`，送出後套用 `is-selected` 與 `is-submitted`。
2. 答題結果訊息已加入答對、答錯、等待判定圖示。
3. 開發中曾因 Windows 檔案鎖定造成 HTML 編碼破壞，已從 Git 還原受影響前端檔案並重新套用修改。
4. 快照位於 `screenshots/v5_0_5_2/`。

1. 第 5 版已建立 `0.5.0` 視覺優化版，開發規格位於 `docs/ANTIGRAVITY_CODEX_FULL.md`。
2. 本版只處理前端顯示層：學生端、講師端、投影端的 pixel art 視覺、美術圖、短轉場、disabled 等候動作與 skeleton 類空狀態。
3. 新增素材：
   - `frontend/shared/assets/images/hero/v5-vaccine-hero.png`
   - `frontend/shared/assets/images/empty-states/v5-loading-empty.png`
   - `frontend/student/dist/assets/images/hero/v5-vaccine-hero.png`
   - `frontend/student/dist/assets/images/empty-states/v5-loading-empty.png`
   - `frontend/instructor/dist/assets/images/hero/v5-vaccine-hero.png`
   - `frontend/instructor/dist/assets/images/empty-states/v5-loading-empty.png`
4. 前端快取版號已更新為 `0.5.0`，`package.json` 與 `app/config/modules.json` 已同步。
5. GAS、Firebase rules、API 行為、題庫、計分規則、道具邏輯與結算流程均未修改，仍沿用第 4 版 `0.4.28` 邏輯。
6. 修改前備份位於 `backup/v5_visual_20260527/`。
7. 第 5 版紀錄位於 `docs/17_v5_visual_release.md`。
8. 視覺快照位於 `screenshots/v5_visual_review/`。

# 最近一次修改摘要：第 4 版定版
1. 第 4 版以 `0.4.28` 定版，定版文件位於 `docs/16_v4_final_release.md`。
2. 定版架構為靜態 HTML5 優先、低 GAS 呼叫、免費方案穩定版。
3. 學員端、講師手機端與大螢幕投影端皆由 Firebase Hosting 提供靜態頁面。
4. GAS Web App deployment 為 `@51`，保留遊戲啟動、作答去重、關題計分、排行榜快照、最後道具同步、幸運獎、全對獎與賽後報表。
5. Cloud Functions、Cloud Run、Blaze 未啟用。
6. `data/v4_static_game_config.example.json` 已重建為 `0.4.28` 可解析範本。
7. `app/config/modules.json` 模組狀態已改為 `v4_0_4_28_final`。
8. 定版後若要修改功能，應先以第 4 版維護版處理，不直接改動已定版紀錄。

# 最近一次修改摘要：0.4.28 結算倒數與道具紀錄顯示修正
1. 學員端道具紀錄改為：一般加分卡與挑戰卡等前端已立即加分的道具直接顯示「已套用」。
2. 加倍卡與翻身卡維持待套用流程，待下一題或後端確認後再轉為已套用。
3. GAS 新增 `startFinalSettlementCountdown`，講師按下結算後先發布 `finalizing_countdown` 公開狀態。
4. 投影端收到 `finalizing_countdown` 後顯示 15 秒最後道具使用倒數，倒數結束後顯示「講師結算成績中」。
5. 講師端按下結算後約 20 秒才正式呼叫 `finalizeCompetition`，保留最後道具送出與 Firebase 同步緩衝。
6. 版本已更新為 `0.4.28`，模組狀態為 `v4_0_4_28_final`。
7. GAS 已推送並部署到 Apps Script Web App deployment `@51`。
8. Firebase Hosting 已部署，學員端、講師端與投影端線上頁面皆載入 `0.4.28`。
9. 已完成線上 Playwright 載入檢查；線上 GAS `getGameState` 回應 `ok:true`。

# ?????????0.4.23 ????????????
1. ????????? Firebase ? GAS ?????? Firebase ??????? GAS ?????????? GAS ?????
2. ???????????????????? `question_closed` ??????????
3. ?????? 0 ?????????????????????????
4. ??????????????????????
5. ????????????
6. ????? `0.4.23`?

# ?????????0.4.22 ???????????
1. 2026-05-26 ??? GAS?Apps Script Web App deployment ??? `@45`?
2. 2026-05-26 ??? Firebase Hosting???????????????????? `0.4.22`?

# ?????????0.4.22 ???????????
1. 2026-05-26 ?????????????????????????????????????
2. ?????????? 1 ??????????????????????????????????????????
3. GAS ?? `gameSessionSeed`???????????????
4. Firebase `gameState/{gameId}` ??? `gameSessionSeed`???????????????
5. ??????????????????????????????????
6. ????? `0.4.22`?

# 最近一次修改摘要：0.4.21 場次隔離與個人排行榜秒數修正

1. 2026-05-26 依使用者回報修正學員端沿用上一場資料、關題後未正確本機結算、成就與寶箱沿用上一場的問題。
2. GAS 場次狀態新增 `sessionStartedAt`，初始化或開啟場次時建立，後續開題、關題與結算沿用。
3. Firebase `gameState/{gameId}` 會發布 `sessionStartedAt`，供學員端判斷是否為新場次。
4. 學員端本機答案、道具、寶箱、成就資料 key 改用 `sessionStartedAt`，並停止跨場次自動搬移舊 localStorage 資料。
5. 學員端若發現本機報到資料與目前 `sessionStartedAt` 不一致，會清除舊報到並要求重新報到。
6. GAS 個人排行榜新增 `totalResponseSeconds`，學員端與投影端個人排名會顯示作答總秒數。
7. 版本更新為 `0.4.21`。

# 最近一次部署摘要：0.4.21 場次隔離與個人排行榜秒數修正
1. 2026-05-26 已部署 GAS，Apps Script Web App deployment 更新為 `@44`。
2. 2026-05-26 已部署 Firebase Hosting，學員端、講師手機端與大螢幕投影端皆載入 `0.4.21`。
3. 線上確認：
   - 學員端：`https://tychbniis-32af5-student.web.app`
   - 講師手機端：`https://tychbniis-32af5-instructor.web.app/Instructor.html`
   - 大螢幕投影端：`https://tychbniis-32af5-instructor.web.app/Display.html`
4. 已確認 `app.js?v=0.4.21` 與 `display.js?v=0.4.21` 皆包含 `sessionStartedAt` 或 `totalResponseSeconds` 修正。

# 最近一次修改摘要：0.4.20 投影狀態、均衡分隊與累積成就修正

1. 2026-05-26 依使用者回報修正投影端、分隊與成就問題。
2. 投影端 `Display.html` 不再呈現題目倒數，改在原倒數位置顯示「已開題」、「已關題」、「已結算」。
3. 學員端 Firebase 快速報到改為讀取 `players/{gameId}` 後選擇目前人數最少的戰隊，人數相同時用裝置種子分散。
4. 學員端本機作答、道具、寶箱與成就資料 key 改用穩定場次 key，不再依賴會隨開題、關題改變的 `updatedAt`。
5. 關題公布答案後會立即重算本機成就與紅點，修正累積答對成就停在 `0 / 3` 或 `0 / 5` 的問題。
6. 版本更新為 `0.4.20`。

# 最近一次修改摘要：0.4.19 開題同步 Firebase 修正

1. 2026-05-26 依使用者回報修正「講師已開題，但投影端仍顯示等待開題」。
2. 根因：`closeQuestionAndRevealAnswer()` 關題時會呼叫 `publishGameStateToFirebase()`，但 `openQuestion()` 開題時只更新 GAS 狀態，未同步 Firebase。
3. 修正：`openQuestion()` 參考關題流程，開題後同步寫入 Firebase `gameState/{gameId}`，包含 `status: question_open`、`currentQuestionId`、`questionOpenedAt`、`openedQuestionIds` 與 `publicQuestion`。
4. 投影端保留 GAS fallback：若 Firebase 仍停在 `draft` 或 `created`，會補讀 GAS 目前狀態與目前題目，避免既有場次卡住。
5. 版本更新為 `0.4.19`，部署後需確認 `Display.html` 載入 `display.js?v=0.4.19`。

# 最近一次修改摘要：0.4.18 投影端輪詢、版面與連續成就修正

1. 學員端 `itemUseLogDetails` 預設隱藏，`showGameView()` 報到後才顯示，避免登入畫面先看到道具使用紀錄。
2. 大螢幕投影端輪詢改為最多 1.5 秒一次，且讀取 Firebase REST 時加 `_ts`，避免快取造成開題後不更新。
3. 投影端在 `question_open` 與 `question_closed` 狀態會確認目前題目是否已在 `publicQuestions` 快取中；缺少時會強制重讀題庫。
4. 連續答對成就使用目前連續題數顯示進度，未完成前失敗會歸零；若曾達成門檻，該門檻維持完成。
5. 投影端排行榜與結算畫面字級、間距與列數縮小，避免戰隊排行與得獎名單被切掉。

# 前一次修改摘要：0.4.17 投影端、挑戰卡與成就修正

1. 投影端開題後會立即顯示已開題提示、題目與選項；關題後在原選項上以紅框標示正確答案，並在下方顯示解析。
2. 投影端 CSS 已改為固定 `100vh` 投影版面，避免頁面向下或向右捲動。
3. 學員端挑戰卡結果保留在彈窗內顯示，並修正「猜?」亂碼。
4. 學員端道具使用紀錄修正亂碼，挑戰卡顯示為已套用，不再顯示待套用。
5. 成就系統移除幸運箱得主項目，幸運獎改維持最終結算處理。
6. 全對獎改為所有正式題目皆已作答且無錯題才成立；連續答對獎改依正式題目順序檢查，錯題或未答會中斷。
7. 成就完成後進度會鎖定在目標值，例如 `3 / 3`。

# 前一次修改摘要：0.4.16 大螢幕、作答彈窗與道具規則

1. 大螢幕端 `Display.html` 會讀取 `publicQuestions/{gameId}` 補齊目前題目，解決開題後題目不更新。
2. 大螢幕端結算後隱藏即時題目與排行榜，只顯示戰隊排名、個人排名、幸運獎、全對獎。
3. 學員端作答改為彈窗選項，倒數在彈窗內，送出後頁面顯示已選答案與花費秒數。
4. 道具使用紀錄移到回答頁最下方 `details` 區塊，可自行展開或收合。
5. 挑戰卡改為前端猜大小，不呼叫 GAS 判定；0 到 4 為小，5 到 9 為大。
6. `publishScoreboardSnapshotToFirebase()` 新增 `awards` 欄位，供大螢幕結算顯示得獎名單。

# 最近一次部署摘要：0.4.20 投影狀態、均衡分隊與累積成就修正

1. 2026-05-26 已部署 Firebase Hosting，學員端、講師端與投影端皆載入 `0.4.20`。
2. 本次未修改 GAS 主程式，Apps Script Web App 維持 deployment `@43`。
3. 線上確認：
   - 學員端：`https://tychbniis-32af5-student.web.app`
   - 講師手機端：`https://tychbniis-32af5-instructor.web.app/Instructor.html`
   - 大螢幕投影端：`https://tychbniis-32af5-instructor.web.app/Display.html`
4. 已確認 `api.js?v=0.4.20`、`app.js?v=0.4.20`、`display.js?v=0.4.20` 均回應 `200` 且包含本次修正函式。

# 最近一次部署摘要：0.4.19 開題同步 Firebase 修正

1. 2026-05-26 已將 GAS 推送至 Apps Script，Web App deployment 更新為 `@43`。
2. 2026-05-26 已將 `0.4.19` 提交至 GitHub `main`，commit hash 以 `git log -1 --oneline` 為準。
3. 2026-05-26 已部署 Firebase Hosting，學員端、講師端與投影端皆載入 `0.4.19`。
4. 線上確認：
   - 學員端：`https://tychbniis-32af5-student.web.app`
   - 講師手機端：`https://tychbniis-32af5-instructor.web.app/Instructor.html`
   - 大螢幕投影端：`https://tychbniis-32af5-instructor.web.app/Display.html`
5. Playwright 未執行，原因是本專案未安裝 `playwright` 套件；已用 HTTP 載入檢查與語法檢查替代。

# 最近一次部署摘要：0.4.18 投影端輪詢、版面與連續成就修正

1. 2026-05-26 已將 `0.4.18` 推送至 GitHub `main`，提交為 `734f795`。
2. 已部署 Firebase Hosting：學員端與講師端。
3. 本次未修改 GAS，GAS Web App 維持 deployment version `42`。
4. 線上入口：
   - 學員端：`https://tychbniis-32af5-student.web.app`
   - 講師手機端：`https://tychbniis-32af5-instructor.web.app/Instructor.html`
   - 大螢幕顯示端：`https://tychbniis-32af5-instructor.web.app/Display.html`
5. Playwright 已實際開啟 3 個線上頁面，均無 console error 與 page error。
6. 線上學員登入畫面的道具使用紀錄已隱藏。
7. 線上大螢幕端在 1366×768 檢查中無水平或垂直捲動，得獎名單位於可視範圍內。

# 前一次部署摘要：0.4.17 投影端、挑戰卡與成就修正

1. 2026-05-26 已將 `0.4.17` 推送至 GitHub `main`，提交為 `96252af`。
2. 已部署 Firebase Hosting：學員端與講師端。
3. 本次未修改 GAS，GAS Web App 維持 deployment version `42`。
4. 線上入口：
   - 學員端：`https://tychbniis-32af5-student.web.app`
   - 講師手機端：`https://tychbniis-32af5-instructor.web.app/Instructor.html`
   - 大螢幕顯示端：`https://tychbniis-32af5-instructor.web.app/Display.html`
5. Playwright 已實際開啟 3 個線上頁面，均無 console error 與 page error。
6. 大螢幕顯示端在 1366×768 檢查中無水平或垂直捲動。

# 前一次部署摘要：0.4.16 大螢幕、作答彈窗與道具規則

1. 2026-05-25 已將 `0.4.16` 推送至 GitHub `main`，提交為 `f5d3325`。
2. 已推送 GAS 並更新既有 Web App deployment 到 version `42`，正式 URL 不變。
3. 已部署 Firebase Hosting：學員端與講師端。
4. 線上入口：
   - 學員端：`https://tychbniis-32af5-student.web.app`
   - 講師手機端：`https://tychbniis-32af5-instructor.web.app/Instructor.html`
   - 大螢幕顯示端：`https://tychbniis-32af5-instructor.web.app/Display.html`
5. Playwright 已實際開啟 3 個線上頁面，均無 console error 與 page error。
6. 大螢幕端在目前已結算狀態下，已確認隱藏目前題目與即時排行榜，只顯示結算畫面。

# 前一次部署摘要：0.4.15 道具紀錄與講師端拆頁

1. 2026-05-25 已將 `0.4.15` 推送至 GitHub `main`，提交為 `b397f5b`。
2. 已部署 Firebase Hosting：學員端與講師端。
3. 線上入口：
   - 學員端：`https://tychbniis-32af5-student.web.app`
   - 講師手機端：`https://tychbniis-32af5-instructor.web.app/Instructor.html`
   - 大螢幕顯示端：`https://tychbniis-32af5-instructor.web.app/Display.html`
4. Playwright 已實際開啟 3 個線上頁面，均無 console error 與 page error。
5. 本次未部署 GAS，GAS Web App 維持既有版本。

# 最近一次修改摘要：0.4.15 道具紀錄與講師端拆頁

1. 學員端回答頁新增 `answerItemUseCountdown`、`answerPageNotice`、`itemUseLog`。
2. 道具使用紀錄來源為本機 `vaccineGameQueuedItemUses:*`，顯示加分卡、加倍卡、翻身卡、挑戰卡的使用狀態。
3. 加倍卡與翻身卡由前端套用到 `itemBonusScore`；挑戰卡自 `0.4.16` 起改為前端猜大小，不再交由 GAS 比較戰隊完成率。
4. 結算獎項顯示已把 `perfect_candidate`、`lucky_box` 等內部代碼轉成中文。
5. 講師端新增 `Instructor.html` 與 `Display.html`，舊 `index.html` 保留相容。
6. 本次未修改 GAS。

# 最近一次部署摘要：0.4.14 學員端模組載入修正

1. 2026-05-25 已將 `0.4.14` 推送至 GitHub `main`，提交為 `67281e8`。
2. 已部署 Firebase Hosting，線上學員端載入 `config.js?v=0.4.14`、`app.js?v=0.4.14`、`static-v4.js?v=0.4.14`。
3. Playwright 實測線上學員端 console 無錯誤，原 `Identifier 'buildAchievementDefinitions' has already been declared` 已消失。
4. 本次未修改 GAS，GAS Web App 維持 deployment version `41`。

# 最近一次修改摘要：0.4.14 學員端模組載入修正

1. 問題原因：實際用 Playwright 開啟線上學員端後，瀏覽器 console 顯示 `Identifier 'buildAchievementDefinitions' has already been declared`。因學員端以 ES module 載入，重複宣告會使整個 `app.js` 中斷，導致報到與重整進入邏輯都不會執行。
2. 修正方式：移除重複宣告衝突，保留完整成就規則合併邏輯，並將快取版本統一為 `0.4.14`。
3. 影響範圍：學員端啟動、報到、重整恢復與成就清單初始化。未修改 GAS。
4. 測試狀態：本機 Playwright 開啟學員端無 console 錯誤；GAS 目前為 `draft`，畫面正確顯示等待講師啟動。

# 最近一次部署摘要：0.4.13 學員端開局與監看機制強化 (Lag Protection)

1. 2026-05-25 已將 `0.4.13` 推送至 GitHub `main`。
2. 已部署 Firebase Hosting，學員端與講師端線上 HTML 均已載入 `app.js?v=0.4.13` 與 `config.js?v=0.4.13`。
3. 本次強化前端開局狀態讀取邏輯並加入監看防踢機制，未修改 GAS，GAS Web App 維持 deployment version `41`。
4. 線上驗證結果：預期修正學員在 Firebase 延遲時無法進入遊戲或被誤踢的問題。

# 最近一次修改摘要：0.4.13 學員端開局與監看機制強化 (Lag Protection)

1. 問題原因：即使 `0.4.12` 加入了 GAS 備援，但若 GAS 呼叫失敗且 Firebase 仍為 `draft` 時，系統會錯誤回傳 `draft` 狀態；此外，後台監看迴圈（Watcher）若在開局後收到 Firebase 延遲的 `draft` 狀態，會將學員踢回報到頁。
2. 修正方式：
   - `getStartupGameState()`：當 Firebase 為 `draft` 但 GAS 失敗時，拋出明確網路錯誤而非回傳 `draft`。
   - `renderPublicGameState()`：加入 Staleness Check，如果收到的狀態是 `draft` 但目前已知狀態為非 `draft` 且新狀態更新時間較舊，則直接忽略該封包。
   - 預先更新 `latestPublicGameState`：在開局進入遊戲前即設定正確狀態，防止 Watcher 第一波讀取到舊資料。
3. 影響範圍：學員端進入遊戲穩定度與重整恢復流程。
4. 前端版本已更新為 `0.4.13`。

# 最近一次部署摘要：0.4.12 學員端重整進入修正

1. 2026-05-25 已將 `0.4.12` 推送至 GitHub `main`，提交為 `5debc26`。
2. 已部署 Firebase Hosting，學員端與講師端線上 HTML 均已載入 `app.js?v=0.4.12` 與 `config.js?v=0.4.12`。
3. 本次修正只改前端啟動狀態判斷，未修改 GAS，GAS Web App 維持 deployment version `41`。
4. 線上驗證結果：學員端回應 `200`、講師端回應 `200`、HTML 中文標題正常。

# 最近一次修改摘要：0.4.12 學員端重整進入修正

1. 問題原因：學員端重整時 `getStartupGameState()` 只要 Firebase 有回應就直接使用，若 Firebase `gameState` 仍是舊的 `draft`，就會誤判講師尚未開啟場次。
2. 修正方式：Firebase 狀態只有在不是 `draft` 時直接採用；若是 `draft`、空值或讀取失敗，會再查 GAS `getGameState`。
3. 影響範圍：只影響學員端開局、報到與重整恢復流程；本次未修改 GAS。
4. 前端版本已更新為 `0.4.12`，部署後需確認 HTML 載入 `app.js?v=0.4.12`。
# 最近一次部署摘要：0.4.11

1. GitHub `main` 已推送，程式修正提交為 `58e1b8e`。
2. GAS Web App 已更新既有正式 deployment 至 version `41`，正式 `/exec` URL 不變。
3. Firebase Hosting 已部署學員端與講師端。
4. 線上學員端與講師端皆回應 `200`，並載入 `app.js?v=0.4.11` 與 `config.js?v=0.4.11`。
5. 線上 HTML 中文標題正常。
6. GAS `getGameState` 回應 `ok:true`。
7. 下一次接手若要還原本次程式修正，可回退至 `8cfd49b`；GAS 可切回 deployment version `40`。
# 最近一次修改摘要：0.4.11 關題流程與本機狀態修正

1. 講師端關題會先顯示解答，並在背景呼叫 `scoreClosedQuestion` 結算成績與排行榜。
2. GAS `closeAndScoreQuestion` 現在只負責關題、寫入答案公布狀態與同步 Firebase，避免講師等待完整計分。
3. 學員端道具使用成功後會更新 localStorage 內的本機道具狀態為 `used`，重新開啟寶箱與道具面板時不會回到未使用。
4. 學員端成就清單合併靜態設定與保底項目，包含累積答對 10 題、連續答對 5 題、使用 3 張道具、幸運箱得主與個人全對。
5. GAS `finalizeCompetition` 不再掃描整場 Firebase answers；`syncFirebasePlayersToSheet` 與 `syncFirebaseAnswersForQuestionToSheet` 已改為批次寫入。
6. 若第 4 題開題仍卡住，優先檢查前一題背景 `scoreClosedQuestion` 是否回報錯誤，而不是重複按開題。
# 最近一次部署摘要：0.4.10

1. GitHub `main` 已推送，程式修正提交為 `ef6959b`。
2. GAS Web App 已更新既有正式 deployment 至 version `40`，正式 `/exec` URL 不變。
3. Firebase Hosting 已部署學員端與講師端。
4. 線上學員端與講師端皆回應 `200`，並載入 `app.js?v=0.4.10` 與 `config.js?v=0.4.10`。
5. GAS `getGameState` 回應 `ok:true`。
6. 下一次接手若要還原本次程式修正，可回退至 `e04fca6`；若只要還原部署紀錄文件，可回退本部署文件提交。
# 最近一次修改摘要：0.4.10 靜態前端重構修正

1. 第 4 版目前版本為 `0.4.10`。
2. 已修正 GAS 後段實際生效的 `recalculateScoreboard` 缺少 `validPlayerIds` 宣告，避免關題與結算競賽失敗。
3. 學員端登入後可用靜態設定建立本機寶箱計畫：`gameSeed + playerId + questionId` 決定是否獲得寶箱與內容物。
4. 一般開箱已改為前端本機處理；幸運箱開啟才呼叫 GAS `recordLuckyBoxOpened`。
5. 個人成就已改為前端本機計算與領取，領取後立即新增本機寶箱。
6. 道具 UI 已補使用說明，並維持前端即時體驗與後端延後確認。
7. 後續第 4 版應避免把一般開箱、個人成就、個人加分卡重新接回 GAS 即時流程。

# 最近一次修改摘要：0.4.9 部署

1. GitHub `main` 已推送至 commit `3f3b995`。
2. GAS 已更新既有正式 Web App deployment 至 version `39`，正式 `/exec` URL 不變。
3. Firebase Hosting 已部署學員端與講師端。
4. 線上學員端與講師端皆回應 `200`，且 HTML 已載入 `app.js?v=0.4.9` 與 `config.js?v=0.4.9`。
5. 線上學員端已包含道具倒數區塊；講師端已包含結算結果彈出頁。
6. GAS `getGameState` 回應 `ok:true`。
7. 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

# 最近一次修改摘要：0.4.9 線上測試回報修正

1. 第 4 版目前版本為 `0.4.9`。
2. 學員端本機答案與道具佇列 key 已加入場次 `updatedAt`，避免固定 `gameId` 在新場次沿用前一場本機積分。
3. 學員端送答後只暫存分數，等 Firebase 公開狀態變成 `question_closed` 後才把該題納入本機積分。
4. 學員端有低頻 Firebase watcher，但只處理關題、道具倒數、初始化過期與結算頁，不顯示講師即時開題提示。
5. 學員端道具使用會在關題後 3 分鐘內立即送出 Firebase `itemUses`，GAS 於下一次關題計分時同步套用。
6. 講師開題已跳過 Firebase `gameState` 寫入，學員按「翻開試卷」時若 Firebase 沒有開題狀態，會使用 GAS `getCurrentQuestion`。
7. 講師關題會在 `closeAndScoreQuestion` 同次完成 Firebase 作答同步、計分、排行榜重算與快照發布，不再依賴前端第二次呼叫 `scoreClosedQuestion`。
8. 關題計分不再為未作答玩家新增空白答案列，以降低 Google Sheets 寫入量。
9. 排行榜快照包含 `teams` 與 `players`，學員端可顯示個人排行。
10. 戰隊排行依 `finalScore` 總分排序，顯示總分、平均分、道具分、人數、整體正確率與當前題目正確率。
11. `getFinalResults` 已移除未定義 `questionId`，學員端結算頁可正常讀取；講師端結算後會顯示彈出式結算結果頁。

# 最近一次修改摘要：0.4.8 部署

1. GitHub `main` 已推送至 commit `9894e51`。
2. GAS 已更新既有正式 Web App deployment 至 version `38`，正式 `/exec` URL 不變。
3. Firebase Hosting 已部署學員端與講師端。
4. 線上學員端與講師端皆回應 `200`，且 HTML 已載入 `app.js?v=0.4.8` 與 `config.js?v=0.4.8`。
5. GAS `getGameState` 回應 `ok:true`。
6. 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

# 最近一次修改摘要：0.4.8 線上測試回報修正

1. 第 4 版目前版本為 `0.4.8`。
2. 學員端與講師端靜態資源版本參數已更新為 `0.4.8`，`clientVersion` 也更新為 `0.4.8`，用於清理舊快取與舊登入資料。
3. 講師端「關題公布」面板預設隱藏，開題後才顯示；關題流程會顯示「關題中」與「已關題結算成績」。
4. GAS `resetGameData` 會清除 Firebase Realtime Database 中該場次的 `players`、`answers`、`itemUses`、`treasureBoxOpenRequests`、`achievementClaimRequests`、創作票選暫存與 `publicScoreboards`，避免前一場資料殘留。
5. GAS `finalizeCompetition` 已改為第 4 版流程，不再執行創作題同步與創作票選加分。
6. 學員端不再輪詢講師開題狀態，只預載公開題庫；學員需依講師畫面提示後按「翻開試卷」。
7. 學員端送答成功後依第 4 版前端規則更新本機積分；若 Firebase 回覆 `HTTP 401` 或 `HTTP 403`，前端視為重複送出或規則阻擋處理，不再回退 GAS。
8. 學員端排行榜、寶箱與成就讀取時保留既有畫面，新資料載入完成後再置換，避免畫面先清空。
9. GAS `publicQuestionFromRow` 會輸出 `correctAnswer` 與 `explanation`，供第 4 版靜態計分與答案說明使用。這代表第 4 版接受課堂小遊戲的前端資料可見風險，暫不處理惡意改封包。

# 最近一次修改摘要：0.4.7 部署

1. 2026-05-25 已推送 GitHub `main`。
2. GAS 已推送並更新正式 Web App deployment 至 version `37`，正式 `/exec` URL 不變。
3. Firebase Hosting 學員端與講師端已部署。
4. 線上學員端與講師端皆回應 `200`，且 HTML 已載入 `app.js?v=0.4.7`。
5. GAS `getGameState` 回應 `ok:true`。
6. GAS `recordLuckyBoxOpened` 與 `recordPerfectAwardCandidate` 已確認不是未知 action。
7. 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

# 最近一次修改摘要：0.4.7

1. 第 4 版已完成 `0.4.1` 至 `0.4.7` 本機作業。
2. 新增檢查紀錄 `docs/15_v4_0_4_7_checklist.md`。
3. 已完成前端 JavaScript、GAS、JSON、Functions 與 diff 檢查。
4. 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。
5. 後續若要上線，需另行部署 Firebase Hosting 與 GAS Web App。

# 最近一次修改摘要：0.4.6

1. GAS `FIRST_CORRECT_BONUS` 已改為 `0`。
2. GAS 新增 `recordLuckyBoxOpened` 與 `recordPerfectAwardCandidate`。
3. 學員端開啟幸運箱時會嘗試回傳 GAS 紀錄。
4. 學員端送答判斷全對候選時會嘗試回傳 GAS 紀錄。
5. Firebase 開箱請求新增 `itemType`、`isLuckyBox` 與 `clientOpenId`。
6. 下一版應接續 `0.4.7`，做整體檢查、語法檢查與交接收斂。

# 最近一次修改摘要：0.4.5

1. 學員端排行榜維持浮動工具按鈕，開啟時才讀取 Firebase `publicScoreboards/{gameId}`。
2. 無排行榜快照時，畫面明確提示不呼叫 GAS 即時排行榜。
3. 已確認學員端沒有 `getScoreboard` 或 `getPlayerLeaderboard` 的 GAS 排行榜備援呼叫。
4. 下一版應接續 `0.4.6`，補 GAS 與 Firebase payload 對幸運箱、全對獎與首答加分取消的相容欄位。

# 最近一次修改摘要：0.4.4

1. 學員端新增關題後 3 分鐘道具使用期。
2. 道具排程資料新增 `clientItemUseId`、`effectScore` 與 `useWindowClosesAt`。
3. `requestFastItemUse` 會把第 4 版道具欄位寫入 Firebase `itemUses`。
4. 道具與挑戰卡超過 3 分鐘使用期時，前端會拒絕送出。
5. 下一版應接續 `0.4.5`，補排行榜快照讀取與浮動按鈕狀態檢查。

# 最近一次修改摘要：0.4.3

1. 學員端新增 `frontend/student/dist/static-v4.js`。
2. 學員端啟動時會優先嘗試讀取 `v4-static-config.json`，可先載入含答案的靜態題庫；若沒有該檔，仍保留既有 Firebase 公開題庫流程。
3. 學員送答會帶入 `clientSubmitId`、`responseSeconds`、本機正誤、基本分、題目分數與個人全對候選旗標。
4. `frontend/student/dist/api.js` 的 `submitFastAnswer` 已支援寫入上述第 4 版欄位。
5. 下一版應接續 `0.4.4`，處理關題後 3 分鐘道具使用期與道具送出欄位。

# 最近一次修改摘要：0.4.2

1. 新增 `data/v4_static_game_config.example.json` 作為第 4 版靜態資料格式範本。
2. 範本包含題庫答案、計分規則、寶箱機率、幸運箱限制、成就規則、道具使用期與重複送出鍵值。
3. `scoreRules.firstCorrectBonus` 固定為 `0`，符合第 4 版取消首答加分要求。
4. `itemUseRules` 自 `0.4.16` 起已將挑戰卡列入學員端可計算道具，`gasCalculatedItemTypes` 為空陣列。
5. 下一版應接續 `0.4.3`，把學員端靜態載入、預配寶箱與成就本機計算接上。

# 最近一次修改摘要：0.4.1

1. 第 4 版進入 `0.4.1`。
2. 學員端已移除創作題隊內初選與匿名全體投票畫面。
3. 講師端已移除創作題審核與投票操作入口。
4. 講師端題目清單會排除 `creative` 題型，示範題不再顯示 `demo_q011`。
5. 學員端排行榜改為浮動工具按鈕，點開時只讀 Firebase `publicScoreboards/{gameId}` 快照，不再回退 GAS 排行榜 API。
6. 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。
7. 下一版應接續 `0.4.2`，建立第 4 版靜態資料格式與題庫、答案、機率表、成就規則的載入規格。

# 最近一次修改摘要：第 3 版定版

1. 第 3 版以 `0.3.22` 定版。
2. 定版文件位於 `docs/13_v3_final_release.md`。
3. 效能收斂文件位於 `docs/tasks/OPTIMIZATION_PLAN_0.3.21.md`。
4. 學員端 Hosting：https://tychbniis-32af5-student.web.app。
5. 講師端 Hosting：https://tychbniis-32af5-instructor.web.app。
6. GAS Web App deployment：version `36`。
7. 定版後仍維持免費方案，不啟用 Cloud Functions、Cloud Run、Blaze 或付費服務。

# 最近一次修改摘要：第 4 版規劃修正

1. 第 4 版改為靜態 HTML5 優先、低 GAS 呼叫、免費方案穩定版。
2. 學員端與導師端以靜態頁面為主，機率表由 GAS 事前建立與維護，遊戲開啟時只讀取既有題庫、答案、機率表、成就規則與戰隊設定。
3. 學員登入時預先決定每題寶箱、道具內容與成就寶箱內容，開箱不再呼叫後台。
4. 關題關閉後到競賽結算前可使用道具，回答期間與結算後不可使用。
5. 加倍卡、翻身卡與挑戰卡均由學員端先計算；挑戰卡採猜大小規則，不再由 GAS 計算。
6. 第 4 版移除創作題、隊內初選、講師審核代表作品與匿名全體票選。
7. 排行榜只在導師每次關題後更新快照，學員端用懸浮按鈕手動開啟，開啟時才讀取。
8. 幸運箱全場最多 1 名預配，也可無人預配；開啟幸運箱時需回傳 GAS，無人中獎時最終結算指定 1 名現有玩家。
9. 個人全對獎由學員端在最後 1 題完成後判斷，達成時回傳 GAS 紀錄。
10. 第 4 版取消首答 +5 分，避免 GAS 計算全場最早答對者。
11. 規劃前端與 GAS 去重機制，避免重複點擊、網路延遲與重送造成分數重複。
12. 詳細規格位於 `docs/14_v4_roadmap.md`。

# 最近一次修改摘要：第 4 版開發啟動

1. 第 4 版以 `0.4.0-planning` 啟動。
2. 新增路線圖 `docs/14_v4_roadmap.md`。
3. 第 4 版定位為正式活動維運與安全檢查版。
4. 優先方向為活動前健康檢查、正式活動操作手冊、賽後資料保存與交接。
5. 本次未修改學員端、講師端、GAS、Firebase rules 或雲端部署設定。
6. 免費方案限制維持，不啟用 Cloud Functions、Cloud Run、Blaze 或付費服務。

# 最近一次修改摘要：0.3.22

1. 學員端頂端只顯示個人得分與道具使用分，不再顯示戰隊積分。
2. 學員端排行榜入口已隱藏，避免學員端讀取戰隊排行資料。
3. 學員端頂端分數由本機送答紀錄、關題後公開解答與本機道具排程估算，不再為頂端資訊呼叫 GAS 摘要或排行榜。
4. GAS `closeAndScoreQuestion` 改為先關題並回傳解答，正式計分與排行榜更新改由講師端自動呼叫 `scoreClosedQuestion` 單次執行。
5. 講師端會在關題後顯示後台計分中，並少量延遲刷新排行榜。
6. 未啟用 Cloud Functions、Cloud Run、Blaze 或任何付費服務。
# 最近一次修改摘要：0.3.21 接續修正

1. 學員端道具流程改為關題後排程，下一題開放時背景送出 Firebase itemUses。
2. GAS 新增 TreasureRewardPool，第一次開題時為全體既有玩家預配寶箱內容，後加入玩家在報到或同步時補配。
3. 寶箱發放時即寫入 itemType，openTreasureBox 只使用既有結果，不再現場計算機率。
4. 戰隊排行榜改採每題平均分加總，再加上道具加分，避免後加入玩家影響前面題目平均。
5. 挑戰卡答對率改用該題已結算 answer rows，不用目前戰隊人數回推舊題。
6. 幸運箱未開啟時，finalizeCompetition 由 buildLuckyAward 隨機指定一位玩家得幸運獎。
7. 學員端關題後不再自動集中 refreshPlayerSummary，紅點 hidden 顯示問題已由 CSS 修正。
8. 未啟用 Cloud Functions、Cloud Run、Blaze 或任何付費服務。
# AI 交接文件

## 專案概要

本專案為「疫苗守護戰隊挑戰賽」，用於 120 分鐘預防接種教育訓練。目標對象為醫事人員，預估 200 人參與，分為 5 個戰隊。

接手時請同步閱讀 `docs/WORK_LOG.md`。該檔記錄逐次工作日誌、測試紀錄、部署紀錄、阻塞點與下一步。

系統正式架構採三方分工：

1. GitHub：程式碼、文件、版本與 Issue。
2. Firebase：Hosting、Authentication、Firestore、Realtime Database。第 1 版使用 Hosting 作為前端入口，並使用 Realtime Database 的 `gameState` 作公開狀態提示；Firestore / Realtime Database 不作為主要資料庫。
3. Google Apps Script / Google Sheets：題庫、場次設定、後端判斷、計分與賽後報表。

## 專案架構

```text
antigravity_vaccine_team_game_docs/
  app/config/modules.json
  data/
  docs/
    AI_HANDOVER.md
    WORK_LOG.md
    11_v2_roadmap.md
  firebase/
  frontend/
    student/dist/
    instructor/dist/
  functions/
    src/index.ts
  gas/
  scripts/static-server.mjs
```

## 功能總覽

| 功能 | 狀態 | 說明 |
|---|---|---|
# AI 交接文件

## 專案概要

本專案為「疫苗守護戰隊挑戰賽」，用於 120 分鐘預防接種教育訓練。目標對象為醫事人員，預估 200 人參與，分為 5 個戰隊。

接手時請同步閱讀 `docs/WORK_LOG.md`。該檔記錄逐次工作日誌、測試紀錄、部署紀錄、阻塞點與下一步。

系統正式架構採三方分工：

1. GitHub：程式碼、文件、版本與 Issue。
2. Firebase：Hosting、Authentication、Firestore、Realtime Database。第 1 版使用 Hosting 作為前端入口，並使用 Realtime Database 的 `gameState` 作公開狀態提示；Firestore / Realtime Database 不作為主要資料庫。
3. Google Apps Script / Google Sheets：題庫、場次設定、後端判斷、計分與賽後報表。

## 專案架構

```text
antigravity_vaccine_team_game_docs/
  app/config/modules.json
  data/
  docs/
    AI_HANDOVER.md
    WORK_LOG.md
    11_v2_roadmap.md
  firebase/
  frontend/
    student/dist/
    instructor/dist/
  functions/
    src/index.ts
  gas/
  scripts/static-server.mjs
```

## 功能總覽

| 功能 | 狀態 | 說明 |
|---|---|---|
| 學員端 | 第 3 版 `0.3.22` 已定版 | 可輸入暱稱、等待講師啟動後報到、依講師啟動前設定自動分隊或方塊選隊、讀取 Firebase 公開狀態、預載 Firebase 公開題庫、依講師口令翻開試卷並作答；報到、送答、道具使用、成就領取、寶箱開啟、創作投稿與創作投票已啟動 Firebase 快速寫入；送答 Firebase 失敗時會回退 GAS；排行榜由講師端關題後更新快照；正式成績仍以賽後 GAS 重算為準；已完成免費方案效能收斂 |
| 講師端 | 第 3 版 `0.3.13` 已部署 | 可套用管理密碼、啟動場次、初始化資料、選題、開題、關題計分、公布答案、讀取排行榜與結算競賽；後端設定與啟動場次完成後會自動隱藏；排行榜顯示整體與當前題目答對率；新增電腦學員測試控制；賽後報表 API 保留但 UI 不顯示 |
| 講師端資料初始化 | 第 2 版定版完成 | 可由講師端明確觸發，清空玩家、作答、翻卷、排行榜、場次狀態與已開放題目紀錄，保留題庫與戰隊設定 |
| 第 2 版速度最佳化 | 定版完成 | GAS 已加入短時間快取、Firebase access token 快取、玩家與翻卷快取，並將公開題庫預載到 Firebase `publicQuestions` |
| Cloud Functions | 免費方案暫停 | Blaze 方案限制，不作為第 1 版必要服務 |
| Firebase rules | 規格已存在 | 位於 `firebase/firestore.rules` 與 `firebase/database.rules.json` |
| GAS | 第 1 版後端 | 位於 `gas/Code.gs`，負責報到、開題、作答、關題與基本計分；`0.3.22` 已完成效能收斂 |
| 第 3 版寶箱、道具、獎項、排行榜、創作題與報表 | `0.3.22` 已定版 | 已啟動免費方案效能重構：學員報到寫 Firebase `players`、送答寫 Firebase `answers`、道具使用寫 `itemUses` pending、創作投稿與投票寫 Firebase 暫存節點、講師關題後由 GAS 發布 `publicScoreboards` 快照、成就與寶箱改快速請求；創作資料已加上 `questionId` 與本次開題時間隔離，避免舊資料混入；賽後報表 API 保留但 UI 隱藏；已修正關題公告與開箱同步問題 |
| 第 4 版正式活動維運與安全檢查 | `0.4.0-planning` 已啟動 | 路線圖位於 `docs/14_v4_roadmap.md`，先處理活動前健康檢查、正式活動操作手冊、賽後資料保存與交接 |

1. `student_app`
2. `instructor_dashboard`
3. `cloud_functions`
4. `gas_sync`
5. `gas_backend`
6. `v3_game_rules`

新增功能時，必須更新此檔案，讓後續維護者知道功能入口與狀態。

## UI 運作方式

第 1 版 UI 是靜態頁面，目的是先確認操作流程與畫面結構。正式後端判斷由 GAS Web App 負責，Firebase Hosting 僅提供頁面。學員端與講師端皆以手機使用者為主要操作情境。

資料與判斷責任：

1. Firebase Hosting：前端入口。
2. GAS Web App：後端 API 與規則判斷。
3. Google Sheets：主要資料庫。
4. Firebase Realtime Database：公開 `gameState`、公開題庫 `publicQuestions` 與公開排行榜，不作為正確答案或正式作答紀錄資料庫。

前端 GAS 設定檔：

1. `frontend/student/dist/config.js`
2. `frontend/instructor/dist/config.js`

部署 GAS Web App 後，需將 Web App URL 寫入上述兩個檔案的 `gasWebAppUrl`，並將 `apiMode` 設為 `gas`。
第 2 版 0.2.3 起，學員端與講師端固定使用 `config.js` 內的 GAS Web App URL，會清除舊的 `localStorage.vaccineGameGasUrl`，避免瀏覽器暫存舊 URL 導致報到或管理操作失敗。
目前 `apiTransport` 預設為 `jsonp`，用於避開 Firebase Hosting 呼叫 GAS Web App 時的 CORS 限制。
學員端與講師端的 JSONP 呼叫已加上 25 秒逾時與最多 3 次重試。原因是 Apps Script 偶發會回傳 Google Drive HTML 錯誤頁，重試後通常可恢復。

學員端流程：

1. 使用者輸入暱稱。
2. 前端確認講師已啟動場次；若仍為 `draft`，不可報到。
3. 若講師啟動前開放自由選隊，前端顯示方塊選隊；若未開放，直接由 GAS 自動分隊。
4. 前端優先寫入 Realtime Database `players/{gameId}/{playerId}` 報到；若 Firebase 失敗才回退呼叫 GAS `joinGame`。
5. 前端啟動後先讀取 Firebase `publicQuestions/{gameId}`，把公開題目載入手機瀏覽器快取。
6. 講師宣布開題後，使用者按「翻開試卷」；學員端優先從 Firebase 快取顯示題目，並呼叫 GAS `openPaper` 記錄翻卷時間。
7. 若 Firebase 題目暫不可用，才回退呼叫 GAS `getCurrentQuestion`。
8. 使用者按選項後呼叫 `submitAnswer`。
9. GAS 檢查題目是否仍開放，並防止同一玩家同一題重複作答。
10. 講師端關題後呼叫 `getScoreboard` 讀取排行榜。

`getCurrentQuestion` 不得回傳 `correctAnswer` 與 `explanation`，避免前端暴露答案。
學員端呼叫 `openPaper` 或回退呼叫 `getCurrentQuestion` 時需帶 `playerId`。GAS 會用伺服端時間寫入 `試卷開啟紀錄`，`submitAnswer` 的 `responseSeconds` 使用「送出時間 - 試卷開啟時間」，不得使用手機本機時間當計分依據。

計分規則：

1. `baseScore`：答對才有基本分，依翻開試卷後到送出的秒數計算。
2. `firstCorrectBonus`：每題第一位提交且答對者加 5 分。
3. `score`：`baseScore + firstCorrectBonus`。
4. 已計分紀錄不重複加分，避免講師重複關題造成分數累加。

學員端不自動更新題目。原因是本競賽要比較誰先完成，自動更新會因網路與裝置輪詢時間產生起跑差。第 1 版採「講師口令 + 學員手動翻開試卷」。

Firebase Realtime Database 使用方式：

1. 學員端每 5 秒讀取 `gameState/{gameId}`。
2. 只用於提示「講師已開放題目」或「已關題」。
3. `createGame` 會同步公開題庫到 `publicQuestions/{gameId}`，學員端啟動時會預載。
4. `openQuestion` 會在 `gameState/{gameId}.publicQuestion` 附帶當題公開資訊，讓手機端不必重新呼叫 GAS 取得題目。
5. `0.3.15` 起，學員報到優先寫入 `players/{gameId}/{playerId}`，報到成功後不自動呼叫 GAS 個人摘要。
6. 不自動呼叫 `getCurrentQuestion`。
7. 不在 Firebase 儲存正確答案或正式分數；比賽中 `answers`、`itemUses`、`players` 僅作快速暫存與賽後稽核資料。
8. 正式計分仍由 GAS 讀寫 Google Sheets，後續需補上從 Firebase 匯出並重新計分的完整流程。

第 1 版預設測試題：

1. `setupGameSheets` 會建立 `demo_q001`、`demo_q002`、`demo_q003`。
2. 若題庫工作表已有資料，會補齊缺少的預設測試題；正式題庫可改欄位或將 `enabled` 改為 `FALSE`。
3. 講師端預設題目 ID 為 `demo_q001`，可用於首次端到端測試。
4. 若獨立 Apps Script 專案未設定 `SPREADSHEET_ID`，`getSpreadsheet` 會自動建立「疫苗守護戰隊挑戰賽資料庫」Google Sheets，並將 ID 寫回 Script Properties。

資料初始化：

1. 講師端新增「初始化遊戲資料」按鈕。
2. GAS 對應 action 為 `resetGameData`，需帶 `ADMIN_API_SECRET`。
3. 會清空 `玩家`、`作答紀錄`、`試卷開啟紀錄`、`排行榜`、`場次狀態`。
4. 第 3 版 `0.3.1` 起，也會清空 `寶箱紀錄`、`道具紀錄`、`獎項紀錄`、`創作投稿`、`創作投票`。
5. 會保留 `題庫`、`場次設定`、`戰隊設定`、`規則設定`。
6. 執行後會重設場次為 `draft`，並重新同步公開題庫與公開場次狀態。
7. 正式活動前可用來清除測試資料；活動中不可任意執行。

第 3 版寶箱資料：

1. `setupGameSheets` 會建立 `寶箱紀錄`、`道具紀錄`、`獎項紀錄`、`創作投稿`、`創作投票`、`規則設定`。
2. `closeAndScoreQuestion` 只針對新計分且答對的作答紀錄發寶箱。
3. 取得條件包含每題答對 30% 機率、累積答對 3 題、5 題、10 題、連續答對 3 題、5 題。
4. 每位學員最多保留 3 個 `unopened` 寶箱；超過時最早未開啟寶箱會標記為 `discarded`。
5. `getPlayerInventory` 可讀取指定玩家自己的寶箱與道具狀態。
6. `0.3.2` 已實作 `openTreasureBox`，可將 `unopened` 寶箱開成道具或空寶箱。
7. 開箱抽到非空結果時，會在 `道具紀錄` 建立 `available` 道具。
8. `0.3.3` 已實作 `useItem`、`getTeamBonusLedger`、`recalculateV3Scoreboard`。
9. 加分卡會立即寫入戰隊加成；翻身卡仍依使用當下排名寫入戰隊加成；加倍卡會自動套用下一題，答對時該題個人分數直接乘以 2；挑戰卡只需指定挑戰戰隊，並自動套用下一題結果。
10. `排行榜` 已新增 `teamBonusScore`、`finalScore`、`weightedAverageScore`。
11. `0.3.4` 已實作特殊道具幸運獎與全對獎結算。
12. `0.3.5` 已將排行榜改為以有效參與人數計算戰隊加權平均分。
13. `0.3.5-ui` 已補做學員端寶箱與道具 UI。
14. 學員端可呼叫 `getPlayerInventory`、`openTreasureBox`、`useItem`，但抽獎與道具效果仍由 GAS 判定。
15. `0.3.6` 已實作 `submitCreativeAnswer`、`getTeamCreativePool`、`voteTeamCreative`。
16. `0.3.9` 已新增 `getPlayerAchievements`，學員端用於顯示累積答對、連續答對、使用道具與寶箱成就。
17. `0.3.9` 規定若已經沒有下一題，只能使用加分卡與翻身卡；加倍卡與挑戰卡會由 GAS 拒絕。
18. `0.3.10` 規定每位學員只能取得或使用 1 次加倍卡；重複抽到加倍卡時，GAS 改建立大加分卡。
19. `0.3.11` 起，成就寶箱不再自動發放；學員端需呼叫 `claimAchievementReward` 領取，領取後才建立寶箱。
20. `0.3.12` 起，`getPlayerSummary.teamScore` 回傳含道具加分的 `weightedAverageScore`，供學員端最上方戰隊積分顯示。
21. `0.3.12` 起，空寶箱回傳短句訊息；前端不顯示寶箱來源與時間，已開啟寶箱不再列出。
22. `0.3.13` 起，`getPlayerSummary` 同步回傳未開啟寶箱與可領取成就摘要，學員端不再於進入頁面時自動讀取寶箱、成就與創作決選，降低 200 人同時操作時的 GAS 呼叫量。
23. `0.3.14` 起，學員端開箱改為寫入 `treasureBoxOpenRequests`，並立即回饋與隱藏該列；由於既有寶箱尚未在取得時預先決定 `rewardType`，正式獎勵需後續由 Firebase 預設獎勵或賽後 GAS 重算補齊。

第 3 版創作題隊內初選：

1. `submitCreativeAnswer`：每位學員每場只能提交 1 則創作答案。
2. `getTeamCreativePool`：只回傳同隊投稿池，不回傳投稿者暱稱與 playerId。
3. `voteTeamCreative`：隊內初選只能投同隊投稿，每位學員每場只能投 1 票。
4. `創作投稿.selectedByInstructor` 已預留給 `0.3.7`。
5. `0.3.7` 已實作講師審核代表作品與匿名全體投票。
6. 學員端匿名決選作品只顯示 A 至 E 與內容，不顯示戰隊、暱稱或 playerId。
7. `voteCreativeFinal` 後端限制不可投自己戰隊作品，且每位學員只能投 1 票。
8. `0.3.9` 起，創作投稿、讀取隊內投稿池與隊內初選必須等講師開放 `creative` 題型後才能使用。
9. `0.3.12` 起，創作題作答固定 180 秒，可主動放棄回答；全員提交或放棄，或 180 秒到，才進入 30 秒隊內投票。
10. `0.3.12` 起，匿名全體投票由講師選出代表作品後開始，投票時間固定 30 秒。
11. `0.3.13` 起，講師執行 `finalizeCompetition` 時，匿名全體投票第一名會寫入 `creative_bonus` 戰隊加分紀錄，預設加 20 分，並避免重複結算。

第 3 版獎項結算：

1. `finalizeAwards` 需帶管理密碼，會重新產生該場次 `lucky` 與 `perfect` 獎項。
2. `getAwardList` 需帶管理密碼，回傳該場次得獎名單。
3. 幸運獎以第一位抽中特殊道具者為得主。
4. 特殊道具出現後，後續開箱不再抽出特殊道具。
5. 若正式題目開放進度達 70% 仍未出現特殊道具，特殊道具機率由 3% 提高為 10%，空寶箱機率同步降低。
6. 全對獎以全部正式題目皆答對者排序，依完成最後一題時間取前 3 名。
7. 獎項資料寫入 `獎項紀錄`，目前尚未接講師端 UI。
8. `0.3.13` 起，講師端提供「結算競賽」按鈕，會結算創作決選戰隊加分、重算排行榜、結算幸運獎與全對獎，並將場次狀態改為 `finalized`；學員端收到狀態後會讀取最後成績、個人排名、戰隊排名與領獎提示。

第 3 版戰隊加權平均分排行榜：

1. `playerCount` 代表戰隊人數。
2. `0.3.10` 起，不再用 `effectivePlayerCount` 顯示或排名；舊欄位保留是為了相容既有工作表。
3. `averageScore = totalScore / playerCount`。
4. `weightedAverageScore = averageScore + teamBonusScore`。
5. `correctRate = correctAnswerCount / (playerCount * closedQuestionCount)`，代表整體答對率。
6. `currentQuestionCorrectRate` 代表當前題目答對率，也用於挑戰卡結算。
7. 未作答、逾時未送出、關題後才作答都不會計入答對，因此在答對率中視同錯誤。
8. 啟用中的戰隊即使尚無戰隊人數，也會保留在排行榜並顯示 0 分。
9. 學員端與講師端顯示排名分、戰隊人數、整體答對率、當前題目答對率與道具加成。
10. `0.3.14` 起，學員端排行榜優先讀取 Firebase `publicScoreboards/{gameId}` 快照；無快照時才退回 GAS 備援。活動中快照為暫時成績，正式成績以賽後結算為準。

第 3 版賽後報表：

1. `exportGameReport` 需帶管理密碼。
2. 匯出前會重新計算排行榜，並重新結算幸運獎與全對獎。
3. 報表會建立新的 Google 試算表。
4. 報表包含摘要、戰隊排行榜、個人排行榜、作答紀錄、寶箱紀錄、道具紀錄、獎項紀錄、創作投稿、創作投票與創作決選結果。
5. 報表不輸出管理密碼、Token、服務帳戶資訊。
6. 創作投票報表不輸出 `voterPlayerId`。
7. `0.3.9` 起，賽後報表 API 保留，但講師端 UI 不顯示。

學員端 CSS 採手機優先 RWD。未來若要接入 GPT 產生的美術素材或替換按鈕視覺，優先調整 `styles.css` 的 CSS 變數與語意 class，例如 `.paper-action`、`.option-button`、`.primary-action`，不要把樣式寫進 JavaScript。

講師端 CSS 也採手機優先設計，固定為單欄操作流程：

1. 後端設定。
2. 啟動場次。
3. 題目控制。
4. 排行榜。
5. 第 1 版流程檢查。

管理密碼不可寫入程式或文件。講師端只把管理密碼保存在瀏覽器 `sessionStorage`，重新開啟瀏覽器後需重新輸入。
講師端後端設定區只顯示管理密碼欄位，不顯示 GAS Web App URL 欄位。按「套用設定」後需顯示「講師已完成設定」。

啟動學員端：

```powershell
npm run dev:student
```

啟動講師端：

```powershell
npm run dev:instructor
```

## Firebase 部署狀態

Firebase project：`tychbniis-32af5`

| 項目 | 狀態 | 說明 |
|---|---|---|
| Firebase CLI 登入 | 已完成 | 登入帳號：`tychbniis@gmail.com` |
| Hosting 學員端 | 已部署 | https://tychbniis-32af5-student.web.app |
| Hosting 講師端 | 已部署 | https://tychbniis-32af5-instructor.web.app |
| Authentication Anonymous | 尚未確認 | 需在 Firebase Console 啟用 |
| Firestore | 已建立 | `(default)`，位置：`asia-east1` |
| Firestore rules | 已部署 | 使用 `firebase/firestore.rules` |
| Realtime Database | 已建立 | `tychbniis-32af5-default-rtdb`，位置：`asia-southeast1` |
| Realtime Database rules | 已部署 | 使用 `firebase/database.rules.json`，公開讀取 `gameState`、`publicQuestions` 與 `publicScoreboards` |
| Cloud Functions | 免費方案暫停 | 不升級 Blaze，第 1 版改用 GAS Web App |
| GAS Web App | 第 3 版已部署 | 正式 `/exec` URL 不變，目前線上 deployment 為 version 34 |

Firebase `gameState` 使用方式：

1. GAS 是主要可信任狀態來源。
2. `場次狀態` 工作表保留完整狀態。
3. `createGame` 會嘗試同步公開題庫到 `publicQuestions/{gameId}`。
4. `createGame`、`openQuestion`、`closeAndScoreQuestion` 會嘗試同步公開 `gameState/{gameId}` 到 Realtime Database。
5. 學員端讀取 Firebase `gameState` 顯示提示，但仍需手動按「翻開試卷」才會顯示題目。
6. 學員端題目優先來自 Firebase `publicQuestions` 或 `gameState.publicQuestion`；GAS 仍只負責記錄翻卷時間、收作答與計分。
7. GAS 優先使用 Apps Script Script Properties 中的 `FIREBASE_SERVICE_ACCOUNT_EMAIL` 與 `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` 產生短效 access token 寫入 Firebase。未設定服務帳戶時會退回 Apps Script OAuth token，但目前實測回覆 `401 Unauthorized request`。

Apps Script 專案：

```text
scriptId: 1qNXWMJSxywJcdpjwgJqvfleqzGm24P9B3i6_vJwLhmF1YMygzWShZcah
目前正式 Web App URL: https://script.google.com/macros/s/AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC/exec
```

該 URL 已回應 `200`，第 1 版主流程已測通。若未來更換 Apps Script 專案或資料試算表，需重新確認 `SPREADSHEET_ID` 與 Script Properties。

本機 `.firebaserc` 已設定：

1. default project：`tychbniis-32af5`
2. hosting target `student`：`tychbniis-32af5-student`
3. hosting target `instructor`：`tychbniis-32af5-instructor`

## modules.json 說明

`app/config/modules.json` 是功能登記表，不是 Firebase 設定檔。它用來記錄各功能模組的 ID、名稱、路徑與狀態。

## module_loader 說明

本專案目前尚未建立 `module_loader`。若未來需要動態載入功能，應先以 `app/config/modules.json` 為來源，避免把功能清單寫死在 UI。

## task_runner 說明

本專案目前尚未建立 `task_runner`。第 1 版以 npm scripts 作為任務入口：

1. `npm run dev:student`
2. `npm run dev:instructor`
3. `npm run check:functions`
4. `npm run deploy:rules`
5. `npm run deploy:hosting`
6. `npm run deploy:functions`

第 1 版免費方案不使用 `npm run deploy:functions`。

## 版本控制規則

每次修改需更新：

1. `CHANGELOG.md`
2. `docs/AI_HANDOVER.md`
3. 對應模組說明文件

Commit message 格式：

```text
[功能名稱] 類型：變更摘要
```

範例：

```text
[學員端] feat：建立第 1 版報到頁
```

## 新增功能流程

1. 確認功能名稱與用途。
2. 確認是否屬於學員端、講師端、Functions、GAS 或資料設定。
3. 建立最小檔案。
4. 更新 `app/config/modules.json`。
5. 更新對應 README。
6. 執行本機測試。
7. 更新 `CHANGELOG.md`。
8. 更新本交接文件。
9. 建立 Git commit。

## 修改功能流程

1. 先讀取本文件。
2. 讀取 `docs/WORK_LOG.md`。
3. 讀取相關模組 README。
4. 找出最小修改範圍。
5. 修改前確認 Git 狀態。
6. 只改必要檔案。
7. 測試該功能。
8. 確認不影響其他功能。
9. 更新文件、工作日誌與變更紀錄。
10. 建立 Git commit。

## 低 token 工作流

後續每次功能改善必須採低 token 模式：

1. 先讀本文件、`docs/WORK_LOG.md`、`README.md`、`CHANGELOG.md` 與相關模組 README。
2. 使用 `rg` 搜尋功能入口，只讀本次會修改或測試的檔案。
3. 不展開 `node_modules`、部署紀錄、大型 log 或與本次功能無關的封存資料。
4. 修改前先列出功能、影響檔案、測試方式與還原方式。
5. 本機測試通過前，不執行雲端部署。
6. 本機測試通過後，先回報結果與風險，等使用者明確確認後才推送 Firebase Hosting、GAS 或其他雲端服務。

## 常見錯誤處理

### Firebase CLI 未安裝

Status：無法執行 `firebase` 指令。
Root Cause：本機尚未安裝 Firebase CLI。
Suggested Fix：

```powershell
npm install -g firebase-tools
```

### Firebase 尚未登入

Status：無法列出 Firebase 專案或部署。
Root Cause：尚未完成 `firebase login`。
Suggested Fix：在互動式 PowerShell 視窗執行：

```powershell
firebase login
```

### 尚未綁定 Firebase 專案

Status：部署時找不到預設 Firebase project。
Root Cause：尚未建立 `.firebaserc`。
Suggested Fix：複製 `.firebaserc.example` 為 `.firebaserc`，並填入實際 project ID 與 hosting site。

### Cloud Functions 需要 Blaze 方案

Status：`firebase deploy --only functions` 失敗。
Root Cause：Firebase 專案不是 Blaze pay-as-you-go 方案，因此無法啟用 `cloudbuild.googleapis.com` 與 `artifactregistry.googleapis.com`。
Suggested Fix：第 1 版不升級 Blaze，改用 GAS Web App 執行後端判斷。Cloud Functions 程式保留為未來升級方案。

### GAS Web App 尚未部署

Status：前端尚未能呼叫 GAS 後端。
Root Cause：GAS Web App 已可呼叫，但指定試算表尚未初始化必要工作表，或 `SPREADSHEET_ID` 未指到正確試算表。
Suggested Fix：在 Apps Script 中確認 `GAME_ID`、`ADMIN_API_SECRET`、`SPREADSHEET_ID`，執行 `setupGameSheets`，再測試 `getGameState`。

部署細節見：

```text
docs/10_gas_web_app_deployment.md
```

### Firebase Hosting 呼叫 GAS 的傳輸風險

Status：前端目前預設用 JSONP 呼叫 GAS Web App。
Root Cause：瀏覽器跨網域 JSON POST 到 GAS Web App 可能被 CORS 限制。
Suggested Fix：第 1 版使用 JSONP 降低 CORS 風險，但不得傳送帳密、Token、身分證字號或完整姓名。若活動後續需要更高資安等級，改用 Firebase 中繼資料層或升級 Cloud Functions。

## 最近一次修改摘要

2026-05-23：第 3 版更新至 `0.3.20` 並已部署。本次修正 Firebase `HTTP 401` 時一般題送答不回退 GAS、創作題代入舊資料、隊內投票不能正確進入，以及講師結算競賽過慢。前端一般題送答若 Firebase 失敗，會回退 GAS `submitAnswer`；GAS 創作投稿與投票新增 `questionId` 欄位，並加上本次開題時間過濾，投稿池、講師候選、決選與投票結果只讀目前這次開題後的新資料；`finalizeCompetition` 不再同步整場 Firebase `answers`，避免結算時掃描過多資料。已部署 GAS version 34、Firebase Hosting 學員端與講師端、Realtime Database rules。仍維持免費方案，不啟用 Blaze、Cloud Functions、Cloud Run 或任何需付費帳務的服務。

2026-05-23：第 3 版更新至 `0.3.18` 並已部署。本次修正 Firebase 快速報到、送答、創作投稿與 GAS 現場結算的相容問題。GAS `closeAndScoreQuestion` 會在計分前同步 Firebase `players` 與當題 `answers` 到 Google Sheets；創作題投稿池、隊內投票、講師候選、決選作品、全體投票與結算前會同步 Firebase 創作暫存資料；`findPlayer` 找不到 Sheets 玩家時會從 Firebase `players` 匯入。學員端寶箱或成就讀取失敗時會先隱藏紅點，避免沒有可操作項目仍顯示警示。已部署 GAS version 32 與 Firebase Hosting；本次仍維持免費方案，不啟用 Blaze、Cloud Functions、Cloud Run 或任何需付費帳務的服務。

2026-05-23：第 3 版更新至 `0.3.17` 並已部署，延續免費方案效能重構第一階段。本次不啟用 Blaze、Cloud Functions、Cloud Run 或任何需付費帳務的服務。GAS 新增 `publishScoreboardSnapshotToFirebase`；講師關題執行 `closeAndScoreQuestion` 後，會將排行榜寫入 Realtime Database `publicScoreboards/{gameId}`，標示 `isTemporary: true` 與 `source: instructor_close_question`。講師執行 `finalizeCompetition` 後，會寫入 `isTemporary: false` 與 `source: gas_final` 的正式快照。學員端排行榜維持優先讀 Firebase 快照，不需每次操作重算排行榜。已部署 GAS 與 Firebase Hosting；未部署 Cloud Functions、Firestore rules 或 Cloud Run。尚未完成：GAS 從 Firebase 匯出並正式重新計分、寶箱取得時預先決定 `rewardType`、Firebase Auth 身分驗證。

2026-05-23：第 3 版更新至 `0.3.13` 並已部署。本次降低學員端自動 GAS 呼叫量：登入後只自動讀取個人摘要，關題後只自動更新個人摘要，不再同時讀取排行榜、寶箱、成就與匿名決選；`getPlayerSummary` 回傳寶箱紅點與成就紅點摘要。學員端修正創作題倒數閃爍、戰隊積分無條件進位、避免暫時性 0 分覆蓋既有戰隊積分。GAS 新增 `finalizeCompetition` 與 `getFinalResults`，結算時會套用創作決選第一名戰隊加分、重算排行榜、結算獎項，並將場次狀態改為 `finalized`；講師端新增「結算競賽」按鈕，學員端新增最後成績、排名與領獎提示。本次已完成 GAS 語法、前端 JavaScript、JSON、`git diff --check`、`npm run check:functions`、本機學員端與講師端頁面 `200` 檢查。GAS 已推送並更新既有 Web App deployment 到 version 30，正式 `/exec` URL 不變；Firebase Hosting 已部署學員端與講師端；線上學員端與講師端回應 `200` 並載入 `app.js?v=0.3.13`；GAS `getGameState` 回應 `ok:true`；`finalizeCompetition` 與 `getFinalResults` 已不再回覆「未知 action」；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

2026-05-22：第 3 版更新至 `0.3.12` 並已部署。本次調整學員端最上方戰隊積分改用含道具加分後的排名分；寶箱與道具列表移除來源、時間與內部題目 ID；已開啟寶箱不再顯示；空寶箱改回傳短句提示；創作題固定 180 秒作答，可提交或放棄，時間到或全員完成後進入 30 秒隊內投票；匿名全體投票固定 30 秒；講師端新增電腦學員測試控制，可加入電腦學員並讓電腦作答目前題目。本次已完成 GAS 語法、前端 JavaScript、JSON、`git diff --check`、`npm run check:functions`、本機學員端與講師端頁面 `200` 檢查。GAS 已推送並更新既有 Web App deployment 到 version 28，正式 `/exec` URL 不變；Firebase Hosting 已部署學員端與講師端；線上學員端與講師端回應 `200` 並載入 `app.js?v=0.3.12`；GAS `getGameState` 回應 `ok:true`；`addComputerPlayers` 與 `submitComputerAnswers` 已不再回覆「未知 action」；未帶管理密碼時會正確回覆「管理操作授權失敗」；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

2026-05-22：第 3 版更新至 `0.3.11` 並已部署。本次調整排行榜文字為戰隊人數，答對率拆成整體答對率與當前題目答對率；挑戰卡只比較使用後下一題的當前題目答對率；講師端完成後端設定與啟動場次後會自動隱藏已完成區塊；寶箱紅點只在有未開啟寶箱時顯示，成就紅點只在有可領取成就寶箱時顯示；成就寶箱需點「領取」才建立；挑戰卡使用時才跳出方塊選隊；講師端移除答對率說明；學員端題目提示改用「第 N 題」等現場文字。本次已完成 GAS 語法、前端 JavaScript、JSON、`git diff --check`、`npm run check:functions`、本機學員端與講師端頁面 `200` 檢查。GAS 已推送並更新既有 Web App deployment 到 version 26，正式 `/exec` URL 不變；Firebase Hosting 已部署學員端與講師端；線上學員端與講師端回應 `200` 並載入 `app.js?v=0.3.11`；GAS `getGameState` 回應 `ok:true`；`claimAchievementReward` 已不再回覆「未知 action」；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

2026-05-22：第 3 版更新至 `0.3.10` 並已部署。本次調整加倍卡只能取得或使用 1 次，重複抽到改為大加分卡；學員端報到頁移除選隊下拉選單，講師啟動場次後才可報到，若講師啟動前開放自由選隊，學員以方塊按鈕選隊，否則自動分隊；講師端自由選隊設定只保留在啟動場次前，啟動後鎖定；排行榜改用報到人數計算平均分並顯示答對率，未作答、逾時未送出、關題後作答都視同錯誤；學員端選隊方塊保留 `.art-slot` 美術替換區。本次已完成 GAS 語法、前端 JavaScript、JSON、`npm run check:functions`、本機學員端與講師端頁面 `200` 檢查。GAS 已推送並更新既有 Web App deployment 到 version 24，正式 `/exec` URL 不變；Firebase Hosting 已部署學員端與講師端；線上學員端與講師端回應 `200` 並載入 `app.js?v=0.3.10`；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

2026-05-22：第 3 版更新至 `0.3.9` 並已部署。本次預設題庫改為 11 題，其中 `demo_q011` 為創作題；GAS 新增 `getPlayerAchievements`；加分卡改為立即套用戰隊加成；加倍卡改為自動套用下一題，答對時該題分數直接乘以 2；挑戰卡改為只選挑戰戰隊並自動套用下一題；若沒有下一題，GAS 會阻擋加倍卡與挑戰卡。學員端新增浮動寶箱 / 成就選單與懸浮視窗，創作題只在講師開放創作題時顯示，匿名全體投票只在講師選出代表作品後顯示。講師端移除賽後報表 UI，保留 API，並新增有效人數與報到人數說明。本次已完成本機 GAS、前端 JavaScript、JSON、`npm run check:functions` 與本機頁面檢查。GAS 已推送並更新既有 Web App deployment 到 version 22，正式 `/exec` URL 不變；Firebase Hosting 已部署學員端與講師端；線上學員端與講師端回應 `200` 並載入 `app.js?v=0.3.9`；`getPlayerAchievements` 已不再回覆「未知 action」；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

2026-05-22：第 3 版更新至 `0.3.8-deployed` 並已部署。使用者回報本機畫面呼叫寶箱、創作與報表功能時出現「未知 action」；原因是正式 GAS Web App 仍停在第 2 版 deployment version 18。已在 `gas` 資料夾執行 `clasp push`，並更新既有正式 Web App deployment 至 version 20，正式 `/exec` URL 不變。已執行 `firebase deploy --only hosting`，學員端與講師端 Hosting 已重新部署。線上檢查結果：學員端與講師端回應 `200`；學員端 HTML 已載入 `app.js?v=0.3.7`；講師端 HTML 已載入 `app.js?v=0.3.8` 並包含 `exportGameReport`；GAS `getGameState` 與 `getPlayerLeaderboard` 回應 `ok:true`；第 3 版管理 action 已不再回傳「未知 action」。本次未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

2026-05-22：第 3 版完成 `0.3.8-final-check` 本機總檢查。本次未修改 GAS、前端、Firebase Functions 或 Firebase rules 功能邏輯；已確認 GAS 語法檢查、學員端與講師端 JavaScript 語法檢查、`app/config/modules.json` 與 `package.json` JSON 解析、`npm run check:functions`、`git diff --check` 均通過。本次尚未部署 GAS Web App、Firebase Hosting、Cloud Functions 或 Firebase rules；下一步需由使用者明確確認後，才可進行雲端部署與端到端測試。

2026-05-22：第 3 版更新至 `0.3.8`，本機完成賽後報表匯出。本次 GAS 新增 `exportGameReport`，講師端新增「匯出賽後報表」按鈕。匯出前會重新計算排行榜並結算幸運獎與全對獎，接著建立新的 Google 試算表。報表包含摘要、戰隊排行榜、個人排行榜、作答紀錄、寶箱紀錄、道具紀錄、獎項紀錄、創作投稿、創作投票與創作決選結果。報表不輸出管理密碼、Token、服務帳戶資訊；創作投票報表不輸出 `voterPlayerId`。本次尚未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版更新至 `0.3.7`，本機完成講師審核代表作品與匿名全體投票。本次 GAS 新增 `getTeamCreativeCandidates`、`selectCreativeFinalists`、`getCreativeFinalists`、`voteCreativeFinal`、`getCreativeVoteResult`。講師端可讀取各隊隊內候選、每隊選 1 則代表作品、讀取匿名全體投票結果。學員端可讀取匿名決選作品並投票。學員端不顯示作品來源戰隊、暱稱或 playerId；GAS 後端限制不可投自己戰隊作品，且每位學員只能投 1 票。本次尚未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版更新至 `0.3.6`，本機完成創作題投稿與隊內初選。本次 GAS 新增 `submitCreativeAnswer`、`getTeamCreativePool`、`voteTeamCreative`。每位學員每場只能提交 1 則創作答案；同隊投稿池不回傳投稿者暱稱與 playerId；隊內初選只能投同隊投稿，且每位學員每場只能投 1 票。學員端新增「創作題隊內初選」區塊，可提交創作答案、刷新同隊投稿池與投票。本次尚未實作講師審核代表作品與匿名全體投票，未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版補作 `0.3.5-ui`，本機完成學員端寶箱與道具 UI。學員端新增「寶箱與道具」區塊，可讀取自己的寶箱與道具，開啟自己的未開啟寶箱，並使用已支援道具。前端只送出 `playerId`、`boxId`、`itemId`、`targetQuestionId` 與 `targetTeamId`，不自行計算抽獎、道具效果或分數。特殊道具只顯示幸運獎狀態，不在前端套用效果。本次未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版更新至 `0.3.5`，本機完成戰隊加權平均分排行榜。本次 GAS `排行榜` 新增 `effectivePlayerCount`，`recalculateScoreboard` 改以至少完成 1 題已計分作答的有效參與人數計算 `averageScore`，並以 `weightedAverageScore = averageScore + teamBonusScore` 作為第 3 版戰隊排名分。啟用中的戰隊即使尚無有效參與者也會保留在排行榜。學員端排行榜改顯示排名分、有效人數與道具加成；講師端排行榜改顯示排名分、有效人數、答題總分、答題平均、道具加成與最終總分。本次尚未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版更新至 `0.3.4`，本機完成幸運獎與全對獎結算。本次新增 `finalizeAwards` 與 `getAwardList`。幸運獎以第一位抽中特殊道具者為得主；特殊道具出現後，後續開箱不再抽出特殊道具；正式題目開放進度達 70% 且尚未出現特殊道具時，特殊道具機率由 3% 提高為 10%。全對獎以全部正式題目皆答對者排序，依完成最後一題送出時間取前 3 名。`道具紀錄` 新增 `createdAt`，`獎項紀錄` 新增 `nickname`、`score`、`completedAt`、`sourceItemId`。本次尚未更新學員端寶箱與道具 UI、講師端獎項 UI，未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版更新至 `0.3.3`，本機完成基本道具效果。本次新增 `useItem`、`getTeamBonusLedger`、`recalculateV3Scoreboard`。加分卡會直接寫入戰隊加成，每隊同一題同類加分卡限用 1 張；加倍卡可指定目標題，關題計分時若答對會增加個人分數，額外加成上限 20 分；翻身卡會依使用當下戰隊排序判定本隊是否最後一名，最後一名 +30，否則 +5，每隊最多觸發 2 次；挑戰卡可指定目標題與對手戰隊，目標題關題後比較答對率，本隊較高 +10，否則 +3，不扣對方分數。`排行榜` 保留第 2 版欄位並新增 `teamBonusScore`、`finalScore`、`weightedAverageScore`。本次未實作特殊道具幸運獎、全對獎與學員端 UI，未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版更新至 `0.3.2`，本機完成開寶箱與道具庫讀取。本次新增 `openTreasureBox` API，僅允許玩家開啟自己的 `unopened` 寶箱；開箱後更新 `寶箱紀錄.status=opened`、`openedAt` 與 `itemType`。若抽到非空結果，會在 `道具紀錄` 新增 `available` 道具；`empty` 不建立道具。`getPlayerInventory` 補回寶箱與道具標籤、來源寶箱、目標題目、目標戰隊與效果分數欄位，供後續 UI 使用。`規則設定` 新增寶箱獎項機率預設值。本次尚未實作道具效果、幸運獎判定、學員端 UI，也未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版更新至 `0.3.1`，本機完成寶箱資料表、寶箱取得判定與持有限制。本次修改 `gas/Code.gs`，新增 `寶箱紀錄`、`道具紀錄`、`獎項紀錄`、`創作投稿`、`創作投票`、`規則設定`，並在 `closeAndScoreQuestion` 對新計分且答對的作答紀錄發放寶箱。寶箱取得條件包含每題答對 30% 機率、累積答對 3 題、5 題、10 題、連續答對 3 題、5 題；每位學員最多保留 3 個未開啟寶箱，超過時最早未開啟寶箱標記為 `discarded`。新增 `getPlayerInventory` API 供後續 UI 使用。同步更新 README、GAS README、第 3 版路線圖、工作日誌、CHANGELOG、`app/config/modules.json` 與 `package.json`。本次尚未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

2026-05-22：第 3 版規格製作啟動，版本標記為 `0.3.0-planning`。本次依 `docs/01_game_rules.md` 新增 `docs/12_v3_roadmap.md`，將寶箱取得與持有限制、開箱機率、道具效果、幸運獎、全對獎、戰隊加權平均分、創作票選題與賽後報表拆成 P0 至 P4 與子版本順序。同步更新 `README.md`、`CHANGELOG.md`、`docs/WORK_LOG.md`、`docs/AI_HANDOVER.md`、`app/config/modules.json` 與 `package.json`。本次未修改前端、GAS 或 Firebase rules 功能邏輯，未部署雲端；第 2 版正式活動流程仍可獨立使用。

2026-05-22：第 2 版定版完成，定版版本為 `0.2.11`。本次未改功能邏輯，僅完成收尾文件與狀態整理：`README.md`、`docs/WORK_LOG.md`、`docs/AI_HANDOVER.md`、`docs/11_v2_roadmap.md`、`CHANGELOG.md` 與 `app/config/modules.json` 均標記第 2 版已完成。第 2 版正式架構為 Firebase Hosting 提供學員端與講師端，Realtime Database 只放公開狀態與公開題庫快取，GAS / Google Sheets 負責正式資料、作答與計分。正式活動前仍需在講師端執行「初始化遊戲資料」、確認題庫與戰隊設定、確認 Script Properties，並要求學員使用可區分暱稱。

2026-05-21：第 2 版更新至 `0.2.11` 並已部署。本次修正學員端最上方個人積分未更新：`refreshPlayerSummary` 會以 GAS 回傳的 `playerScore` 更新畫面與本機暫存，不再把只有 `score` 欄位的物件傳給顯示函式。學員確認送出答案後會立即停止倒數並停用選項；若送出失敗，畫面會顯示錯誤並允許再次送出，但不恢復倒數。報到頁會先讀取講師是否開放自由選隊，讀取完成前暫停報到按鈕；未開放時隱藏戰隊選單並採系統自動分隊。GAS 自動分隊改依啟用中的戰隊清單與合併後玩家數，把新學員分配到人數最少的隊伍，讓各隊人數盡量接近。本次已完成本機 JavaScript、GAS、JSON、`npm run check:functions` 與本機頁面 `200` 檢查。GAS 已推送並更新既有 Web App deployment 到 version 18，正式 URL 不變；Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。線上檢查結果：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.11`；GAS `getGameState`、`getScoreboard`、`getPlayerLeaderboard` 回應 `ok:true`。

2026-05-21：第 2 版更新至 `0.2.10` 並已部署。本次修正學員重複報到與排行榜平均分問題：GAS `joinGame` 新增匿名 `clientKey` 與同場次暱稱去重，同一學員重新報到時會回傳原玩家資料，不新增玩家列。排行榜與個人排行榜改為先合併同一人資料後再計算，避免每題作答後重複玩家造成戰隊平均分下降。`getPlayerSummary` 改為合併同一人的作答紀錄後加總個人積分，修正學員端個人積分顯示為 0 的問題。學員端預設取消選隊，由 GAS 自動分配戰隊；講師端新增「開放學員自由選隊」切換，開啟後學員端才會顯示戰隊選單。GAS `getGameState` 會正規化舊場次狀態；舊資料缺少 `allowFreeTeamChoice` 時一律回傳 `false`。學員端開啟排行榜時不再等待個人積分更新完成，降低操作停等時間。本次已完成本機 JavaScript、GAS、`npm run check:functions` 與本機頁面 `200` 檢查。GAS 已推送並更新既有 Web App deployment 到 version 17，正式 URL 不變；Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。線上檢查結果：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.10`；GAS `getGameState` 回應 `ok:true` 且 `allowFreeTeamChoice:false`；`getScoreboard` 與 `getPlayerLeaderboard` 回應 `ok:true`。注意：同人合併會優先使用正規化後的暱稱以處理既有重複資料，正式活動請要求學員使用可區分的暱稱；正式開始前仍建議按「初始化遊戲資料」清除測試資料。

2026-05-21：第 2 版更新至 `0.2.9`。GAS `openQuestion` 新增 `openedQuestionIds` 場次紀錄，講師已開放過的題目會被後端拒絕，避免同一題重複送出。前端 API 新增 `GameApiError`，GAS 回傳的重複作答、重複開題、題目狀態錯誤會直接顯示原始業務錯誤，不再被包成「無法連線到 GAS」。GAS `getPlayerSummary` 改由作答紀錄加總個人分數，避免玩家表分數未同步造成學員端個人積分不足。講師端改為流程分段：沒有管理密碼時顯示後端設定；已有管理密碼時顯示啟動場次；啟動後顯示題目控制，重新開啟視窗仍可回到題目控制。講師端啟動畫面與題目控制畫面都有初始化按鈕，流程檢查改為半隱藏 `details`。學員端排行榜改為彈出視窗，並隱藏遊戲中的目前狀態區塊。本次已完成本機 JavaScript、GAS、JSON、`npm run check:functions` 與本機頁面 `200` 檢查。GAS 已推送並更新既有 Web App deployment 到 version 15，正式 URL 不變；Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。線上檢查結果：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.9`，GAS `getGameState` 回應 `ok:true` 並包含 `openedQuestionIds`。注意：講師端依使用者需求以瀏覽器 `localStorage` 保留管理密碼，這可降低關閉視窗後重設的困擾，但也代表同一台電腦同一瀏覽器會保留管理密碼；正式活動建議使用受控電腦。

2026-05-21：第 2 版前端與 GAS 更新至 `0.2.8`。本次修正初始化後學員沿用舊報到資料的問題：學員端啟動時會讀取 Firebase `gameState`，必要時回退 GAS `getGameState`，若場次狀態為 `draft` 且 `updatedAt` 晚於本機 `checkedInAt`，會清除 `localStorage.vaccineGamePlayer` 並要求重新報到。學員端新增排行榜區塊，可手動查看戰隊排行榜與個人排行榜；關題計分後也會自動更新一次。GAS 新增 `getPlayerLeaderboard` 只讀 API，回傳暱稱、戰隊與分數，不回傳帳密、Token 或個資欄位。學員端與講師端 GAS 呼叫增加 `_ts` 快取破壞參數、4 次 fetch 重試、4 次 JSONP 備援與較長逾時，降低手機端偶發連線失敗。講師端桌機版改為 3 欄投影版面。本次已完成本機 JavaScript、GAS、JSON 與 `npm run check:functions` 檢查。GAS 已推送並更新既有 Web App deployment 到 version 14，正式 URL 不變；Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。線上檢查結果：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.8`，GAS `getGameState` 與 `getPlayerLeaderboard` 回應 `ok:true`。

2026-05-21：第 2 版調整學員與講師流程。學員端現在分成報到頁與遊戲頁，進入時只顯示報到功能，完成報到後才顯示戰隊、個人積分、戰隊積分、題目與作答區。為避免學員互相提示答案，`submitAnswer` 不再立即回傳正誤與分數，只記錄答案；講師呼叫 `closeAndScoreQuestion` 關題後才計分。學員端沿用 Firebase `gameState` 每 5 秒低頻公開狀態輪詢，偵測到 `question_closed` 後才呼叫 GAS `getPlayerSummary` 一次更新個人與戰隊分數，避免高頻分數輪詢造成 GAS 壓力。講師端新增投影用「關題公布」區塊，關題後會顯示正確答案、答案說明與排行榜。前端版本更新為 `0.2.7`。GAS 已推送並更新既有 Web App deployment 到 version 13，正式 URL 不變；Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。線上檢查結果：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.7`，GAS `getGameState` 回應 `ok:true`。

2026-05-21：第 2 版新增作答確認、倒數計時與講師選題清單。學員端翻開試卷後會依題目 `timeLimitSec` 顯示倒數，點擊答案後需確認才送出，送出後由 GAS `submitAnswer` 立即回傳正誤、剩餘秒數、基本分、最快答對加分與本題總分。GAS 送出當下會把分數寫入作答紀錄與玩家分數；講師關題仍保留既有流程，已計分紀錄不會重複加分。講師端題目控制改為讀取 Firebase `publicQuestions/{gameId}` 並以下拉選單選題，不再要求講師手動輸入題目 ID。本次版本更新為 `0.2.6`，已完成本機語法與 JSON 檢查；尚未推送 GAS 或部署 Firebase Hosting。

2026-05-21：針對「電腦端可執行、手機端顯示無法連線到 GAS」進行修正。線上 GAS 回應標頭已有 `Access-Control-Allow-Origin: *`，因此前端 API 改為優先使用 `fetch GET` 呼叫 GAS，讀回文字後解析 JSONP 包裝；若 fetch 失敗，再退回 JSONP。此修正避免手機瀏覽器因跨網域 `<script>` 載入 GAS 失敗而直接報到失敗。前端版本更新為 `v=0.2.5`。本次只部署 Firebase Hosting，未推送 GAS、Cloud Functions 或 Firebase rules。線上檢查結果：學員端回應 `200`，HTML 已包含 `app.js?v=0.2.5`，`api.js` 已包含 `callFetchGet`，GAS `joinGame` 測試成功。

2026-05-21：修正手機端載入舊前端資料與模組快取問題。前端 `config.js`、`app.js`、`api.js` 均改用 `v=0.2.4` 版本參數，Firebase Hosting 對 HTML / JavaScript 增加 `no-cache, no-store, must-revalidate`。學員端新增 `clientVersion` 檢查，版本更新時會清除舊的 `vaccineGamePlayer` 與公開題庫暫存，避免繼續載入舊玩家資料。學員端新增手機橫式版面，橫放時改為左右欄操作。本次只部署 Firebase Hosting，未推送 GAS、Cloud Functions 或 Firebase rules。線上檢查結果：學員端與講師端回應 `200`，HTML 已包含 `app.js?v=0.2.4`，JavaScript 回應標頭為 `no-cache, no-store, must-revalidate`，GAS `joinGame` 測試成功。

2026-05-21：修正學員報到失敗風險。線上 GAS `joinGame` 以假暱稱測試成功，代表後端可用；前端失敗原因判斷為瀏覽器可能保留舊 `vaccineGameGasUrl` 覆蓋正式設定。已將學員端與講師端改為固定使用 `config.js` 的正式 GAS URL，並清除舊 localStorage URL。講師端後端設定區已隱藏 GAS URL，只保留管理密碼；套用後會顯示「講師已完成設定」。本次只部署 Firebase Hosting，未推送 GAS、Cloud Functions 或 Firebase rules。線上檢查結果：學員端與講師端均回應 `200`，講師端已隱藏 GAS URL 欄位並保留管理密碼欄位，GAS `joinGame` 測試成功。正式活動前需按「初始化遊戲資料」清除本次假資料測試學員。

2026-05-21：第 2 版新增資料初始化與讀取速度改善。本次新增 GAS `resetGameData` 管理 API 與講師端「初始化遊戲資料」按鈕，可清空玩家、作答、翻卷與排行榜資料，保留題庫與戰隊設定。預設測試題增加為 3 題。速度改善包含 Firebase service account access token 快取、玩家資料快取、翻卷時間快取、重複作答快取，以及學員端 Firebase 公開題庫 10 分鐘工作階段快取。已在本機完成語法檢查、JSON 檢查、Functions 編譯與本機頁面 `200` 回應檢查。GAS 已更新既有 Web App deployment 到 version 12，正式 URL 不變；Firebase 已只部署 Hosting，未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。線上檢查結果：學員端與講師端 Hosting 均回應 `200`，講師端已出現「初始化遊戲資料」按鈕，GAS `getGameState` 回應 `200`。

2026-05-21：第 1 版正式結案，並啟動第 2 版。第 2 版第一優先是讀取速度最佳化，因目前瓶頸在 GAS 每次呼叫都可能讀寫 Google Sheets。已先在 GAS 加入 Script Cache：工作表初始化狀態、題庫、場次狀態皆快取 300 秒；開題與關題會同步更新場次狀態快取。新增 `docs/11_v2_roadmap.md` 作為第 2 版工作路線圖。

2026-05-21：GAS 快取版已部署為 Web App version 10。測試結果：`getCurrentQuestion` 約 2.3 秒，`joinGame` 約 2.4 秒，`openQuestion` 約 17.5 秒。第 2 版下一個速度改善重點應改為「公開題目內容同步到 Firebase」，讓學員端先從 Firebase 快速顯示題目，GAS 保留記錄翻卷時間與作答的可信任職責。

2026-05-21：使用者完成 Firebase 服務帳戶 Script Properties 設定後，已重測 `gameState` 同步。`openQuestion` 與 `closeAndScoreQuestion` 均回傳 `firebaseSync.skipped = false`。Realtime Database `gameState/game_YYYYMMDD_vaccine_training` 已可在開題時更新為 `question_open`、在關題時更新為 `question_closed`。第 1 版目前已具備 Firebase Hosting、GAS / Google Sheets 主流程、Firebase Realtime Database 公開狀態提示、學員端手機版與講師端手機版。

2026-05-21：使用者完成 `ADMIN_API_SECRET` 設定後，已執行第 1 版端到端流程測試。GAS / Google Sheets 主流程已測通：`createGame`、`openQuestion`、`joinGame`、`getCurrentQuestion`、`submitAnswer`、`closeAndScoreQuestion`、`getScoreboard` 皆成功。測試學員答對 `demo_q001`，6 秒送出，基本分 30 分，加上首位答對 5 分，排行榜顯示 `team_1` 總分 35 分。Firebase Hosting 學員端與講師端皆回應 `200`。Firebase Realtime Database `gameState` 目前仍為 `null`，因 Apps Script 尚未設定 `FIREBASE_DATABASE_URL` 與 `FIREBASE_DATABASE_AUTH_TOKEN`；正式計分不受影響，但學員端 Firebase 公開狀態提示尚未啟用。

2026-05-21：Firebase `gameState` 寫入方案改為 GAS 支援 Firebase 服務帳戶短效 access token，不使用前端寫入，也不把 Firebase 寫入密鑰放入程式。Realtime Database rules 只允許部署帳號或本專案服務帳戶寫入，`gameState` 維持公開讀取。Apps Script OAuth token 實測被 Firebase 回覆 `401 Unauthorized request`，仍需使用者在 Apps Script Script Properties 設定 `FIREBASE_SERVICE_ACCOUNT_EMAIL` 與 `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`。

2026-05-21：第 1 版前端新增 GAS API 封裝。學員端可透過 `config.js` 串接 GAS Web App 報到、依講師口令翻開試卷取得目前題目與作答；講師端可設定 GAS Web App URL 與管理密鑰，並呼叫啟動、開題、關題計分與排行榜讀取流程。GAS 新增 `getCurrentQuestion` 與 `getScoreboard`，`getCurrentQuestion` 僅下發公開題目資訊，不下發正確答案。學員端不自動更新題目，以避免競賽起跑時間差。學員端版面改為手機優先 RWD，並保留未來美化按鈕與選單的 CSS 主題入口。本次計分改為以 GAS 記錄的翻開試卷時間為起點，第一位提交且答對者額外加 5 分，並新增 Firebase `gameState` 公開狀態提示。`setupGameSheets` 會在題庫空白時建立 `demo_q001` 預設測試題；獨立 Apps Script 專案若未設定 `SPREADSHEET_ID`，會自動建立資料試算表。Firebase Hosting 已重新部署，學員端與講師端線上網址皆回應 `200`。GAS Web App 已可公開呼叫，前端已切換 GAS 模式；在 Apps Script Properties 設定 Firebase 同步參數後，`gameState` 才會由 GAS 寫入 Realtime Database。
# 最近一次修改摘要：0.4.23 投影開題同步與學員誤關題修正
1. 投影端自動更新改為 Firebase Realtime Database 串流通知，低頻備援只讀 Firebase，不再自動輪詢 GAS。
2. 投影端手動刷新才允許使用 GAS 補救讀取，避免課堂中因 GAS 連線或 Google Sheets 延遲造成畫面卡住。
3. 學員端開題後翻開試卷時，會忽略較舊的 `question_closed` 狀態，避免剛開題就被上一題或舊狀態誤關閉。
4. 學員端倒數歸零不再自動關閉作答，實際停止作答只依講師關題狀態。
5. 學員端頂端狀態列新增學員姓名。
6. 學員端結算訊息只在取得幸運獎時顯示上台領獎，不再顯示「沒有幸運獎」。
7. 已推送 GAS，Apps Script Web App deployment 更新為 `@46`。
8. 已部署 Firebase Hosting，學員端、講師端與投影端線上頁面皆載入 `0.4.23` 並回應 `200`。
## 0.5.23 補充修正：道具計分流程
1. 道具使用視窗仍由 `getItemUseWindow()` 控制，只有關題後到結算前可用，開題中不可使用。
2. 加分卡與挑戰卡維持本機端即時加分，並透過 Firebase `itemUses` 供 GAS 後續同步。
3. 加倍卡只屬於下一題型道具：關題後使用時前端先 `queueItemUse()`，下一題開題時 `flushQueuedItemUses()` 才送出，下一題關題時由本機與 GAS 分別套用。
4. 翻身卡不再套用在下一題答案揭曉，而是依目前關題題號的 `comebackControl` 立即決定 `+30/+5`；若該題尚未結算完成，前端會 15 秒後自動再確認。
5. GAS `scoreClosedQuestionNow()` 與舊版 `closeAndScoreQuestion()` 會在排行榜重算後發布 `comebackControl`，內容包含 `questionId`、各隊排名、是否開啟與效果分數。
6. GAS `syncFirebaseItemUsesForQuestionToSheet()` 會尊重 Firebase item use 的 `targetQuestionId`，避免道具被同步到錯誤題號。
7. `syncFirebaseItemUsesForFinalSettlement()` 會依 pending item use 的 `targetQuestionId` 補同步各題道具，不只同步最後一題。
8. 學員端 `index.html` 快取參數更新為 `0.5.23-item-score1`，未變更 `clientVersion`。

## 0.5.23 補充修正：挑戰卡分數同步
1. 挑戰卡邏輯維持與加分卡一致：學員端先用本機已決定的 `effectScore` 即時加分，不交由 GAS 即時計算。
2. `frontend/student/dist/app.js` 的 `sendItemUseNow()` 與 `flushQueuedItemUses()` 不再排除 `challenge`，挑戰卡也會寫入 Firebase `itemUses`。
3. 新增 `syncSentChallengeItemUses()`，用於補送舊版已在本機標記為 `sent`、但還沒有 `fastSyncedAt` 的挑戰卡紀錄。
4. `refreshFinalResults()` 讀取最後成績前會先執行挑戰卡同步，避免已結算畫面漏掉本機已使用的挑戰卡分數。
5. `updateLocalScoreSummary()` 保留本機分數與後端分數取較大值的原本邏輯，避免後端同步延遲時頂欄分數偏低。
6. GAS `getFinalResults()` 會同步 Firebase 玩家與道具使用紀錄後重算排行榜，讓已決定的挑戰卡 `effectScore` 進入結算結果。
7. 學員端 `index.html` 快取參數更新為 `0.5.23-challenge-sync1`，未變更 `clientVersion`。
## 第 6 版定版與第 7 版交接重點

1. `0.6.13` 已定為第 6 版定版。
2. 第 6 版定版後，原則上不再新增大型架構功能，只接受必要修正。
3. Firebase 即時計分遷移改列為第 7 版工作事項。
4. 第 7 版主要任務是降低現場延遲，處理 GAS 大量回應、Google Sheets 寫入與關題計分可能造成的等待、逾時或中斷問題。
5. 第 7 版規劃文件：`docs/19_v6_final_and_v7_roadmap.md`。
6. 第 7 版方向：
   - 學員答題與道具使用先寫 Firebase。
   - 即時計分與排行榜快照優先由 Firebase 提供。
   - GAS 只讀取 Firebase 已鎖定批次。
   - GAS 背景整批寫入 Google Sheets。
   - Google Sheets 作為賽後稽核、報表與備份來源，不作為現場高頻即時運算主體。
7. 下一位 AI 接手時，請先閱讀 `docs/19_v6_final_and_v7_roadmap.md`，再拆第 7 版小任務實作，不要直接大改關題核心。
