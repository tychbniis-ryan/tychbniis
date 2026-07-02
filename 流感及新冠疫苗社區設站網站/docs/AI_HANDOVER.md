# AI_HANDOVER.md

## 1. 專案概要

本專案為「流感及新冠疫苗社區設站網站」，目標是讓衛生所或接種站人員填報設站資料，並讓民眾透過公開網站查詢接種站資訊。

系統設計原則：

1. Google Sheet 保存內部資料。
2. Google Apps Script 提供填報端與資料轉換。
3. Firebase Hosting 提供民眾端查詢網站。
4. 民眾端只讀取公開 JSON，不直接讀取 Google Sheet。
5. 不要求民眾登入，不蒐集民眾個資。

## 2. 專案架構

```text
流感及新冠疫苗社區設站網站/
  README.md
  CHANGELOG.md
  version.py
  firebase.json
  docs/
    AI_HANDOVER.md
  gas/
    Code.gs
    Index.html
  public/
    index.html
    styles.css
    app.js
    public.json
  docs/
    PUBLIC_JSON_SPEC.md
  *.md 開發文件
```

## 3. 功能總覽

### 3.1 民眾端

位置：`public/`

功能：

1. 讀取 `public.json`。
2. 顯示網站標題、公告、更新時間。
3. 今日、明日、本週、附近場次快速查詢。
4. 行政區、里別、日期、關鍵字、疫苗篩選。
5. 接種站卡片顯示。
6. Google 地圖連結。
7. 複製地址與場次資訊。
8. 支援網址參數：`district`、`village`、`date`、`keyword`、`siteId`。
9. 支援 `source=line` 顯示 LINE 使用提示。
10. 支援 `defaultView` 預設查詢模式。
11. 支援 Web Share API 分享場次；不支援時改為複製。

### 3.2 GAS 填報端

位置：`gas/`

功能骨架：

1. `setupWorkbook()`：建立必要工作表與表頭。
2. `createSite(payload)`：新增設站資料。
3. `updateReport(siteId, report)`：回報接種人數。
4. `publishSite(siteId)`：發布資料。
5. `unpublishSite(siteId)`：下架資料。
6. `buildPublicJson()`：產生民眾端公開 JSON。
7. `createJsonDownloadFile()`：在 Google Drive 建立 `public.json` 下載檔。

## 4. 模組規範

目前尚未採用 `app/modules` 模組化架構。本專案目前為獨立網站專案，分為：

1. `public`：民眾端靜態網站。
2. `gas`：Google Apps Script 填報端。
3. `docs`：AI 交接與維護文件。

後續若導入模組化，需新增 `app/config/modules.json` 並將功能拆分為可載入模組。

## 5. UI 運作方式

民眾端為單頁式靜態網站。

流程：

1. `index.html` 載入 `styles.css` 與 `app.js`。
2. `app.js` 讀取 `public.json`。
3. 依使用者選擇的條件篩選資料。
4. 將接種站資料渲染為卡片。
5. 地圖按鈕使用 `mapUrl`，若空白則用地址產生 Google Maps 搜尋連結。

民眾端不得顯示：

1. 醫療院所十碼代碼。
2. 預估人數。
3. 接種人數。
4. 接種率。
5. 填報人。
6. 內部狀態。
7. 宣導品配送資訊。

## 6. `modules.json` 說明

目前未建立 `app/config/modules.json`。

原因：此專案目前不是既有 Python 模組載入式工具，而是 Firebase 靜態網站與 GAS 專案。

若未來整合到統一工具平台，建議新增：

```text
app/config/modules.json
app/modules/vaccine_site/
```

## 7. `module_loader` 說明

目前無 `module_loader`。

## 8. `task_runner` 說明

目前無 `task_runner`。

本機測試使用靜態伺服器即可：

```powershell
python -m http.server 5173 -d public
```

## 9. 版本控制規則

Commit message 格式：

```text
[流感及新冠疫苗社區設站網站] 類型：變更摘要
```

類型：

1. `feat`：新增功能。
2. `fix`：修正錯誤。
3. `refactor`：重構。
4. `docs`：文件更新。
5. `chore`：維護性調整。
6. `test`：測試相關。

## 10. 新增功能流程

1. 先讀取本檔、README、CHANGELOG 與 4 份開發文件。
2. 確認新增功能屬於民眾端、GAS 填報端或文件。
3. 只修改對應資料夾。
4. 不將帳密、Token、管理碼寫進程式。
5. 更新 `version.py`、`CHANGELOG.md`、本檔。
6. 執行本機測試。
7. 建立 Git commit。

## 11. 修改功能流程

1. 先確認目前是否有未提交修改。
2. 閱讀相關檔案。
3. 修改前先輸出修改前檢查。
4. 小範圍修改，不重寫整個專案。
5. 修改後測試。
6. 更新版本與文件。
7. 說明還原方式。

## 12. 常見錯誤處理

### 12.1 `public.json` 讀取失敗

可能原因：

1. 沒有透過靜態伺服器開啟。
2. `public.json` 格式錯誤。
3. 檔案路徑錯誤。

測試方式：

```powershell
python -m http.server 5173 -d public
```

開啟 `http://localhost:5173/public.json`，確認 JSON 可讀取。

### 12.2 GAS 初始化失敗

可能原因：

1. 未綁定 Google Sheet。
2. Apps Script 權限尚未授權。
3. 工作表名稱被手動更改。

處理方式：

1. 先執行 `setupWorkbook()`。
2. 確認 Apps Script 已授權試算表存取權。
3. 不要刪除或更名必要工作表。

### 12.3 民眾端查不到資料

確認：

1. `public.json` 的 `data` 是否有資料。
2. 每筆資料是否有 `date`。
3. 篩選條件是否清除。
4. 正式 JSON 是否只輸出 `是否公開 = 是` 且 `資料狀態 = 已發布` 的資料。

## 13. 最近一次修改摘要

日期：2026-07-02

本次建立並補強第一版可運作骨架：

1. 新增 Firebase 靜態民眾查詢網站。
2. 新增公開 JSON 範例。
3. 新增 GAS 後台與資料轉換骨架。
4. 新增 README、CHANGELOG、version.py。
5. 建立本 AI 交接文件。
6. 補強 GAS 後台第一版主要功能：新增、維護、回報、查詢、稽催、宣導品、廠商回報、匯出、本機暫存。
7. 補強民眾端第一版細節：`defaultView`、`source=line`、分享場次、查無資料下一步、今日已結束排序。
8. 新增 `docs/PUBLIC_JSON_SPEC.md`。

## 14. 目前第一版功能狀態

### 已具備程式骨架

1. 新增、維護、回報、查詢。
2. 發布、鎖定、下架。
3. 申請解鎖、管理者審核解鎖。
4. 稽催／統計與 LINE 文字產生。
5. 宣導品申請欄位、宣導品品項表初始化。
6. 發布時自動產生接種站宣導品配送任務。
7. 非接種站宣導品配送任務新增。
8. 廠商查詢碼與配送回報。
9. 異動紀錄。
10. 本機暫存。
11. 整批上傳後端函式，上限 100 筆。
12. 管理功能管理碼讀取自「系統設定」工作表。
13. 簡易通知單 CSV 匯出。

### 尚需實機驗證

以下功能需在 Google Apps Script 測試專案中驗證：

1. `setupWorkbook()` 是否正確建立工作表。
2. `createSite()` 是否正確寫入 Google Sheet。
3. `publishSite()` 是否正確發布並產生配送任務。
4. `buildPublicJson()` 產生之 JSON 是否可放入 Firebase 前台。
5. 廠商登入與配送回報是否符合實際工作表資料。
6. 管理碼審核解鎖流程。

## 15. 下一步建議

1. 將 GAS 程式貼入正式 Apps Script 測試。
2. 在測試 Google Sheet 執行 `setupWorkbook()`。
3. 使用假資料測試新增、發布、產生 JSON。
4. 將產生的 JSON 放到 `public/public.json`。
5. 進行手機與 LINE 內建瀏覽器測試。
6. 再逐步補齊完整宣導品管理、廠商回報、稽催統計、匯出功能。
