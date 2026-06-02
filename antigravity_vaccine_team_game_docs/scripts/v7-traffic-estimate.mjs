#!/usr/bin/env node

const TEAM_IDS = ["team_1", "team_2", "team_3", "team_4", "team_5"];
const DEFAULT_PLAYER_COUNTS = [50, 100, 200];
const FIREBASE_FREE_DOWNLOAD_GB = 10;
const FIREBASE_FREE_STORAGE_GB = 1;

function parseArgs(argv) {
  const options = {
    players: null,
    questions: 20,
    minutes: 60,
    pollSeconds: 5,
    publicQuestionCount: 50,
    leaderboardViewsPerPlayer: 2,
    topPlayerRows: 20
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--players" && next) options.players = Number(next), index += 1;
    if (arg === "--questions" && next) options.questions = Number(next), index += 1;
    if (arg === "--minutes" && next) options.minutes = Number(next), index += 1;
    if (arg === "--poll-seconds" && next) options.pollSeconds = Number(next), index += 1;
    if (arg === "--public-question-count" && next) options.publicQuestionCount = Number(next), index += 1;
    if (arg === "--leaderboard-views-per-player" && next) options.leaderboardViewsPerPlayer = Number(next), index += 1;
    if (arg === "--top-player-rows" && next) options.topPlayerRows = Number(next), index += 1;
  }

  return options;
}

function assertOptions(options) {
  const numericFields = [
    "questions",
    "minutes",
    "pollSeconds",
    "publicQuestionCount",
    "leaderboardViewsPerPlayer",
    "topPlayerRows"
  ];
  for (const field of numericFields) {
    if (!Number.isFinite(options[field]) || options[field] < 0) {
      throw new Error(`${field} must be a non-negative number.`);
    }
  }
  if (options.pollSeconds < 1) {
    throw new Error("pollSeconds must be at least 1.");
  }
  if (options.players !== null && (!Number.isInteger(options.players) || options.players < 1 || options.players > 1000)) {
    throw new Error("players must be an integer from 1 to 1000.");
  }
}

function utf8Bytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function gb(bytes) {
  return bytes / 1024 / 1024 / 1024;
}

function mb(bytes) {
  return bytes / 1024 / 1024;
}

function pct(value, denominator) {
  if (!denominator) return 0;
  return value / denominator * 100;
}

function iso(index = 0) {
  return new Date(Date.UTC(2026, 5, 2, 8, 0, index)).toISOString();
}

function makePlayer(index, gameId = "game_YYYYMMDD_vaccine_training") {
  const number = String(index + 1).padStart(3, "0");
  const teamId = TEAM_IDS[index % TEAM_IDS.length];
  return {
    gameId,
    playerId: `player_${number}`,
    nickname: `test_player_${number}`,
    teamId,
    clientKeyHash: `client_hash_${number}_abcdef1234567890`,
    clientVersion: "0.7.9",
    status: "checked_in",
    checkedInAt: iso(index),
    updatedAt: iso(index),
    source: "student_firebase"
  };
}

function makeAnswer(player, questionIndex, gameId = "game_YYYYMMDD_vaccine_training") {
  const questionId = `q${String(questionIndex + 1).padStart(3, "0")}`;
  return {
    gameId,
    questionId,
    playerId: player.playerId,
    teamId: player.teamId,
    selectedAnswer: [questionIndex % 4 === 0 ? "B" : "A"],
    submittedAt: iso(questionIndex),
    firstSubmittedAt: iso(questionIndex),
    clientKeyHash: player.clientKeyHash,
    clientVersion: "0.7.9",
    status: "submitted",
    answerSource: "student",
    responseSeconds: 5 + (questionIndex % 55),
    clientSubmitId: `${player.playerId}_${questionId}_${questionIndex}`,
    isCorrect: null,
    baseScore: 0,
    bonusScore: 0,
    finalQuestionScore: 0,
    firstCorrectBonus: 0,
    perfectAwardCandidate: false
  };
}

function makePublicQuestion(questionIndex) {
  const questionId = `q${String(questionIndex + 1).padStart(3, "0")}`;
  return {
    questionId,
    questionNumber: questionIndex + 1,
    title: `Public vaccine question ${questionIndex + 1}`,
    options: {
      A: "Option A",
      B: "Option B",
      C: "Option C",
      D: "Option D"
    },
    correctAnswer: "A",
    explanation: "Short public explanation for instructor reveal.",
    scoreBuckets: [
      { maxSeconds: 10, score: 30 },
      { maxSeconds: 20, score: 25 },
      { maxSeconds: 30, score: 20 },
      { maxSeconds: 45, score: 15 },
      { maxSeconds: 60, score: 10 },
      { maxSeconds: 999, score: 5 }
    ]
  };
}

function makePublicQuestions(count) {
  const questions = {};
  for (let index = 0; index < count; index += 1) {
    const question = makePublicQuestion(index);
    questions[question.questionId] = question;
  }
  return questions;
}

function makeGameState(questionIndex = 0, status = "question_open") {
  const question = makePublicQuestion(questionIndex);
  return {
    gameId: "game_YYYYMMDD_vaccine_training",
    status,
    currentQuestionId: question.questionId,
    currentQuestionNumber: question.questionNumber,
    questionOpenedAt: Date.now(),
    questionClosedAt: status === "question_closed" ? Date.now() + 65000 : null,
    sessionStartedAt: Date.now() - 300000,
    gameSessionSeed: "session_seed_20260602_001",
    answerTimeLimitSeconds: 65,
    allowFreeTeamChoice: false,
    openedQuestionIds: {
      q001: true,
      q002: true,
      q003: true
    },
    finalizingStartedAt: null,
    finalItemUseEndsAt: null,
    finalSettlementRunsAt: null,
    updatedAt: Date.now(),
    publicQuestion: {
      questionId: question.questionId,
      questionNumber: question.questionNumber,
      title: question.title,
      options: question.options
    },
    answerReveal: status === "question_closed" ? {
      questionId: question.questionId,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    } : null
  };
}

function makeScoreboard(playerCount, topPlayerRows) {
  const players = Array.from({ length: Math.min(playerCount, topPlayerRows) }, (_, index) => {
    const player = makePlayer(index);
    return {
      rank: index + 1,
      playerId: player.playerId,
      playerName: player.nickname,
      teamId: player.teamId,
      personalScore: 120 - index,
      answerScore: 100 - index,
      itemScore: 20,
      totalResponseSeconds: 30 + index
    };
  });

  return {
    gameId: "game_YYYYMMDD_vaccine_training",
    snapshotVersion: 1,
    source: "gas_scoreboard_snapshot",
    isTemporary: true,
    updatedAt: iso(0),
    teams: TEAM_IDS.map((teamId, index) => ({
      rank: index + 1,
      teamId,
      teamName: `team_${index + 1}`,
      totalScore: 500 - index * 25,
      averageAnswerScore: 400 - index * 20,
      itemScore: 100 - index * 5,
      playerCount: Math.ceil(playerCount / TEAM_IDS.length),
      currentQuestionCorrectRate: 0.7 - index * 0.03
    })),
    players,
    awards: {
      luckyPrizeWinnerNames: ["test_player_002"],
      perfectAwardWinnerNames: ["test_player_001"]
    }
  };
}

function playersObject(players) {
  return players.reduce((memo, player) => {
    memo[player.playerId] = player;
    return memo;
  }, {});
}

function estimate(playerCount, options) {
  const players = Array.from({ length: playerCount }, (_, index) => makePlayer(index));
  const samplePlayerBytes = utf8Bytes(players[0]);
  const sampleAnswerBytes = utf8Bytes(makeAnswer(players[0], 0));
  const publicQuestionsBytes = utf8Bytes(makePublicQuestions(options.publicQuestionCount));
  const openGameStateBytes = utf8Bytes(makeGameState(0, "question_open"));
  const closedGameStateBytes = utf8Bytes(makeGameState(0, "question_closed"));
  const averageGameStateBytes = Math.ceil((openGameStateBytes + closedGameStateBytes) / 2);
  const scoreboardBytes = utf8Bytes(makeScoreboard(playerCount, options.topPlayerRows));

  let checkinTeamPickDownloadBytes = 0;
  for (let index = 0; index < playerCount; index += 1) {
    checkinTeamPickDownloadBytes += utf8Bytes(playersObject(players.slice(0, index)));
  }

  const checkinUploadBytes = samplePlayerBytes * playerCount;
  const checkinEchoDownloadBytes = checkinUploadBytes;
  const answerUploadBytes = sampleAnswerBytes * playerCount * options.questions;
  const answerEchoDownloadBytes = answerUploadBytes;
  const publicQuestionsDownloadBytes = publicQuestionsBytes * playerCount;
  const gameStatePollsPerPlayer = Math.ceil(options.minutes * 60 / options.pollSeconds);
  const gameStatePollDownloadBytes = averageGameStateBytes * playerCount * gameStatePollsPerPlayer;
  const scoreboardDownloadBytes = scoreboardBytes * playerCount * options.leaderboardViewsPerPlayer;

  const realtimeDownloadBytes =
    checkinTeamPickDownloadBytes +
    checkinEchoDownloadBytes +
    answerEchoDownloadBytes +
    publicQuestionsDownloadBytes +
    gameStatePollDownloadBytes +
    scoreboardDownloadBytes;

  const realtimeUploadBytes = checkinUploadBytes + answerUploadBytes;
  const storedBytes =
    utf8Bytes(playersObject(players)) +
    sampleAnswerBytes * playerCount * options.questions +
    publicQuestionsBytes +
    averageGameStateBytes +
    scoreboardBytes;

  return {
    players: playerCount,
    assumptions: {
      questions: options.questions,
      minutes: options.minutes,
      pollSeconds: options.pollSeconds,
      gameStatePollsPerPlayer,
      publicQuestionCount: options.publicQuestionCount,
      leaderboardViewsPerPlayer: options.leaderboardViewsPerPlayer,
      topPlayerRows: options.topPlayerRows
    },
    sampleBytes: {
      player: samplePlayerBytes,
      answer: sampleAnswerBytes,
      publicQuestions: publicQuestionsBytes,
      gameStateAverage: averageGameStateBytes,
      scoreboard: scoreboardBytes
    },
    downloads: {
      checkinTeamPick: checkinTeamPickDownloadBytes,
      checkinPutEcho: checkinEchoDownloadBytes,
      answerPutEcho: answerEchoDownloadBytes,
      publicQuestions: publicQuestionsDownloadBytes,
      gameStatePolling: gameStatePollDownloadBytes,
      scoreboardViews: scoreboardDownloadBytes,
      total: realtimeDownloadBytes
    },
    uploads: {
      checkinPut: checkinUploadBytes,
      answerPut: answerUploadBytes,
      total: realtimeUploadBytes
    },
    storage: {
      estimatedStoredBytes: storedBytes
    },
    blazeFreeTierUse: {
      realtimeDownloadGb: gb(realtimeDownloadBytes),
      realtimeDownloadPercentOf10Gb: pct(gb(realtimeDownloadBytes), FIREBASE_FREE_DOWNLOAD_GB),
      realtimeStorageGb: gb(storedBytes),
      realtimeStoragePercentOf1Gb: pct(gb(storedBytes), FIREBASE_FREE_STORAGE_GB)
    }
  };
}

function formatMb(bytes) {
  return `${mb(bytes).toFixed(2)} MB`;
}

function formatGbValue(value) {
  return `${value.toFixed(4)} GB`;
}

function printHuman(results) {
  console.log("Firebase Realtime Database traffic estimate");
  console.log("Mode: offline estimate, no Firebase connection, no secrets used");
  console.log("");
  console.table(results.map(result => ({
    players: result.players,
    questions: result.assumptions.questions,
    minutes: result.assumptions.minutes,
    downloads: formatMb(result.downloads.total),
    uploads: formatMb(result.uploads.total),
    storage: formatMb(result.storage.estimatedStoredBytes),
    downloadGb: formatGbValue(result.blazeFreeTierUse.realtimeDownloadGb),
    downloadFreeTier: `${result.blazeFreeTierUse.realtimeDownloadPercentOf10Gb.toFixed(2)}% of 10 GB`,
    storageFreeTier: `${result.blazeFreeTierUse.realtimeStoragePercentOf1Gb.toFixed(2)}% of 1 GB`
  })));

  for (const result of results) {
    console.log("");
    console.log(`players=${result.players}`);
    console.table({
      download_checkin_team_pick: formatMb(result.downloads.checkinTeamPick),
      download_checkin_put_echo: formatMb(result.downloads.checkinPutEcho),
      download_answer_put_echo: formatMb(result.downloads.answerPutEcho),
      download_public_questions: formatMb(result.downloads.publicQuestions),
      download_game_state_polling: formatMb(result.downloads.gameStatePolling),
      download_scoreboard_views: formatMb(result.downloads.scoreboardViews),
      download_total: formatMb(result.downloads.total),
      upload_total: formatMb(result.uploads.total),
      estimated_storage: formatMb(result.storage.estimatedStoredBytes)
    });
  }

  console.log("");
  console.log("Important:");
  console.log("- Spark plan still has a 100 simultaneous Realtime Database connection limit.");
  console.log("- This estimate is for traffic volume, not simultaneous connection capacity.");
  console.log("- Firebase Console Usage is still the source of truth after a real event.");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  assertOptions(options);
  const playerCounts = options.players ? [options.players] : DEFAULT_PLAYER_COUNTS;
  const results = playerCounts.map(count => estimate(count, options));
  printHuman(results);
  console.log("");
  console.log(JSON.stringify({ options, results }, null, 2));
}

main();
