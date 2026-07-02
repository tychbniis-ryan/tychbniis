# 流感及新冠疫苗社區設站網站

本專案用於建置「桃園市流感及新冠疫苗接種站」填報與民眾查詢系統。

第一版採用：

1. Google Sheet 作為資料來源。
2. Google Apps Script 作為填報端與 JSON 產生工具。
3. Firebase Hosting 作為民眾端靜態查詢網站。
4. `public/public.json` 作為民眾端唯一公開資料來源。

## 目前完成範圍

已建立第一版可運作骨架：

1. 民眾端查詢頁：`public/index.html`
2. 民眾端樣式：`public/styles.css`
3. 民眾端查詢邏輯：`public/app.js`
4. 公開資料範例：`public/public.json`
5. Firebase Hosting 設定：`firebase.json`
6. GAS 後台程式骨架：`gas/Code.gs`
7. GAS 後台頁面：`gas/Index.html`
8. AI 交接文件：`docs/AI_HANDOVER.md`

## 民眾端功能

1. 讀取 `public.json`。
2. 顯示標題、公告、更新時間。
3. 今日、明日、本週、附近場次快速查詢。
4. 行政區、里別、日期、關鍵字、疫苗篩選。
5. 卡片式顯示接種站資料。
6. 開啟 Google 地圖。
7. 複製地址。
8. 複製場次資訊，方便貼到 LINE。
9. 支援 `siteId`、`district`、`village`、`date`、`keyword` 網址參數。

## GAS 功能骨架

1. 初始化 Google Sheet 工作表。
2. 新增設站資料。
3. 回報接種人數。
4. 發布資料。
5. 下架資料。
6. 產生公開 JSON。
7. 寫入異動紀錄。

## 本機測試

在本資料夾執行：

```powershell
python -m http.server 5173 -d public
```

開啟：

```text
http://localhost:5173
```

若電腦沒有 Python，可直接用 VS Code Live Server 或其他靜態伺服器開啟 `public` 資料夾。

## Firebase 部署

確認已安裝 Firebase CLI 並登入後，在本資料夾執行：

```powershell
firebase deploy --only hosting
```

正式部署前請先確認：

1. `public/public.json` 已由 GAS 產生，且不含內部欄位。
2. 民眾端不顯示醫療院所十碼代碼、預估人數、接種人數、接種率、填報人、內部狀態、宣導品配送資訊。
3. 範例資料已替換為正式公開資料。

## GAS 使用方式

1. 開啟 Google Apps Script 專案。
2. 將 `gas/Code.gs` 貼入或同步為 `Code.gs`。
3. 將 `gas/Index.html` 貼入或同步為 `Index.html`。
4. 第一次執行 `setupWorkbook()` 建立工作表。
5. 部署 Web App 後，填報人員可進入後台新增資料。
6. 使用 `buildPublicJson()` 產生公開 JSON 內容。

## 資安注意事項

1. 不要把管理碼、帳密、Token、Cookie 寫進程式。
2. 管理碼應放在 Google Sheet 的「系統設定」工作表。
3. 民眾端不得讀取 Google Sheet 原始資料。
4. 民眾端不得要求民眾提供姓名、電話、身分證字號或 LINE ID。
5. 定位僅於前端當次排序使用，不儲存、不回寫。

## 還原方式

若本次第一版骨架不符合需求，可刪除下列新增檔案與資料夾：

```text
firebase.json
version.py
README.md
CHANGELOG.md
docs/
gas/
public/
```

若已建立 Git commit，可使用該 commit 前一版還原。

