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
| GAS 後端 | 程式已完成第 1 版 | 尚需使用者把最新版 `gas/Code.gs` 貼到 Apps Script 並重新部署 |
| GitHub CLI | 已登入 | 帳號為 `tychbniis-ryan` |
| Git push | 尚未執行 | 未收到使用者明確要求，不主動 push |

## 架構決策紀錄

### 2026-05-21：第 1 版固定採免費方案

決策：

1. 不使用 Firebase Cloud Functions。
2. Firebase Hosting 只放學員端與講師端靜態頁。
3. GAS Web App 作為可信任後端。
4. Google Sheets 作為第 1 版主要資料庫。
5. Firebase Realtime Database 的 `gameState` 僅作公開狀態同步，不作為計分依據。

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

### GAS Web App 尚未正式更新

Status：前端已部署，但正式 GAS 後端尚未更新到 Apps Script。  
Root Cause：GAS 程式需要使用者在 Google Sheets 綁定的 Apps Script 專案中手動貼上或更新。  
Suggested Fix：

1. 開啟題庫 Google Sheets。
2. 進入 `擴充功能 → Apps Script`。
3. 將本專案最新版 `gas/Code.gs` 貼入。
4. 執行 `setupGameSheets`。
5. 重新部署 Web App。
6. 將 Web App URL 填入講師端。

### Firebase gameState 同步尚未啟用

Status：GAS 已支援，但未設定同步參數。  
Root Cause：尚未在 Apps Script Properties 設定 Firebase URL 與 token。  
Suggested Fix：

1. 先完成 GAS 主流程測試。
2. 確認需要 Firebase `gameState` 後，再設定：
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_DATABASE_AUTH_TOKEN`
3. 測試 `createGame`、`openQuestion`、`closeAndScoreQuestion` 後 Realtime Database 是否更新。

### Authentication Anonymous 尚未確認

Status：文件仍標示尚未確認。  
Root Cause：未在 Firebase Console 完成或驗證 Anonymous provider 狀態。  
Suggested Fix：進入 Firebase Console 確認 Authentication sign-in provider 是否啟用 Anonymous。

## 下一步建議

1. 由使用者完成 GAS Web App 更新與部署。
2. 使用真實 GAS Web App URL 測試完整流程：
   - 講師啟動場次。
   - 講師開放 `q001`。
   - 學員報到。
   - 學員按「翻開試卷」。
   - 學員作答。
   - 講師關題計分。
   - 檢查 `試卷開啟紀錄`、`作答紀錄`、`排行榜`。
3. 若真實 GAS 測試通過，再處理講師端手機版 RWD 與排行榜顯示。
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
