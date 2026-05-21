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
| 學員端 | 第 2 版速度最佳化中 | 可輸入暱稱、分隊、讀取 Firebase 公開狀態、預載 Firebase 公開題庫、依講師口令翻開試卷並作答 |
| 講師端 | 第 1 版流程 | 手機優先單欄控制台，可設定 GAS URL 與管理密碼、啟動場次、開題、關題計分、讀取排行榜 |
| 第 2 版速度最佳化 | 進行中 | GAS 已加入短時間快取，並將公開題庫預載到 Firebase `publicQuestions` |
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
目前 `apiTransport` 預設為 `jsonp`，用於避開 Firebase Hosting 呼叫 GAS Web App 時的 CORS 限制。
學員端與講師端的 JSONP 呼叫已加上 25 秒逾時與最多 3 次重試。原因是 Apps Script 偶發會回傳 Google Drive HTML 錯誤頁，重試後通常可恢復。

學員端流程：

1. 使用者輸入暱稱與戰隊。
2. 前端呼叫 `joinGame` 報到。
3. 前端啟動後先讀取 Firebase `publicQuestions/{gameId}`，把公開題目載入手機瀏覽器快取。
4. 講師宣布開題後，使用者按「翻開試卷」；學員端優先從 Firebase 快取顯示題目，並呼叫 GAS `openPaper` 記錄翻卷時間。
5. 若 Firebase 題目暫不可用，才回退呼叫 GAS `getCurrentQuestion`。
6. 使用者按選項後呼叫 `submitAnswer`。
7. GAS 檢查題目是否仍開放，並防止同一玩家同一題重複作答。
8. 講師端關題後呼叫 `getScoreboard` 讀取排行榜。

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
5. 不自動呼叫 `getCurrentQuestion`。
6. 不在 Firebase 儲存正確答案、完整作答紀錄或正式分數。
7. 正式計分仍由 GAS 讀寫 Google Sheets。

第 1 版預設測試題：

1. `setupGameSheets` 會建立 `demo_q001`。
2. 若題庫工作表已有資料，不會重複新增。
3. 講師端預設題目 ID 為 `demo_q001`，可用於首次端到端測試。
4. 若獨立 Apps Script 專案未設定 `SPREADSHEET_ID`，`getSpreadsheet` 會自動建立「疫苗守護戰隊挑戰賽資料庫」Google Sheets，並將 ID 寫回 Script Properties。

學員端 CSS 採手機優先 RWD。未來若要接入 GPT 產生的美術素材或替換按鈕視覺，優先調整 `styles.css` 的 CSS 變數與語意 class，例如 `.paper-action`、`.option-button`、`.primary-action`，不要把樣式寫進 JavaScript。

講師端 CSS 也採手機優先設計，固定為單欄操作流程：

1. 後端設定。
2. 啟動場次。
3. 題目控制。
4. 排行榜。
5. 第 1 版流程檢查。

管理密碼不可寫入程式或文件。講師端只把管理密碼保存在瀏覽器 `sessionStorage`，重新開啟瀏覽器後需重新輸入。

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
| GAS Web App | 已公開可呼叫 | 使用者提供的新 `/exec` URL 已回應 `200`，主流程與 Firebase 同步已測通 |

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

2026-05-21：第 1 版正式結案，並啟動第 2 版。第 2 版第一優先是讀取速度最佳化，因目前瓶頸在 GAS 每次呼叫都可能讀寫 Google Sheets。已先在 GAS 加入 Script Cache：工作表初始化狀態、題庫、場次狀態皆快取 300 秒；開題與關題會同步更新場次狀態快取。新增 `docs/11_v2_roadmap.md` 作為第 2 版工作路線圖。

2026-05-21：GAS 快取版已部署為 Web App version 10。測試結果：`getCurrentQuestion` 約 2.3 秒，`joinGame` 約 2.4 秒，`openQuestion` 約 17.5 秒。第 2 版下一個速度改善重點應改為「公開題目內容同步到 Firebase」，讓學員端先從 Firebase 快速顯示題目，GAS 保留記錄翻卷時間與作答的可信任職責。

2026-05-21：使用者完成 Firebase 服務帳戶 Script Properties 設定後，已重測 `gameState` 同步。`openQuestion` 與 `closeAndScoreQuestion` 均回傳 `firebaseSync.skipped = false`。Realtime Database `gameState/game_YYYYMMDD_vaccine_training` 已可在開題時更新為 `question_open`、在關題時更新為 `question_closed`。第 1 版目前已具備 Firebase Hosting、GAS / Google Sheets 主流程、Firebase Realtime Database 公開狀態提示、學員端手機版與講師端手機版。

2026-05-21：使用者完成 `ADMIN_API_SECRET` 設定後，已執行第 1 版端到端流程測試。GAS / Google Sheets 主流程已測通：`createGame`、`openQuestion`、`joinGame`、`getCurrentQuestion`、`submitAnswer`、`closeAndScoreQuestion`、`getScoreboard` 皆成功。測試學員答對 `demo_q001`，6 秒送出，基本分 30 分，加上首位答對 5 分，排行榜顯示 `team_1` 總分 35 分。Firebase Hosting 學員端與講師端皆回應 `200`。Firebase Realtime Database `gameState` 目前仍為 `null`，因 Apps Script 尚未設定 `FIREBASE_DATABASE_URL` 與 `FIREBASE_DATABASE_AUTH_TOKEN`；正式計分不受影響，但學員端 Firebase 公開狀態提示尚未啟用。

2026-05-21：Firebase `gameState` 寫入方案改為 GAS 支援 Firebase 服務帳戶短效 access token，不使用前端寫入，也不把 Firebase 寫入密鑰放入程式。Realtime Database rules 只允許部署帳號或本專案服務帳戶寫入，`gameState` 維持公開讀取。Apps Script OAuth token 實測被 Firebase 回覆 `401 Unauthorized request`，仍需使用者在 Apps Script Script Properties 設定 `FIREBASE_SERVICE_ACCOUNT_EMAIL` 與 `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`。

2026-05-21：第 1 版前端新增 GAS API 封裝。學員端可透過 `config.js` 串接 GAS Web App 報到、依講師口令翻開試卷取得目前題目與作答；講師端可設定 GAS Web App URL 與管理密鑰，並呼叫啟動、開題、關題計分與排行榜讀取流程。GAS 新增 `getCurrentQuestion` 與 `getScoreboard`，`getCurrentQuestion` 僅下發公開題目資訊，不下發正確答案。學員端不自動更新題目，以避免競賽起跑時間差。學員端版面改為手機優先 RWD，並保留未來美化按鈕與選單的 CSS 主題入口。本次計分改為以 GAS 記錄的翻開試卷時間為起點，第一位提交且答對者額外加 5 分，並新增 Firebase `gameState` 公開狀態提示。`setupGameSheets` 會在題庫空白時建立 `demo_q001` 預設測試題；獨立 Apps Script 專案若未設定 `SPREADSHEET_ID`，會自動建立資料試算表。Firebase Hosting 已重新部署，學員端與講師端線上網址皆回應 `200`。GAS Web App 已可公開呼叫，前端已切換 GAS 模式；在 Apps Script Properties 設定 Firebase 同步參數後，`gameState` 才會由 GAS 寫入 Realtime Database。

