# CHANGELOG

## 0.2.10 - 2026-05-21

### fix

- GAS `joinGame` 新增 `clientKey` 與同場次暱稱去重；同一學員重新報到時回傳原玩家資料，不再新增玩家列。
- 戰隊排行榜與個人排行榜改為合併同一人資料後再計算，避免每題作答後重複玩家造成戰隊平均分下降。
- `getPlayerSummary` 會合併同一人的作答紀錄後加總個人積分，修正學員端個人積分顯示為 0 的問題。

### feat

- 學員端預設取消選擇隊伍，改由系統自動分配戰隊。
- 講師端新增「開放學員自由選隊」切換，開啟後學員端才會顯示戰隊選單。
- 學員端排行榜開啟時不再等待個人積分更新完成，降低操作停等時間。

### test

- 本機 JavaScript 語法檢查通過。
- 本機 GAS 語法檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.10`。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- GAS 已推送並更新既有 Web App deployment 到 version 17，正式 URL 不變。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.10`；GAS `getGameState` 回應 `ok:true` 且 `allowFreeTeamChoice:false`；`getScoreboard` 與 `getPlayerLeaderboard` 回應 `ok:true`。

## 0.2.9 - 2026-05-21

### fix

- GAS `openQuestion` 新增 `openedQuestionIds` 場次紀錄，已開放過的題目不可再次開放，避免講師誤送同一題。
- 前端 API 區分「GAS 業務錯誤」與「連線錯誤」；重複作答、題目狀態錯誤會直接顯示 GAS 回傳訊息，不再誤顯示為無法連線到 GAS。
- 學員端個人積分改由作答紀錄加總，避免玩家表分數未同步時只更新戰隊積分。

### feat

- 講師端改為分段流程：未設定管理密碼時顯示後端設定；已設定時顯示啟動場次；啟動後進入題目控制，重新開啟視窗也會回到題目控制。
- 講師端在啟動場次畫面與題目控制畫面都提供初始化按鈕。
- 講師端流程檢查改為半隱藏的 `details` 區塊。
- 學員端排行榜改為彈出視窗查看。
- 學員端隱藏遊戲中的目前狀態區塊。

### test

- 本機 JavaScript 語法檢查通過。
- 本機 GAS 語法檢查通過。
- JSON 設定檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.9`。
- GAS 已推送並更新既有 Web App deployment 到 version 15，正式 URL 不變。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.9`，GAS `getGameState` 回應 `ok:true` 並包含 `openedQuestionIds`。

## 0.2.8 - 2026-05-21

### feat

- 學員端新增「戰隊排行榜」與「個人排行榜」，採手動更新按鈕與關題後自動更新，避免高頻輪詢造成 GAS 流量壓力。
- GAS 新增 `getPlayerLeaderboard` 只讀 API，只回傳暱稱、戰隊與分數，不回傳帳密、Token 或個資欄位。
- 講師端改為更寬的電腦與投影版面，桌機寬度下分成控制區、答案公布區與排行榜區。

### fix

- 學員端啟動時會先確認場次狀態；若講師已初始化遊戲，且本機舊報到時間早於場次初始化時間，會清除舊報到資料並要求重新報到。
- 學員端與講師端 GAS 呼叫增加快取破壞參數、重試次數、逾時時間與 JSONP 備援，降低手機端偶發性無法連線風險。

### test

- 本機 JavaScript 語法檢查通過。
- 本機 GAS 語法檢查通過。
- JSON 設定檢查通過。
- `npm run check:functions` 通過。
- GAS 已推送並更新既有 Web App deployment 到 version 14，正式 URL 不變。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.8`，GAS `getGameState` 與 `getPlayerLeaderboard` 回應 `ok:true`。

## 0.2.7 - 2026-05-21

### feat

- 學員端改為報到前只顯示報到功能，完成報到後才切換到遊戲頁。
- 學員遊戲頁最上方新增戰隊、個人積分與戰隊積分。
- 學員送出答案後不立即顯示正誤與分數，改為講師關題後才更新分數，降低學員互相提示答案的風險。
- 學員端沿用 Firebase `gameState` 低頻公開狀態輪詢，偵測到關題後才向 GAS 查詢一次個人與戰隊分數。
- 講師端新增投影用「關題公布」區塊，關題計分後顯示正確答案、說明與排行榜。
- GAS 新增 `getPlayerSummary`，供學員端在關題後更新個人與戰隊分數。

### test

- 本機前端 JavaScript 語法檢查通過。
- 本機 GAS 暫存語法檢查通過。
- 本機 JSON 設定檔解析通過。
- `npm run check:functions` 通過。
- GAS 已更新既有 Web App deployment 到 version 13，正式 URL 不變。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- 線上學員端與講師端回應 `200`，HTML 已載入 `v=0.2.7`。
- 線上 GAS `getGameState` 回應 `ok:true`。

## 0.2.6 - 2026-05-21

### feat

- 學員端作答前新增「確認送出」提示，避免誤觸後不能修改。
- 學員端翻開試卷後新增倒數計時器，依題目 `timeLimitSec` 顯示剩餘秒數。
- GAS `submitAnswer` 改為送出當下立即判斷正誤並回傳 `baseScore`、`firstCorrectBonus`、`score` 與 `remainingSeconds`，學員答對後可立即看到本題得分。
- 講師端題目控制改為從公開題庫載入題目清單，講師用下拉選單選題，不再手動輸入題目 ID。

### test

- 本機前端 JavaScript 語法檢查通過。
- 本機 GAS 暫存語法檢查通過。
- 本機 JSON 設定檔解析通過。

## 0.2.5 - 2026-05-21

### fix

- 修正手機端無法連線到 GAS 的風險：前端呼叫 GAS 時改為優先使用 `fetch GET`，失敗才退回 JSONP。
- 保留 JSONP 作為舊瀏覽器備援，但避免手機瀏覽器因跨網域 `<script>` 載入失敗而直接報到失敗。
- 前端版本更新為 `v=0.2.5`，強制手機重新載入新版 API 模組。

### test

- 已完成本機 JavaScript 語法檢查、JSON 設定檢查、`npm run check:functions` 與本機頁面回應檢查。
- 已只部署 Firebase Hosting；未推送 GAS、Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端回應 `200`，HTML 已載入 `app.js?v=0.2.5`，`api.js` 已包含 `callFetchGet`，GAS `joinGame` 測試成功。

## 0.2.4 - 2026-05-21

### fix

- 前端 `config.js`、`app.js`、`api.js` 加入版本參數，避免手機瀏覽器混用新舊模組造成講師端卡在「正在讀取後端設定...」。
- Firebase Hosting 對 HTML 與 JavaScript 增加 `Cache-Control: no-cache, no-store, must-revalidate`，降低後續更新後載入舊檔案的風險。
- 學員端新增 `clientVersion` 檢查；前端版本更新時會清除舊報到資料與公開題庫暫存，避免繼續載入舊玩家資料。

### feat

- 學員端新增手機橫式版面，橫放手機時改為左右欄操作，減少作答時上下捲動。

### test

- 已完成本機 JavaScript 語法檢查、JSON 設定檢查、`npm run check:functions` 與本機頁面回應檢查。
- 已只部署 Firebase Hosting；未推送 GAS、Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.4`，JavaScript 回應標頭為 `no-cache, no-store, must-revalidate`。
- 線上 GAS `joinGame` 測試成功。

## 0.2.3 - 2026-05-21

### fix

- 修正學員端可能因瀏覽器保留舊 `vaccineGameGasUrl` 而報到失敗的問題。
- 學員端與講師端改為固定使用 `config.js` 的正式 GAS Web App URL，不再讓 `localStorage` 覆蓋後端網址。
- 講師端隱藏 GAS Web App URL 欄位，只保留管理密碼輸入。
- 講師端按「套用設定」後，明確顯示「講師已完成設定」。

### test

- 已確認線上 GAS `joinGame` 可成功建立假資料測試學員。
- 已完成本機 JavaScript 語法檢查、JSON 設定檢查與本機頁面回應檢查。
- 已只部署 Firebase Hosting；未推送 GAS、Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端回應 `200`、講師端回應 `200`、講師端已隱藏 GAS URL 欄位並保留管理密碼欄位。

## 0.2.2 - 2026-05-21

### feat

- 新增講師端「初始化遊戲資料」按鈕，明確清空玩家、作答、翻卷與排行榜資料，保留題庫與戰隊設定。
- GAS 新增 `resetGameData` 管理 API 與 Apps Script 選單入口，用於正式活動前清除測試資料。
- 預設測試題由 1 題增加為 3 題，方便第 2 版流程測試。
- `data/game_config.example.json` 新增低 token 工作流設定，要求功能改善時只讀必要文件與相關檔案。

### perf

- GAS 快取 Firebase service account access token，降低開題與同步公開資料時的重複取 token 成本。
- GAS 快取玩家、翻卷紀錄與重複作答檢查結果，降低翻卷與作答時重複讀取 Google Sheets 的次數。
- 學員端公開題庫加入 10 分鐘瀏覽器工作階段快取，降低重複讀取 Firebase `publicQuestions` 的時間。

### deploy

- GAS 已更新既有 Web App deployment `AKfycbyyBZ4dss-mCw14-LBPILzJkltyD6otZaO2gsIDcLDZZvTWx4Y-iF6FSvMqcuvLNAWC` 到 version 12，正式 URL 不變。
- Firebase 已只部署 Hosting：學員端與講師端皆更新完成；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

### test

- 已在本機執行 GAS 暫存語法檢查、前端 JavaScript 語法檢查、JSON 設定檔解析、`npm run check:functions`。
- 已啟動本機靜態伺服器檢查學員端與講師端頁面，兩者皆回應 `200`。
- 線上檢查通過：學員端 Hosting 回應 `200`、講師端 Hosting 回應 `200`、講師端已出現「初始化遊戲資料」按鈕、GAS `getGameState` 回應 `200`。

## 0.2.1 - 2026-05-21

### feat

- GAS `createGame` 會將公開題庫預先同步到 Firebase Realtime Database `publicQuestions/{gameId}`。
- `openQuestion` 仍由 GAS 驗證題目存在，但同步到 `gameState` 時會附帶當題公開資訊，方便學員端快速顯示。
- GAS 新增 `openPaper` action，專門記錄學員翻開試卷時間，不再需要用 `getCurrentQuestion` 回傳題目內容。
- 學員端啟動時會先預載 Firebase 公開題庫，學員按「翻開試卷」時優先從 Firebase 快取取得題目。
- Firebase Realtime Database rules 新增 `publicQuestions` 公開讀取路徑，前端仍無寫入權限。
- 學員端與講師端 JSONP 呼叫新增逾時與最多 3 次重試，降低 GAS 偶發回傳 HTML 錯誤頁造成的操作中斷。

### security

- 公開題庫只包含題目、選項、時間限制與題型旗標，不包含 `correctAnswer` 與 `explanation`。

## 0.2.0 - 2026-05-21

### feat

- 第 1 版正式結案，確認主流程與 Firebase `gameState` 同步皆可用。
- 新增 `docs/11_v2_roadmap.md`，整理第 2 版工作項目與優先順序。
- GAS 加入第 2 版第一階段速度最佳化：工作表初始化、題庫與場次狀態短時間快取。

### perf

- `getCurrentQuestion`、`openQuestion`、`submitAnswer` 等流程改用 `ensureGameSheetsReady`，避免每次呼叫都重跑完整工作表初始化。
- 題庫資料快取 300 秒。
- 場次狀態快取 300 秒，開題與關題時同步更新快取。

## 0.1.1 - 2026-05-21

### feat

- 講師端改為手機優先單欄控制台，依現場操作順序排列後端設定、啟動場次、題目控制與排行榜。
- 學員端新增 Firebase Realtime Database `gameState` 公開狀態讀取。
- 學員端會依 `gameState/{gameId}` 顯示「講師已開放題目」提示，但不自動取得題目，仍需學員手動按「翻開試卷」。
- 前端設定新增 `firebaseDatabaseUrl` 與 `firebaseGameStatePollMs`。
- Realtime Database rules 調整為 `gameState` 與 `publicScoreboards` 可公開讀取、不可由前端寫入。
- 講師端改為完整第 1 版控制台，可啟動場次、開題、關題計分與讀取排行榜。
- GAS 新增 `getScoreboard` action。
- `setupGameSheets` 會在題庫空白時建立 `demo_q001` 預設測試題。
- 獨立 Apps Script 專案若未設定 `SPREADSHEET_ID`，GAS 會自動建立資料試算表並寫回 Script Properties。
- Firebase `gameState` 寫入改為支援 Firebase 服務帳戶短效 access token，Realtime Database rules 只允許部署帳號或本專案服務帳戶寫入，前端維持唯讀。

### docs

- 更新 Firebase database 在第 1 版中的定位：只作公開狀態與公開排行榜，不作正式資料庫與計分依據。
- 記錄第 1 版端到端流程測試結果與 Firebase `gameState` 尚未同步的原因。
- 記錄 Firebase 服務帳戶設定完成後，`gameState` 開題與關題同步測試通過。

## 0.1.0 - 2026-05-20

### feat

- 建立第 1 版最小可執行系統骨架。
- 新增學員端本機測試頁面。
- 新增講師端本機測試頁面。
- 新增 Cloud Functions TypeScript 骨架。
- 新增本機靜態伺服器啟動指令。
- 新增 Firebase 專案設定範例 `.firebaserc.example`。
- 新增 `app/config/modules.json` 作為功能模組登記表。
- 新增根目錄 `firebase.json`，讓 Firebase CLI 可直接從專案根目錄部署。
- 建立 Firebase Hosting site：`tychbniis-32af5-student` 與 `tychbniis-32af5-instructor`。
- 完成學員端與講師端 Hosting 部署。
- 建立 Realtime Database instance：`tychbniis-32af5-default-rtdb`。
- 完成 Realtime Database rules 部署。
- 建立 Firestore database：`(default)`，位置 `asia-east1`。
- 完成 Firestore rules 部署。
- 新增 GAS 免費方案後端骨架，取代第 1 版 Cloud Functions 判斷流程。
- GAS 後端支援報到、自動分隊、開題、作答、關題與基本計分。
- 新增學員端 GAS API 封裝與前端設定檔。
- 新增講師端 GAS API 封裝、GAS URL 設定與管理密鑰輸入。
- 重新部署 Firebase Hosting，更新學員端與講師端線上頁面。
- 新增 GAS `doGet` JSONP 入口，前端預設使用 JSONP 呼叫 GAS Web App。
- 新增 GAS `getCurrentQuestion` API，學員端只能取得目前開放題目的公開資訊，不下發正確答案。
- 新增學員端「更新題目」功能，報到後可讀取講師目前開放的題目並送出該題答案。
- 學員端題目取得改為「翻開試卷」手動操作，避免自動更新造成競賽起跑時間差。
- 學員端版面改為手機優先 RWD，並保留未來美化按鈕與選單的 CSS 主題入口。
- GAS 新增 `試卷開啟紀錄`，由伺服端記錄學員翻開試卷時間。
- 計分改為基本分加「第一個提交且答對者」獎勵 5 分。
- GAS 可選擇同步公開 `gameState` 到 Firebase Realtime Database。
- 新增 `clasp` 設定，已將 GAS 程式推送到使用者建立的 Apps Script 專案。
- GAS 新增 `SPREADSHEET_ID` 支援，獨立 Apps Script 專案可指定資料試算表。
- 前端正式寫入 GAS Web App URL，學員端與講師端預設切換為 GAS 模式。

### docs

- 新增 `docs/AI_HANDOVER.md`，供下一位維護者或 AI 接手。
- 新增 `docs/WORK_LOG.md`，記錄工作日誌、測試紀錄、阻塞點與下一步。
- 記錄 Firebase project 與 Hosting URL。
- 記錄 Cloud Functions 因 Blaze 方案限制尚未部署，並改採 GAS Web App 作為第 1 版後端。
- 新增 `docs/10_gas_web_app_deployment.md`。
