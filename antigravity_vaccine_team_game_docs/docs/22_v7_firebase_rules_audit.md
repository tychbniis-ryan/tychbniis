# 第 7 版 Firebase Rules 本機檢查

作業日期：2026-06-02

目前版本：`0.7.13`

## 檢查目的

配合第 7 版「Firebase 即時主資料層 + GAS 背景工作者 / 行政後端」架構，確認 Realtime Database rules 的安全邊界。

本文件是本機檢查紀錄，不代表已部署。

## 本次結論

目前本機 rules 符合第 7 版架構方向：

1. 公開讀取節點只限必要的公開資訊。
2. 學員端可寫入報到與作答，但只能建立一次。
3. 排行榜、gameState、批次狀態、匯出資料與活動 log 只允許管理員或服務帳戶寫入。
4. Cloud Functions 不列為必要路線，GAS 可用服務帳戶身分處理管理節點。

## 公開讀取節點

| 節點 | 讀取 | 寫入 |
|---|---|---|
| `gameState/{gameId}` | public | 管理員 / 服務帳戶 |
| `publicQuestions/{gameId}` | public | 管理員 / 服務帳戶 |
| `publicScoreboards/{gameId}` | public | 管理員 / 服務帳戶 |

用途：

1. 學員端讀取開題、關題與公布答案。
2. 學員端讀取公開題庫。
3. 學員端讀取排行榜快照。

## 學員可寫節點

| 節點 | 規則 |
|---|---|
| `players/{gameId}/{playerId}` | 只能建立一次，`gameId` 與 `playerId` 必須符合路徑 |
| `answers/{gameId}/{questionId}/{playerId}` | 只能建立一次，`gameId`、`questionId`、`playerId` 必須符合路徑 |
| `itemUses/{gameId}/{itemId}` | 只能建立一次，狀態必須為 `pending` |
| `treasureBoxOpenRequests/{gameId}/{boxId}` | 只能建立一次，狀態必須為 `opened_request` |
| `achievementClaimRequests/{gameId}/{claimId}` | 只能建立一次，狀態必須為 `pending` |
| `creativeSubmissions/{gameId}/{questionId}/{playerId}` | 只能建立一次 |
| `creativeTeamVotes/{gameId}/{questionId}/{playerId}` | 只能建立一次 |
| `creativeFinalVotes/{gameId}/{questionId}/{playerId}` | 只能建立一次 |

風險配套：

1. 學員端不可覆寫既有報到或作答。
2. 學員端不可直接寫排行榜。
3. 學員端不可直接寫 gameState。
4. 學員端不可直接寫批次狀態。

## GAS 管理節點

本機 rules 已補上第 7 版 GAS 背景工作者需要的管理節點：

| 節點 | 讀取 | 寫入 | 用途 |
|---|---|---|---|
| `settlementBatches/{gameId}/{closeSequence}` | 管理員 / 服務帳戶 | 管理員 / 服務帳戶 | 計分批次狀態 |
| `activityLogs/{gameId}/{logId}` | 管理員 / 服務帳戶 | 管理員 / 服務帳戶 | 活動管理紀錄 |
| `exports/{gameId}` | 管理員 / 服務帳戶 | 管理員 / 服務帳戶 | 活動後匯出暫存 |

## 不部署提醒

本次沒有部署 Firebase rules。

部署前必須再次確認：

1. Firebase 專案 ID 是否正確。
2. 管理員 email 是否正確。
3. 服務帳戶 email 是否正確。
4. 是否仍需要相容既有第 6 版正式入口。
5. 是否已在測試 gameId 完成端到端測試。

部署指令只有在承辦人明確確認後才可執行：

```powershell
npm run deploy:rules
```

## 下一步

下一步建議檢查 GAS 管理 API：

1. 是否能讀 `players/{gameId}`。
2. 是否能讀 `answers/{gameId}/{questionId}`。
3. 是否能寫 `settlementBatches/{gameId}`。
4. 是否能寫 `publicScoreboards/{gameId}`。
5. 是否能將活動資料匯出到 Google Sheets。

---

## 2026-06-09 更新：0.7.15 rules 調整

1. 新增 `publicPlayers/{gameId}/{playerId}`：
   - `.read: true`
   - 學員端只能寫入自己的精簡報到資料一次。
   - 不保存 `clientKeyHash`。
2. 新增 `publicAnswers/{gameId}/{questionId}/{playerId}`：
   - 只在 `gameState/{gameId}.status === question_closed` 時可讀。
   - 學員端只能寫入自己的精簡答題資料一次。
   - 不保存 `clientKeyHash`。
3. `players` 與原始 `answers` 仍保持私有讀取，只允許管理端 / service account 讀取。
4. `publicScoreboards/{gameId}` 新增 proof-protected direct write：
   - `source` 必須是 `instructor_direct_firebase`。
   - `instructorCommandId` 必須對應 `adminProofs`。
   - `adminProofs` 內的 secret 必須符合私有 `adminSecrets`。
   - proof 狀態必須是 `scoreboard_update`。
5. `gameState/{gameId}` 仍使用 proof-protected direct write 讓講師端快速開題 / 關題。
6. 已執行並通過：
   - `node -e` JSON 檢查。
   - `firebase deploy --only database --dry-run`。
   - `firebase deploy --only database`。
7. 風險判斷：
   - 目前仍使用管理密碼 proof 機制，適合單次活動與非長期公開系統。
   - 若未來要長期常態使用，建議改為 Firebase Auth + custom claims 或 Cloud Run / Cloud Functions 管理寫入權限。
