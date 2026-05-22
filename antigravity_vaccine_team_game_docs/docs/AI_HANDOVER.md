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
| 學員端 | 第 2 版定版完成 | 可輸入暱稱、依講師設定自動分隊或自由選隊、讀取 Firebase 公開狀態、預載 Firebase 公開題庫、依講師口令翻開試卷並作答 |
| 講師端 | 第 2 版定版完成 | 可套用管理密碼、啟動場次、初始化資料、選題、開題、關題計分、公布答案與讀取排行榜 |
| 講師端資料初始化 | 第 2 版定版完成 | 可由講師端明確觸發，清空玩家、作答、翻卷、排行榜、場次狀態與已開放題目紀錄，保留題庫與戰隊設定 |
| 第 2 版速度最佳化 | 定版完成 | GAS 已加入短時間快取、Firebase access token 快取、玩家與翻卷快取，並將公開題庫預載到 Firebase `publicQuestions` |
| Cloud Functions | 免費方案暫停 | Blaze 方案限制，不作為第 1 版必要服務 |
| Firebase rules | 規格已存在 | 位於 `firebase/firestore.rules` 與 `firebase/database.rules.json` |
| GAS | 第 1 版後端 | 位於 `gas/Code.gs`，負責報到、開題、作答、關題與基本計分 |
| 第 3 版規則製作 | 規格製作中 | 位於 `docs/12_v3_roadmap.md`，依 `docs/01_game_rules.md` 拆解寶箱、道具、獎項、戰隊加權平均分與創作票選 |

## 模組規範

模組登記位於 `app/config/modules.json`。目前登記：

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

1. `setupGameSheets` 會建立 `demo_q001`、`demo_q002`、`demo_q003`。
2. 若題庫工作表已有資料，會補齊缺少的預設測試題；正式題庫可改欄位或將 `enabled` 改為 `FALSE`。
3. 講師端預設題目 ID 為 `demo_q001`，可用於首次端到端測試。
4. 若獨立 Apps Script 專案未設定 `SPREADSHEET_ID`，`getSpreadsheet` 會自動建立「疫苗守護戰隊挑戰賽資料庫」Google Sheets，並將 ID 寫回 Script Properties。

資料初始化：

1. 講師端新增「初始化遊戲資料」按鈕。
2. GAS 對應 action 為 `resetGameData`，需帶 `ADMIN_API_SECRET`。
3. 會清空 `玩家`、`作答紀錄`、`試卷開啟紀錄`、`排行榜`、`場次狀態`。
4. 會保留 `題庫`、`場次設定`、`戰隊設定`。
5. 執行後會重設場次為 `draft`，並重新同步公開題庫與公開場次狀態。
6. 正式活動前可用來清除測試資料；活動中不可任意執行。

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

