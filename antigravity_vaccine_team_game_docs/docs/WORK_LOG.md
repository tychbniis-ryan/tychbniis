# 2026-05-26：0.4.21 場次隔離與個人排行榜秒數修正

1. GAS 場次狀態新增 `sessionStartedAt`，用於區分同一個 `gameId` 下的不同課堂場次。
2. `resetGameData` 與 `syncGameSettingsToFirebase` 會建立新的 `sessionStartedAt`。
3. 開題、關題與結算會沿用目前場次的 `sessionStartedAt`，避免使用會變動的 `updatedAt` 當作本機資料隔離依據。
4. 學員端本機作答、寶箱、道具與成就資料 key 改用 `sessionStartedAt`。
5. 學員端停止跨場次搬移舊 localStorage 資料，避免成就與寶箱帶到上一場。
6. 個人排行榜新增作答總秒數，資料來源為 GAS 作答紀錄的 `responseSeconds` 加總。

# 2026-05-26：0.4.21 部署紀錄
1. 已部署 GAS，Apps Script Web App deployment 更新為 `@44`。
2. 已部署 Firebase Hosting，學員端、講師手機端與大螢幕投影端皆回應 `200`，並載入 `0.4.21`。
3. 已確認線上 `app.js?v=0.4.21` 與 `display.js?v=0.4.21` 包含 `sessionStartedAt` 與 `totalResponseSeconds` 修正。

# 2026-05-26：0.4.20 投影狀態、均衡分隊與累積成就修正

1. 投影端移除題目倒數顯示，開題、關題、結算時改顯示目前狀態。
2. 學員端 Firebase 快速報到會先讀取現有 `players/{gameId}`，再分配到人數最少的戰隊。
3. 若多隊人數相同，使用學員端裝置種子在候選隊伍中分散，避免全部集中到第 1 隊。
4. 學員端本機資料 key 改用穩定場次 key，避免開題或關題後因 `updatedAt` 改變而讀不到既有作答紀錄。
5. 作答關題公布後會立即重算成就與紅點，修正累積答題成就停在 `0 / 3` 或 `0 / 5`。
6. 已執行 JavaScript 語法檢查、JSON 檢查與 `npm run check:functions`。
7. 已部署 Firebase Hosting，3 個線上頁面皆回應 `200` 並載入 `0.4.20`。
8. 本次未修改 GAS 主程式，Apps Script Web App 維持 deployment `@43`。

# 2026-05-26：0.4.19 開題同步 Firebase 修正

1. 使用者回報：講師端已開題，但投影端仍顯示「場次已建立，等待講師開題」。
2. 對照關題流程後確認根因：關題會執行 `publishGameStateToFirebase()`，開題則將 Firebase 同步標示為 skipped。
3. 已修正 `gas/Code.gs`：`openQuestion()` 開題後寫入 Firebase `gameState/{gameId}`。
4. 投影端保留 GAS fallback，讓已開題但 Firebase 舊狀態的場次仍可補救顯示。
5. 版本更新為 `0.4.19`。
6. 已部署 GAS Web App deployment `@43`。
7. 已部署 Firebase Hosting，3 個線上頁面皆回應 `200` 並載入 `0.4.19`。
8. Playwright 未執行，原因是本專案未安裝 `playwright` 套件；已用 HTTP 載入檢查與語法檢查替代。
9. 9. GitHub `main` 提交已建立，commit hash 以 `git log -1 --oneline` 為準。

# 2026-05-26：0.4.18 投影端輪詢、版面與連續成就修正

## 部署紀錄

1. 已推送 GitHub `main`，提交為 `734f795`。
2. 已部署 Firebase Hosting，學員端與講師端皆已更新。
3. 本次未修改 GAS，GAS Web App 維持 deployment version `42`。
4. 已用 Playwright 實際開啟線上學員端、講師手機端、大螢幕顯示端。
5. 3 個線上頁面均回應 `200`，載入 `0.4.18`，且無 console error 與 page error。
6. 線上學員登入畫面的道具使用紀錄已隱藏。
7. 線上大螢幕端在 1366×768 檢查中無水平或垂直捲動，得獎名單位於可視範圍內。

## 修改紀錄

1. 學員端道具使用紀錄預設隱藏，報到進入遊戲畫面後才顯示。
2. 大螢幕投影端 Firebase 讀取加上 `_ts`，降低瀏覽器或中間快取造成的舊狀態問題。
3. 大螢幕投影端輪詢頻率改為最多 1.5 秒一次。
4. 開題與關題時若目前題目不在快取中，投影端會強制重讀 `publicQuestions`。
5. 連續答對成就未完成前以目前連續題數顯示，失敗後回到 `0 / N`。
6. 已完成的連續答對成就會維持完成，例如已達 `3 / 3` 後下一題失敗仍維持 `3 / 3`。
7. 另一個尚未完成的連續成就會歸零，例如 `3 / 5` 下一題失敗後回到 `0 / 5`。
8. 大螢幕排行榜與結算畫面改為更緊湊版面，避免得獎名單被切掉。

# 2026-05-26：0.4.17 投影端、挑戰卡與成就修正

## 部署紀錄

1. 已推送 GitHub `main`，提交為 `96252af`。
2. 已部署 Firebase Hosting，學員端與講師端皆已更新。
3. 本次未修改 GAS，GAS Web App 維持 deployment version `42`。
4. 已用 Playwright 實際開啟線上學員端、講師手機端、大螢幕顯示端。
5. 3 個線上頁面均回應 `200`，載入 `0.4.17`，且無 console error 與 page error。
6. 大螢幕顯示端在 1366×768 檢查中無水平或垂直捲動。

## 修改紀錄

1. 投影端開題後立即顯示已開題提示、題目與選項。
2. 投影端關題後不另開答案區塊作為主要視覺，而是在原選項上以紅框強調正確答案，下方保留解析。
3. 投影端 CSS 改為固定 `100vh` 投影畫面，避免向下或向右捲動。
4. 學員端挑戰卡結果改在彈窗內顯示，保留動畫與結果提示空間。
5. 修正挑戰卡「猜?」與道具紀錄 `??` 亂碼。
6. 挑戰卡道具紀錄改顯示已套用，不再顯示待套用。
7. 成就系統移除幸運箱得主項目。
8. 全對獎改為檢查正式題目是否全數作答且無錯題。
9. 連續答對獎改為依正式題目順序判斷，未答或錯題會中斷。
10. 成就完成後進度鎖定在目標值，不再繼續累加超過門檻。

# 2026-05-25：0.4.16 大螢幕、作答彈窗與道具規則

## 部署紀錄

1. 已推送 GitHub `main`，提交為 `f5d3325`。
2. 已推送 GAS 並更新既有 Web App deployment 到 version `42`，正式 URL 不變。
3. 已部署 Firebase Hosting，學員端與講師端皆已更新。
4. 已用 Playwright 實際開啟線上學員端、講師手機端、大螢幕顯示端。
5. 3 個線上頁面均回應 `200`，載入 `0.4.16`，且無 console error 與 page error。
6. 大螢幕端在目前已結算狀態下，已確認只顯示結算畫面。

## 修改紀錄

1. 修正大螢幕端開題後不更新目前題目的問題，改由 `publicQuestions` 快取補齊題目內容。
2. 講師端排行榜隱藏，排行榜資訊改由大螢幕端顯示。
3. 大螢幕結算畫面只顯示戰隊排名、個人排名與得獎名單，隱藏目前題目與即時排行榜。
4. 學員端作答改為彈窗選項與彈窗倒數，送出後只顯示已選答案與花費秒數。
5. 挑戰卡改為前端猜大小規則，不呼叫 GAS 判定；0 到 4 為小，5 到 9 為大。
6. 取消道具 3 分鐘限制，改為講師關題後到競賽結算前可使用。
7. 學員端道具紀錄移至回答頁最下方，可展開或收合。
8. 已補正學員端頂端個人得分，讓立即加分卡與挑戰卡分數納入顯示。
9. GAS 排行榜快照新增 `awards`，供大螢幕結算顯示幸運獎與全對獎。
10. 已完成本機語法、Functions 編譯、`git diff --check` 與 Playwright 實際開啟本機學員端、講師手機端、大螢幕端。

# 2026-05-25：0.4.15 道具紀錄與講師端拆頁

1. 學員端回答頁新增道具使用倒數、道具使用紀錄、寶箱與成就提示。
2. 學員端成就可領取時會顯示紅點，並在回答頁提示可領取成就或寶箱。
3. 學員端結算獎項將內部代碼轉為中文名稱。
4. 講師端新增 `Instructor.html` 手機控制端與 `Display.html` 大螢幕顯示端。
5. 本次未修改 GAS。

# 2026-05-25：0.4.14 線上部署

1. 已推送 GitHub `main`，提交為 `67281e8`。
2. 已部署 Firebase Hosting，學員端與講師端皆已更新。
3. 已用 Playwright 實際開啟線上學員端，確認載入 `0.4.14` 且 console 無錯誤。
4. 本次未修改 GAS，GAS Web App 維持 deployment version `41`。

# 2026-05-25：0.4.14 學員端模組載入修正

1. 實際用 Playwright 開啟線上學員端，重現 console 錯誤：`Identifier 'buildAchievementDefinitions' has already been declared`。
2. 修正學員端 `app.js` 重複宣告，保留完整成就規則合併邏輯。
3. 將前端快取版本統一更新為 `0.4.14`，避免 HTML、config、module import 混用版本。
4. 已用 Playwright 開啟本機學員端，確認 console 無錯誤；因 GAS 目前為 `draft`，畫面正確停在等待講師啟動。

# 2026-05-25：0.4.12 線上部署

1. 已將 `0.4.12` 學員端重整進入修正推送至 GitHub `main`，提交為 `5debc26`。
2. 已部署 Firebase Hosting，學員端與講師端皆已載入 `app.js?v=0.4.12` 與 `config.js?v=0.4.12`。
3. 本次未修改 GAS 程式，GAS Web App 維持 deployment version `41`。
4. 線上驗證結果：學員端回應 `200`、講師端回應 `200`、HTML 中文標題正常。

# 2026-05-25：0.4.12 學員端重整進入修正

1. 修正學員端重整後可能讀到 Firebase 舊 `draft` 狀態，導致無法進入遊戲。
2. 學員端 `getStartupGameState()` 改為只在 Firebase 狀態不是 `draft` 時直接採用。
3. 若 Firebase 為 `draft`、空值或暫時不可用，學員端會查詢 GAS `getGameState` 作為正式狀態來源。
4. 前端版本更新為 `0.4.12`。
# 2026-05-25：0.4.11 線上部署

1. 已將 `0.4.11` 程式修正提交至 GitHub `main`，提交編號 `58e1b8e`。
2. 已執行 `clasp push` 並更新 GAS Web App deployment 至 version `41`，正式 URL 不變。
3. 已部署 Firebase Hosting 學員端與講師端。
4. 線上檢查結果：學員端與講師端皆回應 `200`，並載入 `0.4.11` 前端版本。
5. 線上 HTML 中文標題正常。
6. GAS `getGameState` 回應 `ok:true`。
# 2026-05-25：0.4.11 關題流程與本機狀態修正

1. 講師端關題改為先顯示解答，再背景呼叫 `scoreClosedQuestion` 結算成績。
2. GAS `closeAndScoreQuestion` 改為快速關題與公布答案，不再等待完整計分。
3. 學員端道具使用後會寫回本機道具狀態，避免重新開啟面板又顯示未使用。
4. 學員端成就補齊累積答對 10 題、連續答對 5 題、使用 3 張道具、幸運箱得主與個人全對。
5. 學員端若沒有 `v4-static-config.json`，會由 Firebase 公開題庫建立第 4 版執行期設定，保留本機寶箱預配。
6. GAS 結算競賽取消整場 Firebase answers 掃描，玩家同步與答案同步改採批次寫入。
6. 本機檢查已執行前端 JavaScript、GAS、JSON、Functions build 與 diff 檢查。
# 2026-05-25：0.4.10 線上部署

1. 已將 `0.4.10` 程式修正提交至 GitHub `main`，提交編號 `ef6959b`。
2. 已執行 `clasp push` 並更新 GAS Web App deployment 至 version `40`，正式 URL 不變。
3. 已部署 Firebase Hosting 學員端與講師端。
4. 線上檢查結果：學員端與講師端皆回應 `200`，並載入 `0.4.10` 前端版本。
5. GAS `getGameState` 回應 `ok:true`，目前場次狀態為 `question_closed`。
# 2026-05-25：0.4.10 靜態前端重構修正

1. 修正 GAS `recalculateScoreboard` 的 `validPlayerIds is not defined`，避免講師關題與結算競賽卡住。
2. 學員端新增本機寶箱計畫，依 `gameSeed + playerId + questionId` 預先決定各題是否有寶箱與內容物。
3. 學員端一般開箱不再呼叫 GAS，直接在前端新增道具；幸運箱仍回傳 GAS 紀錄。
4. 學員端成就改為前端本機計算，達成後可立即領取本機寶箱。
5. 道具清單補上使用說明。
6. `data/v4_static_game_config.example.json` 補上幸運箱權重與 `itemUse` 成就規則。
7. 版本更新至 `0.4.10`。

測試：前端 JavaScript 語法檢查、GAS 語法暫存檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 2026-05-25：0.4.9 線上部署

1. 已推送 GitHub `main` 至 commit `3f3b995`。
2. GAS 已執行 `clasp push`。
3. GAS 已更新既有正式 Web App deployment 至 version `39`，正式 URL 不變。
4. Firebase Hosting 已部署學員端與講師端。
5. 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.9` 與 `config.js?v=0.4.9`，並包含道具倒數區塊。
6. 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.9` 與 `config.js?v=0.4.9`，並包含結算結果彈出頁。
7. GAS `getGameState` 回應 `ok:true`。
8. 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

# 2026-05-25：0.4.9 線上測試回報修正

1. 學員端本機積分、答案與道具佇列改以 `gameId + 場次 updatedAt + playerId` 作為儲存 key，避免固定 `gameId` 重開場後讀取前一場分數。
2. 學員端送答後先暫存答案與預估分數，等 Firebase 顯示講師已關題後才納入本機積分。
3. 學員端恢復低頻 Firebase 狀態監看，只處理關題、道具倒數與結算頁，不顯示即時開題提示。
4. 學員端新增道具使用倒數提示，道具在關題後 3 分鐘內立即送出 Firebase 紀錄。
5. 成就領取改為優先呼叫 GAS 正式發放寶箱，成功後重新整理成就與寶箱清單。
6. GAS 開題不再同步 Firebase `gameState`，降低講師開放題目等待時間。
7. GAS 關題改為同次完成同步、計分、排行榜快照發布，不再由講師端等待第二次計分 API。
8. GAS 關題計分不再為未作答玩家補空白答案列，降低 Google Sheets 寫入量。
9. 排行榜改為總分排序，並發布個人排行榜快照。
10. 講師與學員結算頁修正，講師端新增彈出式結算結果頁。

測試：前端 JavaScript 語法檢查、GAS 語法暫存檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 2026-05-25：0.4.8 線上部署

1. 已推送 GitHub `main` 至 commit `9894e51`。
2. GAS 已執行 `clasp push`。
3. GAS 已更新既有正式 Web App deployment 至 version `38`，正式 URL 不變。
4. Firebase Hosting 已部署學員端與講師端。
5. 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.8` 與 `config.js?v=0.4.8`。
6. 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.8` 與 `config.js?v=0.4.8`。
7. GAS `getGameState` 回應 `ok:true`。
8. 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

# 2026-05-25：0.4.8 線上測試回報修正

1. 講師端關題公布面板改為開題後才顯示，並顯示開題、關題與結算狀態。
2. GAS `finalizeCompetition` 改為第 4 版流程，不再執行創作題與票選加分。
3. GAS `resetGameData` 新增 Firebase Realtime Database 場次暫存清除，避免前一場玩家、作答、道具、寶箱、成就與排行榜資料殘留。
4. 學員端不再自動輪詢講師開題狀態，只預載題庫，降低課堂中 Firebase 與 GAS 讀取量。
5. 學員端送答成功後依前端規則更新本機積分，送答失敗訊息改為尚未寫入，避免誤導已由 GAS 紀錄。
6. 學員端排行榜、寶箱與成就讀取期間保留舊畫面，新資料載入完成後再置換。
7. 前端靜態資源版本與 `clientVersion` 更新為 `0.4.8`，讓舊快取與舊登入資料能重新整理。

測試：學員端與講師端 JavaScript 語法檢查、GAS 語法檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 2026-05-25：0.4.7 線上部署

1. 已推送 GitHub `main`。
2. GAS 已執行 `clasp push`。
3. GAS 已更新既有正式 Web App deployment 至 version `37`，正式 URL 不變。
4. Firebase Hosting 已部署學員端與講師端。
5. 線上學員端回應 `200`，HTML 已載入 `app.js?v=0.4.7`。
6. 線上講師端回應 `200`，HTML 已載入 `app.js?v=0.4.7`。
7. GAS `getGameState` 回應 `ok:true`。
8. GAS `recordLuckyBoxOpened` 與 `recordPerfectAwardCandidate` 已確認不是未知 action。
9. 本次未部署 Firebase rules、Cloud Functions 或 Cloud Run。

# 0.4.7 本機檢查與交接收斂

1. 新增 `docs/15_v4_0_4_7_checklist.md`。
2. 整理 `0.4.1` 至 `0.4.7` 完成項目。
3. 更新 README、CHANGELOG、AI 交接文件、工作日誌、模組狀態與 package 版本。
4. 本次仍未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。

測試：學員端與講師端 JavaScript 語法檢查、GAS 語法檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 0.4.6 GAS 獎項紀錄相容欄位

1. GAS 首答加分常數改為 `0`。
2. 新增 `recordLuckyBoxOpened`，紀錄學員端開啟幸運箱。
3. 新增 `recordPerfectAwardCandidate`，紀錄學員端回傳個人全對候選。
4. 學員端幸運箱開啟與全對候選會嘗試回傳 GAS；回傳失敗不阻斷主要送答或開箱流程。
5. Firebase 開箱請求新增 `itemType`、`isLuckyBox` 與 `clientOpenId`。

測試：學員端 JavaScript 語法檢查、GAS 語法檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 0.4.5 學員端排行榜快照讀取收斂

1. 學員端排行榜維持浮動工具按鈕，開啟時才讀取。
2. 排行榜只讀 Firebase `publicScoreboards/{gameId}` 快照。
3. 無快照時顯示等待講師關題，不回退呼叫 GAS 即時排行榜。
4. 已確認學員端無 `getScoreboard` 或 `getPlayerLeaderboard` 的 GAS 排行榜備援呼叫。

測試：學員端 JavaScript 語法檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 0.4.4 關題關閉後 3 分鐘道具使用期

1. 學員端記錄最後一次關題題號與關題時間。
2. `canUseItem` 改為只允許關題後 3 分鐘內使用道具。
3. 一般道具與挑戰卡超過使用期時，前端會顯示拒絕訊息。
4. 道具排程新增 `clientItemUseId`、`effectScore` 與 `useWindowClosesAt`。
5. Firebase `itemUses` payload 已帶入第 4 版欄位，供 GAS 彙整與去重。

測試：學員端 JavaScript 語法檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 0.4.3 學員端靜態設定載入

1. 新增 `frontend/student/dist/static-v4.js`。
2. 學員端會優先嘗試載入 `v4-static-config.json`，若檔案不存在則沿用 Firebase 公開題庫。
3. 靜態題庫可包含 `correctAnswer` 與 `explanation`，供第 4 版學員端本機計算使用。
4. 學員送答時新增 `clientSubmitId`、`responseSeconds`、正誤、基本分、題目分數與全對候選欄位。
5. Firebase `answers` 寫入仍使用 `gameId + questionId + playerId` 路徑，避免同一題重複覆寫。

測試：學員端 JavaScript 語法檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 0.4.2 靜態資料格式範本

1. 新增 `data/v4_static_game_config.example.json`。
2. 範本定義第 4 版學員端可一次載入的資料：題庫、答案、計分、寶箱、成就、道具與重複送出鍵值。
3. 幸運箱限制已寫入 `luckyAwardMaxWinners: 1` 與 `allowNoLuckyPreassignment: true`。
4. 道具使用期已寫入 `postCloseWindowSec: 180`。
5. 挑戰卡列為 `gasCalculatedItemTypes`，其餘加分、加倍、翻身卡列為 `clientCalculatedItemTypes`。

測試：JSON 解析、`npm run check:functions`、`git diff --check`。

# 0.4.1 創作題與票選入口移除

1. 學員端移除創作題隊內初選與匿名全體投票區塊。
2. 講師端移除創作題審核與投票操作區塊。
3. 講師端題目清單排除 `creative` 題型，並從示範 fallback 題庫移除 `demo_q011`。
4. 學員端排行榜改為浮動工具按鈕，手動開啟後只讀 Firebase 快照，不再回退呼叫 GAS 排行榜 API。
5. 本次為本機修改，尚未部署雲端。

測試：前端 JavaScript 語法檢查、JSON 解析、`npm run check:functions`、`git diff --check`。

# 第 3 版定版紀錄

1. 第 3 版以 `0.3.22` 定版。
2. 定版文件：`docs/13_v3_final_release.md`。
3. 效能收斂文件：`docs/tasks/OPTIMIZATION_PLAN_0.3.21.md`。
4. 學員端：https://tychbniis-32af5-student.web.app。
5. 講師端：https://tychbniis-32af5-instructor.web.app。
6. GAS Web App deployment：version `36`。
7. 免費方案限制維持：未啟用 Cloud Functions、Cloud Run、Blaze 或付費服務。

# 第 4 版規劃修正紀錄

1. 第 4 版改為靜態 HTML5 優先，目標是降低 GAS 呼叫與免費方案塞車風險。
2. 機率表改由 GAS 事前建立與維護，導師開啟遊戲時只讀取既有題庫、答案、機率表、成就規則與戰隊設定。
3. 學員登入時依 `gameSeed + playerId + questionId` 預配寶箱與道具內容。
4. 學員端自行計算成就、加倍卡、翻身卡與本題分數，GAS 只接收結果並去重。
5. 挑戰卡保留 GAS 計算，因為涉及戰隊間完成率。
6. 關題關閉後開放 3 分鐘道具送出期，逾時自動關閉。
7. 移除創作題與票選流程。
8. 排行榜只在導師關題後更新，學員端以懸浮按鈕手動讀取。
9. 幸運箱全場最多 1 名預配，無人中獎時最終結算指定 1 名現有玩家。
10. 個人全對獎由學員端在最後 1 題完成後回傳 GAS 紀錄。
11. 取消首答 +5 分，降低 GAS 計算負擔。
12. 補上重複送出與網路延遲防錯規劃。

測試：JSON 解析、`npm run check:functions`、`git diff --check`。

# 第 4 版開發啟動紀錄

1. 第 4 版以 `0.4.0-planning` 啟動。
2. 新增路線圖：`docs/14_v4_roadmap.md`。
3. 版本定位：正式活動維運與安全檢查版。
4. 本階段只做規格、文件與版本標記，不修改正式前端、GAS、Firebase rules 或部署內容。
5. 後續優先順序：活動前健康檢查、正式活動操作手冊、賽後保存與交接、講師端低風險輔助功能。

測試：JSON 解析、`npm run check:functions`、`git diff --check`。

# 0.3.22 關題關閉與學員端頂端分數調整

1. 學員端頂端改為顯示個人得分與道具使用分，不再顯示戰隊積分。
2. 學員端隱藏排行榜入口，避免學員端讀取戰隊排行資料。
3. 學員端使用本機送答紀錄、公開關題解答與本機道具排程估算頂端分數。
4. 講師關題 API 先回傳正確答案與解題說明，計分與排行榜更新改由講師端自動觸發一次 GAS 後台計分。
5. 講師端關題後只由講師端少量延遲刷新排行榜，避免學員端集中呼叫 GAS。
6. 本次未啟用 Cloud Functions、Cloud Run、Blaze 或付費服務。

測試：node --check 前後台 app/api、GAS 語法檢查、JSON 解析、npm run check:functions、git diff --check。
# 0.3.21 接續修正紀錄

1. 學員端道具使用改為關題後排程，下一題開放時由前端背景寫入 Firebase itemUses，降低按下道具時的等待感。
2. 講師第 1 次開題時會先同步 Firebase players，並為所有目前玩家建立 TreasureRewardPool 預配寶箱獎勵池。
3. 後續加入的玩家在 GAS 報到或 Firebase players 匯入 Sheet 時會補建立預配寶箱獎勵池，仍可加入戰隊。
4. 寶箱發放時即決定 itemType，開箱時只使用既有結果，不再現場抽獎。
5. 戰隊排行榜改為每題平均分加總，晚加入玩家不會回頭拉低前面題目的平均分。
6. 挑戰卡答對率改以該題已結算作答列計算，符合下一題該題答對率比較規則。
7. 修正寶箱與成就紅點因 notice-dot CSS 覆蓋 hidden 而常態顯示的問題。
8. 移除關題後學員端集中刷新個人摘要，避免約 200 人同時呼叫 GAS。

測試：node --check 前後台 app/api、GAS 語法檢查、JSON 解析、npm run check:functions、git diff --check。
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
| 第 2 版 | 定版完成 | 定版版本 `0.2.11`，以 Firebase Hosting + Realtime Database 公開快取 + GAS / Google Sheets 為正式架構 |
| 第 3 版 | `0.3.22` 定版完成 | 定版文件為 `docs/13_v3_final_release.md`，GAS Web App deployment 為 version `36` |
| 第 4 版 | `0.4.0-planning` 開發啟動 | 已新增 `docs/14_v4_roadmap.md`，先處理正式活動維運與安全檢查規格 |
| GitHub CLI | 已登入 | 帳號為 `tychbniis-ryan` |
| Git push | 尚未執行 | 未收到使用者明確要求，不主動 push |

## 架構決策紀錄

### 2026-05-23：第 3 版 0.3.21 效能優化與即時反饋修補

本次處理 OPTIMIZATION_PLAN_0.3.21.md 規劃的五項修補：

1. 學員端 `renderPublicGameState` 偵測到 `question_closed` 且題目 ID 符合時，延遲 500ms 發送一次 `refreshPlayerSummary(questionId)`，實現關題後即時顯示得分與對錯顏色。
2. GAS `getPlayerSummary` 建立 `context` 物件一次性傳入 `answerSheet`、`answerRows`、`treasureSheet`、`treasureRows`，再透過 `getPlayerNoticeSummary` 與 `getPlayerAchievements` 沿用，避免高併發時重複讀取 Google Sheets。
3. 學員端 `openBox` 改為直接呼叫 GAS `openTreasureBox`，成功時立即取得 `itemLabel` 並呼叫 `refreshInventory()` 更新道具列表；GAS 呼叫失敗時才回退 Firebase 快速請求。
4. `refreshPlayerSummary` 成功後同步更新 `inventoryNotice` 與 `achievementNotice` 紅點狀態，整合寶箱開啟後的通知更新。
5. GAS `formatCorrectAnswer` 在 `correctAnswer` 為空或解析後無有效選項時，明確回傳「（本題無標準答案）」，防止創作題正確答案欄空值造成 UI 困擾。

測試：

1. 學員端 `app.js` 語法檢查通過（`node --check`，exit 0）。
2. 講師端 `app.js` 語法檢查通過。
3. `git diff --check` 通過（exit 0），已清除 Code.gs 結尾空白。
4. `npm run check:functions` 通過（TypeScript 編譯，exit 0）。
5. JSON 設定檔（`package.json`、`app/config/modules.json`）解析正常。
6. 本次尚未部署 GAS、Firebase Hosting、Cloud Functions 或 Realtime Database rules。

### 2026-05-23：第 3 版 0.3.20 創作題資料隔離與送答備援

使用者回報：

1. 一般題送答出現 Firebase `HTTP 401`，畫面顯示送出失敗。
2. 寶箱與成就仍可能在沒有可操作項目時顯示紅點。
3. 講師按結算競賽速度太慢。
4. 創作題不再卡住，但會代入舊資料，且不能投票。

本次處理：

1. 學員端送答若 Firebase 失敗，會自動回退 GAS `submitAnswer`。
2. 創作投稿與投票新增 `questionId` 欄位，並加上本次開題時間過濾；創作題投稿池、候選、投票與結果只讀目前這次開題後的新資料。
3. 講師結算競賽不再同步整場 Firebase `answers`，避免掃描過多資料造成緩慢；正式完整重算保留在賽後報表流程。
4. 學員端個人摘要讀取失敗時會隱藏寶箱與成就紅點。

測試與部署：

1. 前端 JavaScript 語法檢查通過。
2. GAS 語法檢查通過。
3. JSON 設定檔解析通過。
4. `npm run check:functions` 通過；只做編譯檢查，未部署 Functions。
5. `git diff --check` 通過，僅有既有 CRLF 提示。
6. GAS 已推送並更新既有 Web App deployment 到 version 34。
7. Firebase Hosting 學員端與講師端已部署。
8. Realtime Database rules 已部署，修正學員端 Firebase 快速寫入授權問題。
9. 本次未部署 Cloud Functions、Cloud Run 或 Firestore rules，未啟用 Blaze。

### 2026-05-23：第 3 版 0.3.18 快速寫入與 GAS 結算相容修正

使用者回報：

1. 創作題送出答案後卡住不動。
2. 成績結算失效，顯示找不到玩家。
3. 關題計分失敗、寶箱讀取失敗、成就讀取失敗。
4. 寶箱與成就沒有可操作功能時，不應顯示紅點或驚嘆號。

Root Cause：

1. 學員報到、送答、創作投稿與投票已改為 Firebase 快速寫入，但 GAS 仍有部分結算與讀取流程只查 Google Sheets。
2. Firebase 快速報到的玩家尚未被匯入 Sheets 時，GAS `findPlayer` 會回覆「找不到玩家」。
3. 創作題投稿寫入 Firebase 後，GAS 隊內投稿池與講師候選列表尚未同步該資料。
4. 前端讀取寶箱或成就失敗時，未清除既有紅點狀態。

本次處理：

1. GAS 關題計分前會同步 Firebase `players` 與當題 `answers` 到 Sheets。
2. GAS 創作題投稿池、隊內投票、講師候選、決選作品、全體投票與結算前會同步 Firebase 創作暫存資料。
3. GAS `findPlayer` 找不到 Sheets 玩家時，會從 Firebase `players` 匯入。
4. 學員端寶箱或成就讀取失敗時，會先隱藏紅點。

測試與部署：

1. 前端 JavaScript 語法檢查通過。
2. GAS 語法檢查通過。
3. JSON 設定檔解析通過。
4. `npm run check:functions` 通過；只做編譯檢查，未部署 Functions。
5. `git diff --check` 通過，僅有既有 CRLF 提示。
6. GAS 已推送並更新既有 Web App deployment 到 version 32。
7. Firebase Hosting 學員端與講師端已部署。
8. 本次未部署 Cloud Functions、Cloud Run、Firestore rules 或 Realtime Database rules，未啟用 Blaze。

### 2026-05-23：第 3 版 0.3.17 免費方案效能重構第一階段續作

使用者需求：

1. 延續免費方案效能重構，讓排行榜改以 Firebase 快照提供給學員端讀取。
2. 關題後由講師端管理操作觸發暫時計分，不讓每位學員操作後重算排行榜。
3. 不啟用 Blaze、Cloud Functions、Cloud Run 或任何需付費帳務的服務。

本次處理：

1. GAS 新增 `publishScoreboardSnapshotToFirebase`。
2. `closeAndScoreQuestion` 關題計分後，將排行榜寫入 `publicScoreboards/{gameId}`。
3. 暫時快照包含 `updatedAt`、`questionId`、`isTemporary: true`、`source: instructor_close_question`、`teams`。
4. `finalizeCompetition` 結算後，寫入 `isTemporary: false`、`source: gas_final` 的正式快照。
5. 學員端既有排行榜讀取可繼續優先讀 Firebase 快照。

尚未處理：

1. GAS 尚未新增從 Firebase 匯出 `players`、`answers`、`itemUses`、創作投稿與投票並正式重新計分的完整流程。
2. 寶箱尚未在取得時預先決定 `rewardType`。
3. 學員端尚未接 Firebase Auth，rules 目前只能限制資料形狀與管理節點，無法做到完整身分驗證。

測試：

1. 學員端 `api.js` 語法檢查通過。
2. 學員端 `app.js` 語法檢查通過。
3. 講師端 JavaScript 語法檢查通過。
4. GAS 語法檢查通過。
5. JSON 設定檔解析通過。
6. `git diff --check` 通過。
7. `npm run check:functions` 通過；只做編譯，未部署 Functions。
8. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `app.js?v=0.3.17`。
9. 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.17`。

部署：

1. 已部署 GAS。
2. 已部署 Firebase Hosting 學員端與講師端。
3. 本次未部署 Cloud Functions、Firestore rules、Cloud Run 或任何需付費帳務的服務。

### 2026-05-23：第 3 版 0.3.16 免費方案效能重構第一階段續作

使用者需求：

1. 延續免費方案效能重構，降低創作題投稿與投票對 GAS / Google Sheets 的即時依賴。
2. 讓投稿、放棄回答、隊內投票與匿名全體投票按下後立即回饋。
3. 不啟用 Blaze、Cloud Functions、Cloud Run 或任何需付費帳務的服務。

本次處理：

1. 學員創作題投稿改為優先寫入 `creativeSubmissions/{gameId}/{questionId}/{playerId}`。
2. 學員隊內初選投票改為優先寫入 `creativeTeamVotes/{gameId}/{questionId}/{playerId}`。
3. 學員匿名全體投票改為優先寫入 `creativeFinalVotes/{gameId}/{questionId}/{playerId}`。
4. 投稿或投票成功後不再立即重新讀取投稿池或決選作品，避免 200 人同時刷新。
5. Firebase 寫入失敗時，仍保留 GAS action 備援。
6. Realtime Database rules 新增創作投稿與投票節點規則，同一路徑只能建立一次。

尚未處理：

1. 講師端讀取候選、選代表作品與讀投票結果仍走 GAS。
2. 講師端關題後尚未建立 Firebase 暫時計分器來更新 `publicScoreboards` 快照。
3. GAS 尚未新增從 Firebase 匯出並正式重新計分的完整流程。
4. 寶箱尚未在取得時預先決定 `rewardType`。
5. 學員端尚未接 Firebase Auth，rules 目前只能限制資料形狀與管理節點，無法做到完整身分驗證。

測試：

1. 學員端 `api.js` 語法檢查通過。
2. 學員端 `app.js` 語法檢查通過。
3. 講師端 JavaScript 語法檢查通過。
4. GAS 語法檢查通過。
5. JSON 設定檔解析通過。
6. `git diff --check` 通過。
7. `npm run check:functions` 通過；只做編譯，未部署 Functions。
8. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `app.js?v=0.3.16`。
9. 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.16`。
10. 線上 Realtime Database 測試：`creativeSubmissions`、`creativeTeamVotes`、`creativeFinalVotes` 第一次寫入成功，第二次覆寫被拒絕；測試資料已移除。

部署：

1. 已部署 Firebase Hosting 學員端與講師端。
2. 已部署 Realtime Database rules。
3. 本次未部署 GAS、Cloud Functions、Firestore rules、Cloud Run 或任何需付費帳務的服務。

### 2026-05-23：第 3 版 0.3.15 免費方案效能重構第一階段續作

使用者需求：

1. 延續免費方案效能重構，降低比賽期間學員端對 GAS 與 Google Sheets 的依賴。
2. 讓約 200 人同時報到時，學員端能快速進入遊戲畫面。
3. 不啟用 Blaze、Cloud Functions、Cloud Run 或任何需付費帳務的服務。

本次處理：

1. 學員報到改為優先寫入 Realtime Database `players/{gameId}/{playerId}`。
2. `playerId` 由本機 `clientKey` 雜湊產生，同一裝置重複進入會沿用同一路徑。
3. 未開放自由選隊時，前端以 `clientKey` 雜湊穩定分配 `team_1` 到 `team_5`。
4. 報到成功後立即進入遊戲畫面，不再等待 GAS `joinGame`、個人摘要、排行榜、寶箱、成就整包資料。
5. 若 Firebase 快速報到失敗，仍保留 GAS `joinGame` 備援。
6. Realtime Database rules 新增 `players` 規則，限制同一路徑只能建立一次，學生端不可覆寫既有 player。

尚未處理：

1. 同暱稱跨裝置去重尚未完成；目前以同一裝置 `clientKey` 穩定沿用 player。
2. 創作投稿、隊內投票、匿名全體投票尚未全面改成 Firebase 寫入。
3. 講師端關題後尚未建立 Firebase 暫時計分器來更新 `publicScoreboards` 快照。
4. GAS 尚未新增從 Firebase 匯出並正式重新計分的完整流程。
5. 學員端尚未接 Firebase Auth，rules 目前只能限制資料形狀與管理節點，無法做到完整身分驗證。

測試：

1. 學員端 `api.js` 語法檢查通過。
2. 學員端 `app.js` 語法檢查通過。
3. 講師端 JavaScript 語法檢查通過。
4. GAS 語法檢查通過。
5. JSON 設定檔解析通過。
6. `git diff --check` 通過。
7. `npm run check:functions` 通過；只做編譯，未部署 Functions。
8. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `app.js?v=0.3.15`。
9. 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.15`。
10. 線上 Realtime Database 測試：`players/codex_player_test_20260523/player_test_001` 第一次寫入成功，第二次覆寫被拒絕；測試資料已移除。

部署：

1. 已部署 Firebase Hosting 學員端與講師端。
2. 已部署 Realtime Database rules。
3. 本次未部署 GAS、Cloud Functions、Firestore rules、Cloud Run 或任何需付費帳務的服務。

### 2026-05-23：第 3 版 0.3.14 免費方案效能重構第一階段

使用者需求：

1. 維持免費方案，不啟用 Blaze、Cloud Functions、Cloud Run 或任何需付費帳務的服務。
2. 比賽期間學員端不得高頻呼叫 GAS，且不得直接讀寫 Google Sheets。
3. 學員端高頻操作需先寫 Firebase、立即回饋 UI、延後結算。
4. 正式成績以賽後 GAS 重新計分為準，比賽中排行榜與道具效果屬於暫時結果。

本次處理：

1. 學員送答改為優先寫入 Realtime Database `answers/{gameId}/{questionId}/{playerId}`。
2. 送答按下後立即停用選項並顯示「已送出，等待講師關題」。
3. 已從 Firebase 公開題庫取得題目時，翻開試卷不再額外呼叫 GAS `openPaper`。
4. 道具使用改為寫入 `itemUses/{gameId}/{itemId}`，狀態為 `pending`。
5. 道具使用後不刷新排行榜、寶箱、成就或個人摘要。
6. 排行榜改為優先讀取 `publicScoreboards/{gameId}` 快照，無快照時才使用 GAS 備援。
7. 成就領取改為寫入 `achievementClaimRequests`，不再同步刷新全部資料。
8. 寶箱開啟改為寫入 `treasureBoxOpenRequests`，並立即隱藏該列。
9. Realtime Database rules 新增 `answers`、`itemUses`、`treasureBoxOpenRequests`、`achievementClaimRequests` 規則。

尚未處理：

1. 報到尚未全面改成 Firebase `players`。
2. 創作投稿、隊內投票、匿名全體投票尚未全面改成 Firebase 寫入。
3. 講師端關題後尚未建立 Firebase 暫時計分器來更新 `publicScoreboards` 快照。
4. GAS 尚未新增從 Firebase 匯出並正式重新計分的完整流程。
5. 寶箱尚未在取得時預先決定 `rewardType`，因此本階段開箱先採快速請求與 UI 回饋。
6. 學員端尚未接 Firebase Auth，rules 目前只能限制資料形狀與管理節點，無法做到完整身分驗證。

測試：

1. 學員端 `api.js` 語法檢查通過。
2. 學員端 `app.js` 語法檢查通過。
3. `firebase/database.rules.json`、`package.json`、`app/config/modules.json` JSON 解析通過。
4. 講師端 JavaScript 語法檢查通過。
5. GAS 語法檢查通過。
6. `git diff --check` 通過，僅有 Windows 換行提示。
7. `npm run check:functions` 通過；只做編譯，未部署 Functions。
8. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `app.js?v=0.3.14`。
9. 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.14`。
10. Realtime Database rules 已通過 Firebase CLI dry run。
11. 線上 Realtime Database 測試：`answers/codex_perf_test_20260523/q001/player001` 第一次寫入成功，第二次覆寫被拒絕；測試資料已移除。

部署：

1. 已部署 Firebase Hosting 學員端與講師端。
2. 已部署 Realtime Database rules。
3. 本次未部署 GAS、Cloud Functions、Firestore rules、Cloud Run 或任何需付費帳務的服務。

### 2026-05-23：第 3 版 0.3.13 效能、倒數、創作加分與競賽結算

使用者需求：

1. 目前讀取與送出速度緩慢，難以應付約 200 人操作。
2. 創作題倒數計時會一直閃爍。
3. 創作投票結果後沒有為該隊加分。
4. 寶箱與成就紅點只在有可使用寶箱或可領取成就寶箱時顯示。
5. 戰隊積分預設無條件進位到個位數。
6. 學員面板上的戰隊積分會未預期歸 0。
7. 講師要有結算競賽功能，學員端顯示最後成績、排名與領獎提示。

本次處理：

1. 學員端登入後只自動讀取個人摘要，不再同時讀寶箱、成就與匿名決選。
2. 關題關閉後只自動更新個人摘要，不再同時讀排行榜、寶箱、成就與匿名決選。
3. `getPlayerSummary` 回傳紅點狀態，減少前端額外呼叫。
4. 創作題不再啟動一般題倒數，避免多個 timer 同時改同一段文字。
5. 戰隊積分顯示改為 `Math.ceil`。
6. 學員端保留既有戰隊積分，避免暫時性 0 分覆蓋。
7. GAS 新增創作決選第一名戰隊加分，預設 20 分。
8. GAS 新增 `finalizeCompetition` 與 `getFinalResults`。
9. 講師端新增「結算競賽」按鈕。
10. 學員端新增最後成績區與上台領獎提示。

測試：

1. GAS 語法檢查通過。
2. 學員端與講師端 JavaScript 語法檢查通過。
3. `package.json` 與 `app/config/modules.json` JSON 解析通過。
4. `git diff --check` 通過，僅有 Windows 換行提示。
5. `npm run check:functions` 通過。
6. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `app.js?v=0.3.13`。
7. 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.13`。
8. GAS `getGameState` 回應 `ok:true`。
9. GAS `finalizeCompetition` 與 `getFinalResults` 已不再回覆「未知 action」。

部署：

1. GAS 已推送並更新既有 Web App deployment 到 version 30，正式 `/exec` URL 不變。
2. Firebase Hosting 已部署學員端與講師端。
3. 本次未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

### 2026-05-22：第 3 版 0.3.12 寶箱顯示、創作限時與電腦學員測試

使用者需求：

1. 學員端最上方戰隊積分需包含道具加分。
2. 寶箱不要顯示來源與時間等內部資訊。
3. 空寶箱或鼓勵語要顯示短句彈出提示。
4. 寶箱開啟後，該列隱藏。
5. 創作題限時 3 分鐘，未送出視同放棄，也可主動放棄；全員提交或時間到後開始隊內票選。
6. 匿名全體投票開放 30 秒，未投票視同放棄。
7. 講師端可控制是否加入電腦學員，用於測試競賽流程。

本次處理：

1. `getPlayerSummary.teamScore` 改回傳 `weightedAverageScore`，讓最上方戰隊積分包含道具加分。
2. 學員端寶箱列表只顯示未開啟寶箱，開啟後隱藏。
3. 學員端道具列表隱藏來源、時間、套用題目 ID 等內部資訊。
4. GAS 空寶箱回傳短句訊息。
5. 創作題公開題目時間固定為 180 秒。
6. `submitCreativeAnswer` 支援 `abandon` 放棄回答。
7. `getTeamCreativePool` 回傳創作題階段與剩餘秒數；隊內投票固定 30 秒。
8. `selectCreativeFinalists` 啟動匿名全體投票計時；`getCreativeFinalists` 回傳 30 秒投票階段。
9. GAS 新增 `addComputerPlayers` 與 `submitComputerAnswers`。
10. 講師端新增「加入電腦學員」與「電腦作答目前題目」按鈕。

測試：

1. GAS 語法檢查通過。
2. 學員端與講師端 JavaScript 語法檢查通過。
3. JSON 解析檢查通過。
4. `git diff --check` 通過，僅有 Windows 換行提示。
5. `npm run check:functions` 通過。
6. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `app.js?v=0.3.12`。
7. 本機學員端 HTML 已包含放棄創作回答按鈕。
8. 本機講師端 HTML 已包含電腦學員控制按鈕。
9. GAS 已推送並更新既有 Web App deployment 到 version 28，正式 `/exec` URL 不變。
10. Firebase Hosting 已部署學員端與講師端。
11. 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.12`。
12. 線上學員端 HTML 已包含放棄創作回答按鈕。
13. 線上講師端 HTML 已包含電腦學員控制按鈕。
14. GAS `getGameState` 回應 `ok:true`。
15. GAS `addComputerPlayers` 與 `submitComputerAnswers` 已不再回覆「未知 action」；未帶管理密碼時會正確回覆「管理操作授權失敗」。
16. 本次未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

### 2026-05-22：第 3 版 0.3.11 成就領取、答對率與顯示文字修正

使用者需求：

1. 「報到人數」改成「戰隊人數」。
2. 答對率分成整體答對率與當前題目答對率，且只顯示百分比。
3. 挑戰卡比較使用後下一題的當前題目答對率。
4. 講師設定完成後自動隱藏後端設定與啟動場次區。
5. 寶箱或成就有可處理寶箱時才顯示紅點。
6. 成就獲得的寶箱需點「領取」才給到學員身上。
7. 挑戰戰隊不要常時顯示，使用挑戰卡後才選擇，且不要用下拉式選單。
8. 移除講師端答對率說明。
9. 題目提示文字改成「第 N 題」等適合現場使用的文字。

本次處理：

1. GAS 新增 `claimAchievementReward`。
2. 成就寶箱不再於關題或使用道具後自動建立，改由學員手動領取。
3. 排行榜新增 `currentQuestionCorrectRate`。
4. 學員端與講師端排行榜顯示戰隊人數、整體答對率、當前題目答對率。
5. 學員端挑戰卡使用時才跳出方塊選隊視窗。
6. 講師端完成後端設定後隱藏後端設定區，啟動後隱藏啟動場次區。
7. 學員端題目提示將題目 ID 轉成「第 N 題」。

測試：

1. GAS 語法檢查通過。
2. 學員端與講師端 JavaScript 語法檢查通過。
3. JSON 解析檢查通過。
4. `npm run check:functions` 通過。
5. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `0.3.11` 資源。
6. 本機學員端 HTML 已移除常駐挑戰戰隊下拉選單，並包含挑戰卡方塊選隊視窗。
7. 本機講師端 HTML 已移除答對率說明區塊。
8. GAS 已推送並更新既有 Web App deployment 到 version 26，正式 `/exec` URL 不變。
9. Firebase Hosting 已部署學員端與講師端。
10. 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.11`。
11. 線上學員端 HTML 已移除常駐挑戰戰隊下拉選單，並包含挑戰卡方塊選隊視窗。
12. 線上講師端 HTML 已移除答對率說明區塊。
13. GAS `getGameState` 回應 `ok:true`。
14. GAS `claimAchievementReward` 已不再回覆「未知 action」。
15. 本次未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

### 2026-05-22：第 3 版 0.3.10 報到、選隊、加倍卡與答對率修正

使用者需求：

1. 加倍卡只能用 1 次，重複抽到改為 +5 加分卡。
2. 學員登入頁面取消選隊；講師啟動後才能登入；登入後依講師是否開放選隊決定是否選隊；選隊改成方塊。
3. 講師啟動場次後，不可再變更是否開放自由選隊。
4. UI 各功能保留未來美術圖可替換設計。
5. 排行榜不再分有效人數與報到人數，改成顯示答對率；未答者或關題後才答都視同錯誤。

本次處理：

1. GAS `createGame` 改為啟動後狀態 `created`，並在啟動時寫入 `allowFreeTeamChoice`。
2. GAS `joinGame` 會拒絕 `draft` 狀態報到。
3. GAS `setTeamChoiceMode` 只允許 `draft` 狀態變更。
4. 開寶箱抽到第 2 張加倍卡時，改建立大加分卡。
5. 排行榜平均分改用報到人數計算，並新增答對率資料。
6. 挑戰卡答對率比較改以該隊報到人數作分母，未作答視同錯誤。
7. 學員端報到頁移除下拉式選隊，改為啟動後才可報到；自由選隊時顯示方塊按鈕。
8. 講師端移除題目控制區的自由選隊開關，啟動後鎖定啟動區開關。
9. 學員端選隊方塊加入 `.art-slot`，供未來替換戰隊美術圖。

測試：

1. GAS 語法檢查通過。
2. 學員端與講師端 JavaScript 語法檢查通過。
3. JSON 解析檢查通過。
4. `npm run check:functions` 通過。
5. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `0.3.10` 資源。
6. 學員端 HTML 已無 `teamId` 下拉選隊，並包含方塊選隊 UI。
7. 講師端 HTML 已無題目控制區自由選隊開關，並包含答對率說明。
8. GAS 已推送並更新既有 Web App deployment 到 version 24，正式 `/exec` URL 不變。
9. Firebase Hosting 已部署學員端與講師端。
10. 線上 GAS `getGameState` 回應 `ok:true`。
11. 線上學員端與講師端回應 `200`，HTML 已載入 `app.js?v=0.3.10`。
12. 線上學員端 HTML 已無 `teamId` 下拉選隊，並包含方塊選隊 UI。
13. 線上講師端 HTML 已無題目控制區自由選隊開關，並包含答對率說明。
14. 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

### 2026-05-22：第 3 版 0.3.9 規則與 UI 修正

使用者需求：

1. 題庫範例增加到 11 題，其中 1 題為創作題。
2. 加倍卡改為使用後下一題直接乘以 2，不選題目。
3. 挑戰卡改為使用後只選戰隊，套用下一題結果。
4. 已經沒有題目時，只能使用加分卡與翻身卡。
5. 創作題開始後才顯示創作回答；講師選出代表作品後才顯示全體投票。
6. 寶箱必得條件需做成成就頁面。
7. 學員端新增浮動選單，寶箱與成就點擊後以懸浮視窗顯示，並有紅點提示。
8. 賽後報表功能保留，但不要顯示在 UI。
9. 排行榜有效人數與報到人數需說明設計原理。
10. 講師控制台各區域放在同一頁面，必要時使用收合功能。

本次處理：

1. GAS 預設題庫改為 11 題，`demo_q011` 為創作題。
2. GAS 新增 `getPlayerAchievements`。
3. 加分卡改為立即套用；加倍卡與挑戰卡由後端自動綁定下一題。
4. 若沒有下一題，GAS 會拒絕使用加倍卡與挑戰卡。
5. 創作投稿、隊內初選限制為講師已開放創作題時才能使用。
6. 學員端新增浮動寶箱 / 成就選單與懸浮視窗。
7. 學員端匿名全體投票區塊只在講師已選代表作品後顯示。
8. 講師端移除賽後報表 UI，保留 GAS API。
9. 講師端排行榜加入有效人數與報到人數說明。
10. 講師端主要控制區維持同頁顯示。

測試：

1. GAS 語法檢查通過。
2. 學員端與講師端 JavaScript 語法檢查通過。
3. JSON 解析檢查通過。
4. `npm run check:functions` 通過。
5. 本機學員端與講師端靜態頁面回應 `200`，皆載入 `0.3.9` 資源。
6. GAS 已推送並更新既有 Web App deployment 到 version 22，正式 `/exec` URL 不變。
7. Firebase Hosting 已部署學員端與講師端。
8. 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。
9. 線上 GAS `getGameState` 回應 `ok:true`。
10. 線上 GAS `getPlayerAchievements` 已不再回覆「未知 action」，未報到玩家正確回覆「找不到玩家，請先報到。」。
11. 線上學員端與講師端回應 `200`，HTML 已載入 `app.js?v=0.3.9`；講師端 HTML 已不包含 `exportGameReport` 按鈕。

### 2026-05-22：第 3 版 0.3.8 雲端部署

使用者需求：

1. 使用者回報本機畫面呼叫第 3 版功能時出現「未知 action」。
2. 使用者判斷若是伺服器端尚未更新，需直接上伺服器。

Root Cause：

1. 前端已是第 3 版畫面。
2. 正式 GAS Web App 仍停在第 2 版 deployment version 18。
3. 因此 `getPlayerInventory`、`submitCreativeAnswer`、`getTeamCreativeCandidates`、`exportGameReport` 等第 3 版 action 會被舊版 GAS 回覆「未知 action」。

本次處理：

1. 在 `gas` 資料夾執行 `clasp push`。
2. 建立 Apps Script 版本並更新既有正式 Web App deployment。
3. 正式 GAS Web App deployment 已更新為 version 20，正式 `/exec` URL 不變。
4. 執行 `firebase deploy --only hosting`，已部署學員端與講師端 Hosting。
5. 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

線上測試：

1. GAS `getGameState` 回應 `ok:true`。
2. GAS `getPlayerLeaderboard` 回應 `ok:true`。
3. GAS 第 3 版管理 action 已不再回傳「未知 action」，未帶管理密碼時正確回傳「管理操作授權失敗」。
4. 學員端線上網址回應 `200`，HTML 已載入 `app.js?v=0.3.7`。
5. 講師端線上網址回應 `200`，HTML 已載入 `app.js?v=0.3.8`，並包含 `exportGameReport`。

### 2026-05-22：第 3 版 0.3.8 本機總檢查

使用者需求：

1. 請繼續。
2. 接續 `0.3.8` 後進行下一步。

本次處理：

1. 未修改 GAS、前端、Firebase Functions 或 Firebase rules 功能邏輯。
2. 執行 GAS 語法檢查，結果通過。
3. 執行學員端與講師端 JavaScript 語法檢查，結果通過。
4. 執行 `app/config/modules.json` 與 `package.json` JSON 解析檢查，結果通過。
5. 執行 `npm run check:functions`，結果通過。
6. 執行 `git diff --check`，結果通過。
7. 標記第 3 版已完成部署前本機總檢查。
8. 未部署 GAS Web App、Firebase Hosting、Cloud Functions 或 Firebase rules。

### 2026-05-22：第 3 版 0.3.8 賽後報表匯出

使用者需求：

1. 進入 `0.3.8`。
2. 實作賽後報表匯出。

本次處理：

1. GAS 新增 `exportGameReport` API。
2. 講師端新增「匯出賽後報表」按鈕。
3. 匯出前會重新計算排行榜。
4. 匯出前會重新結算幸運獎與全對獎。
5. 報表會建立新的 Google 試算表。
6. 報表內容包含摘要、戰隊排行榜、個人排行榜、作答紀錄、寶箱紀錄、道具紀錄、獎項紀錄、創作投稿、創作投票與創作決選結果。
7. 報表不輸出管理密碼、Token、服務帳戶資訊。
8. 創作投票報表不輸出 `voterPlayerId`。
9. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

### 2026-05-22：第 3 版 0.3.7 講師審核代表作品與匿名全體投票

使用者需求：

1. 進入 `0.3.7`。
2. 實作講師審核代表作品與匿名全體投票。

本次處理：

1. GAS 新增 `getTeamCreativeCandidates` API。
2. GAS 新增 `selectCreativeFinalists` API。
3. GAS 新增 `getCreativeFinalists` API。
4. GAS 新增 `voteCreativeFinal` API。
5. GAS 新增 `getCreativeVoteResult` API。
6. 講師端新增創作題審核與投票區塊。
7. 學員端新增匿名全體投票區塊。
8. 學員端決選作品只顯示匿名代號與內容，不顯示來源戰隊、暱稱或 playerId。
9. GAS 後端限制不可投自己戰隊作品。
10. GAS 後端限制每位學員匿名全體投票只能投 1 票。
11. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

### 2026-05-22：第 3 版 0.3.6 創作題投稿與隊內初選

使用者需求：

1. 補做 `0.3.5` 學員端寶箱與道具 UI 後，繼續 `0.3.6`。
2. 實作創作題投稿與隊內初選。

本次處理：

1. GAS 新增 `submitCreativeAnswer` API。
2. GAS 新增 `getTeamCreativePool` API。
3. GAS 新增 `voteTeamCreative` API。
4. 每位學員每場只能提交 1 則創作答案。
5. 同隊投稿池只回傳投稿內容與票數，不回傳投稿者暱稱與 playerId。
6. 隊內初選只能投同隊投稿。
7. 每位學員每場隊內初選只能投 1 票。
8. 學員端新增「創作題隊內初選」區塊。
9. 未實作講師審核代表作品與匿名全體投票。
10. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

### 2026-05-22：第 3 版 0.3.5-ui 補做學員端寶箱與道具 UI

使用者需求：

1. 指出 `0.3.5` 原本要製作學員端寶箱與道具 UI。
2. 先補做遺漏 UI，再繼續 `0.3.6`。

本次處理：

1. 學員端新增「寶箱與道具」區塊。
2. 呼叫 `getPlayerInventory` 讀取自己的寶箱與道具。
3. 呼叫 `openTreasureBox` 開啟自己的未開啟寶箱。
4. 呼叫 `useItem` 使用已支援道具。
5. 道具使用欄位包含目標題目與挑戰戰隊。
6. 特殊道具只顯示幸運獎狀態，不在前端套用效果。
7. 示範模式補齊寶箱、開箱與道具使用資料。
8. 未修改 GAS 規則判定。
9. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

### 2026-05-22：第 3 版 0.3.5 戰隊加權平均分排行榜

使用者需求：

1. 進入 `0.3.5`。
2. 依路線圖完成戰隊加權平均分排行榜。

本次處理：

1. GAS `排行榜` 新增 `effectivePlayerCount`。
2. `playerCount` 保留為報到人數。
3. `effectivePlayerCount` 代表至少完成 1 題已計分作答的有效參與人數。
4. `averageScore` 改為 `totalScore / effectivePlayerCount`。
5. `weightedAverageScore` 作為第 3 版戰隊排名分，公式為 `averageScore + teamBonusScore`。
6. 啟用中的戰隊即使尚無有效參與者，也會保留在排行榜並顯示 0 分。
7. 學員端排行榜顯示排名分、有效人數與道具加成。
8. 講師端排行榜顯示排名分、有效人數、答題總分、答題平均、道具加成與最終總分。
9. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

測試狀態：

1. GAS 語法檢查通過。
2. 前端 JavaScript 語法檢查通過。
3. JSON 設定檢查通過。
4. `npm run check:functions` 通過。
5. `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。

### 2026-05-22：第 3 版 0.3.4 幸運獎與全對獎結算

使用者需求：

1. 進入 `0.3.4`。
2. 實作幸運獎與全對獎結算。

本次處理：

1. 新增 `finalizeAwards` API。
2. 新增 `getAwardList` API。
3. 幸運獎規則：
   - 第一位抽中特殊道具者取得幸運獎。
   - 特殊道具出現後，後續開箱不再抽出特殊道具。
   - 正式題目開放進度達 70% 且尚未出現特殊道具時，特殊道具機率由 3% 提高為 10%。
4. 全對獎規則：
   - 全部正式題目皆答對者才具備資格。
   - 依完成最後一題的送出時間排序。
   - 取前 3 名。
5. `道具紀錄` 新增 `createdAt` 欄位。
6. `獎項紀錄` 新增暱稱、分數、完成時間與來源道具欄位。
7. 未修改學員端與講師端 UI。
8. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

測試狀態：

1. GAS 語法檢查通過。
2. JSON 設定檢查通過。
3. `npm run check:functions` 通過。
4. `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。
5. 未部署雲端。

### 2026-05-22：第 3 版 0.3.3 基本道具效果

使用者需求：

1. 進入 `0.3.3`。
2. 實作加分卡、加倍卡、翻身卡與挑戰卡效果。

本次處理：

1. 新增 `useItem` API。
2. 新增 `getTeamBonusLedger` API。
3. 新增 `recalculateV3Scoreboard` API。
4. 加分卡效果：
   - 小加分卡：戰隊 +1。
   - 中加分卡：戰隊 +3。
   - 大加分卡：戰隊 +5。
   - 超級加分卡：戰隊 +10。
   - 每隊同一題同類加分卡限用 1 張。
5. 加倍卡效果：
   - 題前指定目標題。
   - 關題計分時若答對，個人分數額外加成。
   - 額外加成上限 20 分。
   - 目標題答錯時消耗但不加分。
6. 翻身卡效果：
   - 使用當下本隊最後一名，戰隊 +30。
   - 否則戰隊 +5。
   - 每隊最多觸發 2 次。
7. 挑戰卡效果：
   - 題前指定目標題與對手戰隊。
   - 目標題關題後比較本隊與對手答對率。
   - 本隊答對率較高則戰隊 +10，否則 +3。
   - 不扣對方分數。
8. `排行榜` 新增：
   - `teamBonusScore`
   - `finalScore`
   - `weightedAverageScore`
9. 未修改學員端與講師端 UI。
10. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

測試狀態：

1. GAS 語法檢查通過。
2. JSON 設定檢查通過。
3. `npm run check:functions` 通過。
4. `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。
5. 未部署雲端。

### 2026-05-22：第 3 版 0.3.2 開寶箱與道具庫讀取

使用者需求：

1. 進入 `0.3.2`。
2. 實作開寶箱與道具庫讀取，不先啟用道具效果。

本次處理：

1. 新增 `openTreasureBox` API。
2. 僅允許玩家開啟自己的 `unopened` 寶箱。
3. 開箱後更新 `寶箱紀錄`：
   - `status=opened`
   - `openedAt`
   - `itemType`
4. 非空寶箱會新增 `道具紀錄`，狀態為 `available`。
5. `empty` 開箱結果不建立道具紀錄。
6. `getPlayerInventory` 補回寶箱與道具標籤、來源寶箱、目標題目、目標戰隊與效果分數欄位。
7. `規則設定` 新增寶箱獎項機率預設值。
8. 未修改學員端與講師端 UI。
9. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

測試狀態：

1. GAS 語法檢查通過。
2. JSON 設定檢查通過。
3. `npm run check:functions` 通過。
4. `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。
5. 未部署雲端。

### 2026-05-22：第 3 版 0.3.1 寶箱資料與持有限制

使用者需求：

1. 繼續第 3 版下一步。
2. 依第 3 版路線圖先處理寶箱資料表、寶箱取得與持有限制。

本次處理：

1. `setupGameSheets` 新增第 3 版基礎工作表：
   - `寶箱紀錄`
   - `道具紀錄`
   - `獎項紀錄`
   - `創作投稿`
   - `創作投票`
   - `規則設定`
2. `規則設定` 寫入寶箱上限、答對掉落率、投票秒數與獎項名額預設值。
3. `closeAndScoreQuestion` 在新計分且答對時發放寶箱。
4. 寶箱取得條件已完成：
   - 每題答對 30% 機率取得 1 個寶箱。
   - 累積答對 3 題取得 1 個寶箱。
   - 累積答對 5 題取得 1 個寶箱。
   - 累積答對 10 題取得 2 個寶箱。
   - 連續答對 3 題取得 1 個寶箱。
   - 連續答對 5 題取得 2 個寶箱。
5. 每位學員最多保留 3 個未開啟寶箱，超過時自動將最早未開啟寶箱標記為 `discarded`。
6. 新增 `getPlayerInventory` API，供後續學員端 UI 讀取自己的寶箱與道具狀態。
7. 未修改學員端與講師端 UI。
8. 未部署 GAS Web App、Firebase Hosting 或 Firebase rules。

測試狀態：

1. GAS 語法檢查通過。
2. JSON 設定檢查通過。
3. `npm run check:functions` 通過。
4. `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。
5. 未部署雲端。

### 2026-05-22：第 3 版規格製作啟動

使用者需求：

1. 在 GitHub 資料夾底下進行第 3 版製作。
2. 參考 `docs` 下的遊戲規則文件完成需求拆解。

本次處理：

1. 新增 `docs/12_v3_roadmap.md`。
2. 依 `docs/01_game_rules.md` 拆解第 3 版功能：寶箱、道具、幸運獎、全對獎、戰隊加權平均分、創作票選題與賽後報表。
3. 更新 `app/config/modules.json`，新增 `v3_game_rules` 模組狀態。
4. 更新 README、CHANGELOG 與 AI 交接文件。
5. 未修改前端、GAS 或 Firebase rules 功能邏輯。

測試狀態：

1. 本次為規格與文件製作。
2. JSON 設定檢查通過。
3. `npm run check:functions` 通過。
4. `git diff --check` 無空白錯誤；僅出現 Windows 換行提示。
5. 未部署雲端。

### 2026-05-22：第 2 版定版完成

使用者需求：

1. 第 2 版定版完成。
2. 完成收尾作業，讓後續維護者可直接接手。

本次處理：

1. 保留 `0.2.11` 作為第 2 版定版版本。
2. 將 README、AI 交接文件、工作日誌、第 2 版路線圖與模組狀態改為「第 2 版定版完成」。
3. 明確記錄正式架構：Firebase Hosting 作入口、Realtime Database 作公開狀態與公開題庫快取、GAS / Google Sheets 作正式資料與計分來源。
4. 補正式活動前檢查：初始化遊戲資料、確認題庫、確認戰隊設定、確認 Script Properties、要求學員使用可區分暱稱。
5. 未改前端、GAS 或 Firebase rules 功能邏輯。

測試狀態：

1. 本次為文件與狀態收尾。
2. JSON 設定檢查通過。
3. `npm run check:functions` 通過。
4. 前端 JavaScript 與 GAS 語法檢查通過。
5. 未改功能邏輯，未部署雲端。

### 2026-05-21：學員端積分更新、送出後停止倒數與報到分隊防呆

使用者需求：

1. 學員端最上方個人積分沒有更新。
2. 學員送出答案後，倒數要立即停止。
3. 自動分隊需維持各隊人數盡量相同。
4. 學員進報到畫面時，只有講師開放自由選隊才顯示戰隊選項；未開放時直接自動分配。

本次處理：

1. 學員端 `refreshPlayerSummary` 改用 `playerScore` 更新最上方個人積分，避免後端回傳正確但前端欄位對不上而顯示 0。
2. 學員確認送出答案後立即停止倒數並停用選項；若送出失敗，顯示錯誤並允許再次送出，但不恢復倒數。
3. 報到頁進入後先讀取自由選隊設定，讀取完成前暫停報到按鈕。
4. GAS 自動分隊改讀啟用中的戰隊清單，並依合併後玩家數分配到人數最少的隊伍。

測試狀態：

1. JavaScript 語法檢查通過。
2. GAS 語法檢查通過。
3. JSON 設定檢查通過。
4. `npm run check:functions` 通過。
5. 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.11`。
6. GAS 已推送並更新既有 Web App deployment 到 version 18，正式 URL 不變。
7. Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
8. 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.11`；GAS `getGameState`、`getScoreboard`、`getPlayerLeaderboard` 回應 `ok:true`。

### 2026-05-21：同人報到去重、自動分隊與自由選隊控制

使用者需求：

1. 學員個人積分仍顯示 0 分。
2. 學員每回答 1 題就多 1 個人，造成戰隊平均分變小。
3. 學員端取消選擇隊伍，改成自動分配。
4. 講師可控制是否開放自由選隊。
5. 操作停等時間仍需再優化。

本次處理：

1. GAS `joinGame` 新增匿名 `clientKey` 與同場次暱稱去重；同一人重新報到時回傳原玩家資料，不新增玩家列。
2. GAS 排行榜改為先合併同一人，再計算戰隊人數、總分、平均分。
3. GAS `getPlayerSummary` 改為合併同一人的作答紀錄後計算個人積分。
4. 學員端預設隱藏戰隊選單，由 GAS 自動分配戰隊。
5. 講師端新增自由選隊切換，開啟後學員端才顯示戰隊選單。
6. 學員端開啟排行榜時不等待個人積分更新完成，降低畫面停等。
7. GAS `getGameState` 會正規化舊場次狀態；舊資料缺少 `allowFreeTeamChoice` 時一律回傳 `false`，避免前端判斷不一致。

測試狀態：

1. JavaScript 語法檢查通過。
2. GAS 語法檢查通過。
3. `npm run check:functions` 通過。
4. 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.10`。
5. Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
6. GAS 已推送並更新既有 Web App deployment 到 version 17，正式 URL 不變。
7. 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.10`；GAS `getGameState` 回應 `ok:true` 且 `allowFreeTeamChoice:false`；`getScoreboard` 與 `getPlayerLeaderboard` 回應 `ok:true`。

### 2026-05-21：阻止重複出題、修正 GAS 錯誤顯示與調整講師學員畫面

使用者需求：

1. 同一題重複出題時，講師端沒有阻止重複送出。
2. 學員收到重複題目並作答後，前端誤顯示「無法連線到 GAS」。
3. 講師端流程檢查要半隱藏。
4. 講師端首次進入依管理密碼與場次狀態切換畫面。
5. 講師端啟動後才能出題，關閉視窗再回來要進題目控制。
6. 講師端啟動場次與出題畫面都要有初始化按鈕。
7. 學員端排行榜改用彈出視窗。
8. 學員端個人積分需正確加總。
9. 學員端遊戲中不顯示目前狀態區塊。

本次處理：

1. GAS `openQuestion` 新增 `openedQuestionIds`，同場次已開放過的題目會被後端拒絕。
2. 講師端會將已開放題目加入本機集合並停用選項，前端先做防呆，GAS 仍為最終防線。
3. 前端 API 新增 `GameApiError`，GAS 回傳的業務錯誤不再進入連線錯誤 fallback。
4. GAS `getPlayerSummary` 改由作答紀錄加總個人分數，避免玩家表未同步造成個人積分顯示不足。
5. 講師端以 `localStorage` 保留管理密碼與已啟動狀態，重新開啟視窗後可回到題目控制。
6. 學員端排行榜改為彈出視窗，並隱藏遊戲中的目前狀態區塊。

測試狀態：

1. JavaScript 語法檢查通過。
2. GAS 語法檢查通過。
3. JSON 設定檢查通過。
4. `npm run check:functions` 通過。
5. 本機學員端與講師端頁面回應 `200`，HTML 已載入 `v=0.2.9`。
6. GAS 已推送並更新既有 Web App deployment 到 version 15，正式 URL 不變。
7. Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
8. 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.9`，GAS `getGameState` 回應 `ok:true` 並包含 `openedQuestionIds`。

### 2026-05-21：初始化清除舊報到、GAS 連線強化與學員排行榜

使用者需求：

1. 講師介面要更適合電腦與投影呈現。
2. 初始化遊戲後，學員重新進入不能直接沿用舊戰隊。
3. 學員端偶發性無法連線 GAS，需要降低失敗率。
4. 學員可以查看戰隊排行榜與個人排行榜。

本次處理：

1. 學員端啟動時先讀取公開場次狀態；若 `gameState.status` 為 `draft`，且 `gameState.updatedAt` 晚於本機 `checkedInAt`，即清除 `localStorage.vaccineGamePlayer` 並要求重新報到。
2. 學員端新增排行榜區塊，提供手動更新按鈕；講師關題後會自動更新一次排行榜。
3. GAS 新增 `getPlayerLeaderboard`，只回傳暱稱、戰隊、分數、答對數與更新時間。
4. 前端 GAS 呼叫增加重試次數、逾時時間與 `_ts` 快取破壞參數；fetch 失敗後仍會退回 JSONP。
5. 講師端桌機版改為 3 欄版面：控制區、答案公布區、排行榜區。

測試狀態：

1. JavaScript 語法檢查通過。
2. GAS 語法檢查通過。
3. JSON 設定檢查通過。
4. `npm run check:functions` 通過。
5. GAS 已推送並更新既有 Web App deployment 到 version 14，正式 URL 不變。
6. Firebase 已只部署 Hosting，未部署 Cloud Functions 或 Firebase rules。
7. 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `v=0.2.8`，GAS `getGameState` 與 `getPlayerLeaderboard` 回應 `ok:true`。

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
# 2026-05-25：0.4.16 大螢幕、作答彈窗與道具規則

1. 修正大螢幕端開題後不更新目前題目的問題。
2. 講師端排行榜隱藏，排行榜資訊改由大螢幕端顯示。
3. 大螢幕結算畫面改為只顯示戰隊排名、個人排名與得獎名單。
4. 學員端作答改為彈窗選項，倒數在彈窗內顯示。
5. 挑戰卡改為前端猜大小規則，不呼叫 GAS 判定。
6. 道具使用時限取消，改為關題後到結算前可使用。

# 2026-05-25：0.4.15 部署

1. 已推送 GitHub `main`，提交為 `b397f5b`。
2. 已部署 Firebase Hosting 學員端與講師端。
3. 已用 Playwright 實際開啟線上學員端、講師手機端、大螢幕顯示端。
4. 線上 3 個頁面均回應 `200`，且無 console error 與 page error。
5. 本次未部署 GAS。
