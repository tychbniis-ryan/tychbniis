# 11 第 2 版工作路線圖

## 2026-05-22 第 2 版定版結論

Status：第 2 版定版完成。  
Root Cause：第 2 版已完成資料初始化、3 題預設題、公開題庫快取、學員報到與自動分隊、自由選隊控制、作答確認、倒數、關題後給分、排行榜與講師投影控制台。  
Suggested Fix：後續不再以第 2 版開發名義新增功能；若有新需求，請另開第 3 版或維護版，並先完成本機測試再部署。

第 2 版定版版本：`0.2.11`

正式架構：

1. Firebase Hosting：學員端與講師端靜態頁面。
2. Firebase Realtime Database：只保存公開 `gameState` 與公開 `publicQuestions` 快取，不保存正確答案、正式作答紀錄或管理密碼。
3. GAS / Google Sheets：正式資料來源，負責報到、翻卷、作答、關題、計分與排行榜。
4. Cloud Functions：免費方案暫停，不納入第 2 版正式架構。

正式活動前檢查：

1. 講師端輸入管理密碼並套用設定。
2. 講師端按「初始化遊戲資料」清除測試資料。
3. 確認題庫、戰隊設定與場次設定。
4. 按「啟動場次」後確認公開題庫同步完成。
5. 請學員使用可區分暱稱，避免同名學員被合併。
6. 活動中若要重來，使用講師端初始化按鈕，不直接改 Google Sheets。

## 2026-05-21 第 2 版本次更新

### 已完成

1. 資料初始化：
   - GAS 新增 `resetGameData` 管理 API。
   - 講師端新增「初始化遊戲資料」按鈕。
   - 清空範圍為玩家、作答、翻卷、排行榜與場次狀態。
   - 保留題庫、場次設定與戰隊設定。
2. 預設題目：
   - 預設測試題由 1 題增加為 3 題。
   - 題目 ID 為 `demo_q001`、`demo_q002`、`demo_q003`。
3. 讀取速度：
   - GAS 快取 Firebase service account access token。
   - GAS 快取玩家資料、翻卷時間與重複作答檢查結果。
   - 學員端快取 Firebase 公開題庫 10 分鐘。
4. 低 token 工作流：
   - 已寫入 `data/game_config.example.json`、`gas/README.md`、`docs/AI_HANDOVER.md`。
   - 固定要求先本機測試，使用者確認後才推送雲端。

### 雲端部署狀態

Status：已完成最小雲端部署。  
Root Cause：本機測試通過後，依使用者要求再推送至雲端伺服器。  
Suggested Fix：後續若再修改，仍需先本機測試，再只部署必要範圍。

### 本機測試紀錄

1. GAS 暫存語法檢查：通過。
2. 前端 JavaScript 語法檢查：通過。
3. JSON 設定檔解析：通過。
4. `npm run check:functions`：通過。
5. 本機靜態伺服器：
   - 學員端 `http://localhost:5173` 回應 `200`。
   - 講師端 `http://localhost:5174` 回應 `200`。
6. 線上檢查：
   - 學員端 `https://tychbniis-32af5-student.web.app` 回應 `200`。
   - 講師端 `https://tychbniis-32af5-instructor.web.app` 回應 `200`。
   - 講師端 HTML 已包含「初始化遊戲資料」按鈕。
   - GAS Web App `getGameState` 回應 `200`。

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

已完成：

1. GAS 加入 Script Cache。
2. 題庫快取 300 秒。
3. 場次狀態快取 300 秒。
4. 工作表初始化狀態快取 300 秒。
5. 公開題庫同步到 Firebase `publicQuestions/{gameId}`。
6. 學員端啟動時預載公開題庫。
7. 學員端翻開試卷時優先使用 Firebase 題目快取，GAS 只記錄翻卷時間。

初步測試：

1. `getCurrentQuestion` 約 2.3 秒。
2. `joinGame` 約 2.4 秒。
3. `openQuestion` 約 17.5 秒。
4. 開題較慢的主因是同時寫 Google Sheets、產生 Firebase service account token、寫入 Realtime Database。

後續若進入第 3 版可再評估：

1. 實測 200 人同時報到與翻卷的壓力。
2. 評估是否在講師端增加「重新同步公開題庫」按鈕。
3. 減少 `openPaper` 同時寫入 Google Sheets 的延遲，必要時改為批次緩衝或簡化寫入欄位。

### P1：正式活動資料管理

1. 建立正式 `GAME_ID` 命名規則：保留為第 3 版或維護工作。
2. 提供一鍵清除測試資料功能：第 2 版已完成。
3. 提供正式活動前檢查頁：保留為第 3 版或維護工作。
4. 提供題庫匯入與欄位檢查：保留為第 3 版或維護工作。

### P2：排行榜與報表

1. 講師端顯示戰隊排行榜：第 2 版已完成。
2. 講師端顯示個人排行榜：第 2 版已完成。
3. 匯出戰隊成績：保留為第 3 版或維護工作。
4. 匯出個人成績：保留為第 3 版或維護工作。
5. 匯出作答紀錄：保留為第 3 版或維護工作。

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
