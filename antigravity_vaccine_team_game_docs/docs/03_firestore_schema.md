# 03 Firestore 資料模型

## collections

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

## games/{gameId}

```json
{
  "gameId": "game_2026_vaccine_training",
  "title": "疫苗守護戰隊挑戰賽",
  "courseTitle": "預防接種教育訓練",
  "status": "draft|checkin|active|paused|finished",
  "teamCount": 5,
  "currentQuestionId": null,
  "currentPhase": "checkin|question|scoring|item|creative|voting|finished",
  "luckyPrizeGranted": false,
  "luckyPrizePlayerId": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## teams/{teamId}

```json
{
  "teamId": "team_1",
  "gameId": "game_2026_vaccine_training",
  "teamName": "冷鏈守護隊",
  "color": "#3366cc",
  "totalScore": 0,
  "itemBonusScore": 0,
  "missionBonusScore": 0,
  "activePlayers": 0,
  "averageScore": 0,
  "rank": 0,
  "comebackUsedCount": 0
}
```

## players/{playerId}

```json
{
  "playerId": "anon_uid",
  "gameId": "game_2026_vaccine_training",
  "nickname": "小刺針",
  "teamId": "team_1",
  "joinedAt": "timestamp",
  "totalScore": 0,
  "correctCount": 0,
  "wrongCount": 0,
  "answeredCount": 0,
  "streakCorrect": 0,
  "maxStreakCorrect": 0,
  "usedItemCount": 0,
  "hasPerfectScore": true,
  "perfectFinishTime": null,
  "hasLuckyPrize": false,
  "luckyPrizeGranted": false,
  "boxes": [],
  "items": [],
  "pendingDoubleNextQuestion": false,
  "isActive": true
}
```

## questions/{questionId}

學員端可讀，不含正確答案。

```json
{
  "questionId": "q001",
  "gameId": "game_2026_vaccine_training",
  "order": 1,
  "type": "single|multiple|trueFalse|ordering|scenario|creative",
  "title": "題目文字",
  "options": [
    {"id": "A", "text": "選項 A"},
    {"id": "B", "text": "選項 B"}
  ],
  "timeLimitSec": 60,
  "scoreMode": "timeBucket",
  "isBossQuestion": false,
  "status": "draft|open|closed|scored",
  "openedAt": null,
  "closedAt": null
}
```

## answerKeys/{questionId}

僅管理端與 Cloud Functions 可讀。

```json
{
  "questionId": "q001",
  "correctAnswer": ["A"],
  "explanation": "解析文字",
  "acceptedAnswers": [],
  "scoringNote": "計分補充"
}
```

## answers/{answerId}

```json
{
  "answerId": "gameId_questionId_playerId",
  "gameId": "game_2026_vaccine_training",
  "questionId": "q001",
  "playerId": "anon_uid",
  "teamId": "team_1",
  "answer": ["A"],
  "submittedAt": "timestamp",
  "responseTimeMs": 12345,
  "isCorrect": null,
  "baseScore": 0,
  "firstAnswerBonus": 0,
  "itemBonusScore": 0,
  "finalScore": 0,
  "scoredAt": null
}
```

## items/{itemId}

```json
{
  "itemId": "item_001",
  "gameId": "game_2026_vaccine_training",
  "playerId": "anon_uid",
  "teamId": "team_1",
  "itemType": "score_1|score_3|score_5|score_10|double|comeback|challenge|special",
  "value": 0,
  "status": "unused|used|expired|discarded",
  "obtainedAt": "timestamp",
  "usedAt": null,
  "discardedAt": null,
  "discardReason": null,
  "targetTeamId": null,
  "source": "box|achievement"
}
```

## submissions/{submissionId}

```json
{
  "submissionId": "sub_001",
  "gameId": "game_2026_vaccine_training",
  "creativeQuestionId": "cq001",
  "playerId": "anon_uid",
  "teamId": "team_1",
  "text": "投稿內容",
  "createdAt": "timestamp",
  "status": "submitted|filtered|team_candidate|finalist|rejected",
  "teamVotes": 0,
  "finalVotes": 0,
  "displayCode": null
}
```

## votes/{voteId}

```json
{
  "voteId": "gameId_voteRound_playerId",
  "gameId": "game_2026_vaccine_training",
  "round": "team|final",
  "playerId": "anon_uid",
  "teamId": "team_1",
  "targetSubmissionId": "sub_001",
  "createdAt": "timestamp"
}
```
