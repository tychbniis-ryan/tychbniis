# 第 3 版定版狀態

第 3 版已於 2026-05-23 以 `0.3.22` 定版。

| 項目 | 狀態 |
|---|---|
| 學員端 | https://tychbniis-32af5-student.web.app |
| 講師端 | https://tychbniis-32af5-instructor.web.app |
| GAS Web App deployment | version `36` |
| 定版文件 | `docs/13_v3_final_release.md` |
| 免費方案 | 未啟用 Cloud Functions、Cloud Run、Blaze |
# 預防接種教育訓練互動戰隊遊戲系統

本專案為 120 分鐘「預防接種教育訓練」使用之互動戰隊遊戲系統，對象為醫事人員，預估 200 人參與，分為 5 個戰隊。

## 第 2 版定版狀態

第 2 版已定版完成，定版版本為 `0.2.11`。

定版範圍：

1. 學員端完成報到、翻卷、作答、倒數、關題後給分、戰隊與個人排行榜。
2. 講師端完成管理密碼套用、啟動場次、初始化資料、選題、開題、關題計分、答案公布與排行榜。
3. GAS / Google Sheets 作為正式資料與計分來源。
4. Firebase Hosting 提供學員端與講師端入口。
5. Realtime Database 僅作公開狀態與公開題庫快取，不保存正確答案或正式作答紀錄。
6. Cloud Functions 維持免費方案暫停，不作為第 2 版必要服務。

## 第 3 版製作狀態

第 3 版已完成雲端部署，目前版本標記為 `0.3.20`。

第 3 版依 `docs/01_game_rules.md` 製作，完整路線圖位於：

```text
docs/12_v3_roadmap.md
```

第 3 版規劃範圍：

1. 寶箱取得、持有限制與開箱紀錄。
2. 加分卡、加倍卡、翻身卡、挑戰卡與特殊道具。
3. 幸運獎與全對獎結算。
4. 戰隊加權平均分排行榜。
5. 創作票選題：隊內初選、講師審核、匿名全體投票。
6. 賽後報表匯出。

目前第 3 版已完成寶箱資料表、關題後寶箱取得判定、每人最多 3 個未開啟寶箱限制、開寶箱 API、道具庫讀取、基本道具效果、幸運獎與全對獎結算、戰隊加權平均分排行榜、學員端浮動寶箱與成就 UI、創作題投稿、隊內初選、講師審核代表作品、匿名全體投票與賽後報表匯出。`0.3.20` 已啟動免費方案效能重構第一階段：學員報到優先寫 Firebase `players`、送答優先寫 Firebase `answers`，若 Firebase 寫入失敗會回退 GAS；創作投稿與投票以 `questionId` 隔離目前創作題，避免舊資料混入。

`0.3.20` 仍保留 GAS / Google Sheets 作賽前同步與賽後正式重算。Cloud Functions、Cloud Run、Blaze 方案均未啟用。

第 2 版正式活動流程仍可獨立使用；若不使用寶箱 UI，學員端操作流程不變。

## 維護規則

1. 功能改善採低 token 工作流：先讀交接文件與相關檔案，不展開整個專案或大型 log。
2. 每次修改前需列出影響檔案、測試方式與還原方式。
3. 先完成本機測試，再依使用者指示推送雲端。
4. 未確認部署範圍前不得執行 `firebase deploy`、`clasp push` 或 `clasp deploy`。
5. 正式活動前可在講師端按「初始化遊戲資料」，清空測試玩家、作答、翻卷與排行榜資料；題庫與戰隊設定會保留。
6. 預設測試題目前為 11 題：`demo_q001` 至 `demo_q010` 為選擇題，`demo_q011` 為創作題。

## 第 1 版本機開發

### 1. 安裝 Firebase CLI

```powershell
npm install -g firebase-tools
firebase --version
```

### 2. 啟動學員端

```powershell
npm run dev:student
```

開啟：

```text
http://localhost:5173
```

### 3. 啟動講師端

```powershell
npm run dev:instructor
```

開啟：

```text
http://localhost:5174
```

### 4. 檢查 GAS 後端

GAS 程式位於：

```text
gas/Code.gs
```

第 1 版免費方案使用 GAS Web App 做後端判斷，不部署 Cloud Functions。

## Firebase 專案綁定

正式部署前，需要先完成：

1. `firebase login`
2. 建立 Firebase project。
3. 啟用 Authentication Anonymous。
4. 建立 Firestore。
5. 建立 Realtime Database。
6. 複製 `.firebaserc.example` 為 `.firebaserc`，填入實際 project ID 與 Hosting site。

## 目前部署網址

Firebase project：`tychbniis-32af5`

| 端點 | 網址 | 狀態 |
|---|---|---|
| 學員端 | https://tychbniis-32af5-student.web.app | 已部署 |
| 講師端 | https://tychbniis-32af5-instructor.web.app | 已部署 |

Realtime Database：

```text
https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app
```

## 目前狀態

第 2 版已定版完成。核心調整是把公開題庫預先同步到 Firebase，學員端按「翻開試卷」時優先從 Firebase 快取顯示題目，GAS 只負責記錄翻卷時間、收作答與計分。

正式活動前仍需確認：

1. Authentication 是否需要啟用 Anonymous。
2. GAS Script Properties：
   - `GAME_ID`
   - `ADMIN_API_SECRET`
   - `SPREADSHEET_ID`
   - `FIREBASE_SERVICE_ACCOUNT_EMAIL`
   - `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`
3. Google Sheets 題庫、場次設定與戰隊設定。
4. 講師端按「啟動場次」後，Firebase `publicQuestions/{gameId}` 是否已出現公開題庫。
5. 講師端按「初始化遊戲資料」清除測試玩家、作答、翻卷、排行榜與已開放題目紀錄。
6. 學員使用可區分暱稱，避免同名學員被視為同一人。

目前前端已寫入 GAS Web App URL，並已切換為 GAS 模式：

```text
https://script.google.com/macros/s/AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC/exec
```

若後端回傳 `找不到工作表：場次狀態`，代表尚未初始化 Google Sheets。可在 Apps Script 直接執行 `setupGameSheets`，或在講師端填入管理密鑰後按「啟動」。

目前第 1 版已補上自動初始化：若 Apps Script 專案沒有綁定試算表，且尚未設定 `SPREADSHEET_ID`，GAS 會自動建立「疫苗守護戰隊挑戰賽資料庫」Google Sheets，並把 ID 寫回 Script Properties。正式活動前仍建議確認該試算表位置與內容。

目前完整流程：

1. 講師端輸入管理密碼，按「套用設定」。系統會顯示「講師已完成設定」。
2. 講師端按「啟動場次」，GAS 會初始化 Google Sheets，並同步公開題庫到 Firebase。
3. 學員端完成報到。
4. 講師端開放 `demo_q001` 或正式題目 ID。
5. 學員端按「翻開試卷」，優先從 Firebase 公開題庫顯示題目，並由 GAS 記錄翻卷時間。
6. 學員端作答。
7. 講師端按「關題並計分」。
8. 講師端讀取排行榜。

GAS Web App 部署流程請見：

```text
docs/10_gas_web_app_deployment.md
```

AI 接手與工作日誌：

```text
docs/AI_HANDOVER.md
docs/WORK_LOG.md
```

## 已完成的 Firebase 後端

| 項目 | 狀態 | 說明 |
|---|---|---|
| Firestore | 已建立 | `(default)`，位置：`asia-east1` |
| Firestore rules | 已部署 | 使用 `firebase/firestore.rules` |
| Realtime Database | 已建立 | `tychbniis-32af5-default-rtdb`，位置：`asia-southeast1` |
| Realtime Database rules | 已部署 | 使用 `firebase/database.rules.json` |

## Cloud Functions 部署限制

Status：Cloud Functions 尚未部署。  
Root Cause：Firebase 專案目前不是 Blaze pay-as-you-go 方案，無法啟用 `cloudbuild.googleapis.com` 與 `artifactregistry.googleapis.com`。  
Suggested Fix：本專案第 1 版採用免費方案，不升級 Blaze。後端判斷改由 GAS Web App 執行。

## 免費方案後端架構

第 1 版固定採用免費方案：

1. Firebase Hosting：提供學員端與講師端靜態網頁。
2. Firebase Authentication：可保留匿名登入，但不是第 1 版必要條件。
3. Firestore / Realtime Database：已建立；Realtime Database 用於 `gameState`、`publicQuestions` 與公開排行榜，不保存正確答案與正式作答紀錄。
4. GAS Web App：負責可信任判斷，包括報到、開題、作答、關題與基本計分。
5. Google Sheets：作為第 1 版主要資料庫。

前端 GAS 設定位於：

1. `frontend/student/dist/config.js`
2. `frontend/instructor/dist/config.js`

注意：GAS Web App URL 已固定寫在上述 `config.js`。講師端不再顯示 URL 欄位，避免現場誤填舊網址造成報到或管理操作失敗。

前端更新規則：

1. `config.js`、`app.js`、`api.js` 需使用版本參數，避免手機瀏覽器載入舊檔。
2. Firebase Hosting 對 HTML / JavaScript 設為不快取。
3. 學員端 `clientVersion` 變更時會清除舊報到資料與題庫暫存。
4. 學員端已支援手機橫式版面，正式活動建議請學員橫放手機作答。

## 三方核心架構

本系統正式採用三方連結：

1. **GitHub**
   - 管理程式碼、文件、版本、Issue、部署紀錄。
2. **Firebase**
   - Hosting：學員端與講師端網頁。
   - Authentication：匿名登入。
   - Firestore / Realtime Database：用於公開狀態、公開題庫與公開排行榜；不作為正確答案與正式作答紀錄資料庫。
   - Cloud Functions：免費方案暫停，不作為第 1 版必要服務。
3. **Google Apps Script / Google Sheets**
   - Google Sheets 作為題庫與場次設定來源。
   - GAS 負責報到、開題、作答、關題、計分與賽後匯出成績報表。

## 重要設計原則

- 題庫由使用者在 Google Sheets 設計。
- 學員端不得提前取得正確答案。
- 每人每題只能作答一次。
- 計分、抽寶箱、道具與成就判定由後端執行。
- 幸運獎全場 1 名。
- 全對獎取最快完成且全數答對者 3 名。
- 寶箱最多持有 3 個，超過時自動丟棄最早獲得且未開啟者。
- 創作票選題採隊內初選、講師把關、匿名全體票選。
