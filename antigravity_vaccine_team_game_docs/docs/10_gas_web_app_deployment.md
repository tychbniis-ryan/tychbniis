# 10 GAS Web App 部署流程

## 目的

第 1 版固定使用免費方案，不部署 Firebase Cloud Functions。GAS Web App 負責後端判斷，Google Sheets 作為主要資料庫。

## 部署步驟

1. 建立 Google Sheets。
2. 建立工作表：
   - `題庫`
   - `場次設定`
   - `戰隊設定`
3. 開啟 Google Sheets 上方選單：

```text
擴充功能 → Apps Script
```

4. 將 `gas/Code.gs` 貼入 Apps Script。
5. 設定 Script Properties：

| Key | Value |
|---|---|
| `GAME_ID` | 例如 `game_20260521_vaccine_training` |
| `ADMIN_API_SECRET` | 自行設定一組管理密鑰，不可公開 |

6. 在 Apps Script 中執行 `setupGameSheets`。
7. 部署 Web App：

```text
部署 → 新增部署作業 → 類型選 Web 應用程式
```

建議設定：

| 項目 | 設定 |
|---|---|
| 執行身分 | 我 |
| 存取權 | 任何知道連結的人 |

8. 複製 Web App URL。

## 前端設定

將 Web App URL 填入：

1. `frontend/student/dist/config.js`
2. `frontend/instructor/dist/config.js`

範例：

```js
window.VACCINE_GAME_CONFIG = {
  gameId: "game_20260521_vaccine_training",
  gasWebAppUrl: "https://script.google.com/macros/s/部署ID/exec",
  apiMode: "gas"
};
```

## 講師端管理密鑰

講師端不會把 `ADMIN_API_SECRET` 寫入程式。活動時由講師在講師端頁面輸入，資料只保留在目前瀏覽器工作階段。

## 測試順序

1. 開啟講師端。
2. 填入 GAS Web App URL。
3. 填入管理密鑰。
4. 按「啟動」。
5. 開放題目 ID，例如 `q001`。
6. 開啟學員端報到。
7. 學員送出答案。
8. 講師關閉題目並計分。
9. 回到 Google Sheets 查看：
   - `玩家`
   - `作答紀錄`
   - `排行榜`

## 風險

1. Firebase Hosting 直接呼叫 GAS Web App 可能遇到 CORS 限制。
2. 若 CORS 阻擋 JSON POST，改用 GAS HTML 頁面、表單提交或 Firebase 中繼資料層。
3. GAS 有執行時間與併發限制，不適合秒級高頻互動。
4. 第 1 版建議採「學員送出答案，講師關題後批次計分」。

