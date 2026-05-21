# GAS 說明

Google Apps Script 用於連接 Google Sheets 與前端。第 1 版因 Firebase 免費方案不能部署 Cloud Functions，GAS 改為主要後端判斷層。

## GAS 功能

1. 從 Google Sheets 讀取題庫。
2. 驗證題庫欄位。
3. 提供 GAS Web App API。
4. 處理學員報到與自動分隊。
5. 處理講師開題與關題。
6. 處理學員作答，防止同一人同一題重複作答。
7. 關題關閉後依正確答案與作答秒數計算基本分。
8. 活動結束後從 Google Sheets 匯出：
   - 作答紀錄
   - 戰隊成績
   - 個人成績
   - 得獎名單

## 必要 Script Properties

| Key | 說明 |
|---|---|
| GAME_ID | 預設場次 ID |
| ADMIN_API_SECRET | 講師端管理操作密鑰，不可寫在程式碼中 |

## Web App API

GAS Web App 接收 `POST` JSON：

```json
{
  "action": "joinGame",
  "data": {
    "nickname": "測試學員"
  }
}
```

目前支援 action：

1. `joinGame`
2. `getGameState`
3. `submitAnswer`
4. `createGame`
5. `openQuestion`
6. `closeAndScoreQuestion`
7. `recalculateScoreboard`

其中管理操作必須帶：

```json
{
  "adminSecret": "Script Properties 內設定的 ADMIN_API_SECRET"
}
```

## 免費方案架構限制

1. 不部署 Cloud Functions。
2. Firebase Hosting 只提供前端靜態頁面。
3. Firebase Firestore / Realtime Database 保留供未來同步或展示使用。
4. 第 1 版主要資料儲存在 Google Sheets。
5. GAS Web App 有執行時間限制，不適合高頻即時遊戲邏輯；本案 200 人、9 至 11 題可先採保守流程。
6. Firebase Hosting 前端預設使用 JSONP 呼叫 GAS Web App，以降低 CORS 阻擋風險。
7. JSONP 會把請求內容放在網址參數中，不可傳送帳密、Token、身分證字號或完整姓名。

## 注意

正式環境不得將 `ADMIN_API_SECRET`、帳密、Token 或個資寫在程式碼中。
