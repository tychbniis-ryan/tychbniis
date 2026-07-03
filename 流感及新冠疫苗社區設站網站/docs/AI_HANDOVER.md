# AI_HANDOVER.md

## 最近一次修改摘要：0.62.0 - 2026-07-03

1. 民眾端 LINE 使用提示新增獨立關閉按鈕，關閉後本次瀏覽工作階段不再顯示，避免與接種提醒重疊造成看似關不掉。
2. GAS 手機首頁改為單欄大按鈕優先，補上 WebView 文字縮放保護與手機版間距；`docs/test-evidence/gas-mobile-home.png` 為本機 Playwright 手機截圖證據。
3. GAS 回報接種人數改為清冊列呈現，清冊只顯示接種日期、設站地點、行政區與里別。
4. 點擊回報清冊列的「回報／修改」後，才開啟 `#reportModal` 彈出視窗填分類人數。
5. 回報彈出視窗依該場次是否提供流感或新冠疫苗動態顯示欄位；送出時仍加總寫回既有總表欄位，分類明細寫入接種回報備註。
6. `scripts/local-check.mjs` 已新增 GAS 手機首頁單欄導覽、回報彈窗與民眾端使用提示關閉驗收。
7. 0.61.0 的民眾端快速查詢、卡片按鈕、廠牌篩選、GAS 新增設站、維護篩選、查詢場次、廠商配送與宣導品管理密碼調整仍保留。
8. 本機已通過 `npm run test:local`、`node scripts/rwd-check.mjs`、`node --check public/app.js` 與 GAS 手機首頁截圖檢查。

## 1. 專案概要

本專案為「流感及新冠疫苗社區設站網站」，目標是讓衛生所或接種站人員填報設站資料，並讓民眾透過公開網站查詢接種站資訊。

系統設計原則：

1. Google Sheet 保存內部資料。
2. Google Apps Script 提供填報端與資料轉換。
3. Firebase Hosting 提供民眾端查詢網站。
4. 民眾端只讀取公開 JSON，不直接讀取 Google Sheet。
5. 不要求民眾登入，不蒐集民眾個資。

## 2. 專案架構

```text
流感及新冠疫苗社區設站網站/
  README.md
  CHANGELOG.md
  version.py
  firebase.json
  package.json
  package-lock.json
  docs/
    AI_HANDOVER.md
    PUBLIC_JSON_SPEC.md
    GAS_TEST_CHECKLIST.md
    OPERATION_GUIDE.md
    REQUIREMENTS_TRACE.md
    TEST_EXECUTION_RECORD.md
    DEPLOYMENT_RECORD.md
    test-evidence/
  gas/
    Code.gs
    Index.html
  scripts/
    local-check.mjs
    gas-webapp-check.mjs
    gas-write-check.spec.mjs
  public/
    index.html
    styles.css
    app.js
    public.json
  *.md 開發文件
```

## 3. 功能總覽

### 3.1 民眾端

位置：`public/`

功能：

1. 讀取 `public.json`。
2. 顯示網站標題、公告、更新時間。
3. 今日、明日、本週、附近場次快速查詢。
4. 行政區、里別、日期、關鍵字、疫苗篩選。
5. 接種站卡片顯示。
6. Google 地圖連結。
7. 複製地址與場次資訊。
8. 支援網址參數：`district`、`village`、`date`、`keyword`、`siteId`。
9. 支援 `source=line` 顯示 LINE 使用提示。
10. 支援 `defaultView` 預設查詢模式。
11. 支援 Web Share API 分享場次；不支援時改為複製。
12. 支援 `queueUrl` 叫號／現場資訊連結；只接受 `http://` 或 `https://` 完整外部網址，空白或無效網址不顯示按鈕。
13. 支援 `isOpen = false` 暫停開放狀態，會顯示暫停摘要與訊息並清空查詢結果。

### 3.2 GAS 填報端

位置：`gas/`

功能骨架：

1. `setupWorkbook()`：建立必要工作表與表頭。
2. `createSite(payload)`：新增設站資料。
3. `updateReport(siteId, report)`：回報接種人數。
4. `publishSite(siteId)`：發布資料。
5. `unpublishSite(siteId)`：下架資料。
6. `buildPublicJson()`：產生民眾端公開 JSON。
7. `createJsonDownloadFile()`：在 Google Drive 建立 `public.json` 下載檔。

GAS 後台頁面：

1. 首頁入口分為主要作業與管理作業。
2. 新增設站資料採 6 步驟填報：行政區里、日期時間、地點地址、院所疫苗、宣導品、確認送出。
3. 新增表單使用本機瀏覽器 `localStorage` 暫存。
4. 送出前會做前端檢查：必填欄位、`0800-1200` 時間格式、預估人數整數格式。
5. 最後可選擇「送出草稿」或「送出並發布」。
6. 維護列表會顯示資料狀態、公開狀態、鎖定狀態、宣導品申請狀態與院所資訊。
7. 接種回報列表會顯示回報狀態，並提供手機友善的大按鈕。
8. 若偵測到新增表單本機暫存，會提示恢復或清除。
9. 新增送出前會依目前已載入資料，以「行政區 + 里別 + 接種日期」提示可能重複資料；此為前端輔助提醒，不是後端強制防重。
10. 各子頁提供「回到首頁」按鈕。
11. 維護頁可對未鎖定資料使用「編輯資料」，沿用 6 步驟表單並呼叫 `updateSite()`。
12. 編輯模式只儲存修改，不直接發布草稿；發布仍需回維護頁按「發布」，以維持鎖定與宣導品配送任務流程。
13. 維護頁申請解鎖使用頁面內表單，會帶入資料ID與場次摘要，並檢查解鎖申請人必填。
14. 若該場次已有 `已配送` 宣導品配送任務，後端會阻擋申請解鎖與核准解鎖。
15. 已解鎖資料儲存修改後，後端會同步更新未完成配送任務；新增品項會補建任務，取消品項會將未完成任務改為 `取消`。
16. 宣導品申請會讀取 `getAppData()` 回傳的 `deliveryItems`，以前端勾選品項與數量方式輸入。
17. 宣導品勾選結果送出前仍轉回 `宣導品申請品項`、`宣導品申請數量` 欄位，避免改動 Google Sheet 結構。
18. 「稽催／統計」頁有解鎖審核區塊，前端輸入管理碼與審核人後呼叫 `reviewUnlock()`。
19. 管理碼仍由後端從「系統設定」工作表驗證，不得寫死在前端或程式碼。
20. 新增頁有整批上傳區塊，可貼上含表頭 TSV 或簡易 CSV，前端檢查後呼叫 `bulkCreateSites()`。
21. 整批上傳單次上限 100 筆，未指定狀態時預設草稿、不公開、不申請宣導品。
22. 回報接種人數頁顯示預估人數；非數字會阻擋，超過預估會提示確認，成功後顯示摘要。
23. 查詢場次頁支援完整內部條件篩選，包含日期區間、院所、服務對象、疫苗廠牌、公開狀態、回報狀態與宣導品配送狀態。
24. 宣導品管理頁採分頁架構，分為配送任務、非接種站配送與品項管理。
25. 宣導品管理頁可用頁面內表單修改配送任務有限欄位，也可將配送任務狀態改為 `取消`；系統不真刪除配送任務。
26. 品項管理分頁可檢視啟用中的宣導品品項，新增或調整品項仍以 Google Sheet「宣導品品項表」為主。
27. 廠商配送回報頁使用頁面內表單回報配送狀態、實際配送數量、日期、物流資訊、回報人與備註。
28. 通知單 CSV 匯出會將多里別資料拆成單一里別一列。
29. 稽催／統計頁會讀取「里別清冊」，比對已發布且公開的設站資料，列出尚未設站里別並產生提醒文字。
30. 進入稽催／統計、宣導品管理、系統工具前，需先通過管理碼驗證；廠商配送回報維持廠商查詢碼流程。
31. 稽催／統計頁會顯示宣導品配送完成率與行政區設站統計。
32. `callGas()` 執行期間會停用畫面按鈕，避免重複點擊造成重複送出。
33. 表單錯誤訊息會顯示問題清單與「下一步」操作提示。

## 4. 模組規範

目前尚未採用 `app/modules` 模組化架構。本專案目前為獨立網站專案，分為：

1. `public`：民眾端靜態網站。
2. `gas`：Google Apps Script 填報端。
3. `docs`：AI 交接與維護文件。

後續若導入模組化，需新增 `app/config/modules.json` 並將功能拆分為可載入模組。

## 5. UI 運作方式

民眾端為單頁式靜態網站。

流程：

1. `index.html` 載入 `styles.css` 與 `app.js`。
2. `app.js` 讀取 `public.json`。
3. 依使用者選擇的條件篩選資料。
4. 將接種站資料渲染為卡片。
5. 地圖按鈕使用 `mapUrl`，若空白則用地址或地點名稱產生 Google Maps 搜尋連結，並由 `scripts/local-check.mjs` 檢查 fallback 結構。

民眾端不得顯示：

1. 醫療院所十碼代碼。
2. 預估人數。
3. 接種人數。
4. 接種率。
5. 填報人。
6. 內部狀態。
7. 宣導品配送資訊。

## 6. `modules.json` 說明

目前未建立 `app/config/modules.json`。

原因：此專案目前不是既有 Python 模組載入式工具，而是 Firebase 靜態網站與 GAS 專案。

若未來整合到統一工具平台，建議新增：

```text
app/config/modules.json
app/modules/vaccine_site/
```

## 7. `module_loader` 說明

目前無 `module_loader`。

## 8. `task_runner` 說明

目前無 `task_runner`。

本機測試使用靜態伺服器即可：

```powershell
node scripts/local-check.mjs
```

此指令會檢查 GAS 語法、GAS 回報接種人數頁手機友善結構、`public/public.json` 格式、公開 JSON 欄位白名單與禁止內部欄位、民眾端追蹤碼與登入 SDK、錯誤／空狀態引導與 URL 參數，並用假資料測試管理碼驗證、里別未設站與統計邏輯；不會連線 Google Sheet 或 Firebase。

民眾端 RWD 與高齡友善驗收可使用：

```powershell
node scripts/rwd-check.mjs
```

此指令會檢查手機與桌機尺寸的水平溢位、主要觸控元件高度，並輸出截圖到 `docs/test-evidence/`。

Firebase Hosting 部署後線上檢查可使用：

```powershell
node scripts/online-check.mjs
```

此指令會檢查 Hosting 首頁、`public.json` 與 `app.js` 是否可讀，並驗證公開 JSON 欄位與民眾端無追蹤／登入 SDK。

GAS Web App 部署後的非破壞性線上檢查可使用：

```powershell
node scripts/gas-webapp-check.mjs
```

此指令會檢查正確 GAS `/exec` 連結、首頁標題、8 個功能入口、管理保護與系統工具標記，並產生 `docs/test-evidence/gas-webapp-home.png`。此檢查只讀取頁面與截圖，不會寫入 Google Sheet。

GAS Web App 允許寫入假資料後，可使用：

```powershell
npm run test:gas:write
```

此指令會透過 Playwright 在正確 GAS Web App 內呼叫 `google.script.run`，使用假資料測試 `setupWorkbook()`、`createSite()`、`listSites()`、`updateReport()`、`unpublishSite()` 與 `buildPublicJson()`。測試資料關鍵字為 `測試區`、`2026-12-31`、`Codex測試`；測試最後會下架該筆資料，並確認公開 JSON 不含該資料。

民眾端靜態頁面可使用：

```powershell
python -m http.server 5173 -d public
```

GAS 與 Google Sheet 實機驗收請依 `docs/GAS_TEST_CHECKLIST.md` 執行。該文件是給承辦人與下一位 AI 的操作型測試清單。

測試執行結果請記錄於 `docs/TEST_EXECUTION_RECORD.md`；Firebase Hosting 部署資訊與還原方式請記錄於 `docs/DEPLOYMENT_RECORD.md`。

承辦人日常操作請依 `docs/OPERATION_GUIDE.md`，包含新增場次、發布、修改、解鎖、下架、回報、宣導品、廠商回報、產生 `public.json` 與民眾端更新。

4 份開發文件與目前完成狀態請依 `docs/REQUIREMENTS_TRACE.md`，後續開發應優先處理該文件列出的「需優先補程式的缺口」。

## 9. 版本控制規則

Commit message 格式：

```text
[流感及新冠疫苗社區設站網站] 類型：變更摘要
```

類型：

1. `feat`：新增功能。
2. `fix`：修正錯誤。
3. `refactor`：重構。
4. `docs`：文件更新。
5. `chore`：維護性調整。
6. `test`：測試相關。

## 10. 新增功能流程

1. 先讀取本檔、README、CHANGELOG 與 4 份開發文件。
2. 確認新增功能屬於民眾端、GAS 填報端或文件。
3. 只修改對應資料夾。
4. 不將帳密、Token、管理碼寫進程式。
5. 更新 `version.py`、`CHANGELOG.md`、本檔。
6. 執行本機測試。
7. 建立 Git commit。

## 11. 修改功能流程

1. 先確認目前是否有未提交修改。
2. 閱讀相關檔案。
3. 修改前先輸出修改前檢查。
4. 小範圍修改，不重寫整個專案。
5. 修改後測試。
6. 更新版本與文件。
7. 說明還原方式。

## 12. 常見錯誤處理

### 12.1 `public.json` 讀取失敗

可能原因：

1. 沒有透過靜態伺服器開啟。
2. `public.json` 格式錯誤。
3. 檔案路徑錯誤。

測試方式：

```powershell
python -m http.server 5173 -d public
```

開啟 `http://localhost:5173/public.json`，確認 JSON 可讀取。

### 12.2 GAS 初始化失敗

可能原因：

1. 未綁定 Google Sheet。
2. Apps Script 權限尚未授權。
3. 工作表名稱被手動更改。

處理方式：

1. 先執行 `setupWorkbook()`。
2. 確認 Apps Script 已授權試算表存取權。
3. 不要刪除或更名必要工作表。

### 12.3 民眾端查不到資料

確認：

1. `public.json` 的 `data` 是否有資料。
2. 每筆資料是否有 `date`。
3. 篩選條件是否清除。
4. 正式 JSON 是否只輸出 `是否公開 = 是` 且 `資料狀態 = 已發布` 的資料。

## 13. 最近一次修改摘要

日期：2026-07-02

本次建立並補強第一版可運作骨架：

1. 新增 Firebase 靜態民眾查詢網站。
2. 新增公開 JSON 範例。
3. 新增 GAS 後台與資料轉換骨架。
4. 新增 README、CHANGELOG、version.py。
5. 建立本 AI 交接文件。
6. 補強 GAS 後台第一版主要功能：新增、維護、回報、查詢、稽催、宣導品、廠商回報、匯出、本機暫存。
7. 補強民眾端第一版細節：`defaultView`、`source=line`、分享場次、查無資料下一步、今日已結束排序。
8. 新增 `docs/PUBLIC_JSON_SPEC.md`。
9. 補強 GAS 後台 UI：新增 6 步驟填報、前端錯誤摘要、送出前確認、草稿／發布送出按鈕、維護與回報卡片狀態標示。
10. 補上 GAS 後台重複資料提醒、本機暫存提示與各子頁回首頁操作。
11. 補上維護頁編輯未鎖定資料流程，前端可呼叫既有 `updateSite()` 後端函式。
12. 補上宣導品申請結構化輸入：啟用品項勾選、數量欄位、配送聯絡資訊前端檢查。
13. 補上管理者解鎖審核前端介面，可核准解鎖或退回申請。
14. 補上整批上傳前端介面，可貼上含表頭 TSV／CSV 並呼叫 `bulkCreateSites()`。
15. 補上接種人數回報前端檢查、超過預估提醒與成功摘要。
16. 補強查詢頁完整條件與後端 `listSites()` 篩選支援。
17. 補上宣導品配送任務修改／取消流程與 `updateDeliveryTask()` 後端函式。
18. 補上宣導品管理頁分頁架構，將配送任務、非接種站配送與品項管理分區顯示。
19. 將宣導品配送任務修改從 `prompt()` 改為頁面內表單，可維護配送狀態、數量、日期、廠商、物流與備註。
20. 將廠商配送回報從 `prompt()` 改為頁面內表單，並補上必填與數量格式檢查。
21. 將維護頁申請解鎖從 `prompt()` 改為頁面內表單，送出前可確認資料ID與場次摘要。
22. 新增 `docs/GAS_TEST_CHECKLIST.md`，補齊 GAS 實機測試與上線前確認流程。
23. 新增 `docs/OPERATION_GUIDE.md`，補齊承辦人日常操作流程、常見狀況與還原方式。
24. 新增 `docs/REQUIREMENTS_TRACE.md`，對照 4 份開發文件與目前完成狀態，列出優先缺口。
25. 補強已配送宣導品不得解鎖規則，申請與核准階段都會檢查已配送配送任務。
26. 補上解鎖後修改設站資料的宣導品配送任務同步規則。
27. 校正文件，標明通知單 CSV 已支援單一里別拆列匯出。
28. 新增里別未設站提醒，使用「里別清冊」比對已發布且公開的設站資料。
29. 新增管理作業入口驗證，保護稽催／統計、宣導品管理與系統工具頁。
30. 補強稽催／統計頁，新增宣導品配送完成率與行政區設站統計。
31. 新增 `scripts/local-check.mjs`，整合本機語法與核心邏輯假資料檢查。
32. 補強 GAS 後台送出防重複點擊，並在本機檢查腳本加入防重送結構檢查。
33. 統一表單錯誤訊息格式，補上「下一步」提示。
34. 補強 `queueUrl` 叫號／現場資訊連結安全規則，GAS 與民眾端都只接受 `http://` 或 `https://` 完整網址。
35. 補強民眾端 `isOpen = false` 暫停開放畫面，避免保留舊查詢狀態。
36. 補強宣導品配送任務防重，同一接種站同一宣導品已有未取消任務時不再新增。
37. 新增民眾端 RWD Playwright 驗收腳本，涵蓋手機與桌機尺寸、水平溢位與觸控高度檢查。
38. 新增測試執行紀錄與部署紀錄文件，補齊正式交付與上線還原紀錄格式。
39. 新增 GAS 後端設站資料防重，阻擋同行政區、同里別、同接種日期的未下架重複資料。
40. 修正接種率計算，空白回報維持空白，明確回報 `0` 人才顯示 `0%`。
41. 本機檢查腳本新增 GAS 回報接種人數頁手機友善結構驗收。
42. GAS 後端新增接種日期與設站時間嚴格驗證，阻擋不存在日期、非法 24 小時制時間與結束時間早於開始時間。
43. 本機檢查腳本新增民眾端地圖連結 fallback 驗收。
44. 本機檢查腳本新增公開 JSON 欄位白名單與禁止內部欄位驗收。
45. 本機檢查腳本新增民眾端追蹤碼與登入 SDK 掃描，維持不登入、不蒐集民眾個資、不啟用匿名流量統計。
46. 本機檢查腳本新增民眾端 JSON 讀取失敗、查無資料下一步、LINE 提示與 URL 參數結構驗收。
47. 已完成 Firebase Hosting 測試部署至 `tychb-vaccineweb`，Hosting 網址為 `https://tychb-vaccineweb.web.app`，部署紀錄見 `docs/DEPLOYMENT_RECORD.md`。
48. 新增 `scripts/online-check.mjs`，作為 Firebase Hosting 部署後線上健康檢查。
49. 已將 GAS 程式透過 `clasp` 推送到正確 Apps Script 專案 `1dKdl7kRc-TyFLKOsaA09M4vNoqn6uU-FG2aSXl5M1bl9Kc9vgJ9h8oSR`，並將 Web App 部署 `AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw` 更新到版本 `2`。
50. GAS `/exec` 命令列檢查目前回傳 `403 Forbidden`，需承辦人登入瀏覽器確認 Web App 存取權與首次授權；此狀態已記錄於 `docs/DEPLOYMENT_RECORD.md` 與 `docs/TEST_EXECUTION_RECORD.md`。
51. 民眾端第 1 批 5 項自我測試修正：地圖與叫號外開連結加 `noreferrer`，查無資料空狀態 3 個按鈕移除 inline `onclick` 並改為事件監聽。
52. 已將民眾端第 1 批 5 項修正重新部署至 Firebase Hosting；部署 commit `76e492b`，Firebase version `a4b5d51de37d56c5`，release `1783043300759000`。
53. 線上部署後檢查新增 5 項安全回歸驗收：外開連結、inline handler、空狀態按鈕、快取標頭與首頁個資聲明。
54. 使用 `frontend-design` Skill 優化民眾端 UI，改為溫暖健康導覽風格，調整主視覺、色彩、查詢按鈕、篩選面板與結果卡片。
55. 已將民眾端 UI 優化版重新部署至 Firebase Hosting；部署 commit `cd27ca1`，Firebase version `a8ced0f0356e3950`，release `1783044384575000`。
56. 民眾端 UI 第 2 批細部優化：快速查詢按鈕會顯示目前選取狀態，查詢摘要改為膠囊式資訊，空狀態加視覺標記，結果卡片加頂部色帶，手機首屏間距調整。
57. 已將民眾端 UI 第 2 批細節優化重新部署至 Firebase Hosting；部署 commit `94d893c`，Firebase version `fff5d9d66623dac6`，release `1783044733185000`。
58. 新增 `scripts/gas-webapp-check.mjs`，可針對正確 GAS Web App `/exec` 執行非破壞性線上檢查，確認 HTTP 200、首頁標題、8 個功能入口、管理保護、系統工具標記，並輸出首頁截圖證據。
59. 新增 `scripts/gas-write-check.spec.mjs` 與 Playwright 測試相依，可針對 GAS Web App 執行 5 項假資料寫入測試。
60. 修正 GAS `objectFromRow_()`，將 Google Sheet `Date` 物件轉為字串，且接種日期、預計配送日期、實際配送日期固定為 `yyyy-MM-dd`，避免 `google.script.run` 線上查詢回傳 `null` 或日期篩選失效。
61. GAS Web App 已重新部署至版本 `4`，部署名稱 `社區接種站填報系統V1.2`；`npm run test:gas:write` 通過，最新假資料 `SITE-20261231-0009` 已下架且未出現在公開 JSON。

## 14. 2026-07-03 版本 0.55.0 更新摘要

1. 依「幼兒園統計」風格調整 GAS 後台 UI，讓主視覺更接近既有衛生局內部系統。
2. GAS 新增填報在 PC 採一頁式呈現，手機仍保留原本分步流程。
3. GAS 大量上傳與查詢進階欄位改為可展開區，查無資料改為盒狀訊息。
4. 民眾端接種提醒改為彈出式提醒，不再佔用主要版面。
5. 民眾端快速查詢、表單查詢、定位查詢完成後會移動到結果區。
6. `scripts/local-check.mjs` 已加入彈窗、結果區跳轉、GAS 一頁式填報與進階篩選的結構檢查。

## 15. 2026-07-03 版本 0.56.0 更新摘要

1. 民眾端接種提醒改為固定 HTML modal 結構，加入 `role="dialog"`、`aria-modal` 與固定關閉按鈕。
2. 民眾端提醒視窗開啟時會鎖定背景捲動，並將焦點移到關閉按鈕。
3. 民眾端行政區切換、重設查詢與不支援定位情境會移動到結果區。
4. GAS 主要清單空狀態改用 `info-box` 盒狀訊息，減少散落文字。
5. `scripts/local-check.mjs` 已補上 modal、結果區跳轉與 GAS 盒狀空狀態檢查。

## 16. 2026-07-03 版本 0.57.0 更新摘要

1. 新增 `scripts/gas-ui-flow-check.spec.mjs`，直接測試正確 GAS Web App URL。
2. 新增 `npm run test:gas:ui`，不寫入資料，只檢查 UI 線上流程。
3. 測試覆蓋 8 個首頁功能入口，其中 `stats`、`promo`、`system` 會驗證是否進入管理碼保護頁。
4. 測試確認 PC viewport 下新增設站 6 個步驟為一頁式顯示。
5. 測試確認大量上傳與查詢進階篩選維持折疊狀態。
6. `scripts/local-check.mjs` 已補上此測試檔與 npm script 的結構檢查。

## 17. 目前第一版功能狀態

### 已具備程式骨架

1. 新增、維護、回報、查詢。
2. 發布、鎖定、下架。
3. 申請解鎖、管理者審核解鎖。
4. 稽催／統計與 LINE 文字產生。
5. 宣導品申請欄位、宣導品品項表初始化。
6. 發布時自動產生接種站宣導品配送任務。
7. 非接種站宣導品配送任務新增。
8. 廠商查詢碼與配送回報。
9. 異動紀錄。
10. 本機暫存。
11. 整批上傳後端函式，上限 100 筆。
12. 管理功能管理碼讀取自「系統設定」工作表。
13. 簡易通知單 CSV 匯出。
14. GAS 後台 6 步驟新增設站填報介面。
15. 新增設站資料前端基本檢查與送出前確認摘要。
16. 新增設站資料前端重複提醒，依目前載入資料比對行政區、里別與接種日期。
17. 新增本機暫存恢復或清除提示。
18. 維護頁可編輯草稿或已解鎖資料。
19. 宣導品申請可由啟用品項勾選並填寫數量，不再要求承辦人手動輸入品項與數量字串。
20. 管理者可在稽催／統計頁審核解鎖申請。
21. 新增頁可整批上傳最多 100 筆設站資料。
22. 回報頁可提醒接種數超過預估並顯示回報成功摘要。
23. 查詢頁可依內部管理條件篩選設站資料。
24. 宣導品配送任務可由管理端修改或取消，並保留異動紀錄。
25. 宣導品管理頁已分為配送任務、非接種站配送與品項管理 3 個操作區。
26. 配送任務修改已改為頁面表單，送出前會檢查配送數量格式。
27. 廠商配送回報已改為頁面表單，廠商只能回報配送欄位，不修改目的地基本資料。
28. 維護頁申請解鎖已改為頁面表單，解鎖申請人為必填。
29. 已配送宣導品任務會阻擋接種站解鎖申請與核准解鎖。
30. 已解鎖資料修改後，未完成配送任務會同步地址、聯絡人、數量與品項狀態。
31. 通知單 CSV 匯出會拆分多里別資料，輸出為單一里別一列。
32. 稽催／統計頁可顯示里別清冊涵蓋數、已設站數、未設站數與未設站里別提醒文字。
33. 管理作業入口需先輸入管理碼，驗證通過後本次頁面工作階段可進入管理頁。
34. 稽催／統計頁可顯示宣導品配送完成率，以及各行政區全部場次、已發布場次與未回報場次。
35. GAS 後台執行後端作業時會暫時停用按鈕，成功或失敗後恢復。
36. 表單錯誤會透過 `formatErrorMessage()` 顯示「請先修正下列問題」與下一步。
37. `queueUrl` 空白或無效時，民眾端不顯示叫號按鈕；有效網址需為 `http://` 或 `https://` 開頭。
38. `isOpen = false` 時，民眾端會顯示暫停開放摘要與訊息，並清空接種站列表。
39. 宣導品配送任務以接種站資料 ID 與宣導品 ID 防重，既有未取消任務與同次新建任務都會納入判斷。
40. `scripts/rwd-check.mjs` 可驗證民眾端手機與桌機版面，並產生截圖證據。
41. `assertNoDuplicateSite_()` 會檢查同行政區、同里別、同接種日期的未下架資料，新增與修改都會套用。
42. `calculateRate_()` 會區分空白與 `0`，避免未回報資料被誤顯示為 `0%`。
43. `scripts/local-check.mjs` 會檢查 GAS 回報接種人數頁具備手機 viewport、觸控高度、卡片列表、數字鍵盤輸入與回報按鈕。
44. `validateSite_()` 會檢查接種日期是否為真實日期，並要求設站時間為合法 24 小時制且結束時間晚於開始時間。
45. `scripts/local-check.mjs` 會檢查民眾端地圖連結 fallback，確保 `mapUrl` 空白時仍可用地址或地點名稱產生 Google Maps 搜尋連結。
46. `scripts/local-check.mjs` 會檢查 `public/public.json` 只含公開欄位，並阻擋醫療院所代碼、接種人數、接種率、填報人、管理碼與宣導品配送聯絡資料等內部欄位。
47. `scripts/local-check.mjs` 會掃描民眾端 `public/` 檔案，阻擋 GA、GTM、Facebook Pixel、Hotjar、Clarity、LIFF、OAuth 與登入 SDK。
48. `scripts/local-check.mjs` 會檢查民眾端 JSON 讀取失敗摘要、查無資料下一步按鈕、`source=line` 提示與 `siteId/district/village/date/keyword/source` URL 參數。
49. `docs/DEPLOYMENT_RECORD.md` 已記錄 2026-07-03 Firebase Hosting 測試部署；目前線上 `public.json` 仍為範例公開資料，正式測試後需改由 GAS 產生並重新部署。
50. `scripts/online-check.mjs` 會檢查 `https://tychb-vaccineweb.web.app` 首頁、`public.json`、`app.js` 的線上可讀性、公開 JSON 欄位與追蹤／登入 SDK。
51. `docs/DEPLOYMENT_RECORD.md` 已記錄 GAS 正確專案推送與 Web App 版本 `2` 部署資訊，包含 Script ID、Deployment ID、Web App URL 與 403 待確認事項。
52. `scripts/local-check.mjs` 會檢查民眾端外開連結使用 `noopener noreferrer`，且 `public/app.js` 不使用 inline `onclick`。
53. `docs/DEPLOYMENT_RECORD.md` 已記錄民眾端第 1 批 5 項修正後的 Firebase Hosting 重新部署資訊。
54. `scripts/online-check.mjs` 會檢查線上 `app.js` 外開連結、inline handler、空狀態按鈕、`Cache-Control: no-cache` 與首頁個資聲明。
55. 民眾端 UI 目前採溫暖健康導覽視覺，`public/index.html` 保留原本資料綁定 ID，主要樣式集中於 `public/styles.css`。
56. `docs/DEPLOYMENT_RECORD.md` 已記錄民眾端 UI 優化版 Firebase Hosting 重新部署資訊。
57. `public/app.js` 的 `syncQuickActionState()` 會同步快速查詢按鈕的 `is-active` 與 `aria-pressed`，只影響 UI 狀態，不改查詢條件邏輯。
58. `docs/DEPLOYMENT_RECORD.md` 已記錄民眾端 UI 第 2 批細節優化的 Firebase Hosting 重新部署資訊。
59. `scripts/gas-webapp-check.mjs` 會檢查 GAS Web App 正確 `/exec` 連結與首頁功能入口，不輸入管理碼、不送出表單、不寫入 Google Sheet。
60. `scripts/gas-write-check.spec.mjs` 會在允許寫入時使用假資料測試 GAS 寫入流程，並在結尾下架測試資料與確認公開 JSON 不含測試資料。
61. `objectFromRow_()` 會透過 `serializeSheetValue_()` 將 Sheet 日期轉成可序列化字串；這是 GAS 線上 `listSites()`、`getAppData()`、`buildPublicJson()` 正常回傳的關鍵保護。

### 尚需實機驗證

以下功能需在 Google Apps Script 測試專案中驗證，詳細步驟請依 `docs/GAS_TEST_CHECKLIST.md`：

1. `publishSite()` 是否正確發布並產生配送任務。
2. `updateSite()` 是否正確修改未鎖定資料。
3. 異動紀錄是否逐項寫入。
4. 廠商登入與配送回報是否符合實際工作表資料。
5. 管理碼審核解鎖流程。
6. 正式已發布資料產生的 `public.json` 是否可放入 Firebase 前台。

## 18. 下一步建議

1. 請承辦人用瀏覽器登入 `tychbniis@gmail.com`，開啟 GAS Web App `/exec`，完成 Apps Script 首次授權並確認部署存取權。
2. 在測試 Google Sheet 執行 `setupWorkbook()`。
3. 使用假資料測試新增、發布、產生 JSON。
4. 將產生的 JSON 放到 `public/public.json`。
5. 進行手機與 LINE 內建瀏覽器測試。
6. 再逐步補齊完整宣導品管理、廠商回報、稽催統計、匯出功能。
