$ErrorActionPreference = "Stop"

Write-Host "GitHub 連結與推送工具"
Write-Host ""
Write-Host "請先在 GitHub 建立 repository。"
Write-Host "範例：https://github.com/your-account/github-website.git"
Write-Host ""

$remoteUrl = Read-Host "請貼上 GitHub repository HTTPS 網址"

if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
    Write-Host "Status：連結中止"
    Write-Host "Root Cause：未輸入 GitHub repository 網址"
    Write-Host "Suggested Fix：建立 GitHub repository 後，重新執行本工具"
    exit 1
}

if ($remoteUrl -notmatch "^https://github\.com/.+/.+(\.git)?$") {
    Write-Host "Status：連結中止"
    Write-Host "Root Cause：輸入的網址不是 GitHub HTTPS repository 網址"
    Write-Host "Suggested Fix：請使用格式 https://github.com/帳號/repository.git"
    exit 1
}

$gitStatus = git status --short
if ($LASTEXITCODE -ne 0) {
    Write-Host "Status：連結中止"
    Write-Host "Root Cause：目前資料夾不是可用的 Git repository"
    Write-Host "Suggested Fix：請確認工具位於 d:\GAS\GitHub 內執行"
    exit 1
}

if ($gitStatus) {
    Write-Host "Status：連結中止"
    Write-Host "Root Cause：目前有尚未提交的變更"
    Write-Host "Suggested Fix：請先建立 commit，再重新執行本工具"
    git status --short
    exit 1
}

git branch -M main

$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    git remote set-url origin $remoteUrl
} else {
    git remote add origin $remoteUrl
}

Write-Host ""
Write-Host "開始推送到 GitHub。"
Write-Host "如果跳出登入視窗，請使用 GitHub 官方登入流程。"
Write-Host "本工具不會保存帳號、密碼或 Token。"
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Status：推送失敗"
    Write-Host "Root Cause：GitHub 登入、權限、repository 網址或網路連線有問題"
    Write-Host "Suggested Fix：確認 GitHub repository 存在，並完成 GitHub 登入後重試"
    exit 1
}

$repoPath = $remoteUrl -replace "^https://github\.com/", "" -replace "\.git$", ""
$parts = $repoPath.Split("/")
$account = $parts[0]
$repo = $parts[1]
$pagesUrl = "https://$account.github.io/$repo/"

Write-Host ""
Write-Host "Status：推送完成"
Write-Host "GitHub Pages 預期網址：$pagesUrl"
Write-Host ""
Write-Host "請到 GitHub repository 的 Settings > Pages 啟用 main 分支與 /root。"
