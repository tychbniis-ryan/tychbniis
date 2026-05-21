# 11 第 2 版工作路線圖

## 第 1 版結案標準

第 1 版已完成：

1. 學員端手機版網站。
2. 講師端手機版網站。
3. GAS / Google Sheets 主流程。
4. Firebase Hosting。
5. Firebase Realtime Database `gameState` 公開狀態提示。
6. 報到、開題、翻開試卷、作答、關題計分、排行榜。

## 第 2 版優先順序

### P0：速度最佳化

問題：

1. GAS 每次呼叫都可能讀寫 Google Sheets。
2. Google Sheets 讀取會隨資料量增加而變慢。
3. 學員大量同時翻開試卷時，`getCurrentQuestion` 會成為瓶頸。

已開始處理：

1. GAS 加入 Script Cache。
2. 題庫快取 300 秒。
3. 場次狀態快取 300 秒。
4. 工作表初始化狀態快取 300 秒。

初步測試：

1. `getCurrentQuestion` 約 2.3 秒。
2. `joinGame` 約 2.4 秒。
3. `openQuestion` 約 17.5 秒。
4. 開題較慢的主因是同時寫 Google Sheets、產生 Firebase service account token、寫入 Realtime Database。

下一步：

1. 將公開題目內容同步到 Firebase `gameState.publicQuestion`，讓學員端先從 Firebase 快速顯示題目。
2. GAS 只負責記錄 `paperOpenedAt` 與收作答。
3. 講師端開題時一次完成題目公開與狀態同步。

### P1：正式活動資料管理

1. 建立正式 `GAME_ID` 命名規則。
2. 提供一鍵清除測試資料功能。
3. 提供正式活動前檢查頁。
4. 提供題庫匯入與欄位檢查。

### P2：排行榜與報表

1. 講師端顯示即時戰隊排行榜。
2. 講師端顯示個人滿分名單。
3. 匯出戰隊成績。
4. 匯出個人成績。
5. 匯出作答紀錄。

### P3：遊戲化功能

1. 寶箱掉落。
2. 道具紀錄。
3. 每人最多 3 個寶箱限制。
4. 隊伍平均分。
5. 創意題投票。

### P4：視覺與操作優化

1. 使用 GPT 繪圖產生翻卷、戰隊徽章與按鈕素材。
2. 學員端按鈕視覺美化。
3. 講師端手機操作狀態更明確。
4. QR Code 報到頁。

## 不做事項

1. 第 2 版仍不啟用 Firebase Cloud Functions，除非使用者明確同意改變免費方案限制。
2. 不把正確答案放到前端或 Firebase 公開資料。
3. 不把管理密碼、服務帳戶 private key 或 token 寫入 Git。
4. 不改成學員端自動開題。
