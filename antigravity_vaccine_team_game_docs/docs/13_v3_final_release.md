# 第 3 版定版紀錄

## 定版結論

第 3 版以 `0.3.22` 作為定版版本。此版本已完成寶箱、道具、成就、創作題、排行榜、競賽結算與免費方案效能重構的主要需求。

## 定版日期

2026-05-23

## 定版部署

| 項目 | 狀態 |
|---|---|
| 學員端 Hosting | https://tychbniis-32af5-student.web.app |
| 講師端 Hosting | https://tychbniis-32af5-instructor.web.app |
| 前端版本 | `0.3.22` |
| GAS Web App deployment | version `36` |
| Git 定版 commit | `5f446ed` 後續定版文件 commit |
| Cloud Functions | 未部署 |
| Cloud Run | 未啟用 |
| Blaze | 未啟用 |

## 定版功能範圍

1. 學員端報到、作答、寶箱、道具、成就、創作投稿與投票。
2. 講師端啟動場次、開題、關題、公布解答、後台計分、排行榜與結算競賽。
3. Google Sheets 保留題庫、設定、正式結算與賽後報表用途。
4. Firebase Hosting 提供學員端與講師端。
5. Realtime Database 提供公開 gameState、publicQuestions 與排行榜快照。
6. 比賽中高頻操作優先走 Firebase 快速寫入，GAS 保留管理、關題、結算與正式報表。

## 第 3 版效能定版原則

1. 學員端不再高頻呼叫 GAS 取得排行榜或個人摘要。
2. 學員端頂端只顯示個人得分與道具使用分，不顯示戰隊排行。
3. 講師關題先回傳解答與說明，再由講師端單次觸發後台計分。
4. 排行榜只由講師端關題後更新，不由學員端集體刷新。
5. 寶箱內容在發放前決定，開箱時只讀既有結果。
6. 正式成績以賽後 GAS 重新計分為準。

## 定版測試清單

已執行並通過：

1. `node --check frontend/student/dist/app.js`
2. `node --check frontend/student/dist/api.js`
3. `node --check frontend/instructor/dist/app.js`
4. `node --check frontend/instructor/dist/api.js`
5. GAS 語法檢查
6. JSON 設定檔解析
7. `npm run check:functions`
8. `git diff --check`

## 操作驗收建議

定版後仍需使用正式瀏覽器流程做人工驗收：

1. 講師初始化遊戲資料。
2. 學員報到。
3. 講師開第 1 題。
4. 學員作答。
5. 講師關題後立即看到解答與說明。
6. 講師端稍後看到排行榜更新。
7. 學員端頂端只顯示個人得分與道具使用分。
8. 學員於關題後使用道具，下一題開放時背景送出。
9. 寶箱與成就紅點只在有可操作項目時顯示。
10. 講師執行結算競賽，學員端顯示最後成績與得獎提示。

## 還原方式

1. 程式碼：使用 `git revert` 還原定版後的 commit。
2. GAS：將 Web App deployment 切回前一版，例如 version `35`。
3. Hosting：在 Firebase Hosting Console 回復上一個 release。

## 免費方案確認

本定版未啟用 Cloud Functions、Cloud Run、Blaze 或任何需付費帳務的服務。
