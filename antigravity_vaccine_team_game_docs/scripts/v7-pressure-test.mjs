#!/usr/bin/env node

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbzZ9gNIsS70ihBG0dWCgtFKh4wuJaM0ttYqwSfG6dqGDRBHtgq-Ui7UtC_1GDEYm4u5/exec";
const DEFAULT_FIREBASE_URL = "https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app";
const DEFAULT_QUESTION_ID = "q001";
const ALLOWED_DEPLOYMENT_ID = "AKfycbzZ9gNIsS70ihBG0dWCgtFKh4wuJaM0ttYqwSfG6dqGDRBHtgq-Ui7UtC_1GDEYm4u5";
const DEPLOYMENT_LABEL = "@100";
const TEAM_IDS = ["team_1", "team_2", "team_3", "team_4", "team_5"];

function parseArgs(argv) {
  const options = {
    gasUrl: process.env.V7_TEST_GAS_URL || DEFAULT_GAS_URL,
    firebaseUrl: process.env.V7_TEST_FIREBASE_URL || DEFAULT_FIREBASE_URL,
    adminSecret: process.env.V7_TEST_ADMIN_SECRET || "",
    gameId: `v7_perf_${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`,
    questionId: DEFAULT_QUESTION_ID,
    players: 50,
    concurrency: 10,
    smokeOnly: false,
    skipCleanup: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--smoke-only") options.smokeOnly = true;
    if (arg === "--skip-cleanup") options.skipCleanup = true;
    if (arg === "--gas-url" && next) options.gasUrl = next, index += 1;
    if (arg === "--firebase-url" && next) options.firebaseUrl = next, index += 1;
    if (arg === "--game-id" && next) options.gameId = next, index += 1;
    if (arg === "--question-id" && next) options.questionId = next, index += 1;
    if (arg === "--players" && next) options.players = Number(next), index += 1;
    if (arg === "--concurrency" && next) options.concurrency = Number(next), index += 1;
  }

  return options;
}

function assertSafeOptions(options) {
  if (!/^v7_perf_[A-Za-z0-9_-]+$/.test(options.gameId)) {
    throw new Error("安全限制：gameId 必須以 v7_perf_ 開頭，避免誤寫正式場次。");
  }
  if (!String(options.gasUrl || "").includes(`/${ALLOWED_DEPLOYMENT_ID}/`)) {
    throw new Error("安全限制：預設只允許對 GAS 測試 deployment @100 執行。若要改 URL，請先人工檢查腳本。");
  }
  if (!Number.isInteger(options.players) || options.players < 1 || options.players > 200) {
    throw new Error("安全限制：players 必須是 1 到 200 的整數。");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 25) {
    throw new Error("安全限制：concurrency 必須是 1 到 25 的整數。");
  }
}

function buildGasUrl(gasUrl, payload) {
  const requestUrl = new URL(gasUrl);
  requestUrl.searchParams.set("callback", "cb");
  requestUrl.searchParams.set("payload", JSON.stringify(payload));
  requestUrl.searchParams.set("_ts", `${Date.now()}_${Math.random().toString(36).slice(2)}`);
  return requestUrl.toString();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await wait(700 * attempt);
      }
    }
  }
  throw lastError || new Error("fetch failed");
}

async function callGas(options, action, data = {}, admin = false) {
  const response = await fetchWithRetry(buildGasUrl(options.gasUrl, {
    action,
    data: {
      gameId: options.gameId,
      ...data
    },
    adminSecret: admin ? options.adminSecret : ""
  }));
  const text = await response.text();
  const wrapped = text.match(/^[^(]+\(([\s\S]*)\);?$/);
  if (!response.ok || !wrapped) {
    throw new Error(`GAS 回應異常：HTTP ${response.status}`);
  }
  const payload = JSON.parse(wrapped[1]);
  if (!payload.ok) {
    throw new Error(payload.error?.message || "GAS 回傳失敗。");
  }
  return payload.result;
}

async function putFirebase(firebaseUrl, path, data) {
  const baseUrl = firebaseUrl.replace(/\/$/, "");
  const safePath = String(path || "").replace(/^\/+/, "");
  const response = await fetchWithRetry(`${baseUrl}/${safePath}.json`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase 寫入失敗：HTTP ${response.status} ${text.slice(0, 160)}`);
  }
  return response.json();
}

async function getFirebase(firebaseUrl, path) {
  const baseUrl = firebaseUrl.replace(/\/$/, "");
  const safePath = String(path || "").replace(/^\/+/, "");
  const response = await fetchWithRetry(`${baseUrl}/${safePath}.json`, {
    cache: "no-store"
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firebase read failed: HTTP ${response.status} ${text.slice(0, 160)}`);
  }
  return response.json();
}

function parseCorrectAnswers(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeRows(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).filter(Boolean);
  return [];
}

function normalizeAnswer(value) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map(item => String(item || "").trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

function calculateBaseScore(isCorrect, responseSeconds) {
  if (!isCorrect) return 0;
  const seconds = Math.max(0, Number(responseSeconds || 999));
  if (seconds <= 10) return 30;
  if (seconds <= 20) return 25;
  if (seconds <= 30) return 20;
  if (seconds <= 45) return 15;
  if (seconds <= 60) return 10;
  return 5;
}

function makeInstructorCommandId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function writeInstructorDirectState(options, status) {
  const currentState = await getFirebase(options.firebaseUrl, `gameState/${options.gameId}`).catch(() => ({})) || {};
  const questions = await getFirebase(options.firebaseUrl, `publicQuestions/${options.gameId}`).catch(() => ({})) || {};
  const question = questions[options.questionId] || {};
  if (!question.questionId && status === "question_open") {
    throw new Error(`missing publicQuestions/${options.gameId}/${options.questionId}; createGame did not sync questions to the test gameId`);
  }
  const now = new Date().toISOString();
  const commandId = makeInstructorCommandId(status);
  const openedIds = new Set([
    ...String(currentState.openedQuestionIds || "").split(","),
    options.questionId
  ].map(item => String(item || "").trim()).filter(Boolean));
  const proof = {
    gameId: options.gameId,
    proofId: commandId,
    secret: options.adminSecret,
    status,
    questionId: options.questionId,
    createdAt: now,
    source: "instructor_direct_firebase"
  };
  await putFirebase(options.firebaseUrl, `adminProofs/${options.gameId}/${commandId}`, proof);
  const state = {
    gameId: options.gameId,
    status,
    currentQuestionId: options.questionId,
    questionOpenedAt: status === "question_open" ? now : "",
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
    gameSessionSeed: currentState.gameSessionSeed || `${options.gameId}:${now}:pressure`,
    updatedAt: now,
    openedQuestionIds: [...openedIds].join(","),
    allowFreeTeamChoice: Boolean(currentState.allowFreeTeamChoice),
    creativeFinalVoteStartedAt: currentState.creativeFinalVoteStartedAt || "",
    publicQuestion: question,
    instructorCommandId: commandId,
    source: "instructor_direct_firebase"
  };
  if (status === "question_closed") {
    state.answerReveal = {
      questionId: options.questionId,
      correctAnswers: parseCorrectAnswers(question.correctAnswer || ""),
      correctAnswer: question.correctAnswer || "",
      correctAnswerText: question.correctAnswerText || question.correctAnswer || "",
      explanation: question.explanation || "",
      revealedAt: now
    };
  }
  return putFirebase(options.firebaseUrl, `gameState/${options.gameId}`, state);
}

function makePublicPlayer(player) {
  return {
    gameId: player.gameId,
    playerId: player.playerId,
    nickname: player.nickname,
    teamId: player.teamId,
    clientVersion: player.clientVersion,
    status: "checked_in",
    checkedInAt: player.checkedInAt,
    updatedAt: player.updatedAt,
    source: "student_public_firebase"
  };
}

function makePublicAnswer(answer) {
  return {
    gameId: answer.gameId,
    questionId: answer.questionId,
    playerId: answer.playerId,
    teamId: answer.teamId,
    selectedAnswer: answer.selectedAnswer,
    submittedAt: answer.submittedAt,
    firstSubmittedAt: answer.submittedAt,
    clientVersion: answer.clientVersion,
    status: "submitted",
    answerSource: "student_public_firebase",
    responseSeconds: answer.responseSeconds,
    isCorrect: null,
    baseScore: 0,
    bonusScore: 0,
    finalQuestionScore: 0,
    firstCorrectBonus: 0,
    perfectAwardCandidate: false
  };
}

async function writeInstructorDirectScoreboard(options) {
  const [questions, publicPlayers, publicAnswers] = await Promise.all([
    getFirebase(options.firebaseUrl, `publicQuestions/${options.gameId}`).catch(() => ({})),
    getFirebase(options.firebaseUrl, `publicPlayers/${options.gameId}`).catch(() => ({})),
    getFirebase(options.firebaseUrl, `publicAnswers/${options.gameId}`).catch(() => ({}))
  ]);
  const question = questions[options.questionId] || {};
  const correctAnswer = normalizeAnswer(question.correctAnswer || "");
  if (!correctAnswer) {
    throw new Error("missing correctAnswer for direct scoreboard");
  }
  const now = new Date().toISOString();
  const playerRows = normalizeRows(publicPlayers).filter(row => row && row.playerId && row.status === "checked_in");
  const playerMap = {};
  playerRows.forEach(player => {
    playerMap[String(player.playerId)] = player;
  });
  const answers = normalizeRows((publicAnswers || {})[options.questionId])
    .filter(row => row && row.status === "submitted");
  const teamStats = {};
  const playerStats = {};
  for (let index = 1; index <= 5; index += 1) {
    teamStats[`team_${index}`] = {
      gameId: options.gameId,
      teamId: `team_${index}`,
      playerCount: 0,
      effectivePlayerCount: 0,
      closedQuestionCount: 1,
      correctAnswerCount: 0,
      correctRate: 0,
      currentQuestionCorrectRate: 0,
      totalScore: 0,
      averageScore: 0,
      teamBonusScore: 0,
      finalScore: 0,
      weightedAverageScore: 0,
      updatedAt: now
    };
  }
  playerRows.forEach(player => {
    const teamId = String(player.teamId || "team_1");
    if (!teamStats[teamId]) teamStats[teamId] = { gameId: options.gameId, teamId, playerCount: 0, effectivePlayerCount: 0, closedQuestionCount: 1, correctAnswerCount: 0, correctRate: 0, currentQuestionCorrectRate: 0, totalScore: 0, averageScore: 0, teamBonusScore: 0, finalScore: 0, weightedAverageScore: 0, updatedAt: now };
    teamStats[teamId].playerCount += 1;
  });
  answers.forEach(answer => {
    const playerId = String(answer.playerId || "");
    const player = playerMap[playerId] || {};
    const teamId = String(answer.teamId || player.teamId || "team_1");
    const isCorrect = normalizeAnswer(answer.selectedAnswer || answer.answer || "") === correctAnswer;
    const responseSeconds = Math.max(0, Number(answer.responseSeconds || 999));
    const score = calculateBaseScore(isCorrect, responseSeconds);
    if (!playerStats[playerId]) {
      playerStats[playerId] = {
        playerId,
        nickname: String(player.nickname || playerId || "player"),
        teamId,
        score: 0,
        answerScore: 0,
        itemScore: 0,
        correctCount: 0,
        totalResponseSeconds: 0,
        updatedAt: answer.submittedAt || now
      };
    }
    playerStats[playerId].score += score;
    playerStats[playerId].answerScore += score;
    playerStats[playerId].correctCount += isCorrect ? 1 : 0;
    playerStats[playerId].totalResponseSeconds += responseSeconds;
    if (!teamStats[teamId]) teamStats[teamId] = { gameId: options.gameId, teamId, playerCount: 0, effectivePlayerCount: 0, closedQuestionCount: 1, correctAnswerCount: 0, correctRate: 0, currentQuestionCorrectRate: 0, totalScore: 0, averageScore: 0, teamBonusScore: 0, finalScore: 0, weightedAverageScore: 0, updatedAt: now };
    teamStats[teamId].effectivePlayerCount += 1;
    teamStats[teamId].correctAnswerCount += isCorrect ? 1 : 0;
    teamStats[teamId].totalScore += score;
  });
  const teams = Object.values(teamStats).map(team => {
    const answerCount = answers.filter(answer => String(answer.teamId || playerMap[String(answer.playerId || "")]?.teamId || "team_1") === team.teamId).length;
    const averageScore = answerCount ? team.totalScore / answerCount : 0;
    const correctRate = answerCount ? team.correctAnswerCount / answerCount : 0;
    return {
      ...team,
      currentQuestionCorrectRate: correctRate,
      correctRate,
      totalScore: averageScore,
      averageScore,
      finalScore: averageScore,
      weightedAverageScore: averageScore
    };
  }).sort((a, b) => Number(b.finalScore || 0) - Number(a.finalScore || 0) || String(a.teamId || "").localeCompare(String(b.teamId || "")));
  const players = Object.values(playerStats)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String(a.nickname || "").localeCompare(String(b.nickname || "")))
    .slice(0, 20);
  const commandId = makeInstructorCommandId("scoreboard_update");
  await putFirebase(options.firebaseUrl, `adminProofs/${options.gameId}/${commandId}`, {
    gameId: options.gameId,
    proofId: commandId,
    secret: options.adminSecret,
    status: "scoreboard_update",
    questionId: options.questionId,
    createdAt: now,
    source: "instructor_direct_firebase"
  });
  return putFirebase(options.firebaseUrl, `publicScoreboards/${options.gameId}`, {
    gameId: options.gameId,
    questionId: options.questionId,
    updatedAt: now,
    isTemporary: true,
    source: "instructor_direct_firebase",
    mode: "firebase_local_browser",
    submittedCount: answers.length,
    scoredCount: answers.filter(answer => playerMap[String(answer.playerId || "")]).length,
    teams,
    scoreboard: teams,
    players,
    awards: [],
    instructorCommandId: commandId
  });
}

function makeFakePlayer(gameId, index) {
  const number = String(index + 1).padStart(3, "0");
  const teamId = TEAM_IDS[index % TEAM_IDS.length];
  const playerId = `v7_perf_player_${number}`;
  const now = new Date().toISOString();
  return {
    gameId,
    playerId,
    nickname: `測試學員${number}`,
    teamId,
    clientKeyHash: `v7_perf_client_${number}`,
    clientVersion: "0.7.8-pressure-test",
    status: "checked_in",
    checkedInAt: now,
    updatedAt: now,
    source: "student_firebase"
  };
}

function makeFakeAnswer(gameId, questionId, player, index) {
  const responseSeconds = 5 + (index % 55);
  const submittedAt = new Date(Date.now() + responseSeconds * 1000).toISOString();
  return {
    gameId,
    questionId,
    playerId: player.playerId,
    teamId: player.teamId,
    selectedAnswer: index % 4 === 0 ? ["B"] : ["A"],
    submittedAt,
    responseSeconds,
    clientVersion: "0.7.8-pressure-test",
    status: "submitted",
    answerSource: "student"
  };
}

async function runInBatches(items, concurrency, worker) {
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function smokeTest(options) {
  const state = await callGas(options, "getGameState", {}, false);
  return {
    ok: true,
    status: state.status || "",
    gameId: state.gameId || ""
  };
}

function summarizeBatchStatus(result) {
  const latest = result && result.latest ? result.latest : null;
  return {
    count: Number(result?.count || 0),
    status: latest?.status || "",
    closeSequence: latest?.closeSequence || "",
    timingTotalMs: Number(latest?.timingTotalMs || 0),
    submittedCount: Number(latest?.submittedCount || 0),
    scoredCount: Number(latest?.scoredCount || 0),
    updatedAt: latest?.updatedAt || "",
    checkedAt: result?.checkedAt || ""
  };
}

function summarizeTimingSummary(summary) {
  if (!summary) return null;
  return {
    totalMs: Number(summary.totalMs || 0),
    stages: (summary.stages || []).map(stage => ({
      stage: stage.stage || "",
      ms: Number(stage.ms || 0),
      elapsedMs: Number(stage.elapsedMs || 0)
    }))
  };
}

async function getBatchStatus(options) {
  const result = await callGas(options, "getSettlementBatchStatus", {
    questionId: options.questionId
  }, true);
  return summarizeBatchStatus(result);
}

async function runPressureTest(options) {
  if (!options.adminSecret) {
    throw new Error("未設定 V7_TEST_ADMIN_SECRET。為避免密碼外洩，腳本只接受環境變數，不接受命令列密碼。");
  }

  const startedAt = Date.now();
  const players = Array.from({ length: options.players }, (_, index) => makeFakePlayer(options.gameId, index));
  const summary = {
    gameId: options.gameId,
    questionId: options.questionId,
    players: options.players,
    deployment: DEPLOYMENT_LABEL,
    stages: []
  };

  const stage = async (name, fn) => {
    const stageStartedAt = Date.now();
    const result = await fn();
    summary.stages.push({
      name,
      ms: Date.now() - stageStartedAt
    });
    return result;
  };

  try {
    await stage("prepareGame", () => callGas(options, "createGame", {
      allowFreeTeamChoice: false
    }, true));

    await stage("directOpenFirebase", () => writeInstructorDirectState(options, "question_open"));
    const backgroundOpenPromise = callGas(options, "openQuestion", {
      questionId: options.questionId,
      firebaseFirst: true
    }, true).then(result => ({
      ok: true,
      timing: summarizeTimingSummary(result.timingSummary),
      firebaseSync: result.firebaseSync || null
    })).catch(error => ({
      ok: false,
      error: error.message
    }));

    await stage("writeFirebasePlayers", () => runInBatches(players, options.concurrency, async player => {
      await putFirebase(options.firebaseUrl, `players/${options.gameId}/${player.playerId}`, player);
      await putFirebase(options.firebaseUrl, `publicPlayers/${options.gameId}/${player.playerId}`, makePublicPlayer(player));
    }));

    await stage("writeFirebaseAnswers", () => runInBatches(players, options.concurrency, async (player, index) => {
      const answer = makeFakeAnswer(options.gameId, options.questionId, player, index);
      await putFirebase(options.firebaseUrl, `answers/${options.gameId}/${options.questionId}/${player.playerId}`, answer);
      await putFirebase(options.firebaseUrl, `publicAnswers/${options.gameId}/${options.questionId}/${player.playerId}`, makePublicAnswer(answer));
    }));

    await stage("directCloseFirebase", () => writeInstructorDirectState(options, "question_closed"));
    const directScoreboard = await stage("directLocalScoreboardFirebase", () => writeInstructorDirectScoreboard(options));
    summary.directLocalScoreboard = {
      submittedCount: Number(directScoreboard.submittedCount || 0),
      scoredCount: Number(directScoreboard.scoredCount || 0),
      teamCount: (directScoreboard.teams || directScoreboard.scoreboard || []).length,
      playerCount: (directScoreboard.players || []).length,
      mode: directScoreboard.mode || ""
    };
    summary.backgroundOpen = await backgroundOpenPromise;
    summary.batchStatusAfterClose = await stage("getBatchStatusAfterClose", () => getBatchStatus(options).catch(error => ({
      error: error.message
    })));

    const scoringPromise = stage("scoreClosedQuestion", () => callGas(options, "scoreClosedQuestion", {
      questionId: options.questionId
    }, true));
    await wait(1500);
    summary.batchStatusDuringScoring = await getBatchStatus(options).catch(error => ({
      error: error.message
    }));
    const scoring = await scoringPromise;

    summary.scoreTiming = summarizeTimingSummary(scoring.timingSummary);
    summary.scoring = {
      submittedCount: scoring.submittedCount || 0,
      scoredCount: scoring.scoredCount || 0,
      timingTotalMs: scoring.timingSummary?.totalMs || 0,
      settlementStatus: scoring.settlementBatch?.status || ""
    };
    summary.batchStatusAfterScoring = await stage("getBatchStatusAfterScoring", () => getBatchStatus(options));
    return summary;
  } finally {
    summary.totalMs = Date.now() - startedAt;
    if (!options.skipCleanup) {
      await callGas(options, "resetGameData", {}, true).then(result => {
        summary.cleanup = {
          status: result.status || "",
          firebaseClear: result.firebaseClear || []
        };
      }).catch(error => {
        summary.cleanupError = error.message;
      });
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertSafeOptions(options);

  console.log(JSON.stringify({
    mode: options.smokeOnly || !options.adminSecret ? "smoke" : "pressure",
    gasUrl: options.gasUrl,
    firebaseUrl: options.firebaseUrl,
    gameId: options.gameId,
    questionId: options.questionId,
    players: options.players,
    adminSecretProvided: Boolean(options.adminSecret)
  }, null, 2));

  if (options.smokeOnly || !options.adminSecret) {
    const result = await smokeTest(options);
    console.log(JSON.stringify(result, null, 2));
    if (!options.adminSecret) {
      console.log("未設定 V7_TEST_ADMIN_SECRET，已停在 smoke test，未寫入假資料。");
    }
    return;
  }

  const warmupStartedAt = Date.now();
  const warmup = await callGas(options, "warmupGameSheets", {}, true);
  console.log(JSON.stringify({
    mode: "prewarm",
    deployment: DEPLOYMENT_LABEL,
    elapsedMs: Date.now() - warmupStartedAt,
    setupReadyVersion: warmup.setupReadyVersion || "",
    gasElapsedMs: Number(warmup.elapsedMs || 0)
  }, null, 2));

  const result = await runPressureTest(options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
