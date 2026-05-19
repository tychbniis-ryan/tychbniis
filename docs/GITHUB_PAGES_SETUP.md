# GitHub Pages 發布步驟

## 1. 前提

1. 已有 GitHub 帳號。
2. 電腦已安裝 Git。
3. 本專案位於：

```text
d:\GAS\GitHub
```

## 2. 建立 GitHub repository

1. 登入 GitHub。
2. 點選 `New repository`。
3. Repository 名稱建議使用：

```text
github-website
```

4. Visibility 可依需求選擇 `Public` 或 `Private`。
5. 不要勾選自動建立 `README.md`，因為本機專案已經有 README。

## 3. 本機連結 GitHub

請把下方網址替換成自己的 GitHub repository 網址：

```powershell
cd d:\GAS\GitHub
git remote add origin https://github.com/你的帳號/github-website.git
git branch -M main
git push -u origin main
```

## 4. 啟用 GitHub Pages

1. 進入 GitHub repository。
2. 點選 `Settings`。
3. 點選 `Pages`。
4. Source 選擇 `Deploy from a branch`。
5. Branch 選擇 `main`。
6. Folder 選擇 `/root`。
7. 儲存設定。

## 5. 發布後網址

GitHub Pages 完成部署後，網址格式通常為：

```text
https://你的帳號.github.io/github-website/
```

## 6. 常見問題

### 6.1 網站沒有更新

請確認：

1. 是否已執行 `git push`。
2. GitHub Pages 是否選到 `main` 分支。
3. GitHub Actions 或 Pages 部署是否完成。

### 6.2 推送時要求登入

請使用 GitHub 官方登入流程、GitHub CLI，或 Personal Access Token。Token 不可寫入本專案檔案。

### 6.3 不小心提交敏感資料

Status：高風險。

Root Cause：敏感資料被納入 Git 版本紀錄。

Suggested Fix：

1. 立即停止推送。
2. 刪除敏感資料。
3. 重新產生已外洩的 Token 或密碼。
4. 必要時請資訊人員協助清理 Git 紀錄。
