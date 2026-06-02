#!/usr/bin/env node

import fs from "node:fs";
import vm from "node:vm";

const code = fs.readFileSync("gas/Code.gs", "utf8");
const context = {
  console,
  Logger: {
    log() {}
  }
};

vm.createContext(context);
vm.runInContext(code, context);

const result = context.buildFirebaseFastScoreResult({
  gameId: "unit_game",
  questionId: "q001",
  question: { questionId: "q001", correctAnswer: "A" },
  questionMap: {
    q001: { questionId: "q001", type: "single", correctAnswer: "A" },
    q002: { questionId: "q002", type: "single", correctAnswer: "B" }
  },
  players: [
    { playerId: "p1", nickname: "P1", teamId: "team_1", status: "checked_in" },
    { playerId: "p2", nickname: "P2", teamId: "team_2", status: "checked_in" }
  ],
  answersByQuestion: {
    q001: {
      p1: {
        playerId: "p1",
        teamId: "team_1",
        selectedAnswer: ["A"],
        responseSeconds: 10,
        submittedAt: "2026-06-02T00:00:01.000Z",
        status: "submitted"
      },
      p2: {
        playerId: "p2",
        teamId: "team_2",
        selectedAnswer: ["C"],
        responseSeconds: 10,
        submittedAt: "2026-06-02T00:00:02.000Z",
        status: "submitted"
      }
    },
    q002: {
      p1: {
        playerId: "p1",
        teamId: "team_1",
        selectedAnswer: ["B"],
        responseSeconds: 20,
        submittedAt: "2026-06-02T00:01:01.000Z",
        status: "submitted"
      },
      p2: {
        playerId: "p2",
        teamId: "team_2",
        selectedAnswer: ["B"],
        responseSeconds: 20,
        submittedAt: "2026-06-02T00:01:02.000Z",
        status: "submitted"
      }
    }
  }
});

const noAnswerResult = context.buildFirebaseFastScoreResult({
  gameId: "unit_game_no_answer",
  questionId: "q001",
  question: { questionId: "q001", correctAnswer: "A" },
  questionMap: {
    q001: { questionId: "q001", type: "single", correctAnswer: "A" }
  },
  players: [
    { playerId: "p1", nickname: "P1", teamId: "team_1", status: "checked_in" },
    { playerId: "p2", nickname: "P2", teamId: "team_2", status: "checked_in" }
  ],
  answersByQuestion: {}
});

const emptyGameResult = context.buildFirebaseFastScoreResult({
  gameId: "unit_game_empty",
  questionId: "q001",
  question: { questionId: "q001", correctAnswer: "A" },
  questionMap: {
    q001: { questionId: "q001", type: "single", correctAnswer: "A" }
  },
  players: [],
  answersByQuestion: {}
});

if (result.submittedCount !== 2) {
  throw new Error(`submittedCount mismatch: ${result.submittedCount}`);
}
if (result.scoredCount !== 2) {
  throw new Error(`scoredCount mismatch: ${result.scoredCount}`);
}
if (!result.scoreboard.length) {
  throw new Error("missing scoreboard rows");
}
if (!result.playerRows.length) {
  throw new Error("missing player leaderboard rows");
}
if (result.scoreboard[0].teamId !== "team_1") {
  throw new Error(`unexpected top team: ${result.scoreboard[0].teamId}`);
}
if (noAnswerResult.submittedCount !== 0 || noAnswerResult.scoredCount !== 0) {
  throw new Error("no-answer count mismatch");
}
if (!noAnswerResult.scoreboard.length || !noAnswerResult.playerRows.length) {
  throw new Error("no-answer result should keep player and team rows");
}
if (emptyGameResult.submittedCount !== 0 || emptyGameResult.scoredCount !== 0) {
  throw new Error("empty-game count mismatch");
}
if (emptyGameResult.scoreboard.length !== 5) {
  throw new Error(`empty-game team rows mismatch: ${emptyGameResult.scoreboard.length}`);
}

console.log(JSON.stringify({
  ok: true,
  submittedCount: result.submittedCount,
  scoredCount: result.scoredCount,
  teamRows: result.scoreboard.length,
  topTeam: result.scoreboard[0].teamId,
  playerRows: result.playerRows.length,
  noAnswerTeamRows: noAnswerResult.scoreboard.length,
  noAnswerPlayerRows: noAnswerResult.playerRows.length,
  emptyGameTeamRows: emptyGameResult.scoreboard.length
}, null, 2));
