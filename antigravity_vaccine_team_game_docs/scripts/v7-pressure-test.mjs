#!/usr/bin/env node

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycby90HyCTWcCBprkkhabjRRF4xWn8G0ASszw6mqtEack0xScF8QI-zR9xZ667MhuqXv8/exec";
const DEFAULT_FIREBASE_URL = "https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app";
const DEFAULT_QUESTION_ID = "q001";
const ALLOWED_DEPLOYMENT_ID = "AKfycby90HyCTWcCBprkkhabjRRF4xWn8G0ASszw6mqtEack0xScF8QI-zR9xZ667MhuqXv8";
const DEPLOYMENT_LABEL = "@87";
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
    throw new Error("安全限制：預設只允許對 GAS 測試 deployment @87 執行。若要改 URL，請先人工檢查腳本。");
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

async function callGas(options, action, data = {}, admin = false) {
  const response = await fetch(buildGasUrl(options.gasUrl, {
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
  const response = await fetch(`${baseUrl}/${safePath}.json`, {
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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    const opened = await stage("openQuestion", () => callGas(options, "openQuestion", {
      questionId: options.questionId
    }, true));
    summary.openQuestionTiming = summarizeTimingSummary(opened.timingSummary);

    await stage("writeFirebasePlayers", () => runInBatches(players, options.concurrency, player =>
      putFirebase(options.firebaseUrl, `players/${options.gameId}/${player.playerId}`, player)
    ));

    await stage("writeFirebaseAnswers", () => runInBatches(players, options.concurrency, (player, index) =>
      putFirebase(options.firebaseUrl, `answers/${options.gameId}/${options.questionId}/${player.playerId}`, makeFakeAnswer(options.gameId, options.questionId, player, index))
    ));

    const closed = await stage("closeAndReveal", () => callGas(options, "closeAndScoreQuestion", {
      questionId: options.questionId
    }, true));
    summary.closeRevealTiming = summarizeTimingSummary(closed.timingSummary);

    summary.batchStatusAfterClose = await stage("getBatchStatusAfterClose", () => getBatchStatus(options));

    const scoringPromise = stage("scoreClosedQuestion", () => callGas(options, "scoreClosedQuestion", {
      questionId: options.questionId
    }, true));
    await wait(1500);
    summary.batchStatusDuringScoring = await getBatchStatus(options).catch(error => ({
      error: error.message
    }));
    const scoring = await scoringPromise;

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

  const result = await runPressureTest(options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
