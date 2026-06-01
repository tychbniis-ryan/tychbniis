# 第 6 版定版與第 7 版工作規劃

日期：2026-06-01

## 第 6 版定版

第 6 版以 `0.6.13` 作為定版版本。

本版已完成：

1. 計分次序邏輯調整。
2. 題庫選擇與疫苗教育訓練題庫更新。
3. 學員端答題寶箱獎池支援 50 題。
4. 追加寶箱擴增到 10 個。
5. 落後寶箱擴增到每隊 5 個。
6. GAS 寫入與關題流程已做初步批次化與減少不必要作業。

第 6 版定版後，原則上不再新增大型架構功能，只接受必要修正。

## 第 7 版主要任務

第 7 版主軸是降低各項延遲等候時間，處理 GAS 面對大量學員、頻繁回應與 Google Sheets 寫入時可能發生的逾時、中斷或處理延遲問題。

主要方向：

1. 即時計分移到 Firebase 暫存。
2. 排行榜快照移到 Firebase 優先讀取。
3. 學員答題與道具使用先寫 Firebase。
4. GAS 只讀取 Firebase 已鎖定批次。
5. GAS 只負責背景整批寫入 Google Sheets。
6. Google Sheets 定位為賽後稽核、報表與備份，不作為現場高頻即時運算主體。

## 第 7 版目前進度

### 0.7.8 開題與關題公布答案耗時量測

目前速度判斷：仍偏慢。

原因：

1. 第 7 版驗收目標是前台關題 50 人小於 3 秒、100 人小於 5 秒、200 人小於 8 秒。
2. 目前壓測顯示開題約 11 至 17 秒，關題公布答案約 8 至 11 秒，背景計分約 15 至 35 秒。
3. 雖然背景計分已可監看，但前台開題與公布答案仍會讓講師等待，正式活動體感仍偏慢。

本次新增：

1. `openQuestionTiming`：開題階段耗時摘要。
2. `closeQuestionRevealTiming`：關題公布答案階段耗時摘要。
3. 壓測腳本會回傳 `openQuestionTiming` 與 `closeRevealTiming`，便於判斷慢點在 Sheets 初始化、題庫讀取、狀態寫入或 Firebase 同步。

測試部署：

1. GAS 測試 deployment：`@86`。
2. 正式前端仍未切換。

測試結果：

1. 50 人壓測已完成。
2. 測試 `gameId`：`v7_perf_20260601100325`。
3. 開題外層耗時：約 10.8 秒。
4. GAS 內部 `openQuestionTiming.totalMs`：約 2.4 秒。
5. 關題關閉公布答案外層耗時：約 12.1 秒。
6. GAS 內部 `closeRevealTiming.totalMs`：約 3.5 秒。
7. 後台計分外層耗時：約 26.0 秒。
8. GAS 內部計分 `timingTotalMs`：約 19.6 秒。
9. 批次狀態仍可查到 `pending → processing → done`。
10. 結束後已呼叫 `resetGameData` 清理測試 Firebase 路徑。

速度判斷：

1. 速度仍偏慢，尤其是講師端會感受到的開題與關題等待。
2. 但本次量測顯示，開題與關題公布答案的 GAS 內部作業約 2.4 至 3.5 秒，外層 Web App 等待約 10 至 12 秒。
3. 因此最大落差可能不是單一 Sheets 讀寫，而是 Apps Script Web App 端到端呼叫延遲、執行環境啟動或網路往返。
4. 若要達成前台 3 至 8 秒目標，後續需要考慮更明確的架構配套，例如講師端先進入「已送出操作、等待 Firebase 狀態確認」、預先暖機、減少 Web App 管理操作次數，或評估是否使用 Firebase / Cloud Functions 類替代入口。

### 0.7.7 壓測流程整合批次監看

已將 `scripts/v7-pressure-test.mjs` 改為使用 GAS 測試 deployment `@85`，並在完整壓測流程中加入批次狀態查詢。

新增查詢點：

1. `batchStatusAfterClose`：關題公布答案後查詢。
2. `batchStatusDuringScoring`：後台計分啟動後約 1.5 秒查詢。
3. `batchStatusAfterScoring`：後台計分完成後查詢。

目的：

1. 驗證 `settlementBatches` 是否會在壓測中出現可監看的狀態。
2. 確認關題後能否看到批次從 `pending`、`processing` 到 `done`。
3. 作為未來接入講師端 UI 前的安全測試。

安全限制：

1. 壓測 `gameId` 仍必須以 `v7_perf_` 開頭。
2. 管理密碼只讀取 `V7_TEST_ADMIN_SECRET`。
3. 完整壓測結束後仍預設清理測試 Firebase 路徑。
4. 本次不改正式前端、不切換正式活動入口。

測試結果：

1. 50 人壓測已完成。
2. 測試 `gameId`：`v7_perf_20260601095247`。
3. 假學員答題數：50 筆。
4. 完成計分數：50 筆。
5. GAS 內部 `timingTotalMs`：約 15.0 秒。
6. 完整流程耗時：約 49.1 秒。
7. 批次狀態依序查到：
   - 關題關閉後：`pending`
   - 後台計分中：`processing`
   - 後台計分完成後：`done`
8. 結束後已呼叫 `resetGameData` 清理測試 Firebase 路徑。

### 0.7.6 批次狀態本機監看工具

已新增本機只讀工具 `scripts/v7-batch-status.mjs`，可用 `npm run test:v7:batch-status` 查詢 `@85` 的 `getSettlementBatchStatus`。

使用方式：

```powershell
$secret = Read-Host "請輸入管理密碼"
Set-Item Env:V7_TEST_ADMIN_SECRET $secret
npm run test:v7:batch-status -- --question-id q001
Remove-Item Env:\V7_TEST_ADMIN_SECRET
Remove-Variable secret
```

安全配套：

1. 工具預設只允許查詢 GAS 測試 deployment `@85`。
2. 管理密碼只讀取環境變數，不接受命令列密碼。
3. 工具只讀取批次狀態，不寫入 Firebase 或 Google Sheets。
4. 正式講師端仍指向第 6 版 GAS `@81`，因此暫不把監看功能接進正式講師端，避免正式前端呼叫不存在的 action。

測試結果：

1. 未設定 `V7_TEST_ADMIN_SECRET` 時，工具會拒絕執行。
2. 設定 `V7_TEST_ADMIN_SECRET` 後，工具可正常查詢 `@85`。
3. 目前預設場次沒有殘留批次，回傳 `count=0`。

### 0.7.5 結算批次狀態監看 API

已新增 GAS 管理 action `getSettlementBatchStatus`，用於查詢 Firebase `settlementBatches/{gameId}` 批次狀態摘要。

用途：

1. 講師或維運者可確認背景計分是否已從 `pending` 進入 `processing`、`done` 或 `failed`。
2. 可依 `questionId` 查某一題，也可依 `closeSequence` 查某一次關題批次。
3. 正式活動前可作為操作配套：下一題開題前，確認前一題批次是否已 `done`。

風險配套：

1. 此 action 需要管理密碼。
2. 回傳只包含狀態、時間、筆數、耗時與錯誤摘要。
3. 不回傳個資、答案內容、道具明細、Token 或管理密碼。
4. 本次不改計分公式、不切正式前端、不部署 Firebase Hosting。

測試部署：

1. GAS 已建立測試 deployment `@85`。
2. `@85 getGameState` smoke test 正常。
3. `@85 getSettlementBatchStatus` 未帶管理密碼時會拒絕。
4. `@85 getSettlementBatchStatus` 帶管理密碼時回應 `ok:true`，目前預設場次沒有殘留批次，`count=0`。

### 0.7.4 100 / 200 人壓測基準

已完成 100 人與 200 人隔離壓測，兩次皆使用 GAS 測試 deployment `@84`、題號 `q001`，測試 `gameId` 皆以 `v7_perf_` 開頭。

100 人結果：

1. 測試 `gameId`：`v7_perf_20260601093129`。
2. 假學員答題數：100 筆。
3. 完成計分數：100 筆。
4. `scoreClosedQuestion` 外層耗時：約 41.7 秒。
5. GAS 內部 `timingTotalMs`：約 35.2 秒。
6. 完整流程耗時：約 71.5 秒。
7. 批次狀態：`done`。

200 人結果：

1. 測試 `gameId`：`v7_perf_20260601093256`。
2. 假學員答題數：200 筆。
3. 完成計分數：200 筆。
4. `scoreClosedQuestion` 外層耗時：約 24.5 秒。
5. GAS 內部 `timingTotalMs`：約 18.9 秒。
6. 完整流程耗時：約 55.3 秒。
7. 批次狀態：`done`。

兩次測試結束後均已呼叫 `resetGameData` 清理測試 Firebase 路徑。初步判斷目前 `@84` 可完成 200 人單題壓測，但 `openQuestion` 與 `scoreClosedQuestion` 仍有 15 至 42 秒等候，正式活動前應保留操作間隔與批次狀態監看。

### 0.7.3 壓測預設題號修正

50 人壓測初次執行時，腳本使用預設題號 `test_q001`，但目前題庫沒有該題，因此 GAS 回覆「找不到題目」。已將 `scripts/v7-pressure-test.mjs` 預設題號改為目前公開題庫已存在的 `q001`。

本次只修正測試工具預設值，不改 GAS 後端、不切換正式前端、不部署 Firebase Hosting。後續仍可用 `--question-id` 指定其他題目。

修正後已完成 50 人隔離壓測：

1. 測試 `gameId`：`v7_perf_20260601092639`。
2. 題號：`q001`。
3. 假學員答題數：50 筆。
4. 完成計分數：50 筆。
5. `scoreClosedQuestion` 外層耗時：約 24.2 秒。
6. GAS 內部 `timingTotalMs`：約 17.8 秒。
7. 完整流程耗時：約 49.9 秒。
8. 批次狀態：`done`。
9. 結束後已呼叫 `resetGameData` 清理測試 Firebase 路徑。

### 0.7.2 隔離壓測工具

已新增本機壓測腳本 `scripts/v7-pressure-test.mjs`，作為 50 / 100 / 200 人假資料測試前置工具。

安全設計：

1. 預設只允許對 GAS 測試 deployment `@84` 執行。
2. 測試 `gameId` 必須以 `v7_perf_` 開頭，避免誤寫正式場次。
3. 管理密碼只從環境變數 `V7_TEST_ADMIN_SECRET` 讀取，不接受命令列密碼。
4. 未設定管理密碼時，只執行 `getGameState` smoke test，不寫入假資料。
5. 假學員暱稱使用 `測試學員001` 這類假資料，不使用真實個資。
6. 完整壓測結束時，預設呼叫管理 API `resetGameData` 清理測試 `gameId`。
7. GAS 清理範圍已包含 `settlementBatches/{gameId}`，避免壓測批次狀態殘留。

可先執行：

```powershell
npm run test:v7:pressure:smoke
```

尚未執行：

1. 尚未灌入 50 / 100 / 200 人假資料。
2. 尚未用管理密碼執行完整開題、寫入 Firebase 假作答、關題、計分壓測流程。
3. GAS 已建立測試 deployment `@84`，供後續壓測使用。

### 0.7.1 Firebase 關題結算批次

已完成第 2 個小任務的 GAS 端基礎配套：建立 Firebase `settlementBatches/{gameId}/{closeSequence}` 批次狀態紀錄。

狀態流程：

1. 講師關題並公布答案：建立或沿用批次，狀態為 `pending`。
2. 後台計分開始：批次狀態改為 `processing`。
3. 後台計分完成：批次狀態改為 `done`，記錄耗時與筆數摘要。
4. 後台計分失敗：批次狀態改為 `failed`，只記錄錯誤摘要。

風險配套：

1. 同一題已有批次時沿用既有 `closeSequence`，避免重複關題建立新批次。
2. 批次狀態只記錄 `gameId`、`questionId`、`closeSequence`、狀態、時間、筆數與錯誤摘要，不記錄個資、答案內容、道具明細、Token 或管理密碼。
3. 若 Firebase 批次寫入失敗，回傳 `skipped` 結果，不阻斷原本計分流程。
4. 正式前端尚未切換到第 7 版，正式學員端與講師端仍使用第 6 版 `@81`。

測試部署：

1. GAS 已建立測試 deployment `@83`。
2. `@83 getGameState` smoke test 回應 `200`。
3. `@83 scoreClosedQuestion` 未帶管理密碼時回「管理操作授權失敗」。
4. 前端 `gasWebAppUrl` 仍指向正式 `@81`，未切換到 `@83`。

### 0.7.0 現況量測

已先完成第 1 個小任務：在 GAS `scoreClosedQuestionNow()` 加入關題階段耗時摘要。

量測內容：

1. Firebase 玩家同步耗時。
2. Firebase 答案同步耗時。
3. Firebase 道具同步耗時。
4. Google Sheets 答案與道具資料讀寫耗時。
5. 分數計算耗時。
6. 排行榜重算與快照發布耗時。
7. gameState 發布耗時。

資安限制：

1. 不記錄姓名、身分證、電話、答案內容、道具明細、Token 或管理密碼。
2. 只記錄 `gameId`、`questionId`、筆數、階段名稱與毫秒數。

尚未執行：

1. 尚未用 50 人、100 人、200 人假資料壓測。
2. 尚未將正式前端切換到 `0.7.0`，因此正式學員端與講師端仍使用第 6 版 `@81`。

已完成配套：

1. GAS 已建立測試 deployment `@82`，供後續測試關題量測使用。
2. 學員端與講師端正式 `gasWebAppUrl` 未更新，仍指向 `@81`，避免未完成壓測前影響正式活動入口。
3. `@82` 已通過 `getGameState` smoke test。
4. `@82` 的 `scoreClosedQuestion` 未帶管理密碼時會拒絕，確認管理操作未公開。

## 第 7 版建議小任務

### 1. 現況量測

目標：先確認目前慢在哪裡，避免盲改。

工作項目：

1. 在關題流程加入階段耗時紀錄。
2. 分別記錄 Firebase 讀取、答案同步、道具同步、分數計算、排行榜產生、Sheets 寫入耗時。
3. 使用 50 人、100 人、200 人假資料測試。
4. 建立每次關題的耗時摘要。

風險：

1. Log 不得記錄個資。
2. 測試資料必須使用假資料。

### 2. Firebase 關題結算批次

目標：關題時先在 Firebase 建立不可重複的結算批次，避免講師誤觸或重複關題造成重算。

工作項目：

1. 建立 `settlementBatches/{gameId}/{closeSequence}`。
2. 同時保存 `questionId`、`closeSequence`、`status`、`lockedAt`。
3. 若相同 `questionId` 已有關題批次，不增加次數。
4. 同一批次只允許從 `pending` 變成 `processing` 再變成 `done`。

風險：

1. 必須保留 GAS 端二次檢查，避免 Firebase 與 Sheets 狀態不一致。
2. 必須設計失敗重跑機制。

### 3. 即時計分暫存

目標：現場顯示先看 Firebase，不等待 Google Sheets 完成寫入。

工作項目：

1. 學員作答後先寫 Firebase answers。
2. 關題關閉後，Firebase 批次計算本題回答分與上題道具分。
3. 寫入 `liveScores/{gameId}`。
4. 講師端與學員端排行榜優先讀取 `liveScores` 或排行榜快照。

風險：

1. 分數來源要有明確版本與批次 ID。
2. 最終結算時必須以已鎖定批次為準。

### 4. 排行榜快照

目標：避免每次查排行榜都觸發 GAS 重算。

工作項目：

1. 每次關題後產生 Firebase 排行榜快照。
2. 投影端與學員端只讀快照。
3. GAS 背景寫入 Sheets 後只更新稽核狀態，不阻塞前台。

風險：

1. 快照必須標示產生時間與對應關題次數。
2. 若背景寫 Sheets 失敗，前台仍可顯示分數，但後台需提示待補寫。

### 5. GAS 背景批次寫入

目標：降低 GAS 逾時與逐列寫入風險。

工作項目：

1. 將 answers、itemUses、scoreEvents 整批寫入 Google Sheets。
2. 使用批次矩陣 `setValues()`，避免逐列 `appendRow()`。
3. 建立寫入狀態，例如 `pending`、`writing`、`done`、`failed`。
4. 失敗時允許講師端按鈕重試背景寫入。

風險：

1. 背景寫入與前台分數可能短時間不同步。
2. 需要明確 UI 提示「前台已結算，Sheets 尚在背景同步」。

### 6. 壓力測試與驗收

目標：確認 200 人使用時不會因 GAS 等待造成現場中斷。

驗收條件：

1. 50 人關題前台回應目標小於 3 秒。
2. 100 人關題前台回應目標小於 5 秒。
3. 200 人關題前台回應目標小於 8 秒。
4. Google Sheets 背景同步可延後完成，但不得影響前台繼續開下一題。
5. 任一批次失敗時，可重試且不重複計分。

## 第 7 版不建議一次完成的事項

1. 不建議一次把所有 GAS 計分邏輯移除。
2. 不建議同時改題庫、寶箱、計分與排行榜 UI。
3. 不建議先改 UI 再補資料一致性。
4. 不建議讓 Google Sheets 繼續承擔現場即時計分主體。

## 還原原則

第 7 版每一階段都必須可單獨還原：

1. Firebase 暫存結算可關閉，回到 GAS 既有結算。
2. 排行榜快照可關閉，回到 GAS 既有排行榜。
3. 背景寫 Sheets 可手動重試。
4. 每次大改前都要保留前一版 GAS deployment 與 Firebase Hosting 版本。
