import { callGameApi, getConfig, getPublicGameState, getPublicQuestion, getPublicQuestions } from "./api.js?v=0.3.7";

const checkinView = document.querySelector("#checkinView");
const gameView = document.querySelector("#gameView");
const form = document.querySelector("#checkinForm");
const checkinSubmitButton = form.querySelector("button[type='submit']");
const nicknameInput = document.querySelector("#nickname");
const teamChoiceField = document.querySelector("#teamChoiceField");
const teamSelect = document.querySelector("#teamId");
const checkinStatus = document.querySelector("#checkinStatus");
const playerName = document.querySelector("#playerName");
const playerTeam = document.querySelector("#playerTeam");
const playerScore = document.querySelector("#playerScore");
const teamScore = document.querySelector("#teamScore");
const scoreUpdatedAt = document.querySelector("#scoreUpdatedAt");
const connectionMode = document.querySelector("#connectionMode");
const gameIdText = document.querySelector("#gameIdText");
const questionText = document.querySelector("#questionText");
const optionList = document.querySelector("#optionList");
const refreshQuestionButton = document.querySelector("#refreshQuestion");
const syncStatus = document.querySelector("#syncStatus");
const countdownText = document.querySelector("#countdownText");
const answerResult = document.querySelector("#answerResult");
const openLeaderboardsButton = document.querySelector("#openLeaderboards");
const leaderboardDialog = document.querySelector("#leaderboardDialog");
const closeLeaderboardsButton = document.querySelector("#closeLeaderboards");
const refreshLeaderboardsButton = document.querySelector("#refreshLeaderboards");
const leaderboardStatus = document.querySelector("#leaderboardStatus");
const teamLeaderboard = document.querySelector("#teamLeaderboard");
const playerLeaderboard = document.querySelector("#playerLeaderboard");
const refreshInventoryButton = document.querySelector("#refreshInventory");
const inventoryStatus = document.querySelector("#inventoryStatus");
const boxList = document.querySelector("#boxList");
const itemList = document.querySelector("#itemList");
const itemTargetQuestionId = document.querySelector("#itemTargetQuestionId");
const itemTargetTeamId = document.querySelector("#itemTargetTeamId");
const creativeForm = document.querySelector("#creativeForm");
const creativeContent = document.querySelector("#creativeContent");
const refreshCreativePoolButton = document.querySelector("#refreshCreativePool");
const creativeStatus = document.querySelector("#creativeStatus");
const creativePool = document.querySelector("#creativePool");
const refreshCreativeFinalistsButton = document.querySelector("#refreshCreativeFinalists");
const creativeFinalStatus = document.querySelector("#creativeFinalStatus");
const creativeFinalists = document.querySelector("#creativeFinalists");

const teamNames = {
  team_1: "第 1 隊",
  team_2: "第 2 隊",
  team_3: "第 3 隊",
  team_4: "第 4 隊",
  team_5: "第 5 隊"
};
const itemTargetRequirements = {
  score_1: "question",
  score_3: "question",
  score_5: "question",
  score_10: "question",
  double: "question",
  challenge: "question_team",
  comeback: "optional"
};

let currentQuestion = null;
let currentQuestionId = "";
let lastGameStatus = "";
let lastClosedScoreQuestionId = "";
let answeredQuestionId = "";
let isRefreshing = false;
let gameStateTimer = null;
let countdownTimer = null;
let questionOpenedAtMs = 0;
let lastFirebaseQuestionId = "";
let latestPublicGameState = null;
let publicQuestionCache = {};
let allowFreeTeamChoice = false;
let isTeamChoiceReady = false;
let isInventoryRefreshing = false;
let isCreativePoolRefreshing = false;
let isCreativeFinalistsRefreshing = false;

function resetClientCacheIfVersionChanged() {
  const config = getConfig();
  const versionKey = "vaccineGameClientVersion";
  const cachedVersion = localStorage.getItem(versionKey) || "";

  if (cachedVersion === config.clientVersion) {
    return;
  }

  localStorage.removeItem("vaccineGamePlayer");
  sessionStorage.removeItem(`vaccineGamePublicQuestions:${config.gameId}`);
  localStorage.setItem(versionKey, config.clientVersion);
}

function updateConnectionStatus() {
  const config = getConfig();
  connectionMode.textContent = config.apiMode === "gas" ? "GAS 後端" : "示範模式";
  gameIdText.textContent = config.gameId;
}

function getClientKey() {
  const storageKey = "vaccineGameClientKey";
  let clientKey = localStorage.getItem(storageKey) || "";
  if (!clientKey) {
    clientKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, clientKey);
  }
  return clientKey;
}

function updateTeamChoiceVisibility(state) {
  allowFreeTeamChoice = Boolean(state?.allowFreeTeamChoice);
  teamChoiceField.hidden = !allowFreeTeamChoice;
  if (!allowFreeTeamChoice) {
    teamSelect.value = "";
  }
}

function showGameView(player) {
  checkinView.hidden = true;
  gameView.hidden = false;
  playerName.textContent = player.nickname || "學員";
  playerTeam.textContent = teamNames[player.teamId] || player.teamId || "未分隊";
  updateConnectionStatus();
  updateScoreSummary({
    playerScore: player.score || 0,
    teamScore: player.teamScore || 0,
    updatedAt: player.updatedAt || ""
  });
  startGameStateWatcher();
  refreshPlayerSummary();
  refreshInventory();
  refreshCreativePool();
  refreshCreativeFinalists();
}

function updateScoreSummary(summary) {
  playerScore.textContent = Number(summary.playerScore || 0);
  teamScore.textContent = Number(summary.teamScore || 0);
  scoreUpdatedAt.textContent = summary.updatedAt
    ? new Date(summary.updatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
    : "尚未更新";
}

function renderQuestion(question) {
  stopCountdown();
  answerResult.textContent = "";
  answerResult.className = "answer-result";

  if (!question) {
    currentQuestion = null;
    currentQuestionId = "";
    answeredQuestionId = "";
    questionOpenedAtMs = 0;
    countdownText.textContent = "尚未開始";
    questionText.textContent = "目前尚未開放題目，請等待講師口令。";
    optionList.replaceChildren();
    return;
  }

  currentQuestion = question;
  currentQuestionId = question.questionId;
  answeredQuestionId = "";
  questionOpenedAtMs = Date.now();
  questionText.textContent = question.title || question.text || "題目缺少標題";
  optionList.replaceChildren();

  (question.options || []).forEach((option, index) => {
    const optionId = option.id || String.fromCharCode(65 + index);
    const optionText = option.text || String(option);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.textContent = `${optionId}. ${optionText}`;
    button.addEventListener("click", async () => {
      await submitAnswer(optionId);
    });
    optionList.append(button);
  });

  startCountdown(Number(question.timeLimitSec || 60));
}

function startCountdown(totalSeconds) {
  stopCountdown();
  const safeTotal = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 60;
  updateCountdown(safeTotal);
  countdownTimer = window.setInterval(() => {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - questionOpenedAtMs) / 1000));
    const remainingSeconds = Math.max(0, safeTotal - elapsedSeconds);
    updateCountdown(remainingSeconds);
    if (remainingSeconds <= 0) {
      stopCountdown();
      disableOptions();
      updateSyncStatus("作答時間已結束，請等待講師關題。");
    }
  }, 500);
}

function updateCountdown(remainingSeconds) {
  countdownText.textContent = `${remainingSeconds} 秒`;
  countdownText.classList.toggle("is-warning", remainingSeconds <= 10);
}

function stopCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function disableOptions() {
  [...optionList.querySelectorAll("button")].forEach(item => {
    item.disabled = true;
  });
}

function enableOptions() {
  [...optionList.querySelectorAll("button")].forEach(item => {
    item.disabled = false;
  });
}

function updateSyncStatus(message) {
  syncStatus.textContent = message;
}

function renderTeamLeaderboard(rows) {
  teamLeaderboard.replaceChildren();
  if (!rows || rows.length === 0) {
    const item = document.createElement("li");
    item.textContent = "尚無戰隊排行。";
    teamLeaderboard.append(item);
    return;
  }

  rows.slice(0, 5).forEach(row => {
    const item = document.createElement("li");
    const teamName = teamNames[row.teamId] || row.teamId || "未分隊";
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    const weightedAverageScore = Number(row.weightedAverageScore || row.averageScore || 0);
    const teamBonusScore = Number(row.teamBonusScore || 0);
    const effectivePlayerCount = Number(row.effectivePlayerCount || row.playerCount || 0);
    name.textContent = teamName;
    meta.textContent = `排名分 ${weightedAverageScore.toFixed(1)}，有效 ${effectivePlayerCount} 人，道具 +${teamBonusScore}`;
    item.append(name, meta);
    teamLeaderboard.append(item);
  });
}

function renderPlayerLeaderboard(rows) {
  playerLeaderboard.replaceChildren();
  if (!rows || rows.length === 0) {
    const item = document.createElement("li");
    item.textContent = "尚無個人排行。";
    playerLeaderboard.append(item);
    return;
  }

  rows.slice(0, 10).forEach(row => {
    const item = document.createElement("li");
    const teamName = teamNames[row.teamId] || row.teamId || "未分隊";
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    name.textContent = row.nickname || "學員";
    meta.textContent = `${Number(row.score || 0)} 分，${teamName}`;
    item.append(name, meta);
    playerLeaderboard.append(item);
  });
}

async function refreshLeaderboards() {
  if (!hasCheckedIn()) return;

  refreshLeaderboardsButton.disabled = true;
  leaderboardStatus.textContent = "正在更新排行榜...";

  try {
    refreshPlayerSummary();
    const [teamResult, playerResult] = await Promise.all([
      callGameApi("getScoreboard"),
      callGameApi("getPlayerLeaderboard")
    ]);
    renderTeamLeaderboard(teamResult.rows || []);
    renderPlayerLeaderboard(playerResult.rows || []);
    leaderboardStatus.textContent = "排行榜已更新。";
  } catch (error) {
    leaderboardStatus.textContent = `排行榜更新失敗：${error.message}`;
  } finally {
    refreshLeaderboardsButton.disabled = false;
  }
}

function openLeaderboards() {
  leaderboardDialog.hidden = false;
  refreshLeaderboards();
}

function closeLeaderboards() {
  leaderboardDialog.hidden = true;
}

function renderInventory(inventory) {
  const boxes = inventory?.boxes || [];
  const items = inventory?.items || [];
  renderBoxes(boxes);
  renderItems(items);
  inventoryStatus.textContent = `未開啟寶箱 ${inventory?.unopenedBoxCount || 0} / ${inventory?.maxUnopenedBoxCount || 3}，可用道具 ${items.filter(item => item.status === "available").length} 個。`;
}

function renderBoxes(boxes) {
  boxList.replaceChildren();
  if (!boxes.length) {
    boxList.append(createEmptyInventoryItem("目前沒有寶箱。"));
    return;
  }

  boxes.forEach(box => {
    const row = document.createElement("article");
    row.className = "inventory-item";

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = getBoxTitle(box);
    meta.textContent = getBoxMeta(box);
    body.append(title, meta);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "secondary-action compact-action";
    action.textContent = box.status === "unopened" ? "開啟" : "已處理";
    action.disabled = box.status !== "unopened";
    action.addEventListener("click", () => openBox(box.boxId));

    row.append(body, action);
    boxList.append(row);
  });
}

function renderItems(items) {
  itemList.replaceChildren();
  if (!items.length) {
    itemList.append(createEmptyInventoryItem("目前沒有道具。"));
    return;
  }

  items.forEach(item => {
    const row = document.createElement("article");
    row.className = "inventory-item";

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = item.itemLabel || item.itemType || "道具";
    meta.textContent = getItemMeta(item);
    body.append(title, meta);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "secondary-action compact-action";
    action.textContent = getItemActionText(item);
    action.disabled = !canUseItem(item);
    action.addEventListener("click", () => useInventoryItem(item));

    row.append(body, action);
    itemList.append(row);
  });
}

function createEmptyInventoryItem(text) {
  const row = document.createElement("article");
  row.className = "inventory-item is-empty";
  row.textContent = text;
  return row;
}

function getBoxTitle(box) {
  if (box.status === "unopened") return "未開啟寶箱";
  if (box.status === "opened") return box.itemLabel || "已開啟寶箱";
  if (box.status === "discarded") return "已丟棄寶箱";
  if (box.status === "expired") return "已失效寶箱";
  return "寶箱";
}

function getBoxMeta(box) {
  const source = box.sourceType ? `來源 ${box.sourceType}` : "來源未記錄";
  const time = box.awardedAt ? new Date(box.awardedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) : "";
  return [source, time].filter(Boolean).join("，");
}

function getItemMeta(item) {
  const statusText = {
    available: "可使用",
    armed: "已指定，等待結算",
    used: "已使用"
  }[item.status] || item.status || "狀態未記錄";
  const target = item.targetQuestionId ? `目標 ${item.targetQuestionId}` : "";
  const effect = item.effectScore !== "" && item.effectScore !== undefined ? `效果 +${item.effectScore}` : "";
  return [statusText, target, effect].filter(Boolean).join("，");
}

function getItemActionText(item) {
  if (item.itemType === "special") return "幸運獎";
  if (item.status === "armed") return "已指定";
  if (item.status === "used") return "已使用";
  return "使用";
}

function canUseItem(item) {
  return item.status === "available" && item.itemType !== "special" && Boolean(itemTargetRequirements[item.itemType]);
}

async function refreshInventory() {
  if (isInventoryRefreshing || !hasCheckedIn()) return;
  const saved = getSavedPlayer();
  isInventoryRefreshing = true;
  refreshInventoryButton.disabled = true;
  inventoryStatus.textContent = "正在讀取寶箱與道具...";

  try {
    const inventory = await callGameApi("getPlayerInventory", {
      playerId: saved.playerId
    });
    renderInventory(inventory);
  } catch (error) {
    inventoryStatus.textContent = `寶箱與道具讀取失敗：${error.message}`;
  } finally {
    isInventoryRefreshing = false;
    refreshInventoryButton.disabled = false;
  }
}

async function openBox(boxId) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;

  inventoryStatus.textContent = "正在開啟寶箱...";
  try {
    const result = await callGameApi("openTreasureBox", {
      playerId: saved.playerId,
      boxId
    });
    inventoryStatus.textContent = result.itemType === "empty"
      ? "寶箱已開啟，本次沒有取得道具。"
      : `寶箱已開啟，取得 ${result.itemLabel || "道具"}。`;
    await refreshInventory();
  } catch (error) {
    inventoryStatus.textContent = `開箱失敗：${error.message}`;
  }
}

async function useInventoryItem(item) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;

  const payload = {
    playerId: saved.playerId,
    itemId: item.itemId
  };
  const requirement = itemTargetRequirements[item.itemType] || "";
  const targetQuestionId = itemTargetQuestionId.value.trim();
  const targetTeamId = itemTargetTeamId.value;

  if (requirement.includes("question")) {
    if (!targetQuestionId) {
      inventoryStatus.textContent = "請先填寫目標題目。";
      itemTargetQuestionId.focus();
      return;
    }
    payload.targetQuestionId = targetQuestionId;
  }
  if (requirement.includes("team")) {
    if (!targetTeamId) {
      inventoryStatus.textContent = "請先選擇挑戰戰隊。";
      itemTargetTeamId.focus();
      return;
    }
    payload.targetTeamId = targetTeamId;
  }
  if (requirement === "optional" && targetQuestionId) {
    payload.targetQuestionId = targetQuestionId;
  }

  inventoryStatus.textContent = "正在使用道具...";
  try {
    const result = await callGameApi("useItem", payload);
    inventoryStatus.textContent = result.status === "armed"
      ? `${result.itemLabel || "道具"} 已指定，等待關題結算。`
      : `${result.itemLabel || "道具"} 已使用，效果 +${Number(result.effectScore || 0)}。`;
    await Promise.all([refreshInventory(), refreshPlayerSummary()]);
  } catch (error) {
    inventoryStatus.textContent = `使用道具失敗：${error.message}`;
  }
}

function renderCreativePool(result) {
  const rows = result?.rows || [];
  creativePool.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("article");
    empty.className = "creative-entry is-empty";
    empty.textContent = "目前沒有同隊投稿。";
    creativePool.append(empty);
    creativeStatus.textContent = "同隊投稿池已更新。";
    return;
  }

  rows.forEach(row => {
    const entry = document.createElement("article");
    entry.className = "creative-entry";

    const body = document.createElement("div");
    const content = document.createElement("p");
    const meta = document.createElement("span");
    content.textContent = row.content || "";
    meta.textContent = `${row.voteCount || 0} 票${row.isOwn ? "，我的投稿" : ""}`;
    body.append(content, meta);

    const voteButton = document.createElement("button");
    voteButton.type = "button";
    voteButton.className = "secondary-action compact-action";
    voteButton.textContent = result.votedSubmissionId === row.submissionId ? "已投" : "投票";
    voteButton.disabled = Boolean(result.votedSubmissionId);
    voteButton.addEventListener("click", () => voteCreativeSubmission(row.submissionId));

    entry.append(body, voteButton);
    creativePool.append(entry);
  });

  creativeStatus.textContent = result.votedSubmissionId
    ? "已完成隊內初選投票。"
    : "同隊投稿池已更新，可投 1 票。";
}

async function refreshCreativePool() {
  if (isCreativePoolRefreshing || !hasCheckedIn()) return;
  const saved = getSavedPlayer();
  isCreativePoolRefreshing = true;
  refreshCreativePoolButton.disabled = true;
  creativeStatus.textContent = "正在讀取同隊投稿池...";

  try {
    const result = await callGameApi("getTeamCreativePool", {
      playerId: saved.playerId
    });
    renderCreativePool(result);
    if (result.ownSubmissionId) {
      creativeContent.disabled = true;
      creativeForm.querySelector("button[type='submit']").disabled = true;
    }
  } catch (error) {
    creativeStatus.textContent = `同隊投稿池讀取失敗：${error.message}`;
  } finally {
    isCreativePoolRefreshing = false;
    refreshCreativePoolButton.disabled = false;
  }
}

async function submitCreativeAnswer(event) {
  event.preventDefault();
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;

  const content = creativeContent.value.trim();
  if (!content) {
    creativeStatus.textContent = "請先填寫創作答案。";
    creativeContent.focus();
    return;
  }

  creativeStatus.textContent = "正在提交創作答案...";
  try {
    await callGameApi("submitCreativeAnswer", {
      playerId: saved.playerId,
      content
    });
    creativeContent.disabled = true;
    creativeForm.querySelector("button[type='submit']").disabled = true;
    creativeStatus.textContent = "創作答案已提交。";
    await refreshCreativePool();
  } catch (error) {
    creativeStatus.textContent = `提交失敗：${error.message}`;
  }
}

async function voteCreativeSubmission(submissionId) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;

  creativeStatus.textContent = "正在送出隊內初選投票...";
  try {
    await callGameApi("voteTeamCreative", {
      playerId: saved.playerId,
      submissionId
    });
    creativeStatus.textContent = "隊內初選投票已送出。";
    await refreshCreativePool();
  } catch (error) {
    creativeStatus.textContent = `投票失敗：${error.message}`;
  }
}

function renderCreativeFinalists(result) {
  const rows = result?.rows || [];
  creativeFinalists.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("article");
    empty.className = "creative-entry is-empty";
    empty.textContent = "講師尚未選出匿名決選作品。";
    creativeFinalists.append(empty);
    creativeFinalStatus.textContent = "尚無決選作品。";
    return;
  }

  rows.forEach(row => {
    const entry = document.createElement("article");
    entry.className = "creative-entry";

    const body = document.createElement("div");
    const content = document.createElement("p");
    const meta = document.createElement("span");
    content.textContent = `${row.finalAlias || ""}. ${row.content || ""}`;
    meta.textContent = row.isOwnTeam ? "本隊作品，不可投票" : "匿名決選作品";
    body.append(content, meta);

    const voteButton = document.createElement("button");
    voteButton.type = "button";
    voteButton.className = "secondary-action compact-action";
    voteButton.textContent = result.votedSubmissionId === row.submissionId ? "已投" : "投票";
    voteButton.disabled = Boolean(result.votedSubmissionId) || Boolean(row.isOwnTeam);
    voteButton.addEventListener("click", () => voteCreativeFinalist(row.submissionId));

    entry.append(body, voteButton);
    creativeFinalists.append(entry);
  });

  creativeFinalStatus.textContent = result.votedSubmissionId
    ? "已完成匿名全體投票。"
    : "請選擇 1 則非本隊匿名作品投票。";
}

async function refreshCreativeFinalists() {
  if (isCreativeFinalistsRefreshing || !hasCheckedIn()) return;
  const saved = getSavedPlayer();
  isCreativeFinalistsRefreshing = true;
  refreshCreativeFinalistsButton.disabled = true;
  creativeFinalStatus.textContent = "正在讀取匿名決選作品...";

  try {
    const result = await callGameApi("getCreativeFinalists", {
      playerId: saved.playerId
    });
    renderCreativeFinalists(result);
  } catch (error) {
    creativeFinalStatus.textContent = `匿名決選作品讀取失敗：${error.message}`;
  } finally {
    isCreativeFinalistsRefreshing = false;
    refreshCreativeFinalistsButton.disabled = false;
  }
}

async function voteCreativeFinalist(submissionId) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;

  creativeFinalStatus.textContent = "正在送出匿名全體投票...";
  try {
    await callGameApi("voteCreativeFinal", {
      playerId: saved.playerId,
      submissionId
    });
    creativeFinalStatus.textContent = "匿名全體投票已送出。";
    await refreshCreativeFinalists();
  } catch (error) {
    creativeFinalStatus.textContent = `投票失敗：${error.message}`;
  }
}

function shouldRenderQuestion(result) {
  const nextQuestionId = result.question ? result.question.questionId : "";
  const nextStatus = result.status || "";
  return nextQuestionId !== currentQuestionId || nextStatus !== lastGameStatus;
}

function getSavedPlayer() {
  return JSON.parse(localStorage.getItem("vaccineGamePlayer") || "null");
}

function savePlayer(player) {
  localStorage.setItem("vaccineGamePlayer", JSON.stringify(player));
}

function clearSavedPlayer(message = "") {
  localStorage.removeItem("vaccineGamePlayer");
  stopCountdown();
  checkinView.hidden = false;
  gameView.hidden = true;
  currentQuestion = null;
  currentQuestionId = "";
  answeredQuestionId = "";
  lastClosedScoreQuestionId = "";
  if (message) {
    checkinStatus.textContent = message;
  }
}

function hasCheckedIn() {
  const saved = getSavedPlayer();
  return Boolean(saved && saved.playerId);
}

function toTimeMs(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function isSavedPlayerStale(saved, state) {
  if (!saved || !state) return false;
  const status = state.status || "";
  const stateUpdatedAt = toTimeMs(state.updatedAt);
  const checkedInAt = toTimeMs(saved.checkedInAt || saved.updatedAt);
  return status === "draft" && stateUpdatedAt > 0 && checkedInAt > 0 && checkedInAt < stateUpdatedAt;
}

function renderPublicGameState(state) {
  if (!state || !hasCheckedIn()) {
    return;
  }

  const saved = getSavedPlayer();
  if (isSavedPlayerStale(saved, state)) {
    clearSavedPlayer("遊戲已初始化，請重新報到。");
    return;
  }

  latestPublicGameState = state;
  updateTeamChoiceVisibility(state);
  const status = state.status || "";
  const questionId = state.currentQuestionId || "";

  if (state.publicQuestion && state.publicQuestion.questionId) {
    publicQuestionCache[state.publicQuestion.questionId] = state.publicQuestion;
  }

  if (status === "question_open" && questionId && questionId !== currentQuestionId) {
    lastFirebaseQuestionId = questionId;
    lastGameStatus = status;
    updateSyncStatus(`講師已開放 ${questionId}，請按「翻開試卷」。`);
    return;
  }

  if (status === "question_closed" && questionId && questionId === currentQuestionId) {
    stopCountdown();
    disableOptions();
    lastGameStatus = status;
    updateSyncStatus(`${questionId} 已關題，正在更新分數。`);
    if (lastClosedScoreQuestionId !== questionId) {
      lastClosedScoreQuestionId = questionId;
      refreshPlayerSummary(questionId);
      refreshLeaderboards();
      refreshInventory();
    }
    return;
  }

  if (status === "created" && !lastFirebaseQuestionId) {
    updateSyncStatus("場次已啟動，請等待講師開題。");
  }
}

async function preloadPublicQuestions() {
  try {
    const questions = await getPublicQuestions();
    if (questions && typeof questions === "object") {
      publicQuestionCache = questions;
      updateSyncStatus("公開題庫已預載，請等待講師開題。");
    }
  } catch (error) {
    if (hasCheckedIn() && !currentQuestion) {
      updateSyncStatus("公開題庫暫時無法讀取，翻開試卷時會改用 GAS 後端。");
    }
  }
}

async function refreshPublicGameState() {
  try {
    const state = await getPublicGameState();
    renderPublicGameState(state);
  } catch (error) {
    if (hasCheckedIn() && !currentQuestion) {
      updateSyncStatus("Firebase 公開狀態暫時無法讀取，仍可依講師口令翻開試卷。");
    }
  }
}

function startGameStateWatcher() {
  const config = getConfig();
  if (!config.firebaseDatabaseUrl || gameStateTimer) {
    return;
  }

  preloadPublicQuestions();
  refreshPublicGameState();
  gameStateTimer = window.setInterval(refreshPublicGameState, config.firebaseGameStatePollMs);
}

async function getQuestionFromFirebase(questionId) {
  if (!questionId) {
    return null;
  }

  if (latestPublicGameState?.publicQuestion?.questionId === questionId) {
    publicQuestionCache[questionId] = latestPublicGameState.publicQuestion;
    return latestPublicGameState.publicQuestion;
  }

  if (publicQuestionCache[questionId]) {
    return publicQuestionCache[questionId];
  }

  const question = await getPublicQuestion(questionId);
  if (question && question.questionId) {
    publicQuestionCache[question.questionId] = question;
  }
  return question;
}

async function refreshPlayerSummary(questionId = "") {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;

  try {
    const result = await callGameApi("getPlayerSummary", {
      playerId: saved.playerId,
      questionId
    });
    const updatedPlayer = {
      ...saved,
      score: result.playerScore || 0,
      playerScore: result.playerScore || 0,
      teamScore: result.teamScore || 0,
      updatedAt: result.updatedAt || new Date().toISOString()
    };
    savePlayer(updatedPlayer);
    updateScoreSummary({
      playerScore: updatedPlayer.playerScore,
      teamScore: updatedPlayer.teamScore,
      updatedAt: updatedPlayer.updatedAt
    });

    if (questionId && result.lastAnswer && result.lastAnswer.score !== "") {
      answerResult.textContent = `講師已關題。本題得分 ${Number(result.lastAnswer.score || 0)} 分，目前個人積分 ${Number(result.playerScore || 0)} 分。`;
      answerResult.className = Number(result.lastAnswer.score || 0) > 0
        ? "answer-result is-correct"
        : "answer-result is-wrong";
    }
  } catch (error) {
    if (questionId) {
      updateSyncStatus("關題後分數暫時無法更新，請等待講師下一題或重新整理。");
    }
  }
}

async function refreshQuestion() {
  if (isRefreshing) return;

  isRefreshing = true;
  refreshQuestionButton.disabled = true;
  questionText.textContent = "正在翻開試卷...";
  answerResult.textContent = "";
  updateSyncStatus("正在確認講師開題狀態。");

  try {
    const saved = getSavedPlayer();
    if (!saved || !saved.playerId) {
      questionText.textContent = "請先完成報到，再翻開試卷。";
      optionList.replaceChildren();
      updateSyncStatus("尚未報到。");
      return;
    }

    let publicState = null;
    let publicQuestion = null;
    try {
      publicState = await getPublicGameState();
      latestPublicGameState = publicState;
      const publicQuestionId = publicState?.currentQuestionId || "";
      publicQuestion = publicState?.status === "question_open"
        ? await getQuestionFromFirebase(publicQuestionId)
        : null;
    } catch (error) {
      updateSyncStatus("Firebase 題目暫時無法讀取，改用 GAS 後端確認。");
    }

    if (publicQuestion) {
      await callGameApi("openPaper", {
        playerId: saved.playerId
      });
      renderQuestion(publicQuestion);
      lastGameStatus = publicState.status || "";
      updateSyncStatus("試卷已翻開，請在倒數結束前作答。");
      return;
    }

    const result = await callGameApi("getCurrentQuestion", {
      playerId: saved.playerId
    });

    if (shouldRenderQuestion(result)) {
      renderQuestion(result.question);
    }

    lastGameStatus = result.status || "";
    updateSyncStatus(result.question ? "試卷已翻開，請在倒數結束前作答。" : "講師尚未開題，請等待口令。");
  } catch (error) {
    questionText.textContent = error.message;
    optionList.replaceChildren();
    stopCountdown();
    countdownText.textContent = "尚未開始";
    updateSyncStatus("翻開試卷失敗，請重新整理後再試。");
  } finally {
    isRefreshing = false;
    refreshQuestionButton.disabled = false;
  }
}

async function submitAnswer(answer) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) {
    questionText.textContent = "請先完成報到，再送出答案。";
    return;
  }
  if (!currentQuestion || !currentQuestion.questionId) {
    questionText.textContent = "目前沒有可作答的題目。";
    return;
  }
  if (answeredQuestionId === currentQuestion.questionId) {
    questionText.textContent = "本題已送出，請等待講師關題。";
    return;
  }

  const confirmed = window.confirm(`確認送出答案 ${answer}？送出後不能修改。`);
  if (!confirmed) {
    return;
  }

  stopCountdown();
  disableOptions();
  updateSyncStatus("答案送出中，請勿重複操作。");

  try {
    await callGameApi("submitAnswer", {
      playerId: saved.playerId,
      questionId: currentQuestion.questionId,
      answer: [answer]
    });

    answeredQuestionId = currentQuestion.questionId;
    answerResult.textContent = "答案已送出。為避免互相提示，分數會在講師關題後公布。";
    answerResult.className = "answer-result is-pending";
    updateSyncStatus("答案已送出，請等待講師關題計分。");
  } catch (error) {
    questionText.textContent = error.message;
    answerResult.textContent = "送出失敗，請確認網路後再次送出。倒數已停止，系統仍以 GAS 伺服器紀錄為準。";
    answerResult.className = "answer-result is-wrong";
    enableOptions();
    updateSyncStatus("答案尚未確認送出，請再試一次。");
  }
}

async function getStartupGameState() {
  try {
    const state = await getPublicGameState();
    if (state) return state;
  } catch (error) {
    // Firebase is a fast public cache. Fall back to GAS when it is temporarily unavailable.
  }

  return callGameApi("getGameState");
}

async function initTeamChoiceMode() {
  isTeamChoiceReady = false;
  checkinSubmitButton.disabled = true;
  checkinStatus.textContent = "正在讀取分隊設定...";
  try {
    updateTeamChoiceVisibility(await getStartupGameState());
    checkinStatus.textContent = allowFreeTeamChoice
      ? "請輸入暱稱並選擇戰隊後完成報到。"
      : "請輸入暱稱後完成報到，系統會自動分隊。";
  } catch (error) {
    updateTeamChoiceVisibility(null);
    checkinStatus.textContent = "暫時無法讀取分隊設定，將採系統自動分隊。";
  } finally {
    isTeamChoiceReady = true;
    checkinSubmitButton.disabled = false;
  }
}

async function restoreCheckin() {
  const saved = getSavedPlayer();
  if (!saved) return;

  nicknameInput.value = saved.nickname;
  teamSelect.value = saved.teamId;

  try {
    const state = await getStartupGameState();
    updateTeamChoiceVisibility(state);
    if (isSavedPlayerStale(saved, state)) {
      clearSavedPlayer("遊戲已初始化，請重新報到。");
      return;
    }
  } catch (error) {
    clearSavedPlayer("無法確認場次狀態，請重新整理後再報到。");
    return;
  }

  showGameView(saved);
  updateSyncStatus("已讀取本機報到資料，請等待講師開題。");
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isTeamChoiceReady) {
    checkinStatus.textContent = "分隊設定仍在讀取中，請稍候。";
    return;
  }

  const nickname = nicknameInput.value.trim();
  const requestedTeamId = allowFreeTeamChoice ? teamSelect.value : "";
  checkinStatus.textContent = "正在報到...";

  try {
    const joined = await callGameApi("joinGame", {
      nickname,
      teamId: requestedTeamId,
      clientKey: getClientKey()
    });
    const player = {
      playerId: joined.playerId,
      gameId: joined.gameId,
      nickname: joined.nickname || nickname,
      teamId: joined.teamId,
      clientKey: getClientKey(),
      score: joined.score || 0,
      teamScore: 0,
      checkedInAt: new Date().toISOString()
    };

    savePlayer(player);
    teamSelect.value = player.teamId;
    showGameView(player);
    updateSyncStatus("報到完成，請等待講師口令。");
    refreshPublicGameState();
  } catch (error) {
    checkinStatus.textContent = `報到失敗：${error.message}`;
  }
});

refreshQuestionButton.addEventListener("click", refreshQuestion);
refreshInventoryButton.addEventListener("click", refreshInventory);
creativeForm.addEventListener("submit", submitCreativeAnswer);
refreshCreativePoolButton.addEventListener("click", refreshCreativePool);
refreshCreativeFinalistsButton.addEventListener("click", refreshCreativeFinalists);
openLeaderboardsButton.addEventListener("click", openLeaderboards);
closeLeaderboardsButton.addEventListener("click", closeLeaderboards);
leaderboardDialog.addEventListener("click", event => {
  if (event.target?.dataset?.closeLeaderboard !== undefined) {
    closeLeaderboards();
  }
});
refreshLeaderboardsButton.addEventListener("click", refreshLeaderboards);

resetClientCacheIfVersionChanged();
updateConnectionStatus();
initTeamChoiceMode();
restoreCheckin();
