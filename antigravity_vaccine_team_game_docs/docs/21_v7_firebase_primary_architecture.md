# 第 7 版 Firebase 主架構方案

作業日期：2026-06-02

目前版本：`0.7.13`

0.7.13 補充：本架構不再把 Cloud Functions 列為必要路線。第 7 版採「Firebase 即時主資料層 + GAS 背景工作者 / 行政後端」；原先適合 Cloud Functions 的自動計分、資料校驗、排行榜彙整、批次狀態與管理 API，先由 GAS 替代。

## 目標

第 7 版正式改為「Firebase 為主、GAS 為輔」。

核心原則：

1. 現場即時流程由 Firebase Realtime Database 承擔。
2. GAS 不再作為 100 到 200 人活動的即時主後端。
3. GAS 保留題庫、報表、備份、稽核與行政維護。
4. 第 6 版正式流程暫時保留，作為 50 人左右活動與回復方案。
5. 未經承辦人確認，不開通 Blaze、不部署任何付費服務。

## 責任分工

| 功能 | 第 7 版主責 | GAS 角色 |
|---|---|---|
| 靜態網頁 | Firebase Hosting | 無 |
| 開題狀態 | Realtime Database `gameState/{gameId}` | 可作為備援或活動後稽核 |
| 關題狀態 | Realtime Database `gameState/{gameId}` | 可作為備援或活動後稽核 |
| 學員報到 | Realtime Database `players/{gameId}` | 活動後匯出、備份 |
| 學員作答 | Realtime Database `answers/{gameId}/{questionId}` | 活動後正式匯出、稽核 |
| 排行榜快照 | Realtime Database `publicScoreboards/{gameId}` | 可產出正式報表 |
| 題庫管理 | GAS / Google Sheets | 主責 |
| 賽後報表 | GAS / Google Sheets | 主責 |
| 活動資料備份 | GAS / Google Sheets | 主責 |
| 計分批次狀態 | Realtime Database `settlementBatches/{gameId}` | 可記錄處理結果 |
| Cloud Functions | 不列入必要架構 | 相關功能由 GAS 背景工作者替代 |

## 現場資料流

### 1. 活動初始化

Spark 預設階段：

1. GAS 從 Google Sheets 讀取題庫。
2. GAS 發布公開題庫到 `publicQuestions/{gameId}`。
3. 講師端確認 `gameState/{gameId}`。
4. 學員端只讀 Firebase 公開資料，不直接依賴 GAS 取得題目。

Blaze 階段：

1. 同樣使用 Firebase 作為即時資料層。
2. Blaze 只用來解除 Spark 同時連線限制；初始化與計分仍先由 GAS 背景工作者處理。

### 2. 學員報到

第 7 版方向：

1. 學員端寫入 `players/{gameId}/{playerId}`。
2. 前端不得寫入完整身分證字號、電話、地址或真實個資。
3. `playerId` 使用不可逆或不可直接識別個人的代號。
4. GAS 只在活動後或管理員要求時同步報到資料。

### 3. 開題

第 7 版方向：

1. 講師端更新 `gameState/{gameId}`。
2. 學員端輪詢或監看 `gameState/{gameId}` 顯示目前題目。
3. 題目公開內容來自 `publicQuestions/{gameId}/{questionId}`。
4. GAS 不再是開題同步的必要即時路徑。

### 4. 作答

第 7 版方向：

1. 學員端直接寫入 `answers/{gameId}/{questionId}/{playerId}`。
2. 每位學員每題只允許建立一次作答。
3. Firebase rules 應限制同一路徑不可覆寫。
4. 前端可保存本機已作答狀態，避免重複送出。
5. GAS 活動後再匯出作答作為正式稽核資料。

### 5. 關題與公布答案

第 7 版方向：

1. 講師端更新 `gameState/{gameId}.status = question_closed`。
2. `gameState/{gameId}.answerReveal` 放公開答案與說明。
3. 學員端收到關題狀態後停止作答。
4. 排行榜可先顯示暫時計分結果。

### 6. 計分與排行榜

Spark 預設階段：

1. 講師端或 GAS 以批次方式讀取 Firebase 暫存作答。
2. 完成後寫入 `publicScoreboards/{gameId}`。
3. `settlementBatches/{gameId}` 記錄 `pending / processing / done / failed`。
4. 此階段仍可能受 GAS 速度限制，但不應阻塞開題、關題與學員端同步。

Blaze 後續階段：

1. 若你確認開通 Blaze，主要目的為支援 100 到 200 人同時在線。
2. 講師端仍可呼叫 GAS 背景工作者執行計分。
3. GAS 完成計分後寫入 `publicScoreboards/{gameId}`。
4. GAS 同時保留賽後正式報表與備份。

## Realtime Database 建議節點

```text
gameState/{gameId}
publicQuestions/{gameId}/{questionId}
players/{gameId}/{playerId}
answers/{gameId}/{questionId}/{playerId}
publicScoreboards/{gameId}
settlementBatches/{gameId}/{closeSequence}
activityLogs/{gameId}/{logId}
exports/{gameId}
```

## GAS 保留用途

GAS 應保留在低頻、可人工檢查、可回復的行政工作：

1. 從 Google Sheets 匯入題庫。
2. 發布公開題庫到 Firebase。
3. 活動後從 Firebase 匯出報到、作答、排行榜資料。
4. 產出 Google Sheets 賽後報表。
5. 備份活動資料。
6. 稽核異常作答或重複資料。
7. 管理員手動初始化測試 gameId。

GAS 不建議再承擔：

1. 200 人即時開題同步。
2. 200 人即時關題同步。
3. 每位學員高頻作答 API。
4. 每次畫面更新都呼叫的排行榜 API。

## Cloud Functions 功能由 GAS 替代

本專案目前不把 Cloud Functions 列入必要架構。

原先適合放進 Cloud Functions 的功能，先由 GAS 替代：

1. 關題後自動計分：讀取 `answers/{gameId}/{questionId}`，計算本題成績。
2. 防作弊與資料校驗：確認作答時間、題目狀態、重複作答與超時。
3. 排行榜彙整：統一產出 `publicScoreboards/{gameId}`，避免前端各自計算。
4. 批次狀態管理：更新 `settlementBatches/{gameId}` 的 `pending / processing / done / failed`。
5. 活動後資料封存：整理 Firebase 暫存資料，供 GAS 匯出報表。
6. 管理 API：初始化 gameId、清理測試資料、鎖定活動狀態。
7. 觸發式工作：偵測關題狀態後，自動啟動計分流程。

GAS 替代方式：

1. 講師端關題後呼叫 GAS 管理 API。
2. GAS 從 Firebase 讀取當題作答。
3. GAS 執行校驗、計分與排行榜彙整。
4. GAS 寫回 `settlementBatches/{gameId}` 與 `publicScoreboards/{gameId}`。
5. GAS 活動後匯出資料到 Google Sheets。

仍不建議搬離 GAS 的功能：

1. 題庫人工維護。
2. 承辦人需要直接閱讀與修正的 Google Sheets 報表。
3. 尚未明確授權的付費服務。
4. 可由 Realtime Database 直接完成的單純狀態讀取。

## 遷移階段

### 階段 A：文件與規格

目前狀態：本文件完成。

目標：

1. 明確第 7 版責任分工。
2. 保留第 6 版正式入口。
3. 不改線上服務。

### 階段 B：Firebase rules 檢查

目標：

1. 確認 `players` 只能建立一次。
2. 確認 `answers` 只能建立一次。
3. 確認公開節點只能讀必要資料。
4. 確認不允許任意寫入排行榜與 gameState。

### 階段 C：講師端 Firebase 主控測試入口

目標：

1. 建立不影響正式入口的 V7 測試入口。
2. 開題與關題先寫 Firebase。
3. GAS 只作為題庫與報表備援。
4. 測試 50 人流程。

### 階段 D：200 人 Blaze 測試

前提：

1. 承辦人已手動開通 Blaze。
2. 已設定預算提醒。
3. 已確認 Realtime Database rules。

目標：

1. 測 100 人。
2. 測 200 人。
3. 檢查 Firebase Usage。
4. 檢查學員端是否可同步開題與關題。

### 階段 E：GAS 背景工作者優化

只有在下列情況才進入：

1. GAS 批次計分仍太慢。
2. 200 人關題後排行榜等待不可接受。
3. 需要把 GAS 計分拆成更小批次或加強批次狀態追蹤。

## 風險與配套

| 風險 | 配套 |
|---|---|
| Spark 100 同時連線限制 | 50 人活動維持 Spark；200 人活動改 Blaze |
| Blaze 無硬性支出上限 | 設 USD 1 與 USD 5 預算提醒 |
| 前端直接寫 Firebase 被濫用 | Realtime Database rules 限制可寫節點與不可覆寫 |
| 作答重複送出 | 路徑使用 `gameId/questionId/playerId`，rules 禁止覆寫 |
| 排行榜被前端偽造 | 前端不可寫 `publicScoreboards` |
| GAS 仍偏慢 | 即時流程不阻塞 GAS；GAS 改為活動後處理 |
| 文件與實作不同步 | 每階段完成後更新 `AI_HANDOVER.md`、CHANGELOG 與 roadmap |

## 回復策略

若第 7 版 Firebase 主流程測試不穩：

1. 不切換正式 `Instructor.html`。
2. 保留第 6 版正式入口。
3. 停用第 7 版測試入口。
4. 清理測試 gameId。
5. 使用 `git revert` 還原本階段修改。

## 下一步

建議下一步執行「階段 B：Firebase rules 檢查」。

原因：

1. Firebase 主架構能否安全上線，關鍵在 rules。
2. rules 可先本機審查，不必開通 Blaze。
3. 不會影響第 6 版正式入口。
