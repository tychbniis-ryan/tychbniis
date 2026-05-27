# 04 Realtime Database Schema

## 第 4 版定版用途

第 4 版以 Realtime Database 作為「前端同步狀態」與「臨時紀錄區」。
正式成績、賽後報表與後端去重仍以 Google Sheets / GAS 為準。

定版版本：`0.4.28`
定版日期：2026-05-27
定版文件：`docs/16_v4_final_release.md`

## 設計原則

1. 不存放帳密、Token、Cookie 或服務帳戶憑證。
2. 不存放敏感個資。
3. 學員端可讀取公開題目、場次狀態、排行榜快照。
4. 學員端送出的答案與道具使用紀錄，後端需用 `gameId + playerId + questionId` 或 `clientItemUseId` 去重。
5. 不以防止惡意改封包為主要目標，僅處理重複點擊、重新整理、網路重送。

## gameState

路徑：

```text
gameState/{gameId}
```

用途：投影端與學員端讀取目前場次狀態。

```json
{
  "gameId": "game_2026_vaccine_training",
  "status": "created|question_open|question_closed|finalizing_countdown|finalized",
  "currentQuestionId": "q001",
  "currentQuestionNumber": 1,
  "questionOpenedAt": 1760000000000,
  "questionClosedAt": null,
  "sessionStartedAt": 1760000000000,
  "gameSessionSeed": "session_seed_20260527_001",
  "answerTimeLimitSeconds": 65,
  "allowFreeTeamChoice": false,
  "openedQuestionIds": {
    "q001": true
  },
  "finalizingStartedAt": null,
  "finalItemUseEndsAt": null,
  "finalSettlementRunsAt": null,
  "updatedAt": 1760000000000,
  "publicQuestion": {
    "questionId": "q001",
    "questionNumber": 1,
    "title": "示範題目",
    "options": {
      "A": "選項 A",
      "B": "選項 B",
      "C": "選項 C",
      "D": "選項 D"
    }
  },
  "answerReveal": {
    "questionId": "q001",
    "correctAnswer": "A",
    "explanation": "關題後才顯示解析。"
  }
}
```

## publicQuestions

路徑：

```text
publicQuestions/{gameId}/{questionId}
```

用途：開局時一次載入給前端使用。第 4 版接受題庫與答案在前端可讀，目標是降低 GAS 呼叫。

```json
{
  "questionId": "q001",
  "questionNumber": 1,
  "title": "示範題目",
  "options": {
    "A": "選項 A",
    "B": "選項 B",
    "C": "選項 C",
    "D": "選項 D"
  },
  "correctAnswer": "A",
  "explanation": "示範解析",
  "scoreBuckets": [
    {
      "maxSeconds": 10,
      "score": 30
    },
    {
      "maxSeconds": 30,
      "score": 20
    },
    {
      "maxSeconds": 60,
      "score": 10
    }
  ]
}
```

## answers

路徑：

```text
answers/{gameId}/{questionId}/{playerId}
```

用途：學員端送出作答結果。GAS 同步時負責去重與寫入正式成績。

```json
{
  "gameId": "game_2026_vaccine_training",
  "questionId": "q001",
  "playerId": "player_001",
  "playerName": "測試學員 1",
  "teamId": "team_1",
  "clientSubmitId": "game_player_q001_001",
  "selectedOption": "A",
  "isCorrect": true,
  "responseSeconds": 1,
  "baseScore": 30,
  "itemScore": 0,
  "personalTotalAfterSubmit": 30,
  "submittedAt": 1760000000000,
  "syncStatus": "pending|synced|duplicate|failed"
}
```

## itemUses

路徑：

```text
itemUses/{gameId}/{clientItemUseId}
```

用途：學員端道具使用紀錄。前端已立即加分的道具，UI 先顯示「已套用」；加倍卡與翻身卡保留後端確認狀態。

```json
{
  "gameId": "game_2026_vaccine_training",
  "clientItemUseId": "game_player_item_001",
  "playerId": "player_001",
  "playerName": "測試學員 1",
  "teamId": "team_1",
  "itemType": "score_3|double|comeback|challenge",
  "targetQuestionId": "q006",
  "clientAppliedScore": 3,
  "serverConfirmedScore": null,
  "status": "pending|applied|confirmed|duplicate|no_effect|failed",
  "usedAt": 1760000000000
}
```

## publicScoreboards

路徑：

```text
publicScoreboards/{gameId}
```

用途：導師關題後由 GAS 產生排行榜快照。學員端不自動輪詢，點擊懸浮排行榜時才讀取。

```json
{
  "gameId": "game_2026_vaccine_training",
  "snapshotVersion": 6,
  "source": "GAS",
  "updatedAt": 1760000000000,
  "teams": [
    {
      "rank": 1,
      "teamId": "team_1",
      "teamName": "第 1 隊",
      "totalScore": 216,
      "averageAnswerScore": 180,
      "itemScore": 36,
      "playerCount": 4,
      "currentQuestionCorrectRate": 0.75
    }
  ],
  "players": [
    {
      "rank": 1,
      "playerId": "player_001",
      "playerName": "測試學員 1",
      "teamId": "team_1",
      "personalScore": 153,
      "answerScore": 120,
      "itemScore": 33,
      "totalResponseSeconds": 35
    }
  ],
  "awards": {
    "luckyPrizeWinnerNames": [
      "測試學員 2"
    ],
    "perfectAwardWinnerNames": [
      "測試學員 1"
    ]
  }
}
```

## treasureBoxOpenRequests

路徑：

```text
treasureBoxOpenRequests/{gameId}/{boxId}
```

用途：第 4 版幸運箱已改為最後抽出得主。此節點僅保留給歷史相容或特殊紀錄，不作為一般寶箱開啟依賴。

```json
{
  "gameId": "game_2026_vaccine_training",
  "boxId": "player_001_q003_box",
  "playerId": "player_001",
  "boxType": "normal|legacy_lucky",
  "openedAt": 1760000000000,
  "status": "recorded"
}
```

## finalSettlement

路徑：

```text
finalSettlement/{gameId}
```

用途：投影端與學員端讀取最終結算結果。

```json
{
  "gameId": "game_2026_vaccine_training",
  "status": "finalized",
  "finalizedAt": 1760000000000,
  "teamRanking": [],
  "playerRanking": [],
  "luckyPrizeWinnerNames": [],
  "perfectAwardWinnerNames": []
}
```

## 維護注意事項

1. 修改 schema 後，需同步更新 `data/v4_static_game_config.example.json`。
2. 若新增節點，需確認 Firebase rules 不會暴露敏感資料。
3. 若新增 GAS 寫入節點，需更新 `docs/AI_HANDOVER.md` 與 `CHANGELOG.md`。
