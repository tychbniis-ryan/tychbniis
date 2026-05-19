# AI 交接文件

## 1. 專案概要

專案名稱：`GitHub`

專案位置：

```text
d:\GAS\GitHub
```

專案目的：

1. 建立一個可放到 GitHub 的靜態網站。
2. 測試本機網站、Git 版本紀錄與 GitHub 連結流程。
3. 保留清楚文件，讓承辦人與後續 AI 可接手維護。

## 2. 專案架構

```text
GitHub/
  index.html
  CHANGELOG.md
  README.md
  .gitignore
  assets/
    css/
      style.css
    js/
      main.js
  app/
    config/
      modules.json
    modules/
      website/
        README.md
        runner.py
        version.py
  docs/
    AI_HANDOVER.md
    GITHUB_PAGES_SETUP.md
    GITHUB_LOGIN_AND_REMOTE_SETUP.md
  tools/
    start_local_site.bat
    connect_github_and_push.bat
    connect_github_and_push.ps1
```

## 3. 功能總覽

| 功能 | 說明 | 主要檔案 |
| --- | --- | --- |
| 靜態網站首頁 | 提供 GitHub 網站專案首頁 | `index.html` |
| 網站樣式 | 控制版面、顏色、響應式顯示 | `assets/css/style.css` |
| 網站互動 | 保留最小互動腳本 | `assets/js/main.js` |
| GitHub Pages 文件 | 說明如何推送與發布 | `docs/GITHUB_PAGES_SETUP.md` |
| GitHub 登入文件 | 說明登入、remote 設定與 Pages 啟用 | `docs/GITHUB_LOGIN_AND_REMOTE_SETUP.md` |
| 專案檢查 | 檢查必要檔案是否存在 | `app/modules/website/runner.py` |
| 連結輔助工具 | 協助設定 GitHub remote 並 push | `tools/connect_github_and_push.bat` |

## 4. 模組規範

目前只有一個模組：

```text
app/modules/website
```

模組檔案：

1. `README.md`：說明模組用途。
2. `version.py`：紀錄模組版本。
3. `runner.py`：提供基本檔案檢查。

## 5. UI 運作方式

1. UI 是純靜態 HTML。
2. `index.html` 負責內容結構。
3. `assets/css/style.css` 負責畫面樣式。
4. `assets/js/main.js` 只做低風險輔助互動。
5. 不連接帳密、Token、Cookie 或內部系統。

## 6. modules.json 說明

位置：

```text
app/config/modules.json
```

用途：

1. 記錄目前專案有哪些模組。
2. 保留模組名稱、入口檔與版本。
3. 方便後續 AI 判斷專案邊界。

## 7. module_loader 說明

本專案目前沒有 `module_loader`。

原因：

1. 這是靜態網站專案。
2. 目前沒有需要動態載入模組的應用程式。
3. 若未來轉為 Python、Flask 或其他工具，再新增 `module_loader`。

## 8. task_runner 說明

本專案目前沒有集中式 `task_runner`。

目前檢查方式：

```powershell
cd d:\GAS\GitHub
py app\modules\website\runner.py
```

## 8.1 GitHub 連結狀態

日期：2026-05-19

目前狀態：

1. 本機 Git repository 已建立。
2. 分支名稱為 `main`。
3. GitHub remote 已設定為 `https://github.com/tychbniis-ryan/tychbniis.git`。
4. 本機未安裝 GitHub CLI `gh`。
5. 遠端 repository 原本已有 GitHub 初始 `README.md` commit，已使用 merge 保留遠端歷史。
6. 預期 GitHub Pages 網址為 `https://tychbniis-ryan.github.io/tychbniis/`。
7. GitHub Pages 是否已啟用，仍需到 GitHub repository 的 `Settings > Pages` 確認。

## 8.2 輔助工具說明

本專案提供兩個批次檔：

1. `tools/start_local_site.bat`：啟動本機測試網站，網址為 `http://127.0.0.1:8000/`。
2. `tools/connect_github_and_push.bat`：要求使用者貼上 GitHub repository HTTPS 網址，設定 remote 後推送到 GitHub。

資安原則：

1. 工具不保存帳號。
2. 工具不保存密碼。
3. 工具不保存 Token。
4. GitHub 登入應交由 Git Credential Manager 或 GitHub 官方登入流程處理。

## 9. 版本控制規則

每次修改時至少更新：

1. `CHANGELOG.md`
2. `docs/AI_HANDOVER.md`
3. `app/modules/website/version.py`

Commit message 格式：

```text
[GitHub網站] 類型：變更摘要
```

類型範例：

1. `feat`：新增功能。
2. `fix`：修正錯誤。
3. `docs`：文件更新。
4. `chore`：維護性調整。

## 10. 新增功能流程

1. 先確認功能用途與是否需要放在網站中。
2. 優先小範圍修改，不重寫整個網站。
3. 若只是修改內容，優先改 `index.html`。
4. 若只是修改外觀，優先改 `assets/css/style.css`。
5. 若新增互動，才修改 `assets/js/main.js`。
6. 更新 `CHANGELOG.md`。
7. 更新 `docs/AI_HANDOVER.md`。
8. 更新 `app/modules/website/version.py`。
9. 執行 `runner.py` 檢查。
10. 建立 Git commit。

## 11. 修改功能流程

1. 先閱讀本文件。
2. 閱讀 `README.md`。
3. 閱讀 `app/modules/website/README.md`。
4. 閱讀 `app/modules/website/version.py`。
5. 閱讀 `app/modules/website/runner.py`。
6. 找出最小修改範圍。
7. 不刪除原始檔。
8. 修改後執行檢查。
9. 更新版本與文件。
10. 建立 Git commit。

## 12. 常見錯誤處理

### 12.1 GitHub Pages 顯示 404

Status：網站未正確發布。

Root Cause：GitHub Pages 尚未啟用、分支選錯，或 `index.html` 不在 repository 根目錄。

Suggested Fix：

1. 確認 GitHub Pages 使用 `main` 分支。
2. 確認 Folder 選擇 `/root`。
3. 確認 `index.html` 在 repository 根目錄。

### 12.2 樣式沒有載入

Status：網站可開啟，但畫面異常。

Root Cause：CSS 路徑錯誤或檔案未推送。

Suggested Fix：

1. 確認 `assets/css/style.css` 存在。
2. 確認 `index.html` 內路徑為 `assets/css/style.css`。
3. 重新執行 `git status` 與 `git push`。

### 12.3 誤放敏感資料

Status：資安風險。

Root Cause：帳密、Token、Cookie、個資或內部資料被放進專案。

Suggested Fix：

1. 立即移除敏感資料。
2. 若已推送到 GitHub，立即停用或重設相關 Token 與密碼。
3. 請資訊人員協助檢查 Git 紀錄。

## 13. 最近一次修改摘要

日期：2026-05-19

修改內容：

1. 設定 GitHub remote 為 `https://github.com/tychbniis-ryan/tychbniis.git`。
2. 合併遠端 repository 初始 commit。
3. 記錄預期 GitHub Pages 網址。
4. 網站模組版本更新為 `0.1.3`。
