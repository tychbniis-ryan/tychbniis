# 測試執行紀錄

本文件用來記錄本系統每次重要測試結果，供承辦人、資訊人員與下一位 AI 接手時判斷目前驗收狀態。

## 1. 最近一次本機測試

| 項目 | 內容 |
|---|---|
| 測試日期 | 2026-07-03 |
| 測試人 | Codex |
| 測試環境 | Windows，本機資料夾 `D:\GAS\vaccinewebsite\流感及新冠疫苗社區設站網站` |
| 測試資料 | `public/public.json` 範例資料，不含真實個資 |
| 測試結果 | 通過 |

## 2. 已執行項目

| 測試項目 | 指令或證據 | 結果 | 備註 |
|---|---|---|---|
| GAS 正確專案推送 | `clasp push` | 通過 | 已推送 `程式碼.js`、`Index.html`、`appsscript.json` 至 Script ID `1dKdl7kRc-TyFLKOsaA09M4vNoqn6uU-FG2aSXl5M1bl9Kc9vgJ9h8oSR` |
| GAS Web App 版本部署 | `clasp redeploy ... --versionNumber 2` | 通過 | 部署 ID `AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw` 已指向版本 `2` |
| GAS Web App 命令列連線 | `Invoke-WebRequest .../exec` | 通過 | 正確 Web App URL 已可回傳 HTTP 200 |
| GAS Web App 線上非破壞性檢查 | `node scripts/gas-webapp-check.mjs` | 通過 | 檢查正確 `/exec` 連結、首頁標題、8 個功能入口、管理保護、系統工具標記，並產生 `docs/test-evidence/gas-webapp-home.png` |
| GAS Web App 線上假資料寫入檢查 | `npm run test:gas:write` | 通過 | 已用假資料完成 `setupWorkbook()`、`createSite()`、`listSites()`、`updateReport()`、`unpublishSite()`、`buildPublicJson()`；最新測試假資料 ID `SITE-20261231-0009`，測試最後已下架且公開 JSON 不含該資料 |
| GAS 與核心邏輯本機檢查 | `node scripts/local-check.mjs` | 通過 | 不連線 Google Sheet 或 Firebase |
| 民眾端 RWD 檢查 | `node scripts/rwd-check.mjs` | 通過 | 已產生手機與桌機截圖 |
| 民眾端新版 UI 截圖驗收 | `node scripts/rwd-check.mjs` + 截圖人工檢視 | 通過 | 使用 `frontend-design` Skill 優化後，手機與桌機截圖無文字重疊或裁切 |
| 民眾端 UI 第 2 批細節驗收 | `node scripts/local-check.mjs`、`node scripts/rwd-check.mjs` | 通過 | 檢查快速查詢選取狀態、空狀態視覺標記與新版手機／桌機截圖 |
| 民眾端 UI 第 2 批線上檢查 | `node scripts/online-check.mjs` + 線上 JS/CSS 標記檢查 | 通過 | 線上 `app.js` 含 `syncQuickActionState`、`aria-pressed`、`empty-mark`，線上 CSS 含快速查詢選取狀態、查詢摘要膠囊與卡片頂部色帶 |
| Firebase Hosting 線上檢查 | `node scripts/online-check.mjs` | 通過 | 檢查 `https://tychb-vaccineweb.web.app` 首頁、`public.json` 與 `app.js` |
| 民眾端線上連結安全檢查 | `Invoke-WebRequest https://tychb-vaccineweb.web.app/app.js` | 通過 | 線上 `app.js` 含 `noopener noreferrer`、不含 `onclick=`，且具備 `data-empty-action` |
| 線上部署後 5 項安全回歸檢查 | `node scripts/online-check.mjs` | 通過 | 檢查外開連結、inline handler、空狀態按鈕、快取標頭與首頁個資聲明 |
| 民眾端新版 UI 線上檢查 | `Invoke-WebRequest` 檢查首頁與 CSS | 通過 | 線上首頁含 `header-inner`、`route-visual`，線上 CSS 含新版溫暖色系與結果區透明化樣式 |
| 公開 JSON 格式 | PowerShell `ConvertFrom-Json` | 通過 | `public/public.json` 可解析 |
| Git 空白檢查 | `git diff --check -- '流感及新冠疫苗社區設站網站'` | 通過 | 僅有換行格式提示 |

## 3. 2026-07-03 版本 0.55.0 測試摘要

| 測試項目 | 指令或證據 | 結果 | 備註 |
|---|---|---|---|
| UI 流程調整本機檢查 | `npm run test:local` | 通過 | 已檢查 GAS 一頁式填報、進階篩選、民眾端提醒彈窗與結果區跳轉結構 |
| UI 流程調整 RWD 檢查 | `node scripts/rwd-check.mjs` | 通過 | 已更新 `docs/test-evidence/public-mobile.png` 與 `docs/test-evidence/public-desktop.png` |
| UI 流程調整 Firebase 線上檢查 | `npm run test:online` | 通過 | 已檢查 `https://tychb-vaccineweb.web.app` 首頁、`public.json` 與 `app.js` |
| UI 流程調整 GAS Web App 檢查 | `npm run test:gas:webapp` | 通過 | 已檢查正確 Web App URL HTTP 200 與 GAS 首頁入口，截圖 `docs/test-evidence/gas-webapp-home.png` |
| UI 流程調整 GAS 假資料寫入檢查 | `npm run test:gas:write` | 通過 | 最新測試假資料 ID `SITE-20261231-0010`，測試最後已下架且公開 JSON 不含該資料 |

## 4. 2026-07-03 版本 0.56.0 測試摘要

| 測試項目 | 指令或證據 | 結果 | 備註 |
|---|---|---|---|
| 第 2 批 UI 流程本機檢查 | `npm run test:local` | 通過 | 已檢查固定 modal 關閉按鈕、背景捲動鎖定、結果區跳轉與 GAS 盒狀空狀態 |
| 第 2 批 UI 流程 RWD 檢查 | `node scripts/rwd-check.mjs` | 通過 | 已更新 `docs/test-evidence/public-mobile.png` 與 `docs/test-evidence/public-desktop.png` |
| 第 2 批 UI 流程 Firebase 線上檢查 | `npm run test:online` | 通過 | 已檢查 `https://tychb-vaccineweb.web.app` 首頁、`public.json` 與 `app.js` |
| 第 2 批 UI 流程 GAS Web App 檢查 | `npm run test:gas:webapp` | 通過 | 已檢查正確 Web App URL HTTP 200 與 GAS 首頁入口，截圖 `docs/test-evidence/gas-webapp-home.png` |
| 第 2 批 UI 流程 GAS 假資料寫入檢查 | `npm run test:gas:write` | 通過 | 最新測試假資料 ID `SITE-20261231-0011`，測試最後已下架且公開 JSON 不含該資料 |

## 5. 截圖證據

| 截圖 | 用途 |
|---|---|
| `docs/test-evidence/public-mobile.png` | 民眾端手機版 RWD 驗收 |
| `docs/test-evidence/public-desktop.png` | 民眾端桌機版 RWD 驗收 |
| `docs/test-evidence/gas-webapp-home.png` | GAS Web App 首頁線上載入驗收 |

## 6. 尚需實機驗證

以下項目需在 Google Apps Script 與 Google Sheet 寫入環境測試；目前已完成 Web App 首頁、功能入口、假資料草稿新增、查詢、接種人數回報、下架清理與公開 JSON 排除測試資料：

1. `publishSite()` 是否正確發布並產生配送任務。
2. `updateSite()` 是否正確修改未鎖定資料。
3. 異動紀錄是否逐項寫入。
4. 發布時是否產生宣導品配送任務，且不重複產生。
5. 已配送宣導品任務是否正確阻擋解鎖申請與核准。
6. 解鎖後修改資料是否同步未完成配送任務。
7. 通知單 CSV 多里別拆列內容是否正確。
8. 里別清冊是否正確產生未設站提醒。
9. 管理碼驗證、廠商登入與廠商回報是否符合預期。
10. `buildPublicJson()` 已確認不輸出本次未公開測試草稿；仍需以正式已發布資料驗證完整公開欄位內容。
11. Firebase Hosting 正式網址是否可正常讀取 `public.json`。（目前 `scripts/online-check.mjs` 可做基本檢查，仍需搭配人工實測操作流程。）
12. LINE 內建瀏覽器、手機定位、地圖、分享功能是否可操作。

## 7. 失敗紀錄格式

若後續測試失敗，請新增一筆紀錄：

```text
測試日期：
測試人：
測試項目：
使用假資料：
操作步驟：
預期結果：
實際結果：
錯誤訊息：
截圖或檔案：
判斷原因：
修正建議：
是否已修正：
對應 commit：
```
