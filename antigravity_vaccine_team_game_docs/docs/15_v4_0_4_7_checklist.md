# 第 4 版 0.4.1 至 0.4.7 檢查紀錄

## 完成項目

1. `0.4.1`：移除學員端與講師端創作題、隊內初選與匿名全體投票入口。
2. `0.4.2`：新增第 4 版靜態資料格式範本。
3. `0.4.3`：學員端支援優先載入靜態設定，送答時寫入本機計算欄位。
4. `0.4.4`：學員端限制關題後 3 分鐘內使用道具，並寫入道具去重欄位。
5. `0.4.5`：學員端排行榜只用浮動按鈕手動讀取 Firebase 快照，不回退 GAS。
6. `0.4.6`：GAS 取消首答加分，新增幸運箱開啟與全對候選紀錄 API。
7. `0.4.7`：完成本機語法、JSON、Functions 與差異檢查，整理交接文件。

## 未部署項目

1. 2026-05-25 已部署 Firebase Hosting 學員端與講師端。
2. 2026-05-25 已更新 GAS Web App deployment 至 version `37`。
3. 尚未部署 Firebase rules。
4. 未啟用 Cloud Functions、Cloud Run 或 Blaze。

## 線上檢查

1. 學員端：https://tychbniis-32af5-student.web.app，回應 `200`，已載入 `app.js?v=0.4.7`。
2. 講師端：https://tychbniis-32af5-instructor.web.app，回應 `200`，已載入 `app.js?v=0.4.7`。
3. GAS `getGameState` 回應 `ok:true`。
4. GAS `recordLuckyBoxOpened` 與 `recordPerfectAwardCandidate` 已存在。

## 下一步

1. 正式部署前，先由講師端測試第 3 版既有主流程仍可使用。
2. 建立實際 `v4-static-config.json` 時，不放入真實個資或密鑰。
3. 後續若修改 Realtime Database rules，需另行部署 rules 並測試學員端快速寫入。
