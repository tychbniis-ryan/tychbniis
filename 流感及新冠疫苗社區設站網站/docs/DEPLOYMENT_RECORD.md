# 部署紀錄

本文件用來記錄民眾端 Firebase Hosting 部署資訊與還原方式。正式上線前請先完成 `docs/GAS_TEST_CHECKLIST.md` 與 `docs/TEST_EXECUTION_RECORD.md`。

## 0. GAS 推送與部署狀態

| 項目 | 內容 |
|---|---|
| 最近 GAS 推送時間 | 2026-07-03 10:39（Asia/Taipei） |
| 推送人 | Codex 透過 `clasp` |
| Apps Script 專案 ID | `1dKdl7kRc-TyFLKOsaA09M4vNoqn6uU-FG2aSXl5M1bl9Kc9vgJ9h8oSR` |
| Web App 部署 ID | `AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw` |
| Web App 網址 | `https://script.google.com/macros/s/AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw/exec` |
| 部署版本 | `4` |
| 部署名稱 | `社區接種站填報系統V1.2` |
| 部署結果 | `clasp push`、`clasp version`、`clasp redeploy` 成功 |
| 待確認事項 | 已完成 Web App 首頁檢查與假資料寫入檢查；尚需測正式管理碼、發布產生配送任務、廠商回報與正式公開 JSON 更新流程 |

## 1. 目前部署狀態

| 項目 | 內容 |
|---|---|
| 最近部署日期 | 2026-07-03 09:26（Asia/Taipei） |
| 部署人 | Codex 透過 Firebase CLI |
| Firebase 專案 ID | `tychb-vaccineweb` |
| Hosting 網址 | `https://tychb-vaccineweb.web.app` |
| 部署 commit | `94d893c` |
| 使用的 `public.json` 來源 | 目前為 `public/public.json` 範例公開資料，尚非 GAS 正式產生資料 |
| 是否已完成上線前檢查 | 部分完成；本機檢查、RWD 檢查、Firebase 線上檢查與民眾端連結安全檢查通過，GAS、手機與 LINE 實機測試待補 |

## 2. 上線前檢查

部署前請逐項確認：

1. `public/public.json` 已由 GAS 正式測試環境產生。
2. `public/public.json` 只包含 `已發布` 且 `是否公開 = 是` 的資料。
3. `public/public.json` 不含內部欄位、管理碼、廠商查詢碼、填報人、接種人數、接種率或宣導品配送資訊。
4. `public/public.json` 不含真實民眾姓名、身分證字號、電話、地址以外的個資。
5. 已執行 `node scripts/local-check.mjs`。
6. 已執行 `node scripts/rwd-check.mjs`，並確認截圖正常。
7. 已執行 `node scripts/online-check.mjs`，確認 Hosting 首頁與 `public.json` 可讀。
8. 已在手機瀏覽器與 LINE 內建瀏覽器測試查詢、地圖、複製、分享。
9. 已確認 Firebase Hosting 使用正確專案。
10. 已確認不啟用匿名流量統計或第三方追蹤碼。
11. 已保留可還原的 Git commit。

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
3. 執行 `node scripts/online-check.mjs`。
4. 測試今日、明日、本週、行政區、里別、日期、關鍵字與疫苗篩選。
5. 測試地圖、複製地址、複製場次資訊與分享場次。
6. 測試 `siteId`、`district`、`village`、`date`、`keyword`、`source=line` 網址參數。
7. 測試 `queueUrl` 有值時顯示按鈕，空白或無效時不顯示。
8. 測試 `isOpen = false` 時顯示暫停開放訊息。
9. 使用手機與 LINE 內建瀏覽器確認版面與操作。

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
| 2026-07-03 11:16 | Codex / Firebase CLI | `732d741` | `tychb-vaccineweb` | `https://tychb-vaccineweb.web.app` | 成功 | `firebase deploy --only hosting --project tychb-vaccineweb` 成功；Firebase version `projects/839752443010/sites/tychb-vaccineweb/versions/7a6c9ec89f7b527a`，release `projects/839752443010/sites/tychb-vaccineweb/channels/live/releases/1783048591165000`。本次部署民眾端固定 modal 關閉按鈕、背景捲動鎖定與查詢流程修正。 |
| 2026-07-03 11:04 | Codex / Firebase CLI | `d7c2b0f` | `tychb-vaccineweb` | `https://tychb-vaccineweb.web.app` | 成功 | `firebase deploy --only hosting --project tychb-vaccineweb` 成功；Firebase version `projects/839752443010/sites/tychb-vaccineweb/versions/f03d14fc125fb02d`，release `projects/839752443010/sites/tychb-vaccineweb/channels/live/releases/1783047873552000`。本次部署民眾端接種提醒彈窗與查詢後移動到結果區。 |
| 2026-07-03 10:12 | Codex / Firebase CLI | `94d893c` | `tychb-vaccineweb` | `https://tychb-vaccineweb.web.app` | 成功 | `firebase deploy --only hosting --project tychb-vaccineweb` 成功；Firebase version `projects/839752443010/sites/tychb-vaccineweb/versions/fff5d9d66623dac6`，release `projects/839752443010/sites/tychb-vaccineweb/channels/live/releases/1783044733185000`。線上檢查通過，`app.js` 已含 `syncQuickActionState`、`aria-pressed`、`empty-mark`，CSS 已含快速查詢選取狀態、查詢摘要膠囊與卡片頂部色帶。 |
| 2026-07-03 10:06 | Codex / Firebase CLI | `cd27ca1` | `tychb-vaccineweb` | `https://tychb-vaccineweb.web.app` | 成功 | `firebase deploy --only hosting --project tychb-vaccineweb` 成功；Firebase version `projects/839752443010/sites/tychb-vaccineweb/versions/a8ced0f0356e3950`，release `projects/839752443010/sites/tychb-vaccineweb/channels/live/releases/1783044384575000`。線上檢查通過，首頁已含 `header-inner`、`route-visual`，CSS 已含新版溫暖色系與結果區透明化樣式。 |
| 2026-07-03 09:48 | Codex / Firebase CLI | `76e492b` | `tychb-vaccineweb` | `https://tychb-vaccineweb.web.app` | 成功 | `firebase deploy --only hosting --project tychb-vaccineweb` 成功；Firebase version `projects/839752443010/sites/tychb-vaccineweb/versions/a4b5d51de37d56c5`，release `projects/839752443010/sites/tychb-vaccineweb/channels/live/releases/1783043300759000`。`node scripts/online-check.mjs` 通過；線上 `app.js` 已確認含 `noopener noreferrer`、不含 `onclick=`，且具備 `data-empty-action`。 |
| 2026-07-03 09:26 | Codex / Firebase CLI | `4b297ab` | `tychb-vaccineweb` | `https://tychb-vaccineweb.web.app` | 成功 | `firebase deploy --only hosting --project tychb-vaccineweb` 成功；首頁 HTTP 200，`public.json` HTTP 200 且資料筆數 2。此為測試部署，資料仍為範例公開資料。 |

## 7. GAS 部署紀錄表

| 日期 | 部署人 | Apps Script 專案 ID | Web App 部署 ID | 版本 | 結果 | 備註 |
|---|---|---|---|---|---|---|
| 2026-07-03 11:17 | Codex / clasp | `1dKdl7kRc-TyFLKOsaA09M4vNoqn6uU-FG2aSXl5M1bl9Kc9vgJ9h8oSR` | `AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw` | `6` | 推送成功、部署成功、線上寫入測試通過 | `clasp push`、`clasp version "社區接種站填報系統V1.4 UI流程修正"`、`clasp redeploy ... -V 6 -d ...` 成功。GAS 主要清單空狀態改為盒狀訊息；`npm run test:gas:write` 通過，最新假資料 `SITE-20261231-0011` 已下架且未出現在公開 JSON。 |
| 2026-07-03 11:05 | Codex / clasp | `1dKdl7kRc-TyFLKOsaA09M4vNoqn6uU-FG2aSXl5M1bl9Kc9vgJ9h8oSR` | `AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw` | `5` | 推送成功、部署成功、線上寫入測試通過 | `clasp push`、`clasp version "社區接種站填報系統V1.3 UI流程調整"`、`clasp redeploy ... -V 5 -d ...` 成功。GAS 後台部署 PC 一頁式填報、進階篩選與面板化 UI；`npm run test:gas:write` 通過，最新假資料 `SITE-20261231-0010` 已下架且未出現在公開 JSON。 |
| 2026-07-03 10:39 | Codex / clasp | `1dKdl7kRc-TyFLKOsaA09M4vNoqn6uU-FG2aSXl5M1bl9Kc9vgJ9h8oSR` | `AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw` | `4` | 推送成功、部署成功、線上寫入測試通過 | 修正 `objectFromRow_()` 將 Google Sheet `Date` 物件轉成可由 `google.script.run` 回傳的字串，並讓接種日期維持 `yyyy-MM-dd`；`npm run test:gas:write` 通過，最新假資料 `SITE-20261231-0009` 已下架且未出現在公開 JSON。 |
| 2026-07-03 09:39 | Codex / clasp | `1dKdl7kRc-TyFLKOsaA09M4vNoqn6uU-FG2aSXl5M1bl9Kc9vgJ9h8oSR` | `AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw` | `2` | 推送成功、部署成功、瀏覽器實測待承辦人確認 | 已推送 `程式碼.js`、`Index.html`、`appsscript.json`；部署清單顯示 `社區接種站填報系統V1.0 @2`。命令列直接檢查 `/exec` 回傳 `403 Forbidden`。 |
