# 第 7 版定版紀錄

定版日期：2026-06-12

定版版本：`0.7.40`

定版 commit：`67274bf`

## 一、正式使用網址

1. 學員端：
   `https://tychbniis-32af5-student.web.app`

2. 講師端與投影端：
   `https://tychbniis-32af5-instructor.web.app`

3. 投影端頁面：
   `https://tychbniis-32af5-instructor.web.app/Display.html`

4. 第 7 版講師測試頁：
   `https://tychbniis-32af5-instructor.web.app/InstructorV7.html`

## 二、正式部署狀態

1. Firebase Hosting 已部署 `0.7.40`。
2. GAS Web App 正式 deployment 已更新至版本 `116`。
3. GAS deployment ID 維持不變：
   `AKfycbzZ9gNIsS70ihBG0dWCgtFKh4wuJaM0ttYqwSfG6dqGDRBHtgq-Ui7UtC_1GDEYm4u5`
4. 專案架構維持 Firebase 為主、GAS 為輔。
5. 本版未使用 Cloud Functions 或 Cloud Run。

## 三、定版範圍

本次第 7 版定版包含：

1. Firebase 優先的即時遊戲流程。
2. 學員端答題、寶箱、成就、道具使用。
3. 講師端開題、關題、追加寶箱、落後寶箱、結算競賽。
4. 投影端題目、解析、戰隊排行榜。
5. 道具分與答題分的排行榜一致性修正。
6. 題組型題目與解析的可讀性調整。
7. 30% 正答寶箱觸發修正。
8. 道具使用後造成排行榜少算 Firebase 作答紀錄的修正。

## 四、定版驗證結果

目前已完成下列驗證：

1. `node --check frontend\student\dist\app.js` 通過。
2. `node --check frontend\instructor\dist\display.js` 通過。
3. `git diff --check` 通過。
4. Firebase Hosting 部署成功。
5. GAS Web App deployment 更新成功。
6. 後台資料驗算：
   - `AAA` 共 50 題作答。
   - 答對 42 題。
   - 答題分合計 `1010`。
   - 道具分合計 `23`。
   - 個人總分 `1033`。
   - 單人隊伍情境下，戰隊總分同為 `1033`。

## 五、計分規則定版說明

1. 個人分數：
   `個人答題分加總 + 已納入排行榜的個人道具分`

2. 戰隊分數：
   `各題答題平均分加總 + 戰隊道具分`

3. 多人時，戰隊分數不必然等於任一位學員個人分數。

4. 道具分以關題時序納入排行榜：
   - 本題關題後使用的道具，不在本題排行榜立即納入。
   - 後續關題時，會納入先前已使用且尚未計入的道具分。
   - 以題號與關題序列追蹤，避免重複計算。

5. 講師若跳題出題，仍以實際開題順序與關題序列計算，不以題號大小排序。

## 六、Blaze 使用判斷

1. 目前版本可直接在 Spark 方案下使用。
2. 若活動需要約 200 人同時在線，建議活動前升級 Firebase Blaze。
3. 本版沒有使用 Cloud Functions，因此升級 Blaze 不會改變目前程式流程。
4. 升級 Blaze 後，現有網址、Realtime Database 路徑與 Hosting 部署不需要更改。
5. 活動結束後，可在 Firebase Console 降回 Spark。
6. Blaze 應設定 Google Cloud Budget 警示，但 Budget 警示不是硬性停用上限。

## 七、操作前檢查

活動正式使用前，建議執行：

1. 清空測試資料。
2. 用 2 至 5 位測試學員加入。
3. 開 2 至 3 題。
4. 測試：
   - 作答。
   - 關題關閉。
   - 寶箱開啟。
   - 道具使用。
   - 追加寶箱。
   - 落後寶箱。
   - 投影端排行榜。
   - 最終結算。
5. 後台抽查 `publicScoreboards` 是否與學員端、投影端一致。

## 八、還原方式

若正式活動前發現異常，優先採用下列方式還原：

1. Firebase Hosting：
   - 回到 Firebase Console 的 Hosting release history。
   - 選擇前一個穩定 release rollback。

2. GAS：
   - 使用 Apps Script deployment 管理頁。
   - 將正式 deployment 指回前一個穩定 version。

3. Git：
   - 目前定版基準 commit 為 `67274bf`。
   - 若後續修改出問題，可比對此 commit 還原。

## 九、已知限制

1. Spark 方案適合小型活動與約 50 人規模。
2. 100 人以上同時在線可能受 Spark 同時連線限制影響。
3. 200 人活動建議使用 Blaze。
4. 本版不保存長期歷史紀錄，正式活動後若需留存成績，應另外匯出。
5. 若活動中網路不穩，學員端可能需要重新整理以重新取得即時狀態。
