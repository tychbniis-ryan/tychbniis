# 04 Realtime Database Schema

Realtime Database 僅放需要即時同步的輕量狀態，不放大量作答紀錄。

```json
{
  "gameState": {
    "game_2026_vaccine_training": {
      "status": "checkin",
      "currentQuestionId": null,
      "currentPhase": "checkin",
      "serverNow": 0,
      "questionOpenedAt": null,
      "questionClosesAt": null,
      "showScoreboard": false,
      "scoreboardVersion": 0,
      "message": "等待講師開題"
    }
  },
  "publicScoreboards": {
    "game_2026_vaccine_training": {
      "version": 0,
      "teams": {
        "team_1": {"teamName": "冷鏈守護隊", "score": 0, "rank": 1},
        "team_2": {"teamName": "安全接種隊", "score": 0, "rank": 2}
      }
    }
  }
}
```

## 使用原則

- 學員端只監聽自己的遊戲 `gameState`。
- 排行榜只在講師按「公布排行榜」或題後結算時更新版本。
- 不在 Realtime Database 儲存正確答案。
- 不在 Realtime Database 儲存完整作答紀錄。
