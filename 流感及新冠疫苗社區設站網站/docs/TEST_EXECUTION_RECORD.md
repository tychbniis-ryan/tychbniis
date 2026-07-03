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
| GAS Web App 命令列連線 | `Invoke-WebRequest .../exec` | 待確認 | 目前回傳 `403 Forbidden`，需承辦人登入瀏覽器確認 Web App 存取權與首次授權 |
| GAS 與核心邏輯本機檢查 | `node scripts/local-check.mjs` | 通過 | 不連線 Google Sheet 或 Firebase |
| 民眾端 RWD 檢查 | `node scripts/rwd-check.mjs` | 通過 | 已產生手機與桌機截圖 |
| Firebase Hosting 線上檢查 | `node scripts/online-check.mjs` | 通過 | 檢查 `https://tychb-vaccineweb.web.app` 首頁、`public.json` 與 `app.js` |
| 民眾端線上連結安全檢查 | `Invoke-WebRequest https://tychb-vaccineweb.web.app/app.js` | 通過 | 線上 `app.js` 含 `noopener noreferrer`、不含 `onclick=`，且具備 `data-empty-action` |
| 公開 JSON 格式 | PowerShell `ConvertFrom-Json` | 通過 | `public/public.json` 可解析 |
| Git 空白檢查 | `git diff --check -- '流感及新冠疫苗社區設站網站'` | 通過 | 僅有換行格式提示 |

## 3. 截圖證據

| 截圖 | 用途 |
|---|---|
| `docs/test-evidence/public-mobile.png` | 民眾端手機版 RWD 驗收 |
| `docs/test-evidence/public-desktop.png` | 民眾端桌機版 RWD 驗收 |

## 4. 尚需實機驗證

以下項目需在 Google Apps Script、Google Sheet 或 Firebase Hosting 實際環境測試，本機無法完整驗證：

1. `setupWorkbook()` 是否正確建立所有工作表與表頭。
2. `createSite()`、`publishSite()`、`updateSite()` 是否正確寫入 Google Sheet。
3. 異動紀錄是否逐項寫入。
4. 發布時是否產生宣導品配送任務，且不重複產生。
5. 已配送宣導品任務是否正確阻擋解鎖申請與核准。
6. 解鎖後修改資料是否同步未完成配送任務。
7. 通知單 CSV 多里別拆列內容是否正確。
8. 里別清冊是否正確產生未設站提醒。
9. 管理碼驗證、廠商登入與廠商回報是否符合預期。
10. `buildPublicJson()` 實際輸出是否符合 `docs/PUBLIC_JSON_SPEC.md`。
11. Firebase Hosting 正式網址是否可正常讀取 `public.json`。（目前 `scripts/online-check.mjs` 可做基本檢查，仍需搭配人工實測操作流程。）
12. LINE 內建瀏覽器、手機定位、地圖、分享功能是否可操作。

## 5. 失敗紀錄格式

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
