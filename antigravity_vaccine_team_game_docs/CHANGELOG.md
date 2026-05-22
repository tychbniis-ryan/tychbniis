# CHANGELOG

## 0.3.9 - 2026-05-22

### feat

- 預設題庫改為 11 題，其中 `demo_q011` 為創作題。
- 新增 `getPlayerAchievements` API，回傳累積答對、連續答對、使用道具與寶箱成就狀態。
- 學員端新增浮動選單，將寶箱、道具與成就放入懸浮視窗。
- 學員端寶箱或成就有待處理狀態時，功能鈕顯示紅點提示。
- 講師端控制台改為同一頁面顯示主要操作區，流程檢查維持可收合。
- 講師端排行榜新增有效人數與報到人數的設計說明。

### changed

- 加分卡改為立即套用戰隊加成，不需選擇題目。
- 加倍卡改為使用後自動套用下一題，答對時分數直接乘以 2。
- 挑戰卡改為使用時只選擇挑戰戰隊，並自動套用下一題結果。
- 已經沒有下一題時，GAS 會阻擋加倍卡與挑戰卡，只允許加分卡與翻身卡。
- 創作題回答區只在講師開放創作題時顯示。
- 匿名全體投票只在講師選出代表作品後顯示。
- 賽後報表 API 保留，但講師端 UI 不顯示。

### test

- GAS 語法檢查通過。
- 學員端與講師端 JavaScript 語法檢查通過。
- JSON 解析檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端靜態頁面回應 `200`，皆載入 `0.3.9` 資源。

### deploy

- GAS `Code.gs` 已推送到 Apps Script。
- 既有正式 GAS Web App deployment 已更新為 version 22，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端，線上 HTML 已載入 `app.js?v=0.3.9`。
- 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。
- 線上 GAS `getGameState` 回應 `ok:true`；`getPlayerAchievements` 已不再回覆「未知 action」。

## 0.3.8-deployed - 2026-05-22

### deploy

- GAS `Code.gs` 已推送到 Apps Script。
- 既有正式 GAS Web App deployment 已更新為 version 20，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端。
- 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

### test

- GAS `getGameState` 回應 `ok:true`。
- GAS `getPlayerLeaderboard` 回應 `ok:true`。
- GAS 第 3 版管理 action 已不再回傳「未知 action」，未帶管理密碼時正確回傳授權失敗。
- 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.3.7`。
- 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.3.8`，並包含 `exportGameReport`。

## 0.3.8-final-check - 2026-05-22

### docs

- 標記第 3 版 `0.3.8` 本機總檢查完成。
- 確認本次未部署 GAS Web App、Firebase Hosting、Cloud Functions 或 Firebase rules。
- 補充下一步需由使用者明確確認後，才可進行雲端部署與端到端測試。

### test

- GAS 語法檢查通過。
- 學員端與講師端 JavaScript 語法檢查通過。
- `app/config/modules.json` 與 `package.json` JSON 解析通過。
- `npm run check:functions` 通過。
- `git diff --check` 通過。

## 0.3.8 - 2026-05-22

### feat

- GAS 新增 `exportGameReport` API，可由講師建立賽後報表試算表。
- 賽後報表包含報表摘要、戰隊排行榜、個人排行榜、作答紀錄、寶箱紀錄、道具紀錄、獎項紀錄、創作投稿、創作投票與創作決選結果。
- 匯出前會重新計算排行榜並結算幸運獎與全對獎。
- 講師端新增「匯出賽後報表」按鈕，匯出完成後顯示報表試算表連結。
- 報表避開管理密碼、Token 與服務帳戶資訊；創作投票報表不輸出 voterPlayerId。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

## 0.3.7 - 2026-05-22

### feat

- GAS 新增 `getTeamCreativeCandidates` API，供講師讀取各隊隊內初選候選。
- GAS 新增 `selectCreativeFinalists` API，供講師每隊選出代表作品並指定匿名代號。
- GAS 新增 `getCreativeFinalists` API，供學員讀取匿名決選作品。
- GAS 新增 `voteCreativeFinal` API，限制學員不可投自己戰隊作品，且每位學員只能投 1 票。
- GAS 新增 `getCreativeVoteResult` API，供講師讀取匿名全體投票結果。
- 講師端新增創作題審核與投票區塊。
- 學員端新增匿名全體投票區塊。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

## 0.3.6 - 2026-05-22

### feat

- GAS 新增 `submitCreativeAnswer` API，限制每位學員每場只能提交 1 則創作答案。
- GAS 新增 `getTeamCreativePool` API，只回傳同隊投稿池，不回傳投稿者暱稱與 playerId。
- GAS 新增 `voteTeamCreative` API，限制隊內初選只能投同隊投稿，且每位學員每場只能投 1 票。
- `創作投稿` 新增 `selectedByInstructor` 欄位，預留給 `0.3.7` 講師審核代表作品。
- 學員端新增「創作題隊內初選」區塊，可提交創作答案、刷新同隊投稿池與投票。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

## 0.3.5-ui - 2026-05-22

### fix

- 補做 `0.3.5` 原應完成的學員端寶箱與道具 UI。
- 學員端新增「寶箱與道具」區塊，可讀取自己的寶箱與道具。
- 學員端可開啟自己的未開啟寶箱，結果由 GAS `openTreasureBox` 決定。
- 學員端可使用已支援道具，送出目標題目與挑戰戰隊，效果由 GAS `useItem` 決定。
- 特殊道具只顯示幸運獎狀態，不在前端套用效果。
- 示範模式補齊寶箱、開箱與道具使用資料。

### docs

- 更新 README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態，標記 `0.3.5` 補作完成。

## 0.3.5 - 2026-05-22

### feat

- GAS 排行榜新增 `effectivePlayerCount` 欄位，區分報到人數與有效參與人數。
- `recalculateScoreboard` 改以至少完成 1 題已計分作答的有效參與人數計算 `averageScore`。
- `weightedAverageScore` 維持為 `averageScore + teamBonusScore`，作為第 3 版戰隊排名分。
- 排行榜保留啟用中的戰隊，即使尚無有效參與者也會顯示 0 分，避免畫面缺隊伍。
- 學員端排行榜顯示排名分、有效人數與道具加成。
- 講師端排行榜顯示排名分、有效人數、答題總分、答題平均、道具加成與最終總分。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- 前端 JavaScript 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.4 - 2026-05-22

### feat

- GAS 新增 `finalizeAwards` API，可由講師結算幸運獎與全對獎。
- GAS 新增 `getAwardList` API，可讀取該場次得獎名單。
- 幸運獎以第一位抽中特殊道具者為得主。
- 全對獎以全部正式題目皆答對者排序，依完成最後一題時間取前 3 名。
- 特殊道具出現後會關閉特殊道具獎池；若正式題目開放進度達 70% 仍未出現，特殊道具機率由 3% 提高為 10%。
- `道具紀錄` 新增 `createdAt` 欄位，供幸運獎排序使用。
- `獎項紀錄` 新增暱稱、分數、完成時間與來源道具欄位。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.3 - 2026-05-22

### feat

- GAS 新增 `useItem` API，支援小加分卡、中加分卡、大加分卡、超級加分卡、加倍卡、翻身卡與挑戰卡。
- 加分卡會立即寫入戰隊加成，每隊同一題同類加分卡限用 1 張。
- 加倍卡可指定目標題，關題計分時若答對，個人分數額外加成，上限 20 分。
- 翻身卡會依使用當下戰隊排序判定：本隊最後一名加 30 分，否則加 5 分；每隊最多觸發 2 次。
- 挑戰卡可指定目標題與對手戰隊，目標題關題後依本隊答對率是否高於對方，給本隊 +10 或 +3。
- 新增 `getTeamBonusLedger` API 讀取戰隊道具加成明細。
- 新增 `recalculateV3Scoreboard` API，並讓排行榜保留原始總分，同時新增 `teamBonusScore`、`finalScore`、`weightedAverageScore`。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.2 - 2026-05-22

### feat

- GAS 新增 `openTreasureBox` API，可開啟指定玩家自己的未開啟寶箱。
- 開箱後會更新 `寶箱紀錄`：`status=opened`、`openedAt`、`itemType`。
- 開箱抽到非空寶箱時，會新增 `道具紀錄`，道具狀態為 `available`。
- `getPlayerInventory` 回傳寶箱的 `itemType`、`itemLabel`，以及道具的來源寶箱、狀態與目標欄位。
- `規則設定` 新增寶箱獎項機率預設值，供後續調整。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.1 - 2026-05-22

### feat

- GAS 新增第 3 版基礎工作表：`寶箱紀錄`、`道具紀錄`、`獎項紀錄`、`創作投稿`、`創作投票`、`規則設定`。
- `resetGameData` 會清除第 3 版活動紀錄，保留題庫、戰隊設定與規則設定。
- 關題計分後，答對者會依規則取得寶箱：每題答對 30% 機率、累積答對 3 題、5 題、10 題、連續答對 3 題、5 題。
- 每位學員最多保留 3 個未開啟寶箱；超過時自動將最早未開啟寶箱標記為 `discarded`。
- 新增 `getPlayerInventory` API，供後續學員端 UI 讀取自己的寶箱與道具狀態。

### docs

- 更新 README、GAS README、第 3 版路線圖、AI 交接文件、工作日誌與模組狀態。

### test

- GAS 語法檢查通過。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.3.0-planning - 2026-05-22

### docs

- 啟動第 3 版製作規格，新增 `docs/12_v3_roadmap.md`。
- 依 `docs/01_game_rules.md` 拆解寶箱、道具、幸運獎、全對獎、戰隊加權平均分與創作票選題。
- 更新 `app/config/modules.json`，新增 `v3_game_rules` 模組狀態。
- 更新 README、AI 交接文件與工作日誌，標記第 3 版目前為規格製作階段。

### test

- 本次未修改前端、GAS 或 Firebase rules 功能邏輯。
- JSON 設定檔解析檢查通過。
- `npm run check:functions` 通過。
- `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

## 0.2.11-final - 2026-05-22

### docs

- 第 2 版定版完成，定版版本保留為 `0.2.11`。
- 更新 README、AI 交接文件、工作日誌、第 2 版路線圖與模組狀態。
- 明確記錄正式架構：Firebase Hosting 作入口，Realtime Database 作公開狀態與公開題庫快取，GAS / Google Sheets 作正式資料與計分來源。
- 補正式活動前檢查：初始化遊戲資料、確認題庫與戰隊設定、確認 Script Properties、要求學員使用可區分暱稱。

### test

- JSON 設定檢查通過。
- 前端 JavaScript 語法檢查通過。
- GAS 語法檢查通過。
- `npm run check:functions` 通過。
- 本次為文件與狀態收尾，未改功能邏輯，未部署雲端。

## 0.2.11 - 2026-05-21

### fix

- 修正學員端關題後最上方「個人積分」未更新的問題；前端改用 `playerScore` 欄位更新畫面與本機暫存。
- 學員確認送出答案後，倒數計時會立即停止，避免畫面看起來仍在倒數。
- 報到頁會先讀取講師是否開放自由選隊；讀取完成前暫停報到按鈕，未開放時直接採系統自動分隊。

### perf

- GAS 自動分隊改用啟用中的戰隊清單與合併後玩家數計算，優先分配到人數最少的隊伍，讓各隊人數盡量接近。

### test

- 本機 JavaScript 語法檢查通過。
- 本機 GAS 語法檢查通過。
- JSON 設定檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.11`。
- GAS 已推送並更新既有 Web App deployment 到 version 18，正式 URL 不變。
- Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.11`；GAS `getGameState`、`getScoreboard`、`getPlayerLeaderboard` 回應 `ok:true`。

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
