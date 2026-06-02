#!/usr/bin/env node

const DEFAULT_FIREBASE_URL = "https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app";
const DEFAULT_GAME_ID = "v7_perf_read_only";

function parseArgs(argv) {
  const options = {
    firebaseUrl: process.env.V7_TEST_FIREBASE_URL || DEFAULT_FIREBASE_URL,
    gameId: process.env.V7_TEST_GAME_ID || DEFAULT_GAME_ID,
    players: 100,
    rounds: 3,
    concurrency: 25
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--firebase-url" && next) options.firebaseUrl = next, index += 1;
    if (arg === "--game-id" && next) options.gameId = next, index += 1;
    if (arg === "--players" && next) options.players = Number(next), index += 1;
    if (arg === "--rounds" && next) options.rounds = Number(next), index += 1;
    if (arg === "--concurrency" && next) options.concurrency = Number(next), index += 1;
  }

  return options;
}

function assertSafeOptions(options) {
  if (!/^[-_A-Za-z0-9]+$/.test(options.gameId)) {
    throw new Error("gameId can only contain letters, numbers, dash, and underscore.");
  }
  if (!Number.isInteger(options.players) || options.players < 1 || options.players > 200) {
    throw new Error("players must be an integer from 1 to 200.");
  }
  if (!Number.isInteger(options.rounds) || options.rounds < 1 || options.rounds > 20) {
    throw new Error("rounds must be an integer from 1 to 20.");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 100) {
    throw new Error("concurrency must be an integer from 1 to 100.");
  }
}

function buildFirebaseUrl(firebaseUrl, path) {
  const baseUrl = firebaseUrl.replace(/\/$/, "");
  const safePath = String(path || "").replace(/^\/+/, "");
  return `${baseUrl}/${safePath}.json?ts=${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function timedRead(firebaseUrl, path) {
  const startedAt = Date.now();
  const response = await fetch(buildFirebaseUrl(firebaseUrl, path));
  const text = await response.text();
  const elapsedMs = Date.now() - startedAt;
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
  }
  return {
    path,
    elapsedMs,
    bytes: Buffer.byteLength(text, "utf8")
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

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function summarize(results, failures, totalMs) {
  const elapsed = results.map(row => row.elapsedMs);
  const bytes = results.reduce((total, row) => total + row.bytes, 0);
  const byPath = {};
  results.forEach(row => {
    if (!byPath[row.path]) byPath[row.path] = [];
    byPath[row.path].push(row.elapsedMs);
  });

  return {
    totalRequests: results.length + failures.length,
    okRequests: results.length,
    failedRequests: failures.length,
    totalMs,
    totalBytes: bytes,
    latencyMs: {
      min: elapsed.length ? Math.min(...elapsed) : 0,
      p50: percentile(elapsed, 0.5),
      p95: percentile(elapsed, 0.95),
      max: elapsed.length ? Math.max(...elapsed) : 0
    },
    byPath: Object.fromEntries(Object.keys(byPath).sort().map(path => [
      path,
      {
        requests: byPath[path].length,
        p50: percentile(byPath[path], 0.5),
        p95: percentile(byPath[path], 0.95),
        max: Math.max(...byPath[path])
      }
    ])),
    failures: failures.slice(0, 5)
  };
}

async function runReadTest(options) {
  const paths = [
    `gameState/${options.gameId}`,
    `publicQuestions/${options.gameId}`,
    `publicScoreboards/${options.gameId}`
  ];
  const jobs = [];
  for (let player = 0; player < options.players; player += 1) {
    for (let round = 0; round < options.rounds; round += 1) {
      paths.forEach(path => jobs.push({ player, round, path }));
    }
  }

  const startedAt = Date.now();
  const results = [];
  const failures = [];

  await runInBatches(jobs, options.concurrency, async job => {
    try {
      results.push(await timedRead(options.firebaseUrl, job.path));
    } catch (error) {
      failures.push({
        player: job.player,
        round: job.round,
        path: job.path,
        message: error.message
      });
    }
  });

  return summarize(results, failures, Date.now() - startedAt);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertSafeOptions(options);
  console.log(JSON.stringify({
    mode: "firebase_read_only",
    firebaseUrl: options.firebaseUrl,
    gameId: options.gameId,
    players: options.players,
    rounds: options.rounds,
    concurrency: options.concurrency,
    writes: false,
    secrets: false
  }, null, 2));
  const result = await runReadTest(options);
  console.log(JSON.stringify(result, null, 2));
  if (result.failedRequests > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
