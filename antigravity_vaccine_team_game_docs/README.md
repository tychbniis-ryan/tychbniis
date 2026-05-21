# 預防接種教育訓練互動戰隊遊戲系統

本專案為 120 分鐘「預防接種教育訓練」使用之互動戰隊遊戲系統，對象為醫事人員，預估 200 人參與，分為 5 個戰隊。

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

## 尚未完成的第 1 版設定

以下項目需要完成或確認：

1. Authentication 啟用 Anonymous。
2. GAS Script Properties 設定：
   - `GAME_ID`
   - `ADMIN_API_SECRET`
   - `SPREADSHEET_ID`
3. 初始化 Google Sheets 工作表。

目前前端已寫入 GAS Web App URL，並已切換為 GAS 模式：

```text
https://script.google.com/macros/s/AKfycbx17EFkypT0sH3VsQSbkPWczvhxlKs4TR0KutOOJhm219hh0pOSKkQsVksxnAHVlAtz/exec
```

若後端回傳 `找不到工作表：場次狀態`，代表尚未初始化 Google Sheets。可在 Apps Script 直接執行 `setupGameSheets`，或在講師端填入管理密鑰後按「啟動」。

目前第 1 版已補上自動初始化：若 Apps Script 專案沒有綁定試算表，且尚未設定 `SPREADSHEET_ID`，GAS 會自動建立「疫苗守護戰隊挑戰賽資料庫」Google Sheets，並把 ID 寫回 Script Properties。正式活動前仍建議確認該試算表位置與內容。

第 1 版完整流程：

1. 講師端輸入管理密鑰。
2. 講師端按「啟動場次」。
3. 學員端完成報到。
4. 講師端開放 `demo_q001` 或正式題目 ID。
5. 學員端按「翻開試卷」取得題目。
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
3. Firestore / Realtime Database：已建立，可作為未來同步或展示用途；第 1 版不作為主要資料庫。
4. GAS Web App：負責可信任判斷，包括報到、開題、作答、關題與基本計分。
5. Google Sheets：作為第 1 版主要資料庫。

前端 GAS 設定位於：

1. `frontend/student/dist/config.js`
2. `frontend/instructor/dist/config.js`

## 三方核心架構

本系統正式採用三方連結：

1. **GitHub**
   - 管理程式碼、文件、版本、Issue、部署紀錄。
2. **Firebase**
   - Hosting：學員端與講師端網頁。
   - Authentication：匿名登入。
   - Firestore / Realtime Database：保留作未來同步、展示或公開狀態用途；第 1 版不作為主要資料庫。
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
