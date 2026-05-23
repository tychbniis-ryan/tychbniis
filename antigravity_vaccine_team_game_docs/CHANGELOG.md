# CHANGELOG

## 0.4.2 - 2026-05-23

### feat

- 新增 `data/v4_static_game_config.example.json`，定義第 4 版靜態資料格式。
- 靜態資料格式包含題庫、答案、計分規則、寶箱機率、幸運箱限制、成就規則、3 分鐘道具使用期與重複送出鍵值。
- 明確標記首答加分為 `0`，並區分學員端可計算道具與 GAS 仍需計算的挑戰卡。

### test

- 已執行 JSON 設定檔解析、`npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。

## 0.4.1 - 2026-05-23

### feat

- 學員端移除創作題隊內初選與匿名全體投票畫面。
- 講師端移除創作題審核與投票操作入口。
- 講師端題目清單排除 `creative` 題型，示範題不再顯示 `demo_q011` 創作題。
- 學員端排行榜改為浮動工具按鈕，開啟時只讀取 Firebase `publicScoreboards/{gameId}` 快照，不再回退呼叫 GAS 排行榜 API。

### test

- 已執行前端 JavaScript 語法檢查、JSON 設定檔解析、`npm run check:functions` 與 `git diff --check`。
- 本次未部署 Firebase Hosting、GAS、Firebase rules、Cloud Functions 或 Cloud Run。
## 0.4.0-planning - 2026-05-23

### docs

- 補充第 4 版獎項規劃：幸運箱全場最多 1 名預配，也可無人預配；開啟幸運箱需回傳 GAS，無人中獎時最終結算指定 1 名現有玩家。
- 補充個人全對獎規劃：最後 1 題完成後，由學員端判斷全對並回傳 GAS 紀錄。
- 第 4 版取消首答 +5 分，避免 GAS 額外排序與計算全場最早答對者。
- 補充第 4 版排行榜規劃：排行榜只在導師每次關題後更新，學員端改為懸浮按鈕，點開時才讀取快照。
- 修正第 4 版機率表設計：機率表由 GAS 事前建立與維護，導師開啟遊戲時只讀取既有表，避免開場等待。
- 依使用者指定方向重寫第 4 版路線圖：改為靜態 HTML5 優先、降低 GAS 呼叫、遊戲開啟時載入題庫與機率表、學員端預配寶箱與成就內容。
- 規劃關題後 3 分鐘道具送出期，加倍卡與翻身卡由學員端先計算，挑戰卡保留 GAS 計算。
- 規劃移除創作題、隊內初選、講師審核代表作品與匿名全體票選。
- 補上第 3 版未完成 BUG 與風險的第 4 版處理策略，包含重複送出、網路延遲與後端去重。
- 啟動第 4 版開發規格，新增 `docs/14_v4_roadmap.md`。
- 第 4 版定位為正式活動維運與安全檢查版，優先處理活動前健康檢查、操作手冊、賽後保存與交接流程。
- 更新 README、AI 交接文件、工作日誌、模組狀態與 package 版本。
- 本次未修改學員端、講師端、GAS、Firebase rules 或部署設定。

## 0.3.22-final - 2026-05-23

### docs

- 第 3 版以 `0.3.22` 定版，新增 `docs/13_v3_final_release.md`。
- 整理 `docs/tasks/OPTIMIZATION_PLAN_0.3.21.md`，記錄免費方案效能優化收斂結果。
- 定版狀態：Firebase Hosting 學員端與講師端已部署，GAS Web App deployment 為 version `36`。
- 確認未啟用 Cloud Functions、Cloud Run、Blaze 或任何需付費帳務的服務。
## 0.3.22 - 2026-05-23

### changed

- 學員端頂端不再顯示戰隊積分，改為顯示「個人得分」與「道具使用分」。
- 學員端隱藏排行榜入口，避免學員端讀取戰隊排行資料。
- 學員端以本機已送答紀錄、關題後公開解答與本機道具排程估算頂端分數，不再為頂端資訊呼叫 `getPlayerSummary` 或排行榜資料。
- 講師關題改為先關閉題目並立即回傳正確答案與解題說明，再由講師端自動觸發一次 GAS 後台計分與排行榜更新。
- 講師端在關題後顯示「後台計分中」，並由講師端少量延遲刷新排行榜，不讓學員端產生集中呼叫。
## 0.3.21 - 2026-05-23

### fix

- 學員端道具改為「關題後排程、下一題開放時背景送出」，避免使用道具時等待 GAS 或重新計算排行榜。
- 第 1 次開題時先同步 Firebase players，並為當時所有玩家建立預配寶箱獎勵池 TreasureRewardPool。
- 後續才加入的玩家在報到或匯入 Firebase players 時補建立預配寶箱獎勵池，仍可加入戰隊。
- 寶箱發放時即寫入已決定的 itemType，開箱時只讀取既有結果，不再臨時計算機率。
- 幸運箱若未被開啟，結算競賽時改由系統從玩家名單中隨機指定幸運獎。
- 排行榜戰隊成績改為「每題戰隊平均分加總 + 道具加分」，避免後加入玩家拉低已關閉題目的平均分。
- 挑戰卡答對率改以該題已納入結算的作答列為分母，不再使用目前戰隊總人數回推舊題。
- 修正寶箱與成就紅點因 CSS display 覆蓋 hidden 而常態顯示的問題。
- 移除學員端在關題後自動呼叫 refreshPlayerSummary 的 500 ms 集中刷新，降低 200 人同時關題時的 GAS 壓力。
### perf

- **GAS 讀取優化**: 重構 `getPlayerSummary` 與 `getPlayerNoticeSummary`，將多個 sheet 讀取動作整合為單次 pre-fetch，大幅減少 GAS 在高併發下的 Google Sheets 讀取次數，提升系統載入速度。
- **即時寶箱同步**: 優化 `openBox` 流程，由原本依賴結算同步改為直接呼叫 GAS API 並立即刷新本地 `inventory`，實現「秒開、秒用」道具卡。
- **紅點通知優化**: 整合 `refreshPlayerSummary` 與 `refreshInventory`，確保成就領取與寶箱開啟後的紅點通知狀態能正確且即時更新。

### deploy

- 已更新版本標記至 `0.3.21`。
- 本次包含 GAS `Code.gs` 與學生端 `app.js` 之重大更新。

### fix

- 創作題資料再加上「本次開題時間」過濾；同一題號重複測試時，舊投稿、舊隊內投票與舊全體投票不再混入目前題目。

- 學員端一般選擇題送答若 Firebase 回覆 `HTTP 401`，會自動回退呼叫 GAS `submitAnswer`，避免畫面停在送出失敗。
- GAS 創作投稿與創作投票新增 `questionId` 欄位，投稿池、隊內投票、講師候選、決選與結果只讀目前創作題資料，避免代入舊題或測試資料。
- GAS `finalizeCompetition` 不再同步整場 Firebase `answers`，避免講師按結算競賽時掃描過多資料造成緩慢；正式完整重算仍保留給賽後 GAS 報表流程。
- 學員端個人摘要讀取失敗時會清除寶箱與成就紅點，避免無可操作內容仍顯示警示。

### deploy

- 已更新版本標記至 `0.3.20`。
- 本次仍維持免費方案，不啟用 Cloud Functions、Cloud Run 或 Blaze。

## 0.3.18 - 2026-05-23

### fix

- GAS `closeAndScoreQuestion` 計分前會先同步 Firebase `players` 與當題 `answers` 到 Google Sheets，修正講師關題後收到 0 筆作答或分數計算失敗。
- GAS 創作題讀取投稿池、投票、講師讀取候選、選出代表、全體投票、結算競賽前會同步 Firebase 創作投稿與投票暫存資料，修正創作題送出後卡住不動。
- GAS `findPlayer` 找不到 Google Sheets 玩家時，會從 Firebase `players` 匯入該玩家，修正寶箱、成就、成績結算出現「找不到玩家」。
- 學員端寶箱或成就讀取失敗時會先隱藏紅點，避免沒有可操作內容仍顯示警示。

### deploy

- 已更新版本標記至 `0.3.18`。
- 本次仍維持免費方案，不啟用 Cloud Functions、Cloud Run 或 Blaze。

## 0.3.17 - 2026-05-23

### perf

- GAS `closeAndScoreQuestion` 關題計分後，會將目前戰隊排行榜發布到 Realtime Database `publicScoreboards/{gameId}`。
- 學員端排行榜可繼續只讀 Firebase 快照，避免送答、用道具、開寶箱後重算或刷新全體排行榜。
- GAS `finalizeCompetition` 結算後，會發布 `source: gas_final` 的正式排行榜快照。

### changed

- 暫時排行榜快照標示 `isTemporary: true`、`source: instructor_close_question`、`questionId`。
- 正式結算快照標示 `isTemporary: false`、`source: gas_final`。

### limitation

- 暫時快照仍由講師關題時觸發，尚未改成完全 Firebase 端批次結算。
- 正式成績仍以賽後 GAS 重新計分與報表為準。

### test

- 已執行學生端、講師端 JavaScript 語法檢查。
- 已執行 GAS 語法檢查、JSON 設定檔解析、`git diff --check` 與 `npm run check:functions`。
- 已完成本機與線上 Hosting 頁面檢查。

### deploy

- 已部署 GAS。
- 已部署 Firebase Hosting。
- 未部署 Cloud Functions、Firestore rules、Cloud Run，未啟用 Blaze。

## 0.3.16 - 2026-05-23

### perf

- 學員端創作題投稿改為優先寫入 Realtime Database `creativeSubmissions/{gameId}/{questionId}/{playerId}`。
- 學員端隊內初選投票改為優先寫入 `creativeTeamVotes/{gameId}/{questionId}/{playerId}`。
- 學員端匿名全體投票改為優先寫入 `creativeFinalVotes/{gameId}/{questionId}/{playerId}`。
- 投稿或投票成功後立即顯示完成狀態，不再等待 GAS 重新讀取投稿池或決選作品。
- Firebase 寫入失敗時保留 GAS action 備援。

### security

- Realtime Database rules 新增 `creativeSubmissions`、`creativeTeamVotes`、`creativeFinalVotes` 寫入限制。
- 同一玩家同一題投稿或投票路徑只能建立一次，避免重複點擊造成多筆有效資料。

### limitation

- 講師端讀取候選、選代表作品與讀投票結果仍走 GAS。
- 正式創作題加分與匿名投票驗證仍需後續 GAS 從 Firebase 匯出並重新結算。

### test

- 已執行學生端、講師端 JavaScript 語法檢查。
- 已執行 GAS 語法檢查、JSON 設定檔解析、`git diff --check` 與 `npm run check:functions`。
- 已測試 `creativeSubmissions`、`creativeTeamVotes`、`creativeFinalVotes` 第一次寫入成功、同一路徑重複寫入被拒絕。

### deploy

- 已部署 Firebase Hosting 學員端與講師端。
- 已部署 Realtime Database rules。
- 未部署 GAS、Cloud Functions、Firestore rules、Cloud Run，未啟用 Blaze。

## 0.3.15 - 2026-05-23

### perf

- 學員報到改為優先寫入 Realtime Database `players/{gameId}/{playerId}`，成功後立即進入遊戲畫面。
- 報到成功後不再自動呼叫 GAS 個人摘要，避免登入時同時刷新排行榜、寶箱、成就與分數資料。
- 若 Firebase 快速報到失敗，仍保留 GAS `joinGame` 備援，避免現場因 rules 或網路異常完全無法報到。
- 未開放自由選隊時，前端以 `clientKey` 雜湊穩定分配戰隊；正式平衡分隊仍可由後續管理流程調整。

### security

- Realtime Database rules 新增 `players` 寫入限制：同一路徑只能建立一次，且不得由學生端覆寫既有 player。
- 學生端仍未接 Firebase Auth；本階段 rules 只能限制資料形狀與管理節點，不能視為完整身分驗證。

### limitation

- 尚未完成同暱稱跨裝置去重；目前以同一裝置 `clientKey` 穩定沿用同一 playerId。
- 報到資料已進 Firebase，但正式名冊、賽後報表與正式成績仍需後續 GAS 匯出與重新計分流程整合。

### test

- 已執行學生端、講師端 JavaScript 語法檢查。
- 已執行 GAS 語法檢查、JSON 設定檔解析、`git diff --check` 與 `npm run check:functions`。
- 已測試 Realtime Database `players` 第一次寫入成功、同一路徑重複寫入被拒絕。

### deploy

- 已部署 Firebase Hosting 學員端與講師端。
- 已部署 Realtime Database rules。
- 未部署 GAS、Cloud Functions、Firestore rules、Cloud Run，未啟用 Blaze。

## 0.3.14 - 2026-05-23

### perf

- 學員送答改為優先寫入 Firebase Realtime Database `answers/{gameId}/{questionId}/{playerId}`，送出後立即顯示「已送出，等待講師關題」，不再等待 GAS / Google Sheets 計分。
- 學員翻開已同步到 Firebase 的公開題目時，不再呼叫 GAS `openPaper`；作答時間改由 Firebase 暫存資料與賽後正式重算處理。
- 道具使用改為寫入 Firebase `itemUses/{gameId}/{itemId}`，狀態為 `pending`，前端立即顯示「已使用，將於關題後結算」。
- 排行榜改為優先讀取 Firebase `publicScoreboards/{gameId}` 快照，避免學員查看排行榜時即時掃描 GAS / Google Sheets。
- 成就領取與寶箱開啟改為先寫入 Firebase 請求節點，前端立即回饋，不同步刷新全部成就、寶箱、排行榜與個人摘要。

### security

- Realtime Database rules 新增 `answers`、`itemUses`、`treasureBoxOpenRequests`、`achievementClaimRequests` 輕量節點規則。
- 學員端仍不可寫入 `gameState`、`publicQuestions`、`publicScoreboards` 等管理節點。
- `answers` 採同一題同一玩家路徑只允許建立一次，避免重複送答覆寫最早送出時間。

### limitation

- 本階段未啟用 Cloud Functions、Cloud Run 或 Blaze。
- 本階段尚未把報到、創作投稿、隊內投票、匿名全體投票全面改為 Firebase 寫入。
- 既有寶箱資料仍未在取得時預先決定 `rewardType`，因此開箱先採快速請求與 UI 回饋；正式獎勵需在下一階段由 Firebase 預先獎勵資料或賽後 GAS 重算補齊。
- 學員端目前尚未接 Firebase Auth，Realtime Database rules 只能限制資料形狀與管理節點，不能做到完整身分驗證。

### test

- 已完成 GAS 語法檢查、學員端與講師端 JavaScript 語法檢查、JSON 解析、`git diff --check`、`npm run check:functions`。
- 本機學員端與講師端靜態頁面回應 `200`，皆載入 `app.js?v=0.3.14`。
- 線上學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.14`。
- Realtime Database rules 已通過 Firebase CLI dry run。
- 線上 Realtime Database 測試：`answers/codex_perf_test_20260523/q001/player001` 第一次寫入成功，第二次覆寫被拒絕；測試資料已移除。

### deploy

- 已部署 Firebase Hosting 學員端與講師端。
- 已部署 Realtime Database rules。
- 本次未部署 GAS、Cloud Functions、Firestore rules、Cloud Run 或任何需付費帳務的服務。

## 0.3.13 - 2026-05-23

### feat

- 講師端新增 `finalizeCompetition` 結算競賽功能。
- 學員端新增最後成績區，競賽結算後顯示戰隊排名、個人排名、最後積分與上台領獎提示。
- GAS 新增 `getFinalResults`，供學員讀取個人最後成績與獎項。
- 創作決選第一名戰隊結算時取得創作加分。

### changed

- 學員端登入後不再自動讀取寶箱、成就與匿名決選資料，降低大量學員同時進場時的 GAS 壓力。
- 關題關閉後不再自動讀取排行榜、寶箱、成就與匿名決選資料，只更新個人摘要與紅點。
- 創作題倒數改為單一階段倒數，避免一般題倒數與創作倒數同時更新造成閃爍。
- 戰隊積分顯示改為無條件進位到整數。
- 學員端避免用暫時性的 0 分覆蓋既有戰隊積分。
- 寶箱紅點只看未開啟寶箱，成就紅點只看可領取成就寶箱。

### docs

- 更新 README、遊戲規則、工作日誌、AI 交接文件、GAS README 與模組版本。

### test

- 已完成 GAS 語法檢查、前端 JavaScript 語法檢查、JSON 解析、`git diff --check`、`npm run check:functions`、本機學員端與講師端頁面 `200` 檢查。
- 線上檢查通過：學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.13`；GAS `getGameState` 回應 `ok:true`；`finalizeCompetition` 與 `getFinalResults` 已不再回覆「未知 action」。

### deploy

- GAS 已推送並更新既有 Web App deployment 到 version 30，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端；未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.3.12 - 2026-05-22

### feat

- 講師端新增電腦學員測試控制，可加入電腦學員並讓電腦作答目前題目。
- 創作題改為 3 分鐘作答，可提交或放棄回答；全員完成或時間到後進入 30 秒隊內投票。
- 匿名全體投票改為講師選出代表作品後開放 30 秒，逾時未投票視同放棄。

### changed

- 學員端最上方戰隊積分改顯示含道具加分後的排名分。
- 寶箱與道具列表移除來源、時間與內部題目 ID 等資訊。
- 寶箱開啟後不再顯示該寶箱列。
- 空寶箱改顯示「寶物被偷走了」、「發現空寶箱」等現場短句。

### docs

- 更新 README、遊戲規則、工作日誌、AI 交接文件、GAS README 與模組版本。

### test

- 本機檢查通過：GAS 語法、學員端與講師端 JavaScript 語法、JSON 解析、`git diff --check`、`npm run check:functions`。
- 本機靜態頁面檢查通過：學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.12`；學員端包含放棄創作回答按鈕，講師端包含電腦學員控制按鈕。
- 線上檢查通過：學員端與講師端回應 `200`，皆載入 `app.js?v=0.3.12`；GAS `getGameState` 回應 `ok:true`；`addComputerPlayers` 與 `submitComputerAnswers` 已不再回覆「未知 action」。

### deploy

- GAS 已推送並更新既有 Web App deployment 到 version 28，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端。
- 本次未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.3.11 - 2026-05-22

### feat

- GAS 新增 `claimAchievementReward`，成就完成後需由學員點「領取」才建立寶箱。
- 排行榜新增當前題目答對率，與整體答對率分開顯示。
- 學員端使用挑戰卡時才顯示挑戰戰隊選擇，並改用方塊按鈕。

### changed

- 學員端與講師端排行榜顯示「戰隊人數」，不顯示「報到人數」。
- 答對率顯示改為「整體答對率」與「當前題目答對率」，只顯示百分比。
- 成就紅點只在有可領取成就寶箱時顯示；寶箱紅點只在有未開啟寶箱時顯示。
- 講師端移除答對率說明區塊。
- 學員端題目狀態提示改用「第 N 題」，避免直接顯示題目 ID。

### docs

- 更新遊戲規則、README、工作日誌、AI 交接文件、GAS README 與模組版本。

### test

- 本機檢查通過：GAS 語法、學員端與講師端 JavaScript 語法、JSON 解析、`git diff --check`、`npm run check:functions`。
- 線上檢查通過：學員端與講師端回應 `200`，HTML 已載入 `app.js?v=0.3.11`；GAS `getGameState` 回應 `ok:true`；`claimAchievementReward` 已不再回覆「未知 action」。

### deploy

- GAS 已推送並更新既有 Web App deployment 到 version 26，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端。
- 本次未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

## 0.3.10 - 2026-05-22

### feat

- 學員端改為講師啟動場次後才能報到。
- 學員端報到頁移除下拉式選隊；若講師開放自由選隊，改用方塊按鈕選隊。
- 學員端選隊方塊加入 `.art-slot` 美術替換區，保留未來替換戰隊圖像的結構。
- 排行榜新增答對率欄位，未作答、逾時未送出與關題後作答皆視同錯誤。

### changed

- 加倍卡每位學員只能取得或使用 1 次；重複抽到加倍卡時，系統改給大加分卡。
- 講師端自由選隊設定只可在啟動場次前決定，場次啟動後鎖定。
- 戰隊排名分改以報到人數計算平均分，不再使用有效人數作為顯示與排名依據。
- 講師端排行榜說明改為答對率設計說明。

### docs

- 更新遊戲規則、README、GAS README、工作日誌、AI 交接文件與模組版本。

### test

- GAS 語法檢查通過。
- 學員端與講師端 JavaScript 語法檢查通過。
- JSON 解析檢查通過。
- `npm run check:functions` 通過。
- 本機學員端與講師端靜態頁面回應 `200`，皆載入 `0.3.10` 資源。

### deploy

- GAS `Code.gs` 已推送到 Apps Script。
- 既有正式 GAS Web App deployment 已更新為 version 24，正式 `/exec` URL 不變。
- Firebase Hosting 已部署學員端與講師端，線上 HTML 已載入 `app.js?v=0.3.10`。
- 未部署 Cloud Functions、Firestore rules 或 Realtime Database rules。

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
