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
Web App URL: https://script.google.com/macros/s/AKfycbx17EFkypT0sH3VsQSbkPWczvhxlKs4TR0KutOOJhm219hh0pOSKkQsVksxnAHVlAtz/exec
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

