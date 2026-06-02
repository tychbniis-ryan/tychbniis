# 第 7 版 Blaze-ready 維運方案

作業日期：2026-06-02

目前版本：`0.7.12`

0.7.12 補充：第 7 版後續正式架構方向已整理於 `docs/21_v7_firebase_primary_architecture.md`。本文件仍負責 Blaze-ready 與 Spark 預設的維運條件；實際即時資料流責任分工以第 7 版 Firebase 主架構文件為準。

## 目標

本方案將專案整理為「Blaze-ready、Spark 預設」模式。

意思是：

1. 平常仍以 Firebase Spark 免費方案維運。
2. 第 6 版 50 人左右活動仍可依原流程使用。
3. 需要 200 人同時在線活動時，再由承辦人手動開通 Blaze。
4. 開通 Blaze 前，不部署 Cloud Functions，不新增付費服務。
5. GAS 保留題庫、報表、備份與行政維護用途，不作為 200 人即時主後端。

## 目前判斷

### 50 人左右活動

可維持現有第 6 版流程：

1. Firebase Hosting 提供靜態網頁。
2. Realtime Database 提供公開狀態、報到、作答與排行榜快取。
3. GAS / Google Sheets 處理題庫、正式紀錄、關題與報表。
4. Spark 免費方案的 100 同時連線限制仍有餘裕。

### 200 人同時在線活動

不建議使用 Spark 免費方案。

原因：

1. Spark Realtime Database 同時連線限制為 100。
2. 200 位學員加上講師端、大螢幕、測試頁與重複分頁，會明顯超過限制。
3. 流量估算顯示 200 人活動的資料量很小，主要風險不是流量費，而是 Spark 同時連線限制。

## Blaze 開通條件

只有符合下列任一條件時，才建議開通 Blaze：

1. 單場活動預估超過 80 人同時在線。
2. 需要 100 到 200 人同時接收開題、關題與排行榜更新。
3. 活動不適合拆成多場 50 人以內的小場次。
4. 活動前已完成 100 / 200 人測試。
5. 已設定 Google Cloud 預算提醒。

## 開通 Blaze 前檢查

開通前請先確認：

1. Firebase 專案是正確活動專案。
2. 已設定 Google Cloud Billing 預算提醒。
3. 建議至少設定 USD 1 與 USD 5 預算提醒。
4. Realtime Database rules 已部署且不可公開任意寫入。
5. 活動 gameId 已確認。
6. 題庫已同步。
7. 不將圖片、影片、完整個資或大量 log 存進 Realtime Database。
8. 已用 `npm run test:v7:traffic-estimate` 估算流量。

## Blaze 模式下的建議架構

### Firebase Realtime Database

作為即時主資料層：

1. `gameState/{gameId}`：開題、關題、目前題目與公開答案。
2. `players/{gameId}`：學員報到暫存。
3. `answers/{gameId}/{questionId}`：學員作答暫存。
4. `publicScoreboards/{gameId}`：排行榜快照。
5. `settlementBatches/{gameId}`：第 7 版批次計分狀態。

### Firebase Hosting

繼續作為靜態網頁部署：

1. 學員端。
2. 講師端。
3. 大螢幕。
4. 第 7 版測試入口。

### GAS / Google Sheets

保留低頻行政用途：

1. 題庫匯入與同步。
2. 賽後報表。
3. 活動資料備份到 Google Sheets。
4. 管理員手動初始化或清理測試資料。
5. 活動後正式重新計分與稽核。

### Cloud Functions

目前不啟用。

只有在下列情境才評估：

1. GAS 計分仍明顯過慢。
2. 需要真正背景化計分。
3. 需要把關題、計分、排行榜發布改成伺服端事件流程。
4. 使用者明確同意開通 Blaze 並部署 Cloud Functions。

## 成本控管

目前 0.7.10 估算結果：

| 人數 | 活動條件 | Realtime Database 下載 | 儲存 | 佔 10 GB 下載免費額度 |
|---:|---|---:|---:|---:|
| 50 人 | 20 題、60 分鐘、5 秒輪詢 | 約 27.09 MB | 約 0.53 MB | 約 0.26% |
| 100 人 | 20 題、60 分鐘、5 秒輪詢 | 約 54.98 MB | 約 1.04 MB | 約 0.54% |
| 200 人 | 20 題、60 分鐘、5 秒輪詢 | 約 113.14 MB | 約 2.05 MB | 約 1.10% |

判斷：

1. 200 人活動很可能仍在 Blaze 免費額度內。
2. Blaze 無硬性支出上限，不能保證絕對 0 元。
3. 必須設定預算提醒。
4. 活動後應清理測試資料與不必要暫存資料。

## 活動前測試流程

```powershell
npm run test:v7:traffic-estimate
```

若已設定第 7 版測試密碼，可再測：

```powershell
$secret = Read-Host "請輸入測試管理密碼"
Set-Item Env:V7_TEST_ADMIN_SECRET $secret
npm run test:v7:pressure -- --players 50
Remove-Item Env:\V7_TEST_ADMIN_SECRET
Remove-Variable secret
```

200 人壓測只應在確認 Blaze 已開通、預算提醒已設定後執行。

## 活動後清理

活動後建議：

1. 匯出或備份 Google Sheets 報表。
2. 確認 Realtime Database usage。
3. 清理測試 gameId。
4. 關閉不需要的測試頁面。
5. 若短期不再需要大型活動，評估是否保留 Blaze。

## 回復 Spark 維運模式

若不再需要 200 人活動：

1. 保留現有程式。
2. 不部署 Cloud Functions。
3. 第 6 版正式入口維持原設定。
4. 活動規模控制在 50 人左右。
5. 若需變更 Firebase 方案，必須由承辦人於 Firebase Console 手動處理。

## 重要提醒

1. 本文件不會自動開通 Blaze。
2. 本專案不保存信用卡、帳務資料或付款資訊。
3. Codex 不應代替承辦人開通付費方案。
4. 未經明確確認，不執行 `firebase deploy --only functions`。
5. 未經明確確認，不更改 Firebase 專案的帳務方案。
