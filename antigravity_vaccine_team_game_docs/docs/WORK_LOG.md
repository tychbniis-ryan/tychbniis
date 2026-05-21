# 工作日誌

## 用途

本文件記錄第 1 版開發過程、已完成工作、測試結果、部署狀態、阻塞點與下一步。下一位 AI 接手時，請先閱讀：

1. `docs/AI_HANDOVER.md`
2. `docs/WORK_LOG.md`
3. `README.md`
4. `CHANGELOG.md`
5. `gas/README.md`
6. `docs/10_gas_web_app_deployment.md`

## 目前狀態總覽

| 項目 | 狀態 | 備註 |
|---|---|---|
| Firebase Hosting 學員端 | 已部署 | https://tychbniis-32af5-student.web.app |
| Firebase Hosting 講師端 | 已部署 | https://tychbniis-32af5-instructor.web.app |
| Firestore | 已建立 | `(default)`，位置 `asia-east1` |
| Realtime Database | 已建立 | `tychbniis-32af5-default-rtdb`，位置 `asia-southeast1` |
| Firebase rules | 已部署 | Firestore 與 Realtime Database rules 皆已部署 |
| Cloud Functions | 免費方案暫停 | 使用者要求維持免費方案，不啟用 Blaze |
| GAS 後端 | 第 1 版完成 | Web App 已可公開呼叫，主流程與 Firebase `gameState` 同步已測通 |
| 第 2 版 | 已啟動 | 第一優先為讀取速度最佳化 |
| GitHub CLI | 已登入 | 帳號為 `tychbniis-ryan` |
| Git push | 尚未執行 | 未收到使用者明確要求，不主動 push |

## 架構決策紀錄

### 2026-05-21：報到分頁、關題後給分與投影排行榜

使用者需求：

1. 學員進入遊戲頁面時只顯示報到功能。
2. 完成報到後再進入遊戲頁。
3. 遊戲頁最上方顯示戰隊資料、個人積分與戰隊積分。
4. 為避免學員互相提示答案，不在送出答案後立即顯示分數，改為講師關題後給分。
5. 講師控制台會投影，關題計分後需公布正確答案並顯示排行榜。

流量判斷：

1. 不採用每位學員高頻輪詢 GAS 分數。
2. 沿用既有 Firebase `gameState` 每 5 秒公開狀態讀取。
3. 學員端只有偵測到 `question_closed` 後，才呼叫 GAS `getPlayerSummary` 一次更新個人與戰隊分數。
4. 以 200 名學員估算，每題關題後約 200 次 GAS 查詢，屬於事件觸發型查詢；比每秒查詢分數安全。

處理方式：

1. 學員端新增 `checkinView` 與 `gameView`，報到前隱藏題目、狀態與積分。
2. 學員端送出答案後只顯示「等待講師關題計分」。
3. GAS `submitAnswer` 保持只記錄作答，不回傳正誤與分數。
4. GAS `closeAndScoreQuestion` 關題時計分，並回傳正確答案、答案說明與排行榜。
5. GAS 新增 `getPlayerSummary`，供學員端關題後更新個人與戰隊積分。
6. 講師端新增投影用「關題公布」區塊。

本機測試：

1. 前端 JavaScript 語法檢查：通過。
2. GAS 暫存語法檢查：通過。
3. JSON 設定檔解析：通過。
4. `npm run check:functions`：通過。

部署狀態：

1. GAS 已執行 `npx clasp push`。
2. GAS 已建立 version 13：`v2 close-score projection flow 2026-05-21`。
3. GAS 已更新既有 Web App deployment：
   - deployment ID：`AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC`
   - version：`13`
   - 正式 URL 不變。
4. Firebase 已執行 `firebase deploy --only hosting`。
5. 未部署 Cloud Functions。
6. 未部署 Firestore rules。
7. 未部署 Realtime Database rules。

線上檢查：

1. 學員端 Hosting 回應 `200`，HTML 已包含 `app.js?v=0.2.7`。
2. 講師端 Hosting 回應 `200`，HTML 已包含 `app.js?v=0.2.7`。
3. 學員端 HTML 已包含 `checkinView`、`gameView` 與 `score-strip`。
4. 講師端 HTML 已包含 `answerReveal` 與 `scoreboardList`。
5. JavaScript 回應標頭為 `no-cache, no-store, must-revalidate`。
6. GAS `getGameState` 回應 `200` 且 `ok:true`。

### 2026-05-21：作答確認、倒數計時與講師選題清單

使用者需求：

1. 學員點擊答案後，要先確認送出。
2. 學員作答時要有倒數計時器。
3. 答對後直接顯示本題得分，分數依目前設定規則計算。
4. 講師出題不要手動輸入題目 ID，因現場不會有人記得 ID。

處理方式：

1. 學員端點選答案後使用確認視窗，確認後才呼叫 `submitAnswer`。
2. 學員端翻開試卷後依題目 `timeLimitSec` 啟動倒數，倒數結束會停用選項。
3. GAS `submitAnswer` 立即判斷正誤、作答秒數、剩餘秒數、基本分、最快答對加分與本題總分，並寫入 Google Sheets。
4. `closeAndScoreQuestion` 保留既有流程，對已計分的作答紀錄不重複加分。
5. 講師端從 Firebase `publicQuestions/{gameId}` 讀取公開題庫，以下拉選單讓講師選題。

本機測試：

1. 前端 JavaScript 語法檢查：通過。
2. GAS 暫存語法檢查：通過。
3. JSON 設定檔解析：通過。

部署狀態：

1. 尚未部署 Firebase Hosting。
2. 尚未推送 GAS。
3. 尚未部署 Cloud Functions。
4. 尚未部署 Firebase rules。

### 2026-05-21：手機端 GAS 連線改用 fetch 優先

使用者回報：

1. 電腦端執行 OK。
2. 手機端執行失敗，顯示「無法連線到 GAS」。

Root Cause：

1. 後端 GAS `joinGame` 直接測試成功，HTTP `200`。
2. GAS 回應標頭包含 `Access-Control-Allow-Origin: *`。
3. 原本前端使用 JSONP，也就是用 `<script>` 載入 GAS。手機瀏覽器可能封鎖或中斷跨網域 script 載入，因此觸發 `script.onerror`。

處理方式：

1. 前端 API 改為優先使用 `fetch GET` 呼叫 GAS。
2. GAS 仍回傳 JSONP 包裝，前端以文字讀取後解析括號內 JSON。
3. 若 fetch 失敗，再退回原本 JSONP。
4. 前端版本更新為 `0.2.5`，避免手機載入舊 API。

本機測試：

1. 前端 JavaScript 語法檢查：通過。
2. JSON 設定檔解析：通過。
3. `npm run check:functions`：通過。
4. 本機學員端回應 `200`。
5. 本機講師端回應 `200`。
6. 本機 HTML 已包含 `app.js?v=0.2.5`。

部署與線上測試：

1. 已執行 `firebase deploy --only hosting`。
2. 未推送 GAS。
3. 未部署 Cloud Functions。
4. 未部署 Firebase rules。
5. 線上學員端回應 `200`。
6. 線上 HTML 已包含 `app.js?v=0.2.5`。
7. 線上 `api.js` 已包含 `callFetchGet`。
8. 線上 JavaScript 回應標頭為 `no-cache, no-store, must-revalidate`。
9. 線上 GAS `joinGame` 測試成功。
10. 正式活動前需按「初始化遊戲資料」清除本次測試學員。

### 2026-05-21：手機橫式與前端快取破壞

使用者回報：

1. 手機端用戶以橫式進行遊戲。
2. 講師端套用設定後仍可能卡在「正在讀取後端設定...」。
3. 學員端仍載入舊資料，導致報到失敗。

Root Cause：

1. 瀏覽器可能混用舊 `app.js` 與新 `api.js`，或新 `app.js` 與舊 `api.js`，造成 ES module 載入失敗，頁面停在初始文字。
2. 學員端會保留 `localStorage.vaccineGamePlayer`，前端更新後仍可能顯示舊玩家。
3. Hosting 未針對 HTML / JavaScript 明確設定不快取。

處理方式：

1. HTML 載入 `config.js?v=0.2.4` 與 `app.js?v=0.2.4`。
2. `app.js` 匯入 `api.js?v=0.2.4`。
3. `config.js` 新增 `clientVersion: "0.2.4"`。
4. 學員端偵測前端版本變更後，清除舊 `vaccineGamePlayer` 與公開題庫暫存。
5. `firebase.json` 對 HTML / JavaScript 增加 `Cache-Control: no-cache, no-store, must-revalidate`。
6. 學員端 CSS 新增手機橫式版面，橫放手機時改為左右欄。

本機測試：

1. 前端 JavaScript 語法檢查：通過。
2. JSON 設定檔解析：通過。
3. `npm run check:functions`：通過。
4. 本機學員端回應 `200`。
5. 本機講師端回應 `200`。
6. 本機 HTML 已包含 `app.js?v=0.2.4`。

部署與線上測試：

1. 已執行 `firebase deploy --only hosting`。
2. 未推送 GAS。
3. 未部署 Cloud Functions。
4. 未部署 Firebase rules。
5. 線上學員端回應 `200`。
6. 線上講師端回應 `200`。
7. 線上 HTML 已包含 `app.js?v=0.2.4`。
8. 線上 JavaScript 回應標頭為 `no-cache, no-store, must-revalidate`。
9. 線上 GAS `joinGame` 測試成功。
10. 正式活動前需按「初始化遊戲資料」清除本次測試學員。

### 2026-05-21：修正報到失敗與講師設定簡化

使用者回報：

1. 學員報到失敗。
2. 講師端「套用設定」只需要輸入管理密碼。
3. GAS Web App URL 不會改動，應隱藏。
4. 套用完成後要提示「講師已完成設定」。

檢查結果：

1. 直接呼叫線上 GAS `joinGame` 成功，回傳測試玩家 `playerId`。
2. GAS 後端可用，報到失敗不是後端不可用。
3. 前端仍會讀取 `localStorage.vaccineGameGasUrl`，若使用者瀏覽器曾存到舊 URL，會覆蓋 `config.js` 的正式 URL。

處理方式：

1. 學員端固定使用 `frontend/student/dist/config.js` 的 `gasWebAppUrl`。
2. 講師端固定使用 `frontend/instructor/dist/config.js` 的 `gasWebAppUrl`。
3. 兩端都會移除舊的 `localStorage.vaccineGameGasUrl`。
4. 講師端移除 GAS Web App URL 輸入框。
5. 講師端按「套用設定」後顯示「講師已完成設定。管理密碼只保存在本機瀏覽器工作階段。」

本機測試：

1. 前端 JavaScript 語法檢查：通過。
2. JSON 設定檔解析：通過。
3. 本機學員端頁面回應 `200`。
4. 本機講師端頁面回應 `200`。
5. 本機講師端 HTML 不再包含 `GAS Web App URL` 欄位。

部署與線上測試：

1. 已執行 `firebase deploy --only hosting`。
2. 未推送 GAS，因本次未改 `gas/Code.gs`。
3. 未部署 Cloud Functions。
4. 未部署 Firebase rules。
5. 線上學員端回應 `200`。
6. 線上講師端回應 `200`。
7. 線上講師端 HTML 不再包含 `GAS Web App URL` 欄位。
8. 線上講師端 HTML 保留 `管理密碼` 欄位。
9. 線上 GAS `joinGame` 測試成功，建立假資料測試學員。
10. 正式活動前需按「初始化遊戲資料」清除本次測試學員。

### 2026-05-21：第 2 版本機測試優先

使用者要求：

1. 先在本機端測試。
2. 測試通過後再考慮推送至雲端伺服器。
3. 避免未確認修改造成 Firebase、GAS 或其他雲端服務用量增加。

執行規則：

1. 本輪不執行 `firebase deploy`。
2. 本輪不執行 `clasp push`。
3. 本輪不執行 `clasp deploy`.
4. 本機測試通過後，才進行最小雲端部署。

本次第 2 版修改：

1. GAS 新增 `resetGameData` 管理 API。
2. 講師端新增「初始化遊戲資料」按鈕。
3. 預設測試題增加為 3 題。
4. GAS 增加 Firebase access token、玩家、翻卷與作答檢查快取。
5. 學員端增加 Firebase 公開題庫 10 分鐘工作階段快取。
6. 低 token 工作流寫入設定與文件。

本機測試結果：

1. GAS 暫存語法檢查：通過。
2. 前端 JavaScript 語法檢查：通過。
3. JSON 設定檔解析：通過。
4. `npm run check:functions`：通過。
5. 本機學員端頁面回應 `200`。
6. 本機講師端頁面回應 `200`。

雲端部署結果：

1. GAS 已執行 `npx clasp push`。
2. GAS 已更新既有 Web App deployment：
   - deployment ID：`AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC`
   - version：`12`
   - URL 不變。
3. Firebase 已執行 `firebase deploy --only hosting`。
4. 未部署 Cloud Functions。
5. 未部署 Firestore rules。
6. 未部署 Realtime Database rules。

線上檢查結果：

1. 學員端 Hosting 回應 `200`。
2. 講師端 Hosting 回應 `200`。
3. 講師端 HTML 已包含「初始化遊戲資料」按鈕。
4. GAS Web App `getGameState` 回應 `200`。

### 2026-05-21：第 1 版正式結案

結案標準：

1. 學員端手機版可用。
2. 講師端手機版可用。
3. GAS / Google Sheets 主流程可完成報到、開題、翻卷、作答、關題計分、排行榜。
4. Firebase `gameState` 可同步講師開題與關題狀態。
5. 交接文件、工作日誌與 CHANGELOG 已更新。

結論：第 1 版完成。

### 2026-05-21：第 2 版啟動

第 2 版第一優先：讀取速度最佳化。

Root Cause：

1. GAS 呼叫 Google Sheets 的延遲高於 Firebase。
2. 學員翻開試卷時若大量同時呼叫 `getCurrentQuestion`，會重複觸發工作表初始化、狀態讀取與題庫讀取。
3. 目前要維持免費方案，因此不能用 Cloud Functions 解決。

已採取措施：

1. GAS 新增 Script Cache。
2. 工作表初始化狀態快取 300 秒。
3. 題庫快取 300 秒。
4. 場次狀態快取 300 秒。
5. 開題與關題時同步更新場次狀態快取。

部署與測試：

1. GAS 已部署為 Web App version 10。
2. `openQuestion` 測試成功，Firebase 同步成功，耗時約 17.5 秒。
3. `joinGame` 測試成功，耗時約 2.4 秒。
4. 第一次 `getCurrentQuestion` 測試成功，耗時約 2.3 秒。
5. 第二次 `getCurrentQuestion` 測試成功，耗時約 2.3 秒。
6. Realtime Database `gameState` 正確顯示 `question_open` 與 `demo_q001`。

速度判斷：

1. 學員翻卷已可維持約 2 至 3 秒。
2. 講師開題仍慢，主因是開題同時寫入 Google Sheets、產生 Firebase service account token、寫入 Realtime Database。
3. 第 2 版下一階段應把公開題目內容同步到 Firebase，讓學員端先從 Firebase 讀題目，GAS 只負責記錄翻卷時間與收作答。

第 2 版後續工作請見：

```text
docs/11_v2_roadmap.md
```

### 2026-05-21：公開題庫預載到 Firebase

使用者需求：

1. 題目資料可以在一開始就先全部載入。
2. 講師開放題目時，學員端不需要重新呼叫 GAS 取得題目內容。
3. 正確答案仍不可放到前端或 Firebase 公開資料。

本次設計：

1. GAS `createGame` 會讀取 Google Sheets 題庫，驗證後把公開題目同步到 Firebase Realtime Database `publicQuestions/{gameId}`。
2. 同步內容只包含 `questionId`、`order`、`type`、`section`、`title`、`options`、`timeLimitSec`、`scoreMode`、`isBossQuestion`、`isCreativeVote`。
3. `correctAnswer` 與 `explanation` 仍只保留在 Google Sheets，由 GAS 關題時判斷。
4. GAS 新增 `openPaper` action，只記錄學員翻開試卷時間，不回傳題目內容。
5. 學員端啟動時預載 `publicQuestions/{gameId}`，按「翻開試卷」時優先從 Firebase 快取顯示題目，再呼叫 `openPaper` 讓 GAS 記錄伺服端翻卷時間。
6. 若 Firebase 公開題目暫不可用，學員端保留回退流程，仍可呼叫 `getCurrentQuestion`。
7. 學員端與講師端 JSONP 呼叫新增 25 秒逾時與最多 3 次重試，處理 Apps Script 偶發回傳 Google Drive HTML 錯誤頁的情況。

風險控制：

1. Realtime Database rules 只讓前端公開讀取 `publicQuestions`，前端沒有寫入權限。
2. 題目 ID 若含 Firebase 不支援字元，GAS 同步時會直接報錯，避免寫入異常路徑。
3. 正式活動前若修改題庫，應由講師端重新啟動場次或執行題庫同步，讓 Firebase 公開題庫更新。

部署與測試：

1. GAS 已部署為 Web App version 11。
2. 原 Web App deployment 更新後外部呼叫出現 `403 / 找不到網頁`，已建立新的公開 Web App deployment。
3. 目前正式 Web App URL：

```text
https://script.google.com/macros/s/AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC/exec
```

4. 學員端與講師端 Hosting 已重新部署並改用新 Web App URL。
5. `createGame` 測試成功，`questionsSync.skipped = false`，公開題數為 1。
6. Firebase `publicQuestions/{gameId}/demo_q001` 測試成功，未包含 `correctAnswer`。
7. `openQuestion` 測試成功，`firebaseSync.skipped = false`。
8. Firebase `gameState/{gameId}` 測試成功，含 `currentQuestionId = demo_q001` 與 `publicQuestion`。
9. `joinGame` 測試成功。
10. `openPaper` 測試成功，GAS 有回傳 `paperOpenedAt`。
11. Apps Script 偶發第一次回傳 Google Drive HTML 錯誤頁，第二或第三次呼叫成功；前端已加入最多 3 次重試。

### 2026-05-21：第 1 版固定採免費方案

決策：

1. 不使用 Firebase Cloud Functions。
2. Firebase Hosting 只放學員端與講師端靜態頁。
3. GAS Web App 作為可信任後端。
4. Google Sheets 作為第 1 版主要資料庫。
5. Firebase Realtime Database 的 `gameState` 僅作公開狀態同步，不作為計分依據。
6. 第 1 版資料庫與判斷來源是 GAS / Google Sheets，不是 Firebase Firestore 或 Realtime Database。

原因：

1. Cloud Functions 需要 Blaze 方案，不符合「一定要免費專案」要求。
2. GAS + Google Sheets 方便承辦人維護題庫與成績。
3. 第 1 版以可操作、可回復、可交接為優先。

### 2026-05-21：學員端不自動更新題目

決策：

1. 學員端不使用自動輪詢。
2. 講師開題後，由學員依口令按「翻開試卷」。
3. 計時起點由 GAS 在 `getCurrentQuestion` 時記錄伺服端時間。

原因：

1. 本競賽要比較誰先完成。
2. 自動更新會因裝置、網路、輪詢間隔造成起跑時間差。
3. 手動翻開試卷符合現場講師口令控場。

### 2026-05-21：計分規則

目前規則：

1. `baseScore`：答對才有基本分，依 `responseSeconds` 區間計算。
2. `responseSeconds`：`submitAnswer` 時間減去 `試卷開啟紀錄.paperOpenedAt`。
3. `firstCorrectBonus`：每題第一位「提交且答對」者加 5 分。
4. `score`：`baseScore + firstCorrectBonus`。
5. 已計分紀錄不重複加分，避免講師重複關題造成分數重複累加。

## 已完成工作紀錄

### 2026-05-21：Firebase 初始化與 Hosting

完成：

1. 建立 Firebase project：`tychbniis-32af5`。
2. 建立 Hosting site：
   - `tychbniis-32af5-student`
   - `tychbniis-32af5-instructor`
3. 建立 Realtime Database instance：
   - `tychbniis-32af5-default-rtdb`
4. 建立 Firestore database：
   - `(default)`
5. 部署 Firestore rules 與 Realtime Database rules。
6. 部署學員端與講師端 Hosting。

驗證：

1. 學員端線上網址回應 `200`。
2. 講師端線上網址回應 `200`。

### 2026-05-21：GAS 免費方案後端

完成：

1. 建立 `gas/Code.gs`。
2. 支援 `doPost` 與 `doGet` JSONP。
3. 支援 action：
   - `joinGame`
   - `getGameState`
   - `getCurrentQuestion`
   - `submitAnswer`
   - `createGame`
   - `openQuestion`
   - `closeAndScoreQuestion`
   - `recalculateScoreboard`
4. 新增工作表：
   - `題庫`
   - `場次設定`
   - `戰隊設定`
   - `玩家`
   - `試卷開啟紀錄`
   - `作答紀錄`
   - `場次狀態`
   - `排行榜`
5. 新增預設 5 個戰隊種子資料。
6. 新增既有工作表自動補欄位邏輯。

注意：

1. 正式 GAS Web App 尚未部署。
2. 下一步需要使用者在 Google Sheets 的 Apps Script 貼上最新版 `gas/Code.gs`。

### 2026-05-21：學員端

完成：

1. 手機優先 RWD。
2. 報到流程。
3. 依講師口令按「翻開試卷」取得題目。
4. 未報到不能翻開試卷。
5. 作答後按鈕停用，避免同一題重複點擊。
6. 不自動更新題目。
7. CSS 保留未來美化入口：
   - `.paper-action`
   - `.option-button`
   - `.primary-action`
   - CSS 變數區 `:root`

測試：

1. JavaScript 語法檢查通過。
2. 模擬互動通過：
   - 未報到時不能翻開試卷。
   - 報到後可翻開試卷。
   - 顯示示範題與 4 個選項。
   - 作答後顯示送出成功訊息。

### 2026-05-21：講師端

完成：

1. 可輸入 GAS Web App URL。
2. 可輸入管理密鑰。
3. 可呼叫：
   - 啟動場次
   - 開放題目
   - 關閉題目並計分
4. 管理密鑰只保存在瀏覽器 session，不寫入程式碼。

待辦：

1. 講師端目前仍是基本控制台。
2. 尚未做手機優先 RWD 重設計。
3. 尚未顯示排行榜與即時狀態面板。

### 2026-05-21：Firebase gameState

完成：

1. GAS 新增可選 `publishGameStateToFirebase`。
2. 在以下 action 後嘗試同步：
   - `createGame`
   - `openQuestion`
   - `closeAndScoreQuestion`
3. 未設定 Firebase 同步參數時自動略過，不影響主流程。

需要使用者設定：

1. `FIREBASE_DATABASE_URL`
2. `FIREBASE_DATABASE_AUTH_TOKEN`

資安提醒：

1. `FIREBASE_DATABASE_AUTH_TOKEN` 不得寫入程式碼。
2. 若未確認 token 權限，先不要啟用 Firebase 同步。

## 測試紀錄

### 語法檢查

已執行：

```powershell
node --check frontend/student/dist/api.js
node --check frontend/student/dist/app.js
node --check frontend/instructor/dist/api.js
node --check frontend/instructor/dist/app.js
```

GAS 語法檢查方式：

```powershell
Copy-Item .\gas\Code.gs .\gas\Code.syntax-check.tmp.js -Force
node --check .\gas\Code.syntax-check.tmp.js
Remove-Item .\gas\Code.syntax-check.tmp.js -Force
```

結果：

1. 前端語法檢查通過。
2. GAS 語法檢查通過。

### 線上檢查

已檢查：

1. `https://tychbniis-32af5-student.web.app`
2. `https://tychbniis-32af5-instructor.web.app`

結果：

1. 兩者皆回應 `200`。
2. 學員端線上版本包含未報到不可翻開試卷檢查。
3. 學員端線上示範 API 包含 `paperOpenedAt`。

## Git commit 紀錄

近期重要 commit：

```text
44aba1e [計分規則] feat：新增開卷計時與首位答對獎勵
bfe0701 [學員端] feat：改為手動翻開試卷取題
507a18a [學員端] feat：讀取GAS目前題目
3cbd997 [GAS串接] feat：新增JSONP傳輸模式
3250c8b [前端串接] feat：新增GAS後端設定入口
816fd82 [GAS後端] feat：改用免費方案判斷流程
```

注意：

1. 本機 commit 尚未 push 到 GitHub。
2. 若使用者要求上傳 GitHub，再執行 `git push`。

## 目前阻塞點

### 2026-05-21：第 1 版端到端流程測試完成

Status：GAS / Google Sheets 主流程已測通。  
Root Cause：使用者已設定 `ADMIN_API_SECRET`，講師管理 API 可正常執行。  
Test Result：

1. `createGame`：成功，場次狀態為 `draft`。
2. `openQuestion`：成功開放 `demo_q001`。
3. `joinGame`：成功建立測試學員。
4. `getCurrentQuestion`：成功取得 `demo_q001`，選項數量為 4，未下發 `correctAnswer`。
5. `submitAnswer`：成功送出答案，測試作答秒數為 6 秒。
6. `closeAndScoreQuestion`：成功關題並計分，處理 1 筆作答。
7. `getScoreboard`：成功讀取排行榜，`team_1` 測試總分為 35 分。
8. 學員端 Hosting 回應 `200`。
9. 講師端 Hosting 回應 `200`。

Score Logic Check：

1. 測試學員答對 `demo_q001`。
2. 6 秒送出，基本分為 30 分。
3. 為該題第一位答對者，加 5 分。
4. 合計 35 分，符合規則。

注意：本次測試已在 Google Sheets 留下測試報到與作答資料，暱稱為「流程測試學員」。正式活動前應清理測試資料，或建立正式 `GAME_ID`。

### Firebase gameState 尚未同步

Status：Realtime Database `gameState/game_YYYYMMDD_vaccine_training` 目前回傳 `null`。  
Root Cause：GAS 主流程已可用，但 Apps Script 尚未設定 `FIREBASE_DATABASE_URL` 與 `FIREBASE_DATABASE_AUTH_TOKEN`，因此 `publishGameStateToFirebase` 會略過同步。  
Suggested Fix：

1. 第 1 版正式計分不受影響，因為 GAS / Google Sheets 已測通。
2. 若要讓學員端顯示「講師已開放題目」的 Firebase 即時提示，需另外設定 Firebase 寫入驗證方式。
3. 不建議把 Realtime Database rules 改成公開可寫，避免任何人改動公開狀態。

### 2026-05-21：Firebase gameState 寫入方案調整

Status：已改為 GAS 支援 Firebase 服務帳戶短效 access token 寫入 Realtime Database。  
Root Cause：Apps Script OAuth token 實測寫入 Firebase Realtime Database 會回覆 `401 Unauthorized request`；不應把 Firebase 寫入密鑰放進前端，也不應開放 Realtime Database 公開寫入。  
Suggested Fix：

1. `gas/appsscript.json` 新增 `firebase.database` 與 `userinfo.email` OAuth scope。
2. `publishGameStateToFirebase` 優先使用 `FIREBASE_SERVICE_ACCOUNT_EMAIL` 與 `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` 產生短效 access token。
3. `firebase/database.rules.json` 改為只允許部署帳號或本專案服務帳戶寫入。
4. `gameState` 仍公開讀取，供學員端顯示講師開題提示。
5. 仍需由使用者在 Firebase Console 建立或下載服務帳戶 key，並將 email / private key 放到 Apps Script Script Properties。

Test Result：

1. Realtime Database rules 已部署成功。
2. GAS 已部署到 Web App version 9。
3. 未設定服務帳戶時，`openQuestion` 仍可成功，但 `firebaseSync` 回傳 HTTP `401 Unauthorized request`。
4. 本機沒有 `gcloud` 指令，無法由命令列協助建立服務帳戶 key。
5. 下一步需由使用者在 Firebase Console 下載服務帳戶 JSON key，並設定 Apps Script Script Properties：
   - `FIREBASE_SERVICE_ACCOUNT_EMAIL`
   - `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`

### 2026-05-21：Firebase gameState 同步測試完成

Status：Firebase `gameState` 寫入已測通。  
Root Cause：使用者已完成 `FIREBASE_SERVICE_ACCOUNT_EMAIL` 與 `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` 設定。  
Test Result：

1. `openQuestion` 成功，GAS 回傳 `firebaseSync.skipped = false`。
2. Realtime Database `gameState/game_YYYYMMDD_vaccine_training` 已更新為：
   - `status: question_open`
   - `currentQuestionId: demo_q001`
3. `closeAndScoreQuestion` 成功，GAS 回傳 `firebaseSync.skipped = false`。
4. Realtime Database `gameState/game_YYYYMMDD_vaccine_training` 已更新為：
   - `status: question_closed`
   - `currentQuestionId: demo_q001`
5. 學員端每 5 秒讀取 `gameState`，因此可顯示講師開題與關題提示。

目前第 1 版完成度：

1. Firebase Hosting：完成。
2. GAS / Google Sheets 主流程：完成。
3. Firebase Realtime Database `gameState` 提示：完成。
4. 學員端手機版：完成。
5. 講師端手機版：完成。

### GAS Web App 尚未可公開呼叫

Status：使用者提供的新 Web App URL 已可公開呼叫，HTTP 回應 `200`。目前 API 回傳 `找不到工作表：場次狀態`。  
Root Cause：GAS 後端可執行，但 Google Sheets 尚未執行 `setupGameSheets` 初始化必要工作表，或 `SPREADSHEET_ID` 指向的試算表尚未建立欄位。  
Suggested Fix：

1. 開啟 Apps Script 專案：
   `https://script.google.com/u/0/home/projects/1qNXWMJSxywJcdpjwgJqvfleqzGm24P9B3i6_vJwLhmF1YMygzWShZcah/edit`
2. 在 Script Properties 確認：
   - `GAME_ID`
   - `ADMIN_API_SECRET`
   - `SPREADSHEET_ID`
3. 執行 `setupGameSheets`。
4. 重新測試 `getGameState`。

目前 Apps Script 狀態：

```text
scriptId: 1qNXWMJSxywJcdpjwgJqvfleqzGm24P9B3i6_vJwLhmF1YMygzWShZcah
Web App URL: https://script.google.com/macros/s/AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC/exec
clasp push: 已成功推送 `Code.gs` 與 `appsscript.json`
clasp deploy: 已建立 `v1 GAS backend spreadsheet id support 2026-05-21`
```

前端狀態：

1. `frontend/student/dist/config.js` 已寫入 Web App URL，並切換 `apiMode: "gas"`。
2. `frontend/instructor/dist/config.js` 已寫入 Web App URL，並切換 `apiMode: "gas"`。
3. Firebase Hosting 目前只負責提供前端頁面；前端會以 JSONP 呼叫 GAS Web App。

### Firebase gameState 同步尚未啟用

Status：前端已加入 Firebase Realtime Database `gameState` 讀取，GAS 已支援寫入，但正式同步仍需設定 Apps Script Properties。  
Root Cause：尚未在 Apps Script Properties 設定 Firebase URL 與 token。  
Suggested Fix：

1. 先完成 GAS 主流程測試。
2. 確認需要 Firebase `gameState` 後，再設定：
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_DATABASE_AUTH_TOKEN`
3. 測試 `createGame`、`openQuestion`、`closeAndScoreQuestion` 後 Realtime Database 是否更新。

### 2026-05-21：第 1 版完整遊戲流程補強

Status：已補齊講師端與學員端第 1 版流程。  
Root Cause：原前端已有骨架，但畫面文字編碼異常，講師端缺少排行榜讀取，GAS 題庫空白時無法直接完成測試流程。  
Suggested Fix：

1. 學員端改為清楚繁體中文畫面。
2. 學員端每 5 秒讀取 Firebase `gameState/{gameId}`，只顯示公開提示，不自動開題。
3. 講師端改為清楚繁體中文控制台。
4. 講師端新增排行榜讀取區塊。
5. GAS 新增 `getScoreboard` action。
6. `setupGameSheets` 在題庫空白時新增 `demo_q001` 預設測試題，讓第 1 版可直接跑完整流程。
7. Realtime Database rules 調整為 `gameState` 與 `publicScoreboards` 可公開讀取，寫入仍不開放給前端。
8. `getSpreadsheet` 若找不到 `SPREADSHEET_ID` 且不是綁定試算表專案，會自動建立「疫苗守護戰隊挑戰賽資料庫」Google Sheets，並寫回 Script Properties。
9. `getGameState` 會先初始化工作表，避免第一次呼叫時找不到「場次狀態」。

### 2026-05-21：講師端手機版調整

Status：講師端已改為手機優先單欄介面。  
Root Cause：使用者確認講師端也會以手機操作，不以桌機寬版控制台為主要情境。  
Suggested Fix：

1. 講師端改為 `480px` 內的單欄控制台。
2. 操作順序固定為後端設定、啟動場次、題目控制、排行榜、流程檢查。
3. 按鈕與輸入框改為手機觸控尺寸。
4. 管理密碼不寫入程式、不寫入文件，只由講師端暫存在瀏覽器 `sessionStorage`。

部署與測試紀錄：

1. GAS 已推送到 Apps Script，並將使用者提供的 Web App 部署更新到 version 5。
2. Firebase Hosting 已重新部署：
   - `https://tychbniis-32af5-student.web.app`
   - `https://tychbniis-32af5-instructor.web.app`
3. Realtime Database rules 已部署，`gameState` 可公開讀取。
4. 線上學員端與講師端 HTML 已回應 `200`，且畫面文字為繁體中文。
5. GAS `getGameState` 測試通過，回傳 `status: draft`。
6. GAS `joinGame` 測試通過，可建立測試學員。
7. GAS `getCurrentQuestion` 測試通過，在尚未開題時回傳 `question: null`。
8. GAS `getScoreboard` 測試通過，目前排行榜資料為空。
9. GAS `openQuestion` 使用錯誤密鑰測試時，正確回傳「尚未設定 ADMIN_API_SECRET。」。

剩餘阻塞：

Status：講師管理操作尚未能完成端到端測試。  
Root Cause：Apps Script Script Properties 尚未設定 `ADMIN_API_SECRET`。  
Suggested Fix：使用者需在 Apps Script 專案的「專案設定 → 指令碼屬性」新增 `ADMIN_API_SECRET`，設定完成後即可用講師端啟動、開題與關題計分。

### Authentication Anonymous 尚未確認

Status：文件仍標示尚未確認。  
Root Cause：未在 Firebase Console 完成或驗證 Anonymous provider 狀態。  
Suggested Fix：進入 Firebase Console 確認 Authentication sign-in provider 是否啟用 Anonymous。

## 下一步建議

1. 由使用者在 Apps Script 確認 Script Properties，並初始化 Google Sheets 工作表。
2. 使用真實 GAS Web App URL 測試完整流程：
   - 講師啟動場次。
   - 講師開放 `q001`。
   - 學員報到。
   - 學員按「翻開試卷」。
   - 學員作答。
   - 講師關題計分。
   - 檢查 `試卷開啟紀錄`、`作答紀錄`、`排行榜`。
3. 若真實 GAS 測試通過，再處理講師端手機版 RWD 細節與排行榜視覺美化。
4. 若需要美術素材，再用 GPT 繪圖產生「翻開試卷」、「選項按鈕」、「戰隊徽章」等資產。

## 下一位 AI 注意事項

1. 不要啟用 Cloud Functions，除非使用者明確改變免費方案限制。
2. 不要把 `ADMIN_API_SECRET`、Firebase token、帳密或個資寫進程式。
3. 不要把學員端改回自動更新題目。
4. 不要使用手機本機時間做計分。
5. 若修改 GAS，務必同步更新：
   - `gas/README.md`
   - `docs/AI_HANDOVER.md`
   - `docs/WORK_LOG.md`
   - `CHANGELOG.md`
6. 若修改前端，務必重新部署 Firebase Hosting 並檢查線上網址。

