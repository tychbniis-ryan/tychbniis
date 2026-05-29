# 第 5 版定版紀錄

日期：2026-05-29

定版版本：`0.5.24`

定版 commit：`f270e52`

GAS Web App deployment：`@63`

Firebase Hosting：

- 學員端：https://tychbniis-32af5-student.web.app
- 講師端：https://tychbniis-32af5-instructor.web.app
- 投影端：https://tychbniis-32af5-instructor.web.app/Display.html

## 定版範圍

第 5 版定版範圍為疫苗守護戰隊挑戰賽的像素風視覺優化、寶箱與道具流程、挑戰卡動畫、排行榜呈現、追加寶箱、落後寶箱與道具計分同步。

## 最終狀態

1. 學員端、講師端、投影端已套用第 5 版像素風 UI。
2. 寶箱、道具、成就、挑戰卡、排行榜已完成主要視覺優化。
3. 挑戰卡採用抽號動畫與本機端即時加分。
4. 加分卡、挑戰卡、翻身卡等道具只允許在關題後使用。
5. 學員端使用道具只寫入 Firebase，不即時呼叫 GAS 重算排行榜。
6. 講師關題計分與最終結算時，GAS 會同步 pending 道具分並重算排行榜。
7. 空寶箱只顯示趣味回應，不顯示扣分或不扣分等系統語句。
8. 追加寶箱與落後寶箱採用由講師啟用、學員端預先分配內容物的方式，避免現場等待大量運算。

## 定版測試

本次定版前已完成下列檢查：

```powershell
node --check frontend\student\dist\app.js
node --check gas\Code.gs
git diff --check
npm run check:functions
```

部署狀態：

```text
GAS deployment: @63
Firebase Hosting: deployed
```

## 後續維護原則

1. 第 5 版定版後，若只修 bug，請使用 `0.5.25` 之後的版本號。
2. 若要新增大型玩法或流程，請另開第 6 版文件。
3. 修改前先讀：
   - `docs/AI_HANDOVER.md`
   - `CHANGELOG.md`
   - `docs/18_v5_final_release.md`
4. 線上問題優先確認：
   - GAS deployment 是否仍為 `@63` 或更新版本
   - Firebase Hosting 是否已部署
   - 學員端是否讀到最新 `app.js` cache 參數

## 還原方式

如第 5 版定版後發生問題：

1. Git 可回到定版 commit：`f270e52`
2. GAS 可回退到前一個穩定 deployment。
3. Firebase Hosting 可由 Firebase Console 回復前一個 release。

