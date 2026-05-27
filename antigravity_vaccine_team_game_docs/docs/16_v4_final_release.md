# 第 4 版定版紀錄

## 定版結論

第 4 版以 `0.4.28` 作為定版版本。此版本完成「靜態 HTML5 優先、低 GAS 呼叫、免費方案穩定」的重構方向，並將課堂小遊戲的即時體驗移到學員端與投影端，GAS 僅保留必要紀錄、去重、排行榜快照、獎項與報表。

## 定版日期

2026-05-27

## 定版部署

| 項目 | 定版值 |
|---|---|
| 學員端 Hosting | https://tychbniis-32af5-student.web.app |
| 講師手機端 | https://tychbniis-32af5-instructor.web.app/Instructor.html |
| 大螢幕投影端 | https://tychbniis-32af5-instructor.web.app/Display.html |
| 前端版本 | `0.4.28` |
| GAS Web App deployment | `@51` |
| Cloud Functions | 未啟用 |
| Cloud Run | 未啟用 |
| Blaze | 未啟用 |
| 靜態資料範本 | `data/v4_static_game_config.example.json` |

## 定版功能範圍

1. 學員端、講師手機端與大螢幕投影端拆分為靜態 HTML5 頁面。
2. 學員端登入後依場次種子與玩家資料建立本機寶箱、道具與成就資料。
3. 學員端作答後由前端判斷正誤、答題分、個人道具分、成就與寶箱提示。
4. GAS 接收作答結果，並以 `gameId + playerId + questionId` 去重。
5. 排行榜只在講師關題後產生 Firebase 快照，學員端只有開啟懸浮排行榜時讀取。
6. 一般加分卡與挑戰卡由前端立即計分並顯示已套用。
7. 加倍卡與翻身卡保留待套用狀態，待下一題或後端確認後顯示已套用。
8. 講師按下結算後，投影端先顯示 15 秒最後道具使用倒數，後台約 20 秒後正式結算。
9. 幸運獎由最終結算確認；若無幸運箱紀錄，從現有玩家中指定 1 名。
10. 全對獎由學員端先判斷並回傳候選，GAS 最終取最快完成且全對者前 3 名。
11. 第 4 版移除創作題、隊內初選、匿名全體票選與首答加分。

## 定版計分規則

```text
個人積分 = 答題得分 + 道具加分
戰隊積分 = 各題答題平均分加總 + 全隊道具加分
```

答題時間以講師開題後 65 秒倒數為基準。剩餘 65 到 60 秒皆記為 1 秒；剩餘 59 秒時記為 1 秒，剩餘 58 秒時記為 2 秒，依此類推。

第 4 版取消首答加分，排行榜不顯示答對率。

## 定版資料責任

### 學員端

1. 顯示報到、作答、倒數、成就、寶箱、道具與個人結果。
2. 本機計算答題結果、寶箱內容、成就進度與立即型道具分。
3. 使用 localStorage 鎖定已送出狀態，降低重複點擊與網路重送風險。
4. 送出作答、道具、幸運箱、全對候選紀錄到 Firebase 或 GAS。

### 講師手機端

1. 輸入管理密碼。
2. 啟動或初始化場次。
3. 選擇題目、開題、重新開題、關題計分。
4. 觸發結算前倒數與正式結算。
5. 匯出賽後報表。

### 大螢幕投影端

1. 顯示目前狀態、題目、選項與答題倒數。
2. 關題關閉後，以醒目方式標示正確答案並顯示解析。
3. 顯示前 5 名戰隊排行榜。
4. 結算時顯示最後道具使用倒數、結算中提示與最終排名。

### GAS / Google Sheets

1. 建立與初始化資料表。
2. 發布公開題庫與公開 gameState。
3. 接收與去重作答資料。
4. 關題關閉後批次計分並產生排行榜快照。
5. 結算前同步 pending 道具使用紀錄。
6. 產生幸運獎、全對獎與賽後報表。

### Firebase Realtime Database

1. `gameState/{gameId}`：公開場次狀態、題號、倒數與答案公布。
2. `publicQuestions/{gameId}`：公開題庫快取。
3. `answers/{gameId}/{questionId}/{playerId}`：學員快速送答暫存。
4. `itemUses/{gameId}/{itemId}`：道具使用暫存。
5. `publicScoreboards/{gameId}`：排行榜快照。

## 定版測試清單

已完成：

1. `node --check frontend/student/dist/app.js`
2. `node --check frontend/instructor/dist/app.js`
3. `node --check frontend/instructor/dist/display.js`
4. `npm run check:functions`
5. `git diff --check`
6. 線上學員端、講師手機端、投影端載入檢查。
7. GAS `getGameState` 回應 `ok:true`。

正式活動前仍需人工驗收：

1. 講師端初始化遊戲。
2. 4 名以上測試學員報到。
3. 開題、作答、關題、答案公布。
4. 使用一般加分卡、挑戰卡、加倍卡、翻身卡。
5. 關題關閉後排行榜快照更新。
6. 結算前 15 秒投影端倒數。
7. 約 20 秒後正式結算與最終排名。
8. 賽後報表匯出。

## 已知限制

1. 第 4 版為課堂小遊戲，暫不以防止惡意改封包為主要目標。
2. 學員端可讀取題庫答案，這是降低 GAS 呼叫與免費方案負載的設計取捨。
3. Cloud Functions、Cloud Run、Blaze 未啟用。
4. 完整重新開局活動測試會清空目前場次資料，需由講師確認後執行。

## 還原方式

1. 程式碼：使用 `git revert` 還原定版後 commit。
2. GAS：回退上一個 Web App deployment。
3. Hosting：於 Firebase Hosting Console 回復上一版 release。
4. Google Sheets：使用試算表版本紀錄或備份檔回復。

## 定版後維護原則

1. 活動前先執行初始化與題庫同步。
2. 不把管理密碼、Token 或服務帳戶憑證寫入程式。
3. 不在正式活動中新增高頻 GAS 輪詢。
4. 若需新增功能，先更新 `docs/AI_HANDOVER.md` 與路線圖，再做小範圍修改。
