# 05 Cloud Functions 規格

## Callable Functions

### createGame

建立場次。

Input:

```json
{
  "title": "疫苗守護戰隊挑戰賽",
  "courseTitle": "預防接種教育訓練",
  "teamCount": 5
}
```

### joinGame

學員加入遊戲。

Input:

```json
{
  "gameId": "game_2026_vaccine_training",
  "nickname": "暱稱",
  "teamId": "optional"
}
```

Rules:

- 若 teamId 未提供，系統自動分配人數最少的隊伍。
- 暱稱需過濾敏感字與個資格式。
- 建立 player 文件。

### openQuestion

講師開題。

Input:

```json
{
  "gameId": "game_2026_vaccine_training",
  "questionId": "q001"
}
```

Rules:

- 需 admin token。
- 更新 question 狀態。
- 更新 Realtime Database gameState。
- 正確答案不得下發至學員端。

### submitAnswer

學員作答。

Input:

```json
{
  "gameId": "game_2026_vaccine_training",
  "questionId": "q001",
  "answer": ["A"]
}
```

Rules:

- 題目必須處於 open。
- 每人每題只能提交一次。
- 記錄 submittedAt 與 responseSeconds。第 1 版 GAS 流程以「翻開試卷」的伺服端時間作為計時起點。
- 不在前端計分。

### closeAndScoreQuestion

講師關題並結算。

Input:

```json
{
  "gameId": "game_2026_vaccine_training",
  "questionId": "q001"
}
```

Actions:

1. 關閉題目。
2. 讀取 answerKey。
3. 判斷每筆答案正確性。
4. 計算時間區間分。
5. 判定第一位提交且答對者獎勵。
6. 套用加倍卡。
7. 更新 player 分數。
8. 更新 team 分數。
9. 判定寶箱與成就。
10. 更新全對獎候選。
11. 更新排行榜。

### openBox

學員開寶箱。

Input:

```json
{
  "gameId": "game_2026_vaccine_training",
  "boxId": "box_001"
}
```

Actions:

1. 檢查寶箱是否存在且未開啟。
2. 依機率抽道具。
3. 若抽中特殊道具，檢查 luckyPrizeGranted。
4. 產生道具。
5. 更新 player boxes / items。
6. 若寶箱超過 3 個，自動丟棄最早者。

### useItem

使用道具。

Input:

```json
{
  "gameId": "game_2026_vaccine_training",
  "itemId": "item_001",
  "targetTeamId": "optional"
}
```

Actions:

- 加分卡：立即增加 team itemBonusScore。
- 加倍卡：設定 player.pendingDoubleNextQuestion = true。
- 翻身卡：依目前排名加分。
- 挑戰卡：記錄下一題挑戰狀態。
- 特殊道具：取得即生效，不需使用。

### submitCreativeAnswer

提交創作題答案。

Input:

```json
{
  "gameId": "game_2026_vaccine_training",
  "creativeQuestionId": "cq001",
  "text": "投稿內容"
}
```

Rules:

- 每人限提交 1 則。
- 字數限制建議 80 字。
- 過濾不當文字與個資格式。

### voteSubmission

投票。

Input:

```json
{
  "gameId": "game_2026_vaccine_training",
  "round": "team|final",
  "submissionId": "sub_001"
}
```

Rules:

- 每人每輪限投 1 票。
- team round 只能投自己隊伍投稿。
- final round 不得投自己戰隊投稿。
- 投票限時 60 秒。

### finalizeGame

結算整場活動。

Actions:

1. 計算戰隊冠軍。
2. 計算個人總分最高。
3. 計算全對獎前 3 名。
4. 確認幸運獎 1 名。
5. 計算創意獎。
6. 產出 winners 文件。
