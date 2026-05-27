# 03 Firestore Schema

## 第 4 版定版狀態

第 4 版定版後，Firestore 不作為主要資料庫使用。
目前正式流程採用：

1. Firebase Hosting：提供靜態學員端、講師手機端、大螢幕投影端。
2. Realtime Database：提供公開場次狀態、排行榜快照與臨時送出紀錄。
3. Google Sheets / GAS：作為正式成績、賽後報表與後端去重來源。

定版版本：`0.4.28`
定版日期：2026-05-27
定版文件：`docs/16_v4_final_release.md`

## 為何不啟用 Firestore

第 4 版目標是可在免費額度與低維運成本下使用。
Firestore、Cloud Functions 與 Cloud Run 若重新納入即時運算，會增加以下負擔：

1. 規則維護成本增加。
2. 讀寫次數增加。
3. 部署與除錯步驟增加。
4. 對非工程維運者不易交接。

因此第 4 版定版資料模型不依賴 Firestore collection。

## 保留原則

若未來版本需要重新啟用 Firestore，請遵守以下規則：

1. 不存放帳密、Token、Cookie 或服務帳戶憑證。
2. 不存放完整身分證字號、完整個資或敏感資料。
3. 不將 Firestore 作為每題即時計分核心。
4. 不讓學員端依賴 Firestore 即時計算排行榜。
5. 新增 collection 前，必須先更新 `docs/02_architecture_github_firebase_gas.md`、`docs/04_realtime_database_schema.md`、`docs/AI_HANDOVER.md` 與 `CHANGELOG.md`。

## 歷史 collection

以下 collection 為早期規劃或第 3 版概念，於第 4 版定版流程中不啟用：

```text
games/{gameId}
teams/{teamId}
players/{playerId}
questions/{questionId}
answerKeys/{questionId}
answers/{answerId}
items/{itemId}
achievements/{achievementId}
submissions/{submissionId}
votes/{voteId}
scoreboards/{scoreboardId}
auditLogs/{logId}
```

## 替代位置

| 資料類型 | 第 4 版位置 |
|---|---|
| 題庫與答案 | 靜態 JSON、Google Sheets、Realtime Database `publicQuestions` |
| 場次狀態 | Realtime Database `gameState` |
| 作答臨時紀錄 | Realtime Database `answers` |
| 道具臨時紀錄 | Realtime Database `itemUses` |
| 排行榜快照 | Realtime Database `publicScoreboards` |
| 正式成績 | Google Sheets |
| 賽後報表 | Google Sheets / GAS |

## 維護注意事項

1. 不需要為第 4 版建立 Firestore index。
2. 不需要部署 Firestore rules 作為第 4 版必要步驟。
3. 若 Firebase Console 中仍有舊 collection，視為歷史資料，不影響第 4 版運作。
