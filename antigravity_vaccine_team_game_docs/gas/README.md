# GAS 說明

Google Apps Script 用於連接 Google Sheets 與 Firebase。

## GAS 功能

1. 從 Google Sheets 讀取題庫。
2. 驗證題庫欄位。
3. 將題庫同步至 Firebase。
4. 同步場次設定與戰隊設定。
5. 活動結束後從 Firebase 匯出：
   - 作答紀錄
   - 戰隊成績
   - 個人成績
   - 道具紀錄
   - 得獎名單

## 必要 Script Properties

| Key | 說明 |
|---|---|
| FIREBASE_PROJECT_ID | Firebase project id |
| FIREBASE_API_KEY | Firebase Web API key |
| FIREBASE_DATABASE_URL | Realtime Database URL |
| FIREBASE_SERVICE_ACCOUNT | 若使用服務帳戶，存放 JSON 字串或改用安全部署方式 |
| GAME_ID | 預設場次 ID |

## 注意

正式環境不建議將敏感金鑰直接寫在程式碼中。
