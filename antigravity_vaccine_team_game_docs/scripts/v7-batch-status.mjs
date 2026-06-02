#!/usr/bin/env node

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbzv0Mumayt5jNL2yjDrFt04bD--E0aPvJ9DW4UG-yByeOjPFsPPMUcx-XJySd8zZXdo/exec";
const DEFAULT_GAME_ID = "game_YYYYMMDD_vaccine_training";
const ALLOWED_DEPLOYMENT_ID = "AKfycbzv0Mumayt5jNL2yjDrFt04bD--E0aPvJ9DW4UG-yByeOjPFsPPMUcx-XJySd8zZXdo";

function parseArgs(argv) {
  const options = {
    gasUrl: process.env.V7_BATCH_STATUS_GAS_URL || DEFAULT_GAS_URL,
    adminSecret: process.env.V7_TEST_ADMIN_SECRET || "",
    gameId: process.env.V7_BATCH_STATUS_GAME_ID || DEFAULT_GAME_ID,
    questionId: "",
    closeSequence: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--gas-url" && next) options.gasUrl = next, index += 1;
    if (arg === "--game-id" && next) options.gameId = next, index += 1;
    if (arg === "--question-id" && next) options.questionId = next, index += 1;
    if (arg === "--close-sequence" && next) options.closeSequence = next, index += 1;
  }

  return options;
}

function assertSafeOptions(options) {
  if (!String(options.gasUrl || "").includes(`/${ALLOWED_DEPLOYMENT_ID}/`)) {
    throw new Error("安全限制：預設只允許查詢 GAS 測試 deployment @91。若要改 URL，請先人工檢查腳本。");
  }
  if (!options.adminSecret) {
    throw new Error("未設定 V7_TEST_ADMIN_SECRET。為避免密碼外洩，腳本只接受環境變數，不接受命令列密碼。");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(options.gameId)) {
    throw new Error("安全限制：gameId 只能包含英數、底線與連字號。");
  }
}

function buildGasUrl(gasUrl, payload) {
  const requestUrl = new URL(gasUrl);
  requestUrl.searchParams.set("callback", "cb");
  requestUrl.searchParams.set("payload", JSON.stringify(payload));
  requestUrl.searchParams.set("_ts", `${Date.now()}_${Math.random().toString(36).slice(2)}`);
  return requestUrl.toString();
}

async function callGas(options) {
  const response = await fetch(buildGasUrl(options.gasUrl, {
    action: "getSettlementBatchStatus",
    data: {
      gameId: options.gameId,
      questionId: options.questionId,
      closeSequence: options.closeSequence
    },
    adminSecret: options.adminSecret
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertSafeOptions(options);

  console.log(JSON.stringify({
    mode: "batch-status",
    gasUrl: options.gasUrl,
    gameId: options.gameId,
    questionId: options.questionId,
    closeSequence: options.closeSequence,
    adminSecretProvided: Boolean(options.adminSecret)
  }, null, 2));

  const result = await callGas(options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
