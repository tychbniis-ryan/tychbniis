# GitHub 登入與連結設定

## 1. 目前狀態

本機專案位置：

```text
d:\GAS\GitHub
```

目前已完成：

1. Git repository 已建立。
2. 分支已使用 `main`。
3. 靜態網站已可在本機測試。
4. 尚未設定 GitHub remote。
5. 尚未推送到 GitHub。

## 2. 需要先準備的資訊

請先在 GitHub 建立一個 repository，並取得 HTTPS 網址。

網址格式：

```text
https://github.com/你的帳號/repository名稱.git
```

範例：

```text
https://github.com/example-account/github-website.git
```

## 3. GitHub 登入方式

### 3.1 建議方式：使用 Git Credential Manager

Windows 版 Git 通常會內建 Git Credential Manager。

當第一次執行 `git push` 時，系統會跳出 GitHub 登入視窗。

請依序操作：

1. 點選 GitHub 登入。
2. 使用瀏覽器登入 GitHub。
3. 若有雙因素驗證，依 GitHub 畫面完成驗證。
4. 授權 Git 存取 GitHub。
5. 回到 PowerShell 或批次檔視窗，等待推送完成。

注意：

1. 不要把密碼貼進任何專案檔案。
2. 不要把 Personal Access Token 存到 `.txt`、`.md`、`.json` 或程式碼中。
3. 若 GitHub 顯示授權畫面，以 GitHub 官方頁面為準。

### 3.2 不建議方式：手動保存 Token

不建議把 Token 寫進：

1. `README.md`
2. `.env`
3. Python 檔案
4. JavaScript 檔案
5. 批次檔

原因：這會讓 Token 進入版本紀錄，形成資安風險。

## 4. 使用輔助工具設定 remote 並推送

請在檔案總管雙擊：

```text
d:\GAS\GitHub\tools\connect_github_and_push.bat
```

執行後請貼上 GitHub repository HTTPS 網址。

工具會做以下事情：

1. 檢查輸入的網址格式。
2. 檢查目前是否有未提交變更。
3. 設定 Git branch 為 `main`。
4. 設定或更新 `origin` remote。
5. 執行 `git push -u origin main`。
6. 顯示預期 GitHub Pages 網址。

## 5. 手動指令

如果不用輔助工具，也可以手動執行：

```powershell
cd d:\GAS\GitHub
git remote add origin https://github.com/你的帳號/repository名稱.git
git branch -M main
git push -u origin main
```

如果已經設定過 remote，需要改網址：

```powershell
cd d:\GAS\GitHub
git remote set-url origin https://github.com/你的帳號/repository名稱.git
git push -u origin main
```

## 6. 啟用 GitHub Pages

推送完成後，請到 GitHub repository：

1. 點選 `Settings`。
2. 點選 `Pages`。
3. Source 選擇 `Deploy from a branch`。
4. Branch 選擇 `main`。
5. Folder 選擇 `/root`。
6. 儲存設定。

## 7. 網站網址

啟用 GitHub Pages 後，網址通常為：

```text
https://你的帳號.github.io/repository名稱/
```

範例：

```text
https://example-account.github.io/github-website/
```

## 8. 常見錯誤

### 8.1 登入失敗

Status：推送失敗。

Root Cause：GitHub 尚未登入、帳號權限不足，或瀏覽器授權未完成。

Suggested Fix：

1. 重新執行 `tools\connect_github_and_push.bat`。
2. 依 GitHub 官方登入視窗完成登入。
3. 確認目前帳號有該 repository 的寫入權限。

### 8.2 Repository 不存在

Status：推送失敗。

Root Cause：GitHub repository 尚未建立，或網址打錯。

Suggested Fix：

1. 到 GitHub 確認 repository 已建立。
2. 複製 GitHub 顯示的 HTTPS 網址。
3. 重新執行 `tools\connect_github_and_push.bat`。

### 8.3 GitHub Pages 沒有網址

Status：網站尚未公開。

Root Cause：GitHub Pages 尚未啟用，或部署尚未完成。

Suggested Fix：

1. 到 `Settings > Pages` 確認設定。
2. 等待 GitHub 部署完成。
3. 重新整理 GitHub Pages 頁面。
