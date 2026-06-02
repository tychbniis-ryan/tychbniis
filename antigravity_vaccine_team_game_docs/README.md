# 第 7 版作業：關題效能量測

作業日期：2026-06-01

目前版本：`0.7.14`

0.7.14 更新：新增第 7 版 Firebase 快速計分路徑。講師關題後呼叫 `scoreClosedQuestion` 時，若偵測到一般選擇題、Firebase 報到玩家與 Firebase 作答資料齊全，GAS 會直接從 Firebase 計算當題與累計排行榜，發布 `publicScoreboards/{gameId}`，不再每題同步玩家、答案與排行榜到 Google Sheets；若遇到創作題、道具使用或 Firebase 資料不足，會自動回退既有 GAS / Sheets 計分路徑。本次新增 `npm run test:v7:read`，已完成 100 人與 200 人公開節點讀取測試。GAS 測試 deployment 已更新為 `@93`，快速計分會以批次平行方式讀取 Firebase 題庫、玩家、作答與道具資料，並用已知 `closeSequence` 直接更新批次狀態；`gameState` 仍保留在發布前重新讀取，避免講師快速切題時覆蓋新狀態。第 7 版測試入口與壓測腳本已改指向 `@93`。正式入口仍未切換，未部署 Firebase rules，未開通 Blaze。

0.7.14 部署結果：2026-06-02 已重新部署 Firebase Hosting 的學員端與講師端。第 7 版講師測試入口為 `https://tychbniis-32af5-instructor.web.app/InstructorV7.html`，設定檔 `config-v7-test.js` 已確認指向 GAS `@93`。100 人公開節點只讀測試完成：900 requests、0 failures、p50 約 58 ms、p95 約 70 ms。

0.7.14 100 人完整壓測：2026-06-02 使用 GAS `@91`、`gameId=v7_perf_20260602075820`、題號 `q001`、100 名假玩家、concurrency 25。完整流程約 44.9 秒；開題外層約 18.7 秒，寫入 100 名玩家約 4.1 秒，寫入 100 份作答約 0.3 秒，關題公布答案約 10.7 秒，計分 API 外層約 5.9 秒，GAS 內部快速計分約 3.0 秒。結果 `submittedCount=100`、`scoredCount=100`、批次狀態 `done`，測試資料已自動清理。

0.7.14 再加速結果：2026-06-02 使用 GAS `@93`、`gameId=v7_perf_20260602090348`、100 名假玩家、concurrency 25。壓測前先以管理 API `warmupGameSheets` 完成工作表結構暖機；完整流程降為約 33.6 秒。開題外層約 6.0 秒，關題公布答案約 11.2 秒，計分 API 外層約 5.3 秒，GAS 內部快速計分約 2.9 秒。結果 `submittedCount=100`、`scoredCount=100`、批次狀態 `done`，測試資料已自動清理。

0.7.13 更新：第 7 版最終架構收斂為「Firebase 即時主資料層 + GAS 背景工作者 / 行政後端」。Cloud Functions 不列入必要架構；原先可由 Functions 處理的自動計分、防作弊校驗、排行榜彙整、批次狀態、管理 API 與資料封存，先由 GAS 替代。本次新增 `docs/22_v7_firebase_rules_audit.md`，只更新本機 rules 與文件，不部署、不開通 Blaze、不切換正式入口。

0.7.12 更新：新增 `docs/21_v7_firebase_primary_architecture.md`，正式將第 7 版架構方向定義為「Firebase 為主、GAS 為輔」。即時開題、關題、報到、作答與排行榜快照以 Realtime Database 為主；GAS 保留題庫匯入、賽後報表、備份、稽核與行政維護。本次只更新文件與版本登記，不切換正式入口、不部署 Cloud Functions。

0.7.11 更新：新增 `docs/20_v7_blaze_ready_plan.md`，將第 7 版整理為「Blaze-ready、Spark 預設」模式。平常仍維持 Spark 免費方案與第 6 版 50 人左右活動流程；若需 200 人同時在線，再由承辦人手動開通 Blaze。本次不開通 Blaze、不部署 Cloud Functions、不更改 Firebase 帳務方案。

0.7.10 更新：新增第 7 版流量估算工具 `scripts/v7-traffic-estimate.mjs`，可用 `npm run test:v7:traffic-estimate` 離線估算 50 / 100 / 200 人活動的 Firebase Realtime Database 下載量、上傳量與儲存量。此工具不連線 Firebase，不需要管理密碼；結果只供評估 Blaze 免費額度與 Spark 連線限制風險。

0.7.9 更新：新增講師端第 7 版測試入口 `frontend/instructor/dist/InstructorV7.html`，搭配 `config-v7-test.js` 指向 GAS 測試 deployment `@86`，並啟用批次狀態顯示。正式入口 `Instructor.html` 與正式 `config.js` 仍未切換，避免影響現場。

0.7.8 更新：新增 GAS 開題與關題公布答案階段耗時摘要，測試 deployment 為 `@86`。壓測腳本與批次監看工具已改用 `@86`，壓測結果會附上 `openQuestionTiming` 與 `closeRevealTiming`，用來判斷前台等待偏慢的主要原因。

0.7.8 測試結果：50 人壓測完成，開題外層耗時約 10.8 秒，但 GAS 內部開題只約 2.4 秒；關題公布答案外層耗時約 12.1 秒，但 GAS 內部只約 3.5 秒。批次狀態仍可查到 `pending → processing → done`。初步判斷速度仍偏慢，主要瓶頸偏向 Apps Script Web App 端到端呼叫延遲，而不只是 GAS 內部邏輯。

0.7.7 更新：壓測腳本改用 GAS 測試 deployment `@85`，並在完整壓測中加入批次狀態查詢。腳本會在關題後、計分中與計分後呼叫 `getSettlementBatchStatus`，把批次狀態寫入壓測 JSON 摘要，供確認 `settlementBatches` 是否可監看。

0.7.7 測試結果：50 人壓測已完成，批次狀態依序查到 `pending → processing → done`。本次 `gameId` 為 `v7_perf_20260601095247`，50 筆假作答全數完成計分，GAS 內部計分耗時約 15.0 秒，完整流程約 49.1 秒，結束後已清理測試 Firebase 路徑。

0.7.6 更新：新增本機只讀監看工具 `scripts/v7-batch-status.mjs` 與 npm script `npm run test:v7:batch-status`，可查詢 `@85` 的 `getSettlementBatchStatus`。此工具只接受環境變數 `V7_TEST_ADMIN_SECRET`，不接受命令列密碼，也不寫入 Firebase 或 Google Sheets。

0.7.6 測試結果：未設定 `V7_TEST_ADMIN_SECRET` 時，工具會拒絕執行；設定後可正常查詢 `@85`，目前預設場次沒有殘留批次，回傳 `count=0`。

0.7.5 更新：新增 GAS 管理 API `getSettlementBatchStatus`，可用管理密碼查詢 `settlementBatches/{gameId}` 批次狀態摘要，支援依 `questionId` 或 `closeSequence` 篩選。此功能只回傳批次狀態、時間、筆數與耗時，不回傳個資、答案內容、道具明細、Token 或管理密碼；正式前端仍未切換到第 7 版測試 deployment。

0.7.5 測試部署：GAS 已建立測試 deployment `@85`。`getGameState` smoke test 正常；`getSettlementBatchStatus` 未帶管理密碼時會拒絕，帶管理密碼時可回傳批次狀態摘要。目前預設場次沒有殘留批次，回傳 `count=0`。

0.7.4 更新：完成 100 人與 200 人隔離壓測。100 人測試全數送出與計分，完整流程約 71.5 秒；200 人測試全數送出與計分，完整流程約 55.3 秒。兩次 `settlementStatus` 均為 `done`，結束後均已清理測試 Firebase 路徑。此結果顯示目前 `@84` 測試 deployment 可完成 200 人單題壓測，但 `openQuestion` 與 `scoreClosedQuestion` 仍有 15 至 42 秒等候，正式活動前仍建議保留操作間隔與監看批次狀態。

0.7.3 更新：修正壓測腳本預設題號，改用目前公開題庫已存在的 `q001`，避免 50 人壓測因找不到 `test_q001` 中止。若活動前要測其他題目，仍可用 `--question-id 題號` 指定。

0.7.3 50 人壓測結果：使用測試 `gameId` `v7_perf_20260601092639`、題號 `q001`，50 筆假學員答題全部完成計分；`scoreClosedQuestion` 外層耗時約 24.2 秒，GAS 內部 `timingTotalMs` 約 17.8 秒，完整流程約 49.9 秒，`settlementStatus` 為 `done`，結束後已清理測試 Firebase 路徑。

0.7.2 更新：新增本機壓測腳本 `scripts/v7-pressure-test.mjs`，供後續用 `@84` 測試 deployment 執行 50 / 100 / 200 人假資料壓測。腳本預設只允許測試 `gameId` 使用 `v7_perf_` 前綴，管理密碼只從環境變數 `V7_TEST_ADMIN_SECRET` 讀取；未提供密碼時只做 smoke test，不寫入假資料。

壓測清理配套：完整壓測結束時，腳本會呼叫 `resetGameData` 清理測試 `gameId`；GAS 清理範圍已包含 `settlementBatches/{gameId}`，避免批次狀態殘留。

安全 smoke test 指令：

```powershell
npm run test:v7:pressure:smoke
```

後續如需執行 50 人測試，請先在目前 PowerShell 工作階段設定管理密碼環境變數，且不要把密碼寫進任何檔案：

```powershell
$secret = Read-Host "請輸入管理密碼"
Set-Item Env:V7_TEST_ADMIN_SECRET $secret
npm run test:v7:pressure -- --players 50
Remove-Item Env:\V7_TEST_ADMIN_SECRET
Remove-Variable secret
```

0.7.1 更新：新增 Firebase `settlementBatches/{gameId}/{closeSequence}` 批次狀態紀錄。關題公布答案時建立或沿用 `pending` 批次，後台計分開始改為 `processing`，完成後改為 `done`；若計分失敗則記錄 `failed` 與錯誤摘要。此功能用於第 7 版後續避免重複關題與支援失敗重跑追蹤，不改計分公式，也不記錄個資、答案內容、道具明細、Token 或管理密碼。

0.7.1 測試部署：GAS 已建立測試 deployment `@83`。學員端與講師端正式前端仍指向 `@81`，尚未切換正式活動入口。本次未部署 Firebase Hosting、Cloud Functions 或 Firebase rules。

0.7.0 更新：開始第 7 版第 1 階段「現況量測」。本次只在 GAS `scoreClosedQuestionNow()` 加入關題結算階段耗時摘要，協助後續判斷慢點是在 Firebase 同步、Google Sheets 讀寫、道具同步、分數計算或排行榜快照發布。量測摘要只記錄場次代號、題目代號、筆數與毫秒數，不記錄個資、答案內容、道具明細、Token 或管理密碼。

0.7.0 測試部署：GAS 已建立測試 deployment `@82`，但學員端與講師端正式前端仍指向 `@81`，未切換正式活動入口。本次未部署 Firebase Hosting、Cloud Functions 或 Firebase rules。

# 第 6 版最終優化

作業日期：2026-05-29

第 6 版定版版本：`0.6.13`

0.6.13 更新：確認學員端答題獎池已支援 50 題；講師端追加寶箱擴增為第 1 至第 10 箱；落後寶箱擴增為每隊第 1 至第 5 箱，GAS 以 teamId:slot 記錄，學員端同步依 Firebase gameState 補入本機寶箱。Firebase 即時計分遷移已完成評估，建議下一版獨立處理，避免與寶箱擴增混合造成關題與最終結算風險。

第 6 版定版：`0.6.2`

0.6.12 補充：GAS 內建「疫苗題庫」改由 `d:\GAS\GitHub\疫苗教育訓練題庫.md` 產生，仍維持 `vac_q001` 至 `vac_q050`。執行「更新疫苗題庫」時會以新檔內容更新或新增，並停用不在新檔中的舊 `vac_q` 題目，不直接刪除資料列。GAS 已部署 `@80`。

0.6.12 架構評估：GAS 可以拆成多個 `.gs` 檔以降低維護難度，但 Apps Script 仍會在同一個執行環境載入全部檔案，拆檔不會明顯改善執行速度。若要改善關題速度，重點不是拆檔，而是把即時計分與暫存狀態更多移到 Firebase，GAS 改為背景批次寫入 Google Sheets。

0.6.11 補充：GAS 新增「更新測試題庫」、「更新臺灣生活趣味題庫」、「更新疫苗題庫」選單；疫苗題庫由 `d:\GAS\GitHub\疫苗題庫.md` 轉入內建 `vac_q001` 至 `vac_q050`，不覆寫臺灣生活題庫。講師端新增題庫選擇，可在測試題庫、臺灣生活、疫苗題庫之間切換開題清單。GAS 已部署 `@79`，講師端 Hosting 已部署。

0.6.11 效能評估：學員答題目前已先寫入 Firebase，關題慢的主要瓶頸不是前端送 GAS，而是 GAS 關題關閉時仍同步 Firebase 到 Google Sheets、讀寫整批答案／道具／排行榜工作表並重新發布排行榜。建議下一階段改為「Firebase 即時計分快照 + GAS 背景批次落 Sheet」，但需加入同步狀態、重試與人工補同步機制。

0.6.7 維護補充：已退回 `0.6.8` 至 `0.6.10` 題庫匯入／同步 UI 變更，並移除講師端「匯入臺灣題庫」按鈕與 Web App 題庫覆寫 action。正式題庫更新改由 Apps Script / Google Sheet 選單「更新臺灣生活趣味題庫」執行 upsert；此流程不清空題庫，只更新或新增 `q001` 至 `q020`，並停用舊 `demo_q` 測試題。GAS 已部署 `@78`，講師端 Hosting 已部署。

0.6.7 補充：GAS 預設題庫改為 `臺灣生活趣味問答.md` 的 20 題，移除自動補回 `demo_q001` 至 `demo_q011` 測試題。關題計分改為只同步本題需要的道具，並加入玩家同步短暫快取，降低每次關題重複讀 Firebase 與全域道具同步的時間。

0.6.7 部署：GAS 正式 Web App 已更新到 deployment `@71`；講師端 Firebase Hosting 已部署；學員端未重部署。

0.6.6 補充：學員端本機獎池維持原本作法，同一場次同一學員固定，不同學員或不同場次不同；答題寶箱計畫支援最多 50 題並可補齊新增題目。GAS 關題關題不再補發答題寶箱，降低關題結算負擔。

0.6.6 部署：GAS 正式 Web App 已更新到 deployment `@70`；學員端 Firebase Hosting 已部署；講師端未重部署。

0.6.5 補充：針對關題後結算等待過久進行效能修正。答案同步改為一次讀取翻卷紀錄；答對掉寶改為批次更新預配獎勵池與批次新增寶箱；講師端改為先公布答案、背景結算排行榜。

0.6.5 部署：GAS 正式 Web App 已更新到 deployment `@69`；講師端 Firebase Hosting 已部署；學員端未重部署。

0.6.4 補充：講師端「清空測試資料」改為「清空資料」；啟動場次與清空資料流程移除不必要的題庫說明重建、重複工作表初始化與清空時題庫同步，Firebase 清理改為批次刪除。

0.6.4 部署：GAS 正式 Web App 已更新到 deployment `@68`；講師端 Firebase Hosting 已部署；學員端未重部署。

0.6.3 補充：修正講師端題庫連結與重新讀取流程。曾登入過的講師頁會直接進入控制流程；題庫連結會使用本機已保存連結；重新讀取題目清單會同步 Google Sheets 題庫到 Firebase 並清除前端快取。

0.6.3 部署：GAS 正式 Web App 已更新到 deployment `@67`；講師端 Firebase Hosting 已部署；學員端未重部署。

0.6.2 補充：講師端新增「建立／編輯題庫」按鈕，連到 GAS 使用的 Google Sheets 題庫；GAS 會建立「題庫欄位說明」工作表，以中文列出欄位用途、必填規則、範例與可填內容。

0.6.2 部署：GAS 正式 Web App 已更新到 deployment `@66`；講師端 Firebase Hosting 已部署；學員端未重部署。

0.6.1 補充：修正學員端加倍卡道具使用紀錄顯示；本次不變更 GAS 計分邏輯。

0.6.1 部署：已部署學員端 Firebase Hosting；未部署 GAS Web App 或講師端。

第 6 版重點：

1. 計分改以「第 N 次關題」為基準，不以題目題號排序為基準。
2. 第 1 次關題只計算第 1 題回答分；第 2 次關題計算第 2 題回答分，並納入第 1 次關題後使用的道具分。
3. 學員端 Firebase `itemUses` 會標記 `usedAfterQuestionSequence` 與 `settleAtCloseSequence`，供 GAS 後台判斷何時結算。
4. GAS 維持只同步本題 `answers`，不重送整場資料；道具狀態更新改為整批寫回，降低 200 人遊戲時的延遲。
5. 講師誤觸同一題關題時，同一題號不會增加關題次序；本機端與 GAS 都以去重後的 `openedQuestionIds` 判斷。

部署狀態：

- Git commit：`c42f26c`
- GAS Web App deployment：`@65`
- Firebase Hosting：已部署學員端與講師端
- 線上 smoke test：學員端、講師端、投影端皆回應 `200`，無 page error / console error

# 第 5 版已定版

定版日期：2026-05-29

定版版本：`0.5.24`

定版 commit：`f270e52`

GAS Web App deployment：`@63`

第 5 版最終交接文件：`docs/18_v5_final_release.md`

後續若只修正錯誤，請使用 `0.5.25` 之後版本號；若要新增大型玩法或流程，建議另開第 6 版。

# 0.5.24 道具使用與計分同步修正

2026-05-29 修正道具使用規則：學員端只有在講師關題後或最後結算倒數時可以使用道具，開題期間不可使用。學員端使用道具只寫入 Firebase，不主動要求 GAS 重算排行榜；GAS 會在講師關題計分與最終結算時同步 pending 道具並重算排行榜。空寶箱提示改為趣味回應，不再顯示「不扣分」。

# 第 5 版維護摘要

第 5 版已於 2026-05-29 更新到 `0.5.23`。本版重點為挑戰卡抽號動畫、追加與落後寶箱獎勵分配修正、個人排行獎牌，以及 Pixel Art Retro Game UI 持續優化。

| 項目 | 狀態 |
|---|---|
| 目前版本 | `0.5.23` |
| 主要規劃文件 | `docs/17_v5_visual_release.md` |
| 學員端 | https://tychbniis-32af5-student.web.app |
| 講師端 | https://tychbniis-32af5-instructor.web.app |
| 投影端 | https://tychbniis-32af5-instructor.web.app/Display.html |
| GAS Web App deployment | `@59` |
| 部署狀態 | GAS Web App 已部署 `@59`；已執行 Firebase Hosting 部署 |

`0.5.23` 修正挑戰卡與寶箱分配。挑戰卡數字牌改用 `challenge-number-v523-*.png`，選大或選小後會進入 5 秒抽號動畫，可手動停止或自動停止，停在預設號碼 3 秒後自動結算；抽號高亮已改為藍色對比底與外框，停住結果改為綠色確認狀態。追加寶箱改回只啟用講師點選的箱號；追加寶箱與落後寶箱都改用玩家種子與權重抽取內容物，避免全員獎勵一致。個人排行改用 `award-player-medal-v523-*.png` 獎牌，配色為彩色、紫、金、銀、黃。結算後學員端頂欄分數以後端最終分數為準，最後成績查詢也改為只讀取已結算資料，避免非第 1 名學員讀取時觸發空範圍錯誤。

# 第 3 版定版摘要

# 第 3 版定版狀態

第 3 版已於 2026-05-23 以 `0.3.22` 定版。

| 項目 | 狀態 |
|---|---|
| 學員端 | https://tychbniis-32af5-student.web.app |
| 講師端 | https://tychbniis-32af5-instructor.web.app |
| GAS Web App deployment | version `36` |
| 定版文件 | `docs/13_v3_final_release.md` |
| 免費方案 | 未啟用 Cloud Functions、Cloud Run、Blaze |

# 第 4 版定版狀態

第 4 版已於 2026-05-27 以 `0.4.28` 定版。

第 4 版定位為「靜態 HTML5 優先、低 GAS 呼叫、免費方案穩定版」，不延續第 3 版的創作題與票選流程，改以學員端本機計算、講師端關題快照、投影端公開顯示為主。

| 項目 | 狀態 |
|---|---|
| 版本 | `0.4.28` |
| 路線圖 | `docs/14_v4_roadmap.md` |
| 檢查紀錄 | `docs/15_v4_0_4_7_checklist.md` |
| 定版文件 | `docs/16_v4_final_release.md` |
| 主要方向 | 靜態 HTML5、移除創作票選、前端預配寶箱、幸運箱紀錄、個人全對回傳、取消首答加分 |
| 免費方案 | 未啟用 Cloud Functions、Cloud Run、Blaze |

`0.4.28` 定版後，學員端立即加分的道具會直接顯示已套用；講師按下結算後，投影端會先顯示 15 秒最後道具使用倒數，後台約 20 秒後才正式結算。正式部署仍維持免費方案，不啟用 Cloud Functions、Cloud Run、Blaze 或付費帳務。

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

第 3 版已完成雲端部署，並已於 `0.3.22` 定版。

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

目前第 3 版已完成寶箱資料表、關題後寶箱取得判定、每人最多 3 個未開啟寶箱限制、開寶箱 API、道具庫讀取、基本道具效果、幸運獎與全對獎結算、戰隊加權平均分排行榜、學員端浮動寶箱與成就 UI、創作題投稿、隊內初選、講師審核代表作品、匿名全體投票與賽後報表匯出。`0.3.22` 已完成免費方案效能收斂：學員報到優先寫 Firebase `players`、送答優先寫 Firebase `answers`，若 Firebase 寫入失敗會回退 GAS；創作投稿與投票以 `questionId` 隔離目前創作題，避免舊資料混入；講師關題後由講師端單次觸發後台計分與排行榜更新。

`0.3.22` 仍保留 GAS / Google Sheets 作賽前同步與賽後正式重算。Cloud Functions、Cloud Run、Blaze 方案均未啟用。

第 2 版正式活動流程仍可獨立使用；若不使用寶箱 UI，學員端操作流程不變。

## 維護規則

1. 功能改善採低 token 工作流：先讀交接文件與相關檔案，不展開整個專案或大型 log。
2. 每次修改前需列出影響檔案、測試方式與還原方式。
3. 先完成本機測試，再依使用者指示推送雲端。
4. 未確認部署範圍前不得執行 `firebase deploy`、`clasp push` 或 `clasp deploy`。
5. 正式活動前可在講師端按「初始化遊戲資料」，清空測試玩家、作答、翻卷與排行榜資料；題庫與戰隊設定會保留。
6. 預設題庫目前為 `臺灣生活趣味問答.md` 的 20 題；測試題庫 `demo_q001` 至 `demo_q011` 不再自動補回。

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
4. 講師端開放 `q001` 或正式題目 ID。
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
0.5.23 道具計分補充：加分卡與挑戰卡維持本機即時加分；加倍卡改為下一題開題後才同步、下一題關題時計分；翻身卡改為依指定題號的 `comebackControl` 判斷 `+30/+5`，避免讀到上一題狀態。學員端快取參數更新為 `0.5.23-item-score1`。

0.5.23 補充修正：挑戰卡分數維持學員端本機即時加分，與加分卡一致；本次只補上 Firebase `itemUses` 同步，讓 GAS 結算與排行榜能納入挑戰卡已決定的 `effectScore`。學員端快取參數更新為 `0.5.23-challenge-sync1`，未變更 `clientVersion`，不會要求玩家重新報到。
## 第 6 版定版與第 7 版方向

`0.6.13` 定為第 6 版定版。第 6 版完成後，Firebase 即時計分遷移改列為第 7 版工作事項，不再納入第 6 版追加修改。

第 7 版主要任務是降低現場延遲，處理 GAS 面對大量學員、頻繁回應、Google Sheets 批次寫入時可能發生的等待、逾時或中斷問題。

第 7 版規劃文件：`docs/19_v6_final_and_v7_roadmap.md`
