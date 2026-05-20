# 預防接種教育訓練互動戰隊遊戲系統

本專案為 120 分鐘「預防接種教育訓練」使用之互動戰隊遊戲系統，對象為醫事人員，預估 200 人參與，分為 5 個戰隊。

## 第 1 版本機開發

### 1. 安裝 Firebase CLI

```powershell
npm install -g firebase-tools
firebase --version
```

### 2. 啟動學員端

```powershell
npm run dev:student
```

開啟：

```text
http://localhost:5173
```

### 3. 啟動講師端

```powershell
npm run dev:instructor
```

開啟：

```text
http://localhost:5174
```

### 4. 檢查 Cloud Functions

```powershell
cd functions
npm install
npm run build
```

## Firebase 專案綁定

正式部署前，需要先完成：

1. `firebase login`
2. 建立 Firebase project。
3. 啟用 Authentication Anonymous。
4. 建立 Firestore。
5. 建立 Realtime Database。
6. 複製 `.firebaserc.example` 為 `.firebaserc`，填入實際 project ID 與 Hosting site。

## 目前部署網址

Firebase project：`tychbniis-32af5`

| 端點 | 網址 | 狀態 |
|---|---|---|
| 學員端 | https://tychbniis-32af5-student.web.app | 已部署 |
| 講師端 | https://tychbniis-32af5-instructor.web.app | 已部署 |

Realtime Database：

```text
https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app
```

## 尚未完成的 Firebase 設定

以下項目需要在 Firebase Console 完成或確認：

1. Authentication 啟用 Anonymous。
2. Cloud Firestore API 啟用並建立 Firestore Database。
3. 部署 Firestore rules。
4. 部署 Cloud Functions。

## 三方核心架構

本系統正式採用三方連結：

1. **GitHub**
   - 管理程式碼、文件、版本、Issue、部署紀錄。
2. **Firebase**
   - Hosting：學員端與講師端網頁。
   - Authentication：匿名登入。
   - Firestore / Realtime Database：遊戲資料與即時狀態。
   - Cloud Functions：計分、寶箱、道具、成就與獎項判定。
3. **Google Apps Script / Google Sheets**
   - Google Sheets 作為題庫與場次設定來源。
   - GAS 負責將題庫同步至 Firebase，並於賽後匯出成績報表。

## 重要設計原則

- 題庫由使用者在 Google Sheets 設計。
- 學員端不得提前取得正確答案。
- 每人每題只能作答一次。
- 計分、抽寶箱、道具與成就判定由後端執行。
- 幸運獎全場 1 名。
- 全對獎取最快完成且全數答對者 3 名。
- 寶箱最多持有 3 個，超過時自動丟棄最早獲得且未開啟者。
- 創作票選題採隊內初選、講師把關、匿名全體票選。
