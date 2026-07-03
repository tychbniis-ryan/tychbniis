# 部署紀錄

本文件用來記錄民眾端 Firebase Hosting 部署資訊與還原方式。正式上線前請先完成 `docs/GAS_TEST_CHECKLIST.md` 與 `docs/TEST_EXECUTION_RECORD.md`。

## 1. 目前部署狀態

| 項目 | 內容 |
|---|---|
| 最近部署日期 | 尚未正式部署 |
| 部署人 | 尚未填寫 |
| Firebase 專案 ID | 尚未填寫 |
| Hosting 網址 | 尚未填寫 |
| 部署 commit | 尚未填寫 |
| 使用的 `public.json` 來源 | 尚未填寫 |
| 是否已完成上線前檢查 | 否 |

## 2. 上線前檢查

部署前請逐項確認：

1. `public/public.json` 已由 GAS 正式測試環境產生。
2. `public/public.json` 只包含 `已發布` 且 `是否公開 = 是` 的資料。
3. `public/public.json` 不含內部欄位、管理碼、廠商查詢碼、填報人、接種人數、接種率或宣導品配送資訊。
4. `public/public.json` 不含真實民眾姓名、身分證字號、電話、地址以外的個資。
5. 已執行 `node scripts/local-check.mjs`。
6. 已執行 `node scripts/rwd-check.mjs`，並確認截圖正常。
7. 已在手機瀏覽器與 LINE 內建瀏覽器測試查詢、地圖、複製、分享。
8. 已確認 Firebase Hosting 使用正確專案。
9. 已確認不啟用匿名流量統計或第三方追蹤碼。
10. 已保留可還原的 Git commit。

## 3. 部署指令

在本資料夾執行：

```powershell
firebase deploy --only hosting
```

部署後請記錄：

```text
部署日期：
部署人：
Firebase 專案 ID：
Hosting 網址：
部署 commit：
部署結果：
部署後檢查結果：
```

## 4. 部署後檢查

1. 開啟 Hosting 網址。
2. 確認網站標題、公告與資料更新時間正確。
3. 測試今日、明日、本週、行政區、里別、日期、關鍵字與疫苗篩選。
4. 測試地圖、複製地址、複製場次資訊與分享場次。
5. 測試 `siteId`、`district`、`village`、`date`、`keyword`、`source=line` 網址參數。
6. 測試 `queueUrl` 有值時顯示按鈕，空白或無效時不顯示。
7. 測試 `isOpen = false` 時顯示暫停開放訊息。
8. 使用手機與 LINE 內建瀏覽器確認版面與操作。

## 5. 還原方式

若部署後發現問題，優先使用 Git 還原到上一個可用 commit，再重新部署。

```powershell
git revert <問題 commit>
firebase deploy --only hosting
```

若只是 `public/public.json` 資料錯誤，請優先重新產生正確 JSON 後再部署，不要修改程式。

## 6. 部署紀錄表

| 日期 | 部署人 | commit | Firebase 專案 ID | Hosting 網址 | 結果 | 備註 |
|---|---|---|---|---|---|---|
| 尚未部署 |  |  |  |  |  |  |
