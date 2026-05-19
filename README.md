# GitHub 網站專案

## 1. 專案用途

本專案是 `d:\GAS\GitHub` 底下的獨立靜態網站專案，用途是：

1. 建立一個可放上 GitHub 的網站。
2. 測試本機網站、Git 版本紀錄與 GitHub 連結流程。
3. 保留清楚的交接文件，方便後續由承辦人或 AI 接手維護。

## 2. 專案內容

| 路徑 | 用途 |
| --- | --- |
| `index.html` | 網站首頁，GitHub Pages 預設讀取此檔案 |
| `assets/css/style.css` | 網站樣式 |
| `assets/js/main.js` | 網站互動功能 |
| `docs/AI_HANDOVER.md` | 給下一位維護者或 AI 的交接文件 |
| `docs/GITHUB_PAGES_SETUP.md` | GitHub Pages 發布步驟 |
| `docs/GITHUB_LOGIN_AND_REMOTE_SETUP.md` | GitHub 登入與連結設定 |
| `app/config/modules.json` | 專案模組設定紀錄 |
| `app/modules/website/` | 網站模組說明與檢查腳本 |
| `CHANGELOG.md` | 版本變更紀錄 |

## 3. 使用方式

### 3.1 本機開啟網站

方式一：直接用瀏覽器開啟：

```text
d:\GAS\GitHub\index.html
```

方式二：啟動本機靜態網站伺服器後，用瀏覽器開啟：

```text
http://127.0.0.1:8000/
```

### 3.2 執行檢查

如果電腦有安裝 Python，可以在 PowerShell 執行：

```powershell
cd d:\GAS\GitHub
py app\modules\website\runner.py
```

成功時會顯示：

```text
網站專案檢查完成
```

## 4. 發布到 GitHub Pages

目前狀態：

1. 本機 Git repository 已建立。
2. GitHub remote 尚未設定。
3. 本機尚未安裝 GitHub CLI `gh`。

請參考：

```text
docs/GITHUB_PAGES_SETUP.md
docs/GITHUB_LOGIN_AND_REMOTE_SETUP.md
```

### 4.1 輔助工具

啟動本機測試網站：

```text
tools\start_local_site.bat
```

連結 GitHub 並推送：

```text
tools\connect_github_and_push.bat
```

使用 `connect_github_and_push.bat` 前，請先在 GitHub 建立 repository，並準備好 HTTPS 網址。

## 5. 資安注意事項

1. 不要把帳號、密碼、Token、Cookie、憑證寫進本專案。
2. 不要把含有個資的 Excel、CSV 或截圖放進 repository。
3. 若需要連接 GitHub，請使用 GitHub 官方 Personal Access Token 或 GitHub CLI，且 Token 不得提交到 Git。

## 6. 還原方式

若本專案尚未推送到 GitHub，刪除整個資料夾即可還原：

```text
d:\GAS\GitHub
```

若已推送到 GitHub，還需要到 GitHub 網站刪除或封存遠端 repository。
