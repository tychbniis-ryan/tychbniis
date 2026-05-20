# 02 GitHub、Firebase、GAS 三方架構

## 架構圖

```text
GitHub
  ├── 程式碼版本管理
  ├── 文件管理
  ├── GitHub Issues
  └── 部署紀錄

Google Sheets
  ├── 場次設定
  ├── 題庫
  ├── 戰隊設定
  └── 賽後報表
        │
        ▼
Google Apps Script
  ├── syncQuestionsToFirebase()
  ├── syncGameSettingsToFirebase()
  ├── exportResultsFromFirebase()
  └── generateReportSheets()
        │
        ▼
Firebase
  ├── Hosting
  │   ├── student app
  │   └── instructor dashboard
  ├── Authentication
  ├── Firestore
  ├── Realtime Database
  └── Cloud Functions
```

## GitHub 職責

- 儲存前端程式碼。
- 儲存 Cloud Functions 程式碼。
- 儲存 GAS 程式碼。
- 儲存 Firebase rules。
- 儲存系統文件。
- 管理 Issue、版本與部署。

## Firebase 職責

- 提供學員端與講師端網頁。
- 提供匿名登入。
- 儲存遊戲資料。
- 維持遊戲即時狀態。
- 處理可信任後端邏輯。

## GAS / Google Sheets 職責

- 由使用者在 Google Sheets 設計題庫。
- GAS 讀取題庫並同步到 Firebase。
- GAS 從 Firebase 匯出作答紀錄、排行榜、得獎名單。
- Google Sheets 作為講師與承辦人員最容易維護的管理界面。

## 核心資料流

### 題庫同步

```text
使用者填寫 Google Sheets 題庫
→ GAS 驗證欄位
→ 產生 publicQuestions 與 answerKey
→ 寫入 Firebase
→ 講師端讀取題庫列表
```

### 作答與結算

```text
講師開題
→ Firebase 更新 gameState
→ 學員端顯示題目
→ 學員送出答案
→ Cloud Functions 寫入 answers
→ 講師關題
→ Cloud Functions 批次計分
→ 更新 players / teams / scoreboards
```

### 賽後匯出

```text
講師按匯出
→ GAS 讀取 Firebase
→ 寫入 Google Sheets 報表
→ 產出作答紀錄、戰隊成績、個人成績、得獎名單
```
