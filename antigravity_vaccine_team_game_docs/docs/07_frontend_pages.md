# 07 前端頁面規格

## 學員端

| 頁面 | 路徑 | 功能 |
|---|---|---|
| 進入頁 | / | 輸入暱稱、閱讀個資提示 |
| 分隊頁 | /team | 顯示所屬戰隊 |
| 等待頁 | /waiting | 等待講師開題 |
| 作答頁 | /question/:id | 題目與選項 |
| 結果頁 | /result/:id | 顯示得分、答對或答錯、解析 |
| 道具頁 | /items | 寶箱與道具 |
| 成就頁 | /achievements | 成就進度 |
| 排行榜 | /scoreboard | 戰隊排行榜 |
| 創作投稿 | /creative/:id | 提交創作題 |
| 投票頁 | /vote/:id | 隊內初選或全體票選 |

## 講師端

| 頁面 | 路徑 | 功能 |
|---|---|---|
| 登入頁 | /admin/login | 管理員登入或 token |
| 場次管理 | /admin/game | 建立、啟動、暫停、結束 |
| 報到監控 | /admin/checkin | 查看報到人數與戰隊分布 |
| 題目控制 | /admin/questions | 開題、關題、顯示解析 |
| 計分控制 | /admin/scoring | 批次計分、重新計分 |
| 排行榜 | /admin/scoreboard | 顯示或隱藏排行榜 |
| 創作題審核 | /admin/creative | 從每隊前 3 名中選 1 則 |
| 得獎名單 | /admin/winners | 全對獎、幸運獎、成就獎 |
| 匯出資料 | /admin/export | 匯出 CSV / Google Sheets |
