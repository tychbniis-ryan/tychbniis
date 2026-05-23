# 第 3 版效能優化收斂紀錄（0.3.21 至 0.3.22）

## 目標

在不啟用 Blaze、不使用 Cloud Functions、不使用 Cloud Run、不新增付費服務的前提下，降低約 200 人同時操作時的等待時間。

## 已完成

1. 學員送答優先寫入 Firebase `answers`，按下後立即回饋。
2. 道具使用改為關題後排程，下一題開放時由學員端背景送出 `itemUses`。
3. 寶箱內容於發放前預先決定，開箱時不再臨時計算機率。
4. 第 1 次開題時，GAS 會為當時玩家建立 `TreasureRewardPool`。
5. 後加入玩家在報到或同步 Firebase players 時補建立寶箱預配資料。
6. 學員端不再顯示戰隊排行榜入口，頂端只顯示個人得分與道具使用分。
7. 講師關題先回傳正確答案與解題說明，再由講師端自動呼叫 1 次 `scoreClosedQuestion` 完成計分與排行榜更新。
8. 排行榜改以每題戰隊平均分加總，避免後加入玩家拉低前面題目的平均分。
9. 寶箱與成就紅點只在有可操作項目時顯示。
10. 正式成績仍以 GAS 賽後結算為準。

## 定版版本

| 項目 | 定版值 |
|---|---|
| 前端版本 | `0.3.22` |
| GAS deployment | version `36` |
| 學員端 | https://tychbniis-32af5-student.web.app |
| 講師端 | https://tychbniis-32af5-instructor.web.app |
| Cloud Functions | 未啟用 |
| Cloud Run | 未啟用 |
| Blaze | 未啟用 |

## 定版檢查

1. `node --check frontend/student/dist/app.js`
2. `node --check frontend/student/dist/api.js`
3. `node --check frontend/instructor/dist/app.js`
4. `node --check frontend/instructor/dist/api.js`
5. GAS 語法檢查
6. JSON 設定檔解析
7. `npm run check:functions`
8. `git diff --check`

## 現場操作重點

1. 正式活動前先在講師端初始化遊戲資料。
2. 學員登入後只看個人得分與道具使用分，不看戰隊排行。
3. 講師關題後會先看到答案與說明，排行榜稍後由講師端自動更新。
4. 若排行榜未即時更新，講師端可手動按「重新讀取排行榜」。
5. 賽後請使用 GAS 正式結算與匯出報表作為正式成績。

## 保留限制

1. 活動中成績是暫時計分，正式結果以賽後 GAS 重新計分為準。
2. 學員端本機頂端分數是操作回饋用估算，不作為正式排名依據。
3. 免費方案下仍需避免學員端高頻刷新排行榜、寶箱、成就。
