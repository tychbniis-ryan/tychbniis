# AI 交接文件

## 專案概要

本專案為「疫苗守護戰隊挑戰賽」，用於 120 分鐘預防接種教育訓練。目標對象為醫事人員，預估 200 人參與，分為 5 個戰隊。

系統正式架構採三方分工：

1. GitHub：程式碼、文件、版本與 Issue。
2. Firebase：Hosting、Authentication、Firestore、Realtime Database。
3. Google Apps Script / Google Sheets：題庫、場次設定、後端判斷、計分與賽後報表。

## 專案架構

```text
antigravity_vaccine_team_game_docs/
  app/config/modules.json
  data/
  docs/
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
| 學員端 | 第 1 版骨架 | 可本機輸入暱稱、分隊、示範作答 |
| 講師端 | 第 1 版骨架 | 可本機操作場次狀態與示範開題 |
| Cloud Functions | 免費方案暫停 | Blaze 方案限制，不作為第 1 版必要服務 |
| Firebase rules | 規格已存在 | 位於 `firebase/firestore.rules` 與 `firebase/database.rules.json` |
| GAS | 第 1 版後端 | 位於 `gas/Code.gs`，負責報到、開題、作答、關題與基本計分 |

## 模組規範

模組登記位於 `app/config/modules.json`。目前登記：

1. `student_app`
2. `instructor_dashboard`
3. `cloud_functions`
4. `gas_sync`
5. `gas_backend`

新增功能時，必須更新此檔案，讓後續維護者知道功能入口與狀態。

## UI 運作方式

第 1 版 UI 是靜態頁面，目的是先確認操作流程與畫面結構。正式 Firebase 串接尚未完成。

前端 GAS 設定檔：

1. `frontend/student/dist/config.js`
2. `frontend/instructor/dist/config.js`

部署 GAS Web App 後，需將 Web App URL 寫入上述兩個檔案的 `gasWebAppUrl`，並將 `apiMode` 設為 `gas`。
目前 `apiTransport` 預設為 `jsonp`，用於避開 Firebase Hosting 呼叫 GAS Web App 時的 CORS 限制。

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
| Realtime Database rules | 已部署 | 使用 `firebase/database.rules.json` |
| Cloud Functions | 免費方案暫停 | 不升級 Blaze，第 1 版改用 GAS Web App |
| GAS Web App | 尚未部署 | 需由 Google Sheets 綁定 Apps Script 後部署 Web App |

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
2. 讀取相關模組 README。
3. 找出最小修改範圍。
4. 修改前確認 Git 狀態。
5. 只改必要檔案。
6. 測試該功能。
7. 確認不影響其他功能。
8. 更新文件與變更紀錄。
9. 建立 Git commit。

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
Root Cause：`gas/Code.gs` 尚未貼入綁定 Google Sheets 的 Apps Script 專案並部署 Web App。  
Suggested Fix：在 Google Sheets 中開啟 Apps Script，貼上 `gas/Code.gs`，設定 `GAME_ID` 與 `ADMIN_API_SECRET`，部署 Web App。

部署細節見：

```text
docs/10_gas_web_app_deployment.md
```

### Firebase Hosting 呼叫 GAS 的傳輸風險

Status：前端目前預設用 JSONP 呼叫 GAS Web App。  
Root Cause：瀏覽器跨網域 JSON POST 到 GAS Web App 可能被 CORS 限制。  
Suggested Fix：第 1 版使用 JSONP 降低 CORS 風險，但不得傳送帳密、Token、身分證字號或完整姓名。若活動後續需要更高資安等級，改用 Firebase 中繼資料層或升級 Cloud Functions。

## 最近一次修改摘要

2026-05-21：第 1 版前端新增 GAS API 封裝。學員端可透過 `config.js` 串接 GAS Web App 報到與作答；講師端可設定 GAS Web App URL 與管理密鑰，並呼叫啟動、開題、關題計分流程。Firebase Hosting 已重新部署，學員端與講師端線上網址皆回應 `200`。GAS Web App 尚未實際部署，需依 `docs/10_gas_web_app_deployment.md` 操作。
