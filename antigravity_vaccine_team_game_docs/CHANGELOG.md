# CHANGELOG

## 0.1.0 - 2026-05-20

### feat

- 建立第 1 版最小可執行系統骨架。
- 新增學員端本機測試頁面。
- 新增講師端本機測試頁面。
- 新增 Cloud Functions TypeScript 骨架。
- 新增本機靜態伺服器啟動指令。
- 新增 Firebase 專案設定範例 `.firebaserc.example`。
- 新增 `app/config/modules.json` 作為功能模組登記表。
- 新增根目錄 `firebase.json`，讓 Firebase CLI 可直接從專案根目錄部署。
- 建立 Firebase Hosting site：`tychbniis-32af5-student` 與 `tychbniis-32af5-instructor`。
- 完成學員端與講師端 Hosting 部署。
- 建立 Realtime Database instance：`tychbniis-32af5-default-rtdb`。
- 完成 Realtime Database rules 部署。
- 建立 Firestore database：`(default)`，位置 `asia-east1`。
- 完成 Firestore rules 部署。
- 新增 GAS 免費方案後端骨架，取代第 1 版 Cloud Functions 判斷流程。
- GAS 後端支援報到、自動分隊、開題、作答、關題與基本計分。
- 新增學員端 GAS API 封裝與前端設定檔。
- 新增講師端 GAS API 封裝、GAS URL 設定與管理密鑰輸入。
- 重新部署 Firebase Hosting，更新學員端與講師端線上頁面。
- 新增 GAS `doGet` JSONP 入口，前端預設使用 JSONP 呼叫 GAS Web App。

### docs

- 新增 `docs/AI_HANDOVER.md`，供下一位維護者或 AI 接手。
- 記錄 Firebase project 與 Hosting URL。
- 記錄 Cloud Functions 因 Blaze 方案限制尚未部署，並改採 GAS Web App 作為第 1 版後端。
- 新增 `docs/10_gas_web_app_deployment.md`。
