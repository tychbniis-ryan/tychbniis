# GAS 說明

Google Apps Script 用於連接 Google Sheets 與前端。第 1 版因 Firebase 免費方案不能部署 Cloud Functions，GAS 改為主要後端判斷層。

## GAS 功能

1. 從 Google Sheets 讀取題庫。
2. 驗證題庫欄位。
3. 提供 GAS Web App API。
4. 處理學員報到與自動分隊。
5. 提供目前開放題目給學員端，不回傳正確答案；學員端需依講師口令手動翻開試卷取得題目。
6. 處理講師開題與關題。
7. 處理學員作答，防止同一人同一題重複作答。
8. 記錄學員翻開試卷時間，作為作答秒數的計時起點。
9. 問題關閉後依正確答案與作答秒數計算基本分，並給該題第一位答對者 5 分獎勵。
10. 選擇性同步公開 `gameState` 到 Firebase Realtime Database。
11. 活動結束後從 Google Sheets 匯出：
   - 作答紀錄
   - 戰隊成績
   - 個人成績
   - 得獎名單

## 必要 Script Properties

| Key | 說明 |
|---|---|
| GAME_ID | 預設場次 ID |
| ADMIN_API_SECRET | 講師端管理操作密鑰，不可寫在程式碼中 |
| SPREADSHEET_ID | 獨立 Apps Script 專案必填；Google Sheets 網址 `/d/` 後面的試算表 ID |
| FIREBASE_DATABASE_URL | 選填，Realtime Database URL，用於同步公開 `gameState` |
| FIREBASE_DATABASE_AUTH_TOKEN | 選填，GAS 寫入 Realtime Database 使用，不可寫在程式碼中 |

若 Apps Script 是從 Google Sheets 的「擴充功能 → Apps Script」開啟，通常可不填 `SPREADSHEET_ID`。若是從 Apps Script 首頁建立的獨立專案，必須設定 `SPREADSHEET_ID`，否則 GAS 找不到資料試算表。

## 目前 Apps Script 專案

```text
scriptId: 1qNXWMJSxywJcdpjwgJqvfleqzGm24P9B3i6_vJwLhmF1YMygzWShZcah
deploymentId: AKfycbzNwOMX31ZnbThZoyf7fHohGtPmXXRabpzeFoDcS8EnXNPoxfL3eY4ib54nOt_cLFo0
Web App URL: https://script.google.com/macros/s/AKfycbzNwOMX31ZnbThZoyf7fHohGtPmXXRabpzeFoDcS8EnXNPoxfL3eY4ib54nOt_cLFo0/exec
```

注意：上述 Web App URL 目前測試回傳 `403 需要存取權`，需在 Apps Script 部署設定中確認「誰可以存取」為「任何人」或「任何知道連結的人」，且部署類型為「網頁應用程式」。

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
3. `getCurrentQuestion`
4. `submitAnswer`
5. `createGame`
6. `openQuestion`
7. `closeAndScoreQuestion`
8. `recalculateScoreboard`

`getCurrentQuestion` 僅回傳題目 ID、題幹、選項、時間限制與題型旗標，不回傳 `correctAnswer` 與 `explanation`。
學員端呼叫 `getCurrentQuestion` 時會帶 `playerId`，GAS 會在 `試卷開啟紀錄` 記錄伺服端時間。`submitAnswer` 的 `responseSeconds` 使用「送出時間 - 試卷開啟時間」計算，不使用手機本機時間。

## 計分規則

1. `baseScore`：答對才有基本分，依 `responseSeconds` 落在 `SCORE_BUCKETS` 的區間計算。
2. `firstCorrectBonus`：每題第一位「提交且答對」的學員加 5 分。
3. `score`：`baseScore + firstCorrectBonus`。
4. 已計分的作答紀錄不會重複計分，避免講師重按關題造成分數重複累加。

## Firebase gameState 同步

GAS 仍是第 1 版可信任後端。當 `createGame`、`openQuestion`、`closeAndScoreQuestion` 執行時，系統會嘗試同步公開 `gameState/{gameId}` 到 Firebase Realtime Database。

若未設定 `FIREBASE_DATABASE_URL` 或 `FIREBASE_DATABASE_AUTH_TOKEN`，同步會自動略過，不影響 GAS 與 Google Sheets 主流程。

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
8. 學員端不自動輪詢 `getCurrentQuestion`。此設計避免不同裝置自動更新時間不同，影響競賽公平性。

## 注意

正式環境不得將 `ADMIN_API_SECRET`、帳密、Token 或個資寫在程式碼中。

