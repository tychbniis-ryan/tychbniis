import {
  callGameApi,
  getConfig,
  getPublicGameState,
  getPublicQuestion,
  getPublicQuestions,
  getScoreboardSnapshot,
  joinFastPlayer,
  requestFastAchievementClaim,
  requestFastItemUse,
  requestFastTreasureOpen,
  submitFastAnswer
} from "./api.js?v=0.4.10";
import {
  buildClientSubmitId,
  buildPublicQuestionCache,
  buildStaticTreasurePlan,
  calculateStaticQuestionResult,
  getPerfectAwardCandidate,
  hashStringToUint32,
  loadV4StaticConfig
} from "./static-v4.js?v=0.4.10";

const checkinView = document.querySelector("#checkinView");
const gameView = document.querySelector("#gameView");
const form = document.querySelector("#checkinForm");
const checkinSubmitButton = form.querySelector("button[type='submit']");
const nicknameInput = document.querySelector("#nickname");
const teamChoiceField = document.querySelector("#teamChoiceField");
const teamChoiceGrid = document.querySelector("#teamChoiceGrid");
const checkinStatus = document.querySelector("#checkinStatus");
const playerName = document.querySelector("#playerName");
const playerTeam = document.querySelector("#playerTeam");
const playerScore = document.querySelector("#playerScore");
const teamScore = document.querySelector("#teamScore");
const scoreUpdatedAt = document.querySelector("#scoreUpdatedAt");
const scoreStripLabels = document.querySelectorAll(".score-strip span");
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
const itemUseCountdown = document.querySelector("#itemUseCountdown");
const boxList = document.querySelector("#boxList");
const itemList = document.querySelector("#itemList");
const openInventoryPanelButton = document.querySelector("#openInventoryPanel");
const openAchievementPanelButton = document.querySelector("#openAchievementPanel");
const inventoryNotice = document.querySelector("#inventoryNotice");
const achievementNotice = document.querySelector("#achievementNotice");
const utilityDialog = document.querySelector("#utilityDialog");
const inventoryPanel = document.querySelector("#inventoryPanel");
const achievementPanel = document.querySelector("#achievementPanel");
const closeUtilityPanelButton = document.querySelector("#closeUtilityPanel");
const refreshAchievementsButton = document.querySelector("#refreshAchievements");
const achievementStatus = document.querySelector("#achievementStatus");
const achievementList = document.querySelector("#achievementList");
const creativePanel = document.querySelector("#creativePanel");
const creativeForm = document.querySelector("#creativeForm");
const creativeContent = document.querySelector("#creativeContent");
const refreshCreativePoolButton = document.querySelector("#refreshCreativePool");
const creativeStatus = document.querySelector("#creativeStatus");
const creativePool = document.querySelector("#creativePool");
const creativeFinalPanel = document.querySelector("#creativeFinalPanel");
const refreshCreativeFinalistsButton = document.querySelector("#refreshCreativeFinalists");
const creativeFinalStatus = document.querySelector("#creativeFinalStatus");
const creativeFinalists = document.querySelector("#creativeFinalists");
const finalResultPanel = document.querySelector("#finalResultPanel");
const finalResultStatus = document.querySelector("#finalResultStatus");
const challengeDialog = document.querySelector("#challengeDialog");
const closeChallengeDialogButton = document.querySelector("#closeChallengeDialog");
const challengeStatus = document.querySelector("#challengeStatus");
const challengeTeamGrid = document.querySelector("#challengeTeamGrid");
const abandonCreativeButton = document.querySelector("#abandonCreativeAnswer");

const teamNames = {
  team_1: "第 1 隊",
  team_2: "第 2 隊",
  team_3: "第 3 隊",
  team_4: "第 4 隊",
  team_5: "第 5 隊"
};
const itemTargetRequirements = {
  score_1: "",
  score_3: "",
  score_5: "",
  score_10: "",
  double: "",
  challenge: "team",
  comeback: "optional"
};
const localScoreBuckets = [
  { maxSeconds: 10, score: 30 },
  { maxSeconds: 20, score: 25 },
  { maxSeconds: 30, score: 20 },
  { maxSeconds: 45, score: 15 },
  { maxSeconds: 60, score: 10 },
  { maxSeconds: 999, score: 5 }
];
const localItemEffects = {
  score_1: 1,
  score_3: 3,
  score_5: 5,
  score_10: 10,
  comeback: 5
};
const itemLabels = {
  empty: "空寶箱",
  score_1: "+1 分卡",
  score_3: "+3 分卡",
  score_5: "+5 分卡",
  score_10: "+10 分卡",
  double: "加倍卡",
  comeback: "翻身卡",
  challenge: "挑戰卡",
  special: "幸運箱"
};
const itemDescriptions = {
  empty: "沒有取得道具。",
  score_1: "關題後 3 分鐘內使用，立即增加個人道具分 1 分。",
  score_3: "關題後 3 分鐘內使用，立即增加個人道具分 3 分。",
  score_5: "關題後 3 分鐘內使用，立即增加個人道具分 5 分。",
  score_10: "關題後 3 分鐘內使用，立即增加個人道具分 10 分。",
  double: "關題後 3 分鐘內使用，下一次答對時加計同等個人分數。",
  comeback: "關題後 3 分鐘內使用，前端先加 5 分，正式結果以結算為準。",
  challenge: "關題後 3 分鐘內指定其他戰隊，正式效果由 GAS 依戰隊完成率結算。",
  special: "幸運箱開啟後會立即記錄，最後結算判斷幸運獎。"
};
const postCloseItemUseWindowMs = 180 * 1000;

let currentQuestion = null;
let currentQuestionId = "";
let lastGameStatus = "";
let lastClosedScoreQuestionId = "";
let lastClosedQuestionId = "";
let lastClosedQuestionAtMs = 0;
let answeredQuestionId = "";
let isRefreshing = false;
let gameStateTimer = null;
let countdownTimer = null;
let questionOpenedAtMs = 0;
let lastFirebaseQuestionId = "";
let latestPublicGameState = null;
let publicQuestionCache = {};
let v4StaticConfig = null;
let cachedInventory = null;
let cachedAchievements = null;
let currentGameSessionUpdatedAt = "";
let allowFreeTeamChoice = false;
let isTeamChoiceReady = false;
let pendingNickname = "";
let isInventoryRefreshing = false;
let isAchievementRefreshing = false;
let isCreativePoolRefreshing = false;
let isCreativeFinalistsRefreshing = false;
let pendingChallengeItem = null;
let creativeCountdownTimer = null;
let creativeFinalCountdownTimer = null;
let creativeCountdownKey = "";
let creativeFinalCountdownKey = "";
let finalResultsLoaded = false;

const emptyTreasureMessages = [
  "寶物被偷走了",
  "發現空寶箱",
  "再接再厲",
  "差點就中了",
  "寶箱睡著了",
  "這次先暖身",
  "下次會更好"
];

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

function getLocalAnswerKey() {
  const config = getConfig();
  const saved = getSavedPlayer();
  const sessionKey = saved?.gameSessionUpdatedAt || currentGameSessionUpdatedAt || config.clientVersion;
  return `vaccineGameLocalAnswers:${config.gameId}:${sessionKey}:${saved?.playerId || "anonymous"}`;
}

function getLocalAnswers() {
  try {
    return JSON.parse(localStorage.getItem(getLocalAnswerKey()) || "{}");
  } catch (error) {
    return {};
  }
}

function saveLocalAnswers(rows) {
  localStorage.setItem(getLocalAnswerKey(), JSON.stringify(rows || {}));
}

function recordLocalAnswer(question, answer, result = null, responseSecondsOverride = null) {
  if (!question || !question.questionId) return;
  const rows = getLocalAnswers();
  const elapsedSeconds = responseSecondsOverride === null
    ? Math.max(0, Math.floor((Date.now() - questionOpenedAtMs) / 1000))
    : Number(responseSecondsOverride || 0);
  rows[question.questionId] = {
    questionId: question.questionId,
    answer: [answer].filter(Boolean),
    responseSeconds: elapsedSeconds,
    submittedAt: new Date().toISOString(),
    score: result ? Number(result.finalQuestionScore || result.baseScore || 0) : rows[question.questionId]?.score || 0,
    itemBonusScore: result ? Number(result.bonusScore || 0) : rows[question.questionId]?.itemBonusScore || 0,
    isCorrect: result ? Boolean(result.isCorrect) : rows[question.questionId]?.isCorrect,
    scored: Boolean(rows[question.questionId]?.scored)
  };
  saveLocalAnswers(rows);
}

function normalizeAnswer(value) {
  return (Array.isArray(value) ? value : [value])
    .map(item => String(item || "").trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

function calculateLocalBaseScore(isCorrect, responseSeconds) {
  if (!isCorrect) return 0;
  const bucket = localScoreBuckets.find(row => responseSeconds <= row.maxSeconds);
  return bucket ? bucket.score : 0;
}

function getLocalAnswerScore() {
  return Object.values(getLocalAnswers())
    .filter(row => row.scored)
    .reduce((total, row) => total + Number(row.score || 0), 0);
}

function getLocalItemScore() {
  const answerBonus = Object.values(getLocalAnswers())
    .filter(row => row.scored)
    .reduce((total, row) => total + Number(row.itemBonusScore || 0), 0);
  const itemBonus = getQueuedItemUses()
    .filter(row => row.status === "queued" || row.status === "sent")
    .reduce((total, row) => total + Number(localItemEffects[row.itemType] || 0), 0);
  return answerBonus + itemBonus;
}

function updateLocalScoreSummary(updatedAt = "") {
  updateScoreSummary({
    playerScore: getLocalAnswerScore(),
    itemScore: getLocalItemScore(),
    updatedAt: updatedAt || new Date().toISOString()
  });
}

function applyClosedQuestionReveal(state) {
  const reveal = state?.answerReveal;
  const questionId = reveal?.questionId || state?.currentQuestionId || "";
  if (!questionId || !reveal || !Array.isArray(reveal.correctAnswers)) return;

  const answers = getLocalAnswers();
  const localAnswer = answers[questionId];
  if (!localAnswer || localAnswer.scored) return;

  const isCorrect = normalizeAnswer(localAnswer.answer) === normalizeAnswer(reveal.correctAnswers);
  const baseScore = calculateLocalBaseScore(isCorrect, Number(localAnswer.responseSeconds || 999));
  const hasDouble = getQueuedItemUses().some(row =>
    row.itemType === "double" &&
    row.status === "sent" &&
    row.targetQuestionId === questionId
  );
  const itemBonusScore = isCorrect && hasDouble ? baseScore : 0;
  answers[questionId] = {
    ...localAnswer,
    score: baseScore,
    itemBonusScore,
    isCorrect,
    scored: true,
    scoredAt: new Date().toISOString()
  };
  saveLocalAnswers(answers);
  updateLocalScoreSummary(state.updatedAt || "");
}

function getQueuedItemUseKey() {
  const config = getConfig();
  const saved = getSavedPlayer();
  const sessionKey = saved?.gameSessionUpdatedAt || currentGameSessionUpdatedAt || config.clientVersion;
  return `vaccineGameQueuedItemUses:${config.gameId}:${sessionKey}:${saved?.playerId || "anonymous"}`;
}

function getQueuedItemUses() {
  try {
    return JSON.parse(localStorage.getItem(getQueuedItemUseKey()) || "[]");
  } catch (error) {
    return [];
  }
}

function saveQueuedItemUses(rows) {
  localStorage.setItem(getQueuedItemUseKey(), JSON.stringify(rows || []));
}

function getLocalInventoryKey() {
  const config = getConfig();
  const saved = getSavedPlayer();
  const sessionKey = saved?.gameSessionUpdatedAt || currentGameSessionUpdatedAt || config.clientVersion;
  return `vaccineGameLocalInventory:${config.gameId}:${sessionKey}:${saved?.playerId || "anonymous"}`;
}

function getLocalInventory() {
  try {
    return JSON.parse(localStorage.getItem(getLocalInventoryKey()) || '{"boxes":[],"items":[],"claimedAchievements":{}}');
  } catch (error) {
    return { boxes: [], items: [], claimedAchievements: {} };
  }
}

function saveLocalInventory(inventory) {
  localStorage.setItem(getLocalInventoryKey(), JSON.stringify({
    boxes: inventory?.boxes || [],
    items: inventory?.items || [],
    claimedAchievements: inventory?.claimedAchievements || {}
  }));
}

function getLocalTreasurePlanKey() {
  const config = getConfig();
  const saved = getSavedPlayer();
  const sessionKey = saved?.gameSessionUpdatedAt || currentGameSessionUpdatedAt || config.clientVersion;
  return `vaccineGameTreasurePlan:${config.gameId}:${sessionKey}:${saved?.playerId || "anonymous"}`;
}

function getLocalTreasurePlan() {
  try {
    return JSON.parse(localStorage.getItem(getLocalTreasurePlanKey()) || "{}");
  } catch (error) {
    return {};
  }
}

function saveLocalTreasurePlan(plan) {
  localStorage.setItem(getLocalTreasurePlanKey(), JSON.stringify(plan || {}));
}

function ensureLocalTreasurePlan() {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId || !v4StaticConfig) return getLocalTreasurePlan();
  const existing = getLocalTreasurePlan();
  if (Object.keys(existing).length) return existing;
  const plan = buildStaticTreasurePlan(v4StaticConfig, getConfig().gameId, saved.playerId);
  saveLocalTreasurePlan(plan);
  return plan;
}

function getItemLabel(itemType) {
  return itemLabels[itemType] || itemType || "道具";
}

function buildLocalBox(row) {
  return {
    boxId: row.boxId,
    sourceType: row.sourceType || "local",
    sourceQuestionId: row.sourceQuestionId || "",
    status: "unopened",
    awardedAt: new Date().toISOString(),
    openedAt: "",
    itemType: row.itemType || "empty",
    itemLabel: getItemLabel(row.itemType || "empty"),
    isLuckyBox: row.itemType === "special"
  };
}

function awardLocalQuestionBox(questionId) {
  const plan = ensureLocalTreasurePlan();
  const row = plan[questionId];
  if (!row || !row.hasBox || !row.boxId) return null;
  const inventory = getLocalInventory();
  if (inventory.boxes.some(box => box.boxId === row.boxId)) return null;
  const maxBoxes = Number(v4StaticConfig?.treasureRules?.maxUnopenedBoxes || 3);
  const unopenedCount = inventory.boxes.filter(box => box.status === "unopened").length;
  if (unopenedCount >= maxBoxes) return null;
  const box = buildLocalBox(row);
  inventory.boxes.push(box);
  saveLocalInventory(inventory);
  return box;
}

function buildAchievementDefinitions() {
  const rows = Array.isArray(v4StaticConfig?.achievementRules) ? v4StaticConfig.achievementRules : [];
  if (rows.length) return rows;
  return [
    { achievementId: "correct_3", type: "totalCorrect", threshold: 3, rewardBoxCount: 1, title: "累積答對 3 題" },
    { achievementId: "correct_5", type: "totalCorrect", threshold: 5, rewardBoxCount: 1, title: "累積答對 5 題" },
    { achievementId: "streak_3", type: "correctStreak", threshold: 3, rewardBoxCount: 1, title: "連續答對 3 題" },
    { achievementId: "perfect_personal", type: "perfect", threshold: "all", rewardBoxCount: 0, title: "個人全對" }
  ];
}

function getLocalAchievementSummary() {
  const answers = Object.values(getLocalAnswers());
  const correctRows = answers.filter(row => row.isCorrect === true);
  const correctCount = correctRows.length;
  let streak = 0;
  let bestStreak = 0;
  answers
    .slice()
    .sort((a, b) => String(a.questionId || "").localeCompare(String(b.questionId || "")))
    .forEach(row => {
      if (row.isCorrect === true) {
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }
    });
  const itemUseCount = getQueuedItemUses().filter(row => row.status === "sent" || row.status === "queued").length;
  const inventory = getLocalInventory();
  const claimed = inventory.claimedAchievements || {};
  const definitions = buildAchievementDefinitions();
  const totalQuestions = (v4StaticConfig?.questions || []).filter(question => question && question.enabled !== false && question.type !== "creative").length;
  const achievements = definitions.map(rule => {
    const threshold = rule.threshold === "all" ? totalQuestions : Number(rule.threshold || 0);
    const current = rule.type === "correctStreak"
      ? bestStreak
      : rule.type === "itemUse"
        ? itemUseCount
        : rule.type === "perfect"
          ? correctCount
          : correctCount;
    const completed = rule.type === "perfect"
      ? totalQuestions > 0 && correctCount >= totalQuestions
      : current >= threshold;
    return {
      achievementId: rule.achievementId,
      title: rule.title || rule.achievementId,
      description: rule.description || "達成後可領取寶箱。",
      current,
      target: threshold,
      completed,
      rewarded: Boolean(claimed[rule.achievementId]),
      claimable: completed && !claimed[rule.achievementId] && Number(rule.rewardBoxCount || 0) > 0,
      rewardBoxCount: Number(rule.rewardBoxCount || 0),
      reportToGas: Boolean(rule.reportToGas)
    };
  });
  return { correctCount, correctStreak: bestStreak, itemUseCount, achievements };
}

function buildAchievementBox(achievementId, index) {
  const config = getConfig();
  const saved = getSavedPlayer();
  const source = [config.gameId, saved?.playerId || "", achievementId, index].join(":");
  const itemTypes = ["score_1", "score_3", "score_5", "score_10", "double", "comeback", "challenge", "empty"];
  const itemType = itemTypes[hashStringToUint32(source) % itemTypes.length];
  return {
    boxId: `local_achievement_${hashStringToUint32(source).toString(36)}`,
    sourceType: "achievement",
    sourceQuestionId: "",
    status: "unopened",
    awardedAt: new Date().toISOString(),
    openedAt: "",
    itemType,
    itemLabel: getItemLabel(itemType),
    isLuckyBox: false
  };
}

function isItemUseQueued(itemId) {
  return getQueuedItemUses().some(row => row.itemId === itemId && row.status !== "sent");
}

function getItemUseWindow() {
  if (!lastClosedQuestionId || !lastClosedQuestionAtMs) {
    return { isOpen: false, questionId: "", closesAt: "" };
  }
  const closesAtMs = lastClosedQuestionAtMs + postCloseItemUseWindowMs;
  return {
    isOpen: Date.now() <= closesAtMs,
    questionId: lastClosedQuestionId,
    closesAt: new Date(closesAtMs).toISOString()
  };
}

function formatRemainingTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateItemUseCountdown() {
  if (!itemUseCountdown) return;
  const windowState = getItemUseWindow();
  if (!lastClosedQuestionId || !lastClosedQuestionAtMs) {
    itemUseCountdown.textContent = "道具使用期限會在講師關題後顯示。";
    return;
  }
  const closesAtMs = Date.parse(windowState.closesAt || "");
  const remainingMs = Number.isFinite(closesAtMs) ? closesAtMs - Date.now() : 0;
  if (windowState.isOpen && remainingMs > 0) {
    itemUseCountdown.textContent = `道具使用倒數：${formatRemainingTime(remainingMs)}，可在期限內送出道具。`;
    return;
  }
  itemUseCountdown.textContent = "本題道具使用期限已結束。";
}

function buildClientItemUseId(itemId, questionId) {
  const config = getConfig();
  const saved = getSavedPlayer();
  return [config.gameId, questionId, saved?.playerId || "", itemId].join(":");
}

function queueItemUse(payload) {
  const rows = getQueuedItemUses().filter(row => row.itemId !== payload.itemId);
  const windowState = getItemUseWindow();
  rows.push({
    ...payload,
    targetQuestionId: payload.targetQuestionId || windowState.questionId,
    clientItemUseId: payload.clientItemUseId || buildClientItemUseId(payload.itemId, windowState.questionId),
    effectScore: Number(localItemEffects[payload.itemType] || 0),
    useWindowClosesAt: windowState.closesAt,
    status: "queued",
    queuedAt: new Date().toISOString()
  });
  saveQueuedItemUses(rows);
  updateLocalScoreSummary();
}

async function sendItemUseNow(payload) {
  const windowState = getItemUseWindow();
  const itemUse = {
    ...payload,
    targetQuestionId: payload.targetQuestionId || windowState.questionId,
    clientItemUseId: payload.clientItemUseId || buildClientItemUseId(payload.itemId, windowState.questionId),
    effectScore: Number(localItemEffects[payload.itemType] || 0),
    useWindowClosesAt: windowState.closesAt,
    status: "sent",
    queuedAt: new Date().toISOString()
  };
  await requestFastItemUse(itemUse);
  const rows = getQueuedItemUses().filter(row => row.itemId !== itemUse.itemId);
  rows.push({
    ...itemUse,
    sentAt: new Date().toISOString()
  });
  saveQueuedItemUses(rows);
  updateLocalScoreSummary();
}

async function flushQueuedItemUses(questionId) {
  if (!questionId) return;
  const rows = getQueuedItemUses();
  const pendingRows = rows.filter(row => row.status === "queued");
  if (!pendingRows.length) return;

  const nextRows = rows.slice();
  for (const row of pendingRows) {
    try {
      await requestFastItemUse({
        ...row,
        targetQuestionId: questionId
      });
      const index = nextRows.findIndex(item => item.itemId === row.itemId);
      if (index >= 0) {
        nextRows[index] = { ...nextRows[index], status: "sent", sentAt: new Date().toISOString(), targetQuestionId: questionId };
      }
    } catch (error) {
      console.warn("Queued item use failed.", error);
    }
  }
  saveQueuedItemUses(nextRows);
  updateLocalScoreSummary();
}

function updateTeamChoiceVisibility(state) {
  allowFreeTeamChoice = Boolean(state?.allowFreeTeamChoice);
  teamChoiceField.hidden = !allowFreeTeamChoice;
}

function showGameView(player) {
  checkinView.hidden = true;
  gameView.hidden = false;
  configureScoreStripLabels();
  if (openLeaderboardsButton) {
    openLeaderboardsButton.hidden = false;
  }
  playerName.textContent = player.nickname || "\u5b78\u54e1";
  playerTeam.textContent = teamNames[player.teamId] || player.teamId || "\u672a\u5206\u968a";
  updateConnectionStatus();
  updateLocalScoreSummary(player.updatedAt || "");
  startGameStateWatcher();
  updateItemUseCountdown();
  window.setTimeout(() => {
    refreshInventory({ silent: true });
    refreshAchievements({ silent: true });
  }, 300);
}

function configureScoreStripLabels() {
  if (scoreStripLabels[1]) {
    scoreStripLabels[1].textContent = "\u500b\u4eba\u5f97\u5206";
  }
  if (scoreStripLabels[2]) {
    scoreStripLabels[2].textContent = "\u9053\u5177\u4f7f\u7528\u5206";
  }
}

function updateScoreSummary(summary) {
  playerScore.textContent = Math.ceil(Number(summary.playerScore || 0));
  teamScore.textContent = Math.ceil(Number(summary.itemScore || 0));
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
    updateCreativeVisibility(null);
    return;
  }

  currentQuestion = question;
  currentQuestionId = question.questionId;
  answeredQuestionId = "";
  questionOpenedAtMs = Date.now();
  questionText.textContent = question.title || question.text || "題目缺少標題";
  optionList.replaceChildren();
  updateCreativeVisibility(question);

  if (question.type === "creative") {
    countdownText.textContent = "不適用";
    questionText.textContent = "第 4 版已移除創作題與票選流程，請等待講師開放下一題。";
    updateSyncStatus("第 4 版不使用創作題與票選。");
    return;
  }

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

function updateCreativeVisibility(question) {
  if (creativePanel) {
    creativePanel.hidden = true;
  }
  if (creativeFinalPanel) {
    creativeFinalPanel.hidden = true;
  }
  stopCreativeCountdowns();
  if (creativePool) {
    creativePool.replaceChildren();
  }
  if (creativeFinalists) {
    creativeFinalists.replaceChildren();
  }
}

function stopCreativeCountdowns() {
  if (creativeCountdownTimer) {
    clearInterval(creativeCountdownTimer);
    creativeCountdownTimer = null;
  }
  creativeCountdownKey = "";
  if (creativeFinalCountdownTimer) {
    clearInterval(creativeFinalCountdownTimer);
    creativeFinalCountdownTimer = null;
  }
  creativeFinalCountdownKey = "";
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

function getQuestionDisplayName(questionId) {
  const question = publicQuestionCache[questionId];
  if (question?.order) {
    return `第 ${Number(question.order)} 題`;
  }
  const demoMatch = String(questionId || "").match(/demo_q0*(\d+)/);
  if (demoMatch) {
    return `第 ${Number(demoMatch[1])} 題`;
  }
  const numberMatch = String(questionId || "").match(/(\d+)/);
  if (numberMatch) {
    return `第 ${Number(numberMatch[1])} 題`;
  }
  return "目前題目";
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
    const totalScore = Number(row.finalScore || row.totalScore || 0);
    const averageScore = Number(row.averageScore || 0);
    const teamBonusScore = Number(row.teamBonusScore || 0);
    const correctRate = Number(row.correctRate || 0) * 100;
    const currentQuestionCorrectRate = Number(row.currentQuestionCorrectRate || 0) * 100;
    const playerCount = Number(row.playerCount || 0);
    name.textContent = teamName;
    meta.textContent = `獲得總分 ${Math.ceil(totalScore)} 分（平均分 ${averageScore.toFixed(1)} 分／道具 ${teamBonusScore.toFixed(1)} 分），戰隊人數 ${playerCount} 人，整體正確率 ${correctRate.toFixed(1)}%，當前題目正確率 ${currentQuestionCorrectRate.toFixed(1)}%`;
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
  leaderboardStatus.textContent = "正在讀取排行榜快照...";

  try {
    const snapshot = await getScoreboardSnapshot();
    if (snapshot) {
      renderTeamLeaderboard(snapshot.teams || []);
      renderPlayerLeaderboard(snapshot.players || []);
      const updatedAt = snapshot.updatedAt
        ? new Date(snapshot.updatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
        : "尚未標記";
      leaderboardStatus.textContent = `排行榜快照已更新：${updatedAt}。活動中為暫時成績，正式成績以賽後結算為準。`;
      return;
    }
    renderTeamLeaderboard([]);
    renderPlayerLeaderboard([]);
    leaderboardStatus.textContent = "目前尚無排行榜快照，請等待講師關題後再開啟。本畫面不呼叫 GAS 即時排行榜。";
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
  const boxes = (inventory?.boxes || []).filter(box => box.status === "unopened");
  const items = (inventory?.items || []).filter(item => item.status === "available" || item.status === "armed");
  renderBoxes(boxes);
  renderItems(items);
  inventoryNotice.hidden = boxes.length <= 0;
  inventoryStatus.textContent = `未開啟寶箱 ${inventory?.unopenedBoxCount || 0} 個，可用道具 ${items.filter(item => item.status === "available").length} 個。`;
}

function renderAchievements(result) {
  const rows = result?.achievements || [];
  achievementList.replaceChildren();
  achievementNotice.hidden = !result?.hasNotice;

  if (!rows.length) {
    achievementList.append(createEmptyInventoryItem("目前沒有成就資料。"));
    achievementStatus.textContent = "成就資料尚未建立。";
    return;
  }

  rows.forEach(row => {
    const item = document.createElement("article");
    item.className = "inventory-item achievement-item";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = row.title || "成就";
    meta.textContent = `${row.description || ""} 進度 ${row.current || 0} / ${row.target || 0}${row.rewarded ? "，寶箱已發放" : ""}`;
    body.append(title, meta);
    if (row.claimable) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "secondary-action compact-action";
      action.textContent = "領取";
      action.addEventListener("click", () => claimAchievement(row.achievementId));
      item.append(body, action);
    } else {
      const badge = document.createElement("span");
      badge.className = row.completed ? "achievement-badge is-complete" : "achievement-badge";
      badge.textContent = row.rewarded ? "已領取" : row.completed ? "完成" : "進行中";
      item.append(body, badge);
    }
    achievementList.append(item);
  });

  achievementStatus.textContent = `累積答對 ${result.correctCount || 0} 題，連續答對 ${result.correctStreak || 0} 題，已使用道具 ${result.itemUseCount || 0} 張。`;
}

async function claimAchievement(achievementId) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;

  const summary = getLocalAchievementSummary();
  const achievement = summary.achievements.find(row => row.achievementId === achievementId);
  if (!achievement || !achievement.claimable) {
    achievementStatus.textContent = "此成就尚未達成或已領取。";
    return;
  }

  const inventory = getLocalInventory();
  inventory.claimedAchievements = inventory.claimedAchievements || {};
  inventory.claimedAchievements[achievementId] = new Date().toISOString();
  for (let index = 1; index <= Number(achievement.rewardBoxCount || 1); index += 1) {
    inventory.boxes.push(buildAchievementBox(achievementId, index));
  }
  saveLocalInventory(inventory);
  cachedInventory = inventory;
  cachedAchievements = getLocalAchievementSummary();
  renderAchievements(cachedAchievements);
  renderInventory(cachedInventory);
  achievementStatus.textContent = `成就寶箱已領取，新增 ${Number(achievement.rewardBoxCount || 0)} 個寶箱。`;
  achievementNotice.hidden = !cachedAchievements.achievements.some(row => row.claimable);
}

async function refreshAchievements(options = {}) {
  if (isAchievementRefreshing || !hasCheckedIn()) return;
  isAchievementRefreshing = true;
  refreshAchievementsButton.disabled = true;
  try {
    if (!v4StaticConfig) {
      await preloadPublicQuestions();
    }
    const result = getLocalAchievementSummary();
    cachedAchievements = result;
    renderAchievements(result);
  } catch (error) {
    achievementNotice.hidden = true;
    if (!options.silent) {
      achievementStatus.textContent = `成就讀取失敗：${error.message}`;
    }
  } finally {
    isAchievementRefreshing = false;
    refreshAchievementsButton.disabled = false;
  }
}

function openUtilityPanel(panelName) {
  utilityDialog.hidden = false;
  inventoryPanel.hidden = panelName !== "inventory";
  achievementPanel.hidden = panelName !== "achievement";
  if (panelName === "inventory") {
    updateItemUseCountdown();
    refreshInventory();
  } else {
    refreshAchievements();
  }
}

function closeUtilityPanel() {
  utilityDialog.hidden = true;
}

function renderBoxes(boxes) {
  boxList.replaceChildren();
  if (!boxes.length) {
    boxList.append(createEmptyInventoryItem("目前沒有寶箱。"));
    return;
  }

  boxes.filter(box => box.status === "unopened").forEach(box => {
    const row = document.createElement("article");
    row.className = "inventory-item";

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = getBoxTitle(box);
    meta.textContent = "點擊開啟取得獎勵。";
    body.append(title, meta);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "secondary-action compact-action";
    action.textContent = "開啟";
    action.dataset.boxId = box.boxId;
    action.disabled = false;
    action.addEventListener("click", () => openBox(box));

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

  items.filter(item => item.status === "available" || item.status === "armed").forEach(item => {
    const row = document.createElement("article");
    row.className = "inventory-item";

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = item.itemLabel || item.itemType || "道具";
    meta.textContent = [getItemMeta(item), itemDescriptions[item.itemType]].filter(Boolean).join("。");
    body.append(title, meta);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "secondary-action compact-action";
    action.textContent = getItemActionText(item);
    action.dataset.itemId = item.itemId;
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

function getItemMeta(item) {
  if (isItemUseQueued(item.itemId)) {
    return "已送出，等待下一次關題計分套用";
  }
  const statusText = {
    available: "可使用",
    armed: "已指定，等待結算",
    used: "已使用"
  }[item.status] || item.status || "狀態未記錄";
  const targetTeam = item.targetTeamId ? `挑戰 ${teamNames[item.targetTeamId] || item.targetTeamId}` : "";
  return [statusText, targetTeam].filter(Boolean).join("，");
}

function getItemActionText(item) {
  if (item.itemType === "special") return "幸運獎";
  if (item.status === "armed") return "已指定";
  if (item.status === "used") return "已使用";
  return "使用";
}

function canUseItem(item) {
  const windowState = getItemUseWindow();
  updateItemUseCountdown();
  return windowState.isOpen && !isItemUseQueued(item.itemId) &&
    item.status === "available" && item.itemType !== "special" &&
    Object.prototype.hasOwnProperty.call(itemTargetRequirements, item.itemType);
}

async function refreshInventory(options = {}) {
  if (isInventoryRefreshing || !hasCheckedIn()) return;
  isInventoryRefreshing = true;
  refreshInventoryButton.disabled = true;
  try {
    if (!v4StaticConfig) {
      await preloadPublicQuestions();
    }
    ensureLocalTreasurePlan();
    const inventory = getLocalInventory();
    cachedInventory = inventory;
    renderInventory(inventory);
    if (!options.silent) {
      inventoryStatus.textContent = "已讀取本機寶箱與道具。";
    }
  } catch (error) {
    inventoryNotice.hidden = true;
    if (!options.silent) {
      inventoryStatus.textContent = `寶箱與道具讀取失敗：${error.message}`;
    }
  } finally {
    isInventoryRefreshing = false;
    refreshInventoryButton.disabled = false;
  }
}

async function openBox(box) {
  const boxId = typeof box === "string" ? box : box?.boxId;
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;
  const isLuckyBox = Boolean(box?.isLuckyBox || box?.itemType === "special");

  inventoryStatus.textContent = "寶箱已開啟，獎勵稍後同步。";
  const targetButton = findBoxButton(boxId);
  if (targetButton) {
    targetButton.disabled = true;
  }
  const inventory = getLocalInventory();
  const targetBox = inventory.boxes.find(row => row.boxId === boxId);
  if (!targetBox || targetBox.status !== "unopened") {
    inventoryStatus.textContent = "這個寶箱已開啟或不存在。";
    return;
  }

  targetBox.status = "opened";
  targetBox.openedAt = new Date().toISOString();
  const itemType = targetBox.itemType || "empty";
  if (itemType !== "empty" && itemType !== "special") {
    inventory.items.push({
      itemId: `local_item_${hashStringToUint32([boxId, itemType].join(":")).toString(36)}`,
      itemType,
      itemLabel: getItemLabel(itemType),
      sourceBoxId: boxId,
      status: "available",
      createdAt: new Date().toISOString()
    });
  }
  saveLocalInventory(inventory);
  cachedInventory = inventory;
  renderInventory(inventory);
  inventoryStatus.textContent = itemType === "empty"
    ? pickEmptyTreasureMessage()
    : itemType === "special"
      ? "已開啟幸運箱，將於最終結算確認幸運獎。"
      : `恭喜獲得：${getItemLabel(itemType)}！`;

  if (isLuckyBox || itemType === "special") {
    try {
      await callGameApi("recordLuckyBoxOpened", {
        playerId: saved.playerId,
        boxId,
        openedAt: new Date().toISOString()
      });
    } catch (recordError) {
      inventoryStatus.textContent = "幸運箱已在前端開啟，後端紀錄待同步。";
      console.warn("Lucky box open record failed.", recordError);
    }
  }
}

function removeBoxFromLocalList(boxId) {
  const button = findBoxButton(boxId);
  const row = button?.closest(".inventory-item");
  if (row) row.remove();
  if (boxList.children.length === 0) {
    boxList.append(createEmptyInventoryItem("目前沒有寶箱。"));
  }
  inventoryNotice.hidden = boxList.querySelectorAll(".inventory-item:not(.is-empty)").length === 0;
}

function findBoxButton(boxId) {
  return [...boxList.querySelectorAll("button[data-box-id]")]
    .find(button => button.dataset.boxId === boxId) || null;
}

function pickEmptyTreasureMessage() {
  return emptyTreasureMessages[Math.floor(Math.random() * emptyTreasureMessages.length)];
}

async function useInventoryItem(item) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;
  if (!getItemUseWindow().isOpen) {
    inventoryStatus.textContent = "道具只能在講師關題後 3 分鐘內使用。";
    return;
  }

  if (item.itemType === "challenge") {
    openChallengeDialog(item);
    return;
  }

  const button = findItemButton(item.itemId);
  if (button) button.disabled = true;

  inventoryStatus.textContent = "正在送出道具使用紀錄。";
  try {
    await sendItemUseNow({
      playerId: saved.playerId,
      teamId: saved.teamId,
      itemId: item.itemId,
      itemType: item.itemType
    });
    inventoryStatus.textContent = "道具已送出，會在下一次關題計分時套用。";
    markItemPending(item.itemId);
  } catch (error) {
    inventoryStatus.textContent = `道具送出失敗：${error.message}`;
    if (button) button.disabled = false;
  }
}

function openChallengeDialog(item) {
  pendingChallengeItem = item;
  challengeDialog.hidden = false;
  challengeStatus.textContent = "\u8acb\u9078\u64c7\u8981\u6311\u6230\u7684\u6230\u968a\uff0c\u7cfb\u7d71\u6703\u5728\u4e0b\u4e00\u984c\u5957\u7528\u3002";
  const saved = getSavedPlayer();
  [...challengeTeamGrid.querySelectorAll("button[data-team-id]")].forEach(button => {
    const isOwnTeam = button.dataset.teamId === saved?.teamId;
    button.disabled = isOwnTeam;
    button.hidden = isOwnTeam;
    button.classList.remove("is-selected");
  });
}

function closeChallengeDialog() {
  pendingChallengeItem = null;
  challengeDialog.hidden = true;
}

async function useChallengeItem(targetTeamId) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId || !pendingChallengeItem) return;
  if (!getItemUseWindow().isOpen) {
    challengeStatus.textContent = "挑戰卡只能在講師關題後 3 分鐘內使用。";
    return;
  }

  challengeStatus.textContent = "正在送出挑戰卡使用紀錄。";
  try {
    await sendItemUseNow({
      playerId: saved.playerId,
      itemId: pendingChallengeItem.itemId,
      itemType: pendingChallengeItem.itemType,
      teamId: saved.teamId,
      targetTeamId
    });
    inventoryStatus.textContent = "挑戰卡已送出，會在下一次關題計分時套用。";
    markItemPending(pendingChallengeItem.itemId);
    closeChallengeDialog();
  } catch (error) {
    challengeStatus.textContent = `挑戰卡送出失敗：${error.message}`;
  }
}

function markItemPending(itemId) {
  const button = findItemButton(itemId);
  const row = button?.closest(".inventory-item");
  if (!row) return;
  const meta = row.querySelector("span");
  if (meta) {
    meta.textContent = "已送出，等待下一次關題計分套用";
  }
  if (button) {
    button.textContent = "已送出";
    button.disabled = true;
  }
}

function findItemButton(itemId) {
  return [...itemList.querySelectorAll("button[data-item-id]")]
    .find(button => button.dataset.itemId === itemId) || null;
}

function renderCreativePool(result) {
  const rows = result?.rows || [];
  creativePool.replaceChildren();
  renderCreativePhaseStatus(result);
  if (!rows.length) {
    const empty = document.createElement("article");
    empty.className = "creative-entry is-empty";
    empty.textContent = result?.phase === "answering" ? "正在等待同隊投稿。" : "目前沒有同隊投稿。";
    creativePool.append(empty);
    return;
  }
  creativeFinalPanel.hidden = false;

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
    voteButton.disabled = result.phase !== "team_vote" || Boolean(result.votedSubmissionId);
    voteButton.addEventListener("click", () => voteCreativeSubmission(row.submissionId));

    entry.append(body, voteButton);
    creativePool.append(entry);
  });

}

function renderCreativePhaseStatus(result) {
  if (!result) return;
  if (abandonCreativeButton) {
    abandonCreativeButton.disabled = Boolean(result.ownSubmissionId) || result.phase !== "answering";
  }
  const submitButton = creativeForm.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.disabled = Boolean(result.ownSubmissionId) || result.phase !== "answering";
  }
  creativeContent.disabled = Boolean(result.ownSubmissionId) || result.phase !== "answering";

  if (result.phase === "answering") {
    creativeStatus.textContent = result.ownSubmissionId
      ? "已完成創作題回覆，請等待隊內投票。"
      : "創作題作答中，3 分鐘內可提交或放棄。";
    startCreativePhaseCountdown(Number(result.remainingSeconds || 0), "創作剩餘");
    return;
  }
  if (result.phase === "team_vote") {
    creativeStatus.textContent = result.votedSubmissionId
      ? "已完成隊內投票，請等待講師選出代表作品。"
      : "隊內投票開放中，請在 30 秒內投票。";
    startCreativePhaseCountdown(Number(result.remainingSeconds || 0), "投票剩餘");
    return;
  }
  if (result.phase === "team_vote_closed") {
    stopCreativeCountdowns();
    creativeStatus.textContent = "隊內投票已結束，請等待講師選出代表作品。";
    return;
  }
  stopCreativeCountdowns();
}

function startCreativePhaseCountdown(seconds, label) {
  const nextKey = `${label}:${Math.max(0, Math.floor(seconds || 0))}`;
  if (creativeCountdownTimer && creativeCountdownKey.startsWith(`${label}:`)) {
    return;
  }
  if (creativeCountdownTimer) {
    clearInterval(creativeCountdownTimer);
    creativeCountdownTimer = null;
  }
  creativeCountdownKey = nextKey;
  let remaining = Math.max(0, Math.floor(seconds || 0));
  const render = () => {
    countdownText.textContent = `${label} ${Math.max(0, remaining)} 秒`;
    if (remaining <= 0) {
      clearInterval(creativeCountdownTimer);
      creativeCountdownTimer = null;
      creativeCountdownKey = "";
      refreshCreativePool();
      return;
    }
    remaining -= 1;
  };
  render();
  creativeCountdownTimer = setInterval(render, 1000);
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
    try {
      await submitFastCreativeSubmission({
        playerId: saved.playerId,
        teamId: saved.teamId,
        questionId: currentQuestionId || currentQuestion?.questionId || "creative",
        content
      });
    } catch (firebaseError) {
      console.warn("Firebase creative submission failed, falling back to GAS.", firebaseError);
      await callGameApi("submitCreativeAnswer", {
        playerId: saved.playerId,
        content
      });
    }
    creativeContent.disabled = true;
    creativeForm.querySelector("button[type='submit']").disabled = true;
    creativeStatus.textContent = "創作答案已提交。";
  } catch (error) {
    creativeStatus.textContent = `提交失敗：${error.message}`;
  }
}

async function abandonCreativeAnswer() {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;
  const confirmed = window.confirm("確認放棄本次創作題回答？");
  if (!confirmed) return;

  creativeStatus.textContent = "正在送出放棄回答...";
  try {
    try {
      await submitFastCreativeSubmission({
        playerId: saved.playerId,
        teamId: saved.teamId,
        questionId: currentQuestionId || currentQuestion?.questionId || "creative",
        content: "放棄回答",
        abandon: true
      });
    } catch (firebaseError) {
      console.warn("Firebase creative abandon failed, falling back to GAS.", firebaseError);
      await callGameApi("submitCreativeAnswer", {
        playerId: saved.playerId,
        content: "放棄回答",
        abandon: true
      });
    }
    creativeContent.value = "";
    creativeStatus.textContent = "已放棄本次創作題回答。";
  } catch (error) {
    creativeStatus.textContent = `放棄回答失敗：${error.message}`;
  }
}

async function voteCreativeSubmission(submissionId) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) return;

  creativeStatus.textContent = "正在送出隊內初選投票...";
  try {
    try {
      await submitFastCreativeTeamVote({
        playerId: saved.playerId,
        teamId: saved.teamId,
        questionId: currentQuestionId || currentQuestion?.questionId || "creative",
        submissionId
      });
    } catch (firebaseError) {
      console.warn("Firebase creative team vote failed, falling back to GAS.", firebaseError);
      await callGameApi("voteTeamCreative", {
        playerId: saved.playerId,
        submissionId
      });
    }
    creativeStatus.textContent = "隊內初選投票已送出。";
  } catch (error) {
    creativeStatus.textContent = `投票失敗：${error.message}`;
  }
}

function renderCreativeFinalists(result) {
  const rows = result?.rows || [];
  creativeFinalists.replaceChildren();
  renderCreativeFinalPhaseStatus(result);
  if (!rows.length) {
    const empty = document.createElement("article");
    empty.className = "creative-entry is-empty";
    empty.textContent = "講師尚未選出匿名決選作品。";
    creativeFinalists.append(empty);
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
    voteButton.disabled = result.phase !== "final_vote" || Boolean(result.votedSubmissionId) || Boolean(row.isOwnTeam);
    voteButton.addEventListener("click", () => voteCreativeFinalist(row.submissionId));

    entry.append(body, voteButton);
    creativeFinalists.append(entry);
  });

}

function renderCreativeFinalPhaseStatus(result) {
  if (!result) return;
  if (result.phase === "final_vote") {
    creativeFinalStatus.textContent = result.votedSubmissionId
      ? "已完成匿名全體投票。"
      : "匿名全體投票開放中，請在 30 秒內投票。";
    startCreativeFinalCountdown(Number(result.remainingSeconds || 0));
    return;
  }
  if (result.phase === "final_vote_closed") {
    if (creativeFinalCountdownTimer) {
      clearInterval(creativeFinalCountdownTimer);
      creativeFinalCountdownTimer = null;
    }
    creativeFinalStatus.textContent = "匿名全體投票已結束，未投票者視同放棄。";
    return;
  }
  creativeFinalStatus.textContent = "講師尚未選出匿名決選作品。";
}

function startCreativeFinalCountdown(seconds) {
  if (creativeFinalCountdownTimer) {
    return;
  }
  creativeFinalCountdownKey = `final:${Math.max(0, Math.floor(seconds || 0))}`;
  let remaining = Math.max(0, Math.floor(seconds || 0));
  const render = () => {
    creativeFinalStatus.textContent = remaining > 0
      ? `匿名全體投票開放中，剩餘 ${remaining} 秒。`
      : "匿名全體投票已結束，未投票者視同放棄。";
    if (remaining <= 0) {
      clearInterval(creativeFinalCountdownTimer);
      creativeFinalCountdownTimer = null;
      creativeFinalCountdownKey = "";
      refreshCreativeFinalists();
      return;
    }
    remaining -= 1;
  };
  render();
  creativeFinalCountdownTimer = setInterval(render, 1000);
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
    try {
      await submitFastCreativeFinalVote({
        playerId: saved.playerId,
        teamId: saved.teamId,
        questionId: currentQuestionId || currentQuestion?.questionId || "creative_final",
        submissionId
      });
    } catch (firebaseError) {
      console.warn("Firebase creative final vote failed, falling back to GAS.", firebaseError);
      await callGameApi("voteCreativeFinal", {
        playerId: saved.playerId,
        submissionId
      });
    }
    creativeFinalStatus.textContent = "匿名全體投票已送出。";
  } catch (error) {
    creativeFinalStatus.textContent = `投票失敗：${error.message}`;
  }
}

async function refreshFinalResults() {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId || !finalResultPanel || !finalResultStatus) return;

  finalResultPanel.hidden = false;
  finalResultStatus.textContent = "正在讀取最後成績...";
  try {
    const result = await callGameApi("getFinalResults", {
      playerId: saved.playerId
    });
    const teamRank = result.teamRank ? `戰隊第 ${result.teamRank} 名` : "戰隊排名未產生";
    const playerRank = result.playerRank ? `個人第 ${result.playerRank} 名` : "個人排名未產生";
    const awardText = result.hasAward
      ? `恭喜獲獎，請上台領獎：${(result.awards || []).map(formatAwardName).join("、")}`
      : "未獲得個人獎項。";
    finalResultStatus.textContent = `${teamRank}，戰隊積分 ${Math.ceil(Number(result.teamScore || 0))}。${playerRank}，個人積分 ${Math.ceil(Number(result.playerScore || 0))}。${awardText}`;
    finalResultStatus.className = result.hasAward ? "answer-result is-correct" : "sync-status";
  } catch (error) {
    finalResultStatus.textContent = `最後成績讀取失敗：${error.message}`;
  }
}

function formatAwardName(row) {
  if (row.awardType === "lucky") return "幸運獎";
  if (row.awardType === "perfect") return `全對獎第 ${row.rank || ""} 名`;
  return row.awardType || "獎項";
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
  if (gameStateTimer) {
    window.clearInterval(gameStateTimer);
    gameStateTimer = null;
  }
  checkinView.hidden = false;
  gameView.hidden = true;
  currentQuestion = null;
  currentQuestionId = "";
  answeredQuestionId = "";
  lastClosedScoreQuestionId = "";
  lastClosedQuestionId = "";
  lastClosedQuestionAtMs = 0;
  cachedInventory = null;
  cachedAchievements = null;
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
  currentGameSessionUpdatedAt = state.updatedAt || currentGameSessionUpdatedAt;
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
    flushQueuedItemUses(questionId);
    lastFirebaseQuestionId = questionId;
    lastGameStatus = status;
    return;
  }

  if (status === "question_closed" && questionId && questionId === currentQuestionId) {
    stopCountdown();
    disableOptions();
    applyClosedQuestionReveal(state);
    lastClosedQuestionId = questionId;
    lastClosedQuestionAtMs = Date.parse(state.updatedAt || "") || Date.now();
    updateItemUseCountdown();
    lastGameStatus = status;
    updateSyncStatus(`${getQuestionDisplayName(questionId)}已關題，已更新本機計分與道具使用倒數。`);
    if (lastClosedScoreQuestionId !== questionId) {
      lastClosedScoreQuestionId = questionId;
      const localAnswer = getLocalAnswers()[questionId];
      const scoreText = localAnswer && localAnswer.scored
        ? `本題得分 ${Number(localAnswer.score || 0)} 分，目前個人積分 ${Math.ceil(getLocalAnswerScore())} 分。`
        : "本題已關閉，請稍後更新成績。";
      answerResult.textContent = `${scoreText} 活動中分數為暫時結果，正式成績以賽後結算為準。`;
      answerResult.className = "answer-result is-pending";

    }
    return;
  }

  if (status === "finalized") {
    stopCountdown();
    disableOptions();
    updateSyncStatus("競賽已結算，正在讀取最後成績。");
    if (!finalResultsLoaded) {
      finalResultsLoaded = true;
      refreshFinalResults();
    }
    return;
  }

  if (status === "created" && !lastFirebaseQuestionId) {
    updateSyncStatus("場次已啟動，請等待講師開題。");
  }
}

async function preloadPublicQuestions() {
  if (!v4StaticConfig) {
    v4StaticConfig = await loadV4StaticConfig();
    const staticQuestions = buildPublicQuestionCache(v4StaticConfig);
    if (Object.keys(staticQuestions).length) {
      publicQuestionCache = {
        ...publicQuestionCache,
        ...staticQuestions
      };
      updateSyncStatus("第 4 版靜態題庫已載入，請等待講師開題。");
      return;
    }
  }

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
  gameStateTimer = window.setInterval(() => {
    refreshPublicGameState();
    updateItemUseCountdown();
  }, Math.max(Number(config.firebaseGameStatePollMs || 5000), 5000));
  updateSyncStatus("請看講師畫面；講師顯示已開題後，再按「翻開試卷」。");
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
      itemScore: getLocalItemScore(),
      updatedAt: result.updatedAt || new Date().toISOString()
    };
    savePlayer(updatedPlayer);
    updateLocalScoreSummary(updatedPlayer.updatedAt);
    if (Object.prototype.hasOwnProperty.call(result, "hasInventoryNotice")) {
      inventoryNotice.hidden = !result.hasInventoryNotice;
    }
    if (Object.prototype.hasOwnProperty.call(result, "hasAchievementNotice")) {
      achievementNotice.hidden = !result.hasAchievementNotice;
    }

    if (questionId && result.lastAnswer && result.lastAnswer.score !== "") {
      answerResult.textContent = `講師已關題。本題得分 ${Number(result.lastAnswer.score || 0)} 分，目前個人積分 ${Number(result.playerScore || 0)} 分。`;
      answerResult.className = Number(result.lastAnswer.score || 0) > 0
        ? "answer-result is-correct"
        : "answer-result is-wrong";
    }
  } catch (error) {
    inventoryNotice.hidden = true;
    achievementNotice.hidden = true;
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
  answeredQuestionId = currentQuestion.questionId;
  answerResult.textContent = "答案已送出，等待講師關題。";
  answerResult.className = "answer-result is-pending";
  updateSyncStatus("答案已送出，等待講師關題。");
  const responseSeconds = Math.max(0, Math.floor((Date.now() - questionOpenedAtMs) / 1000));
  const localStaticConfig = v4StaticConfig || {
    scoreRules: {
      firstCorrectBonus: 0,
      buckets: localScoreBuckets
    }
  };
  const staticQuestionResult = currentQuestion.correctAnswer
    ? calculateStaticQuestionResult(localStaticConfig, currentQuestion, [answer], responseSeconds)
    : null;
  const localAnswers = getLocalAnswers();
  const localAnswersWithCurrent = {
    ...localAnswers,
    [currentQuestion.questionId]: {
      ...(localAnswers[currentQuestion.questionId] || {}),
      isCorrect: staticQuestionResult?.isCorrect === true
    }
  };
  const perfectAwardCandidate = getPerfectAwardCandidate(v4StaticConfig, localAnswersWithCurrent);
  const clientSubmitId = buildClientSubmitId(getConfig().gameId, currentQuestion.questionId, saved.playerId);

  try {
    try {
      await submitFastAnswer({
        playerId: saved.playerId,
        teamId: saved.teamId,
        questionId: currentQuestion.questionId,
        answer: [answer],
        clientKey: saved.clientKey || getClientKey(),
        responseSeconds,
        clientSubmitId,
        isCorrect: staticQuestionResult?.isCorrect,
        baseScore: staticQuestionResult?.baseScore,
        bonusScore: staticQuestionResult?.bonusScore,
        finalQuestionScore: staticQuestionResult?.finalQuestionScore,
        firstCorrectBonus: staticQuestionResult?.firstCorrectBonus,
        perfectAwardCandidate
      });
      if (perfectAwardCandidate) {
        try {
          await callGameApi("recordPerfectAwardCandidate", {
            playerId: saved.playerId,
            finalQuestionId: currentQuestion.questionId,
            completedAt: new Date().toISOString()
          });
        } catch (recordError) {
          console.warn("Perfect award candidate record failed.", recordError);
        }
      }
    } catch (firebaseError) {
      console.warn("Firebase answer submit failed.", firebaseError);
      throw firebaseError;
    }
    recordLocalAnswer(currentQuestion, answer, staticQuestionResult, responseSeconds);
    if (staticQuestionResult?.isCorrect === true) {
      const awardedBox = awardLocalQuestionBox(currentQuestion.questionId);
      if (awardedBox) {
        inventoryNotice.hidden = false;
        answerResult.textContent = "答案已送出，並獲得 1 個待開啟寶箱。等待講師關題。";
      }
    }
    cachedAchievements = getLocalAchievementSummary();
    updateLocalScoreSummary();
    if (!answerResult.textContent.includes("寶箱")) {
      answerResult.textContent = "答案已送出，等待講師關題。";
    }
    answerResult.className = "answer-result is-pending";
    updateSyncStatus("答案已送出，等待講師關題。");
  } catch (error) {
    answeredQuestionId = "";
    questionText.textContent = error.message;
    answerResult.textContent = "送出失敗，請確認網路後再次送出。倒數已停止，尚未寫入作答紀錄。";
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
  checkinStatus.textContent = "正在確認講師是否已啟動場次...";
  try {
    const state = await getStartupGameState();
    currentGameSessionUpdatedAt = state?.updatedAt || currentGameSessionUpdatedAt;
    updateTeamChoiceVisibility(state);
    if (!isGameOpenForCheckin(state)) {
      checkinStatus.textContent = "講師尚未啟動場次，請稍候再重新整理。";
      return;
    }
    checkinStatus.textContent = allowFreeTeamChoice
      ? "請輸入暱稱後進入報到，再選擇戰隊。"
      : "請輸入暱稱後完成報到，系統會自動分隊。";
    checkinSubmitButton.disabled = false;
  } catch (error) {
    updateTeamChoiceVisibility(null);
    checkinStatus.textContent = "暫時無法確認場次狀態，請重新整理後再試。";
  } finally {
    isTeamChoiceReady = true;
  }
}

async function restoreCheckin() {
  const saved = getSavedPlayer();
  if (!saved) return;

  nicknameInput.value = saved.nickname;

  try {
    const state = await getStartupGameState();
    currentGameSessionUpdatedAt = state?.updatedAt || currentGameSessionUpdatedAt;
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

function isGameOpenForCheckin(state) {
  return state && state.status && state.status !== "draft";
}

async function performCheckin(nickname, teamId) {
  checkinSubmitButton.disabled = true;
  setTeamChoiceButtonsDisabled(true);
  const clientKey = getClientKey();
  checkinStatus.textContent = "正在報到...";

  try {
    const startupState = await getStartupGameState();
    currentGameSessionUpdatedAt = startupState?.updatedAt || currentGameSessionUpdatedAt;
    let joined;
    try {
      joined = await joinFastPlayer({ nickname, teamId, clientKey });
    } catch (firebaseError) {
      console.warn("Firebase check-in failed, falling back to GAS joinGame.", firebaseError);
      joined = await callGameApi("joinGame", { nickname, teamId, clientKey });
    }
    const player = {
      playerId: joined.playerId,
      gameId: joined.gameId,
      nickname: joined.nickname || nickname,
      teamId: joined.teamId,
      clientKey,
      score: joined.score || 0,
      itemScore: 0,
      checkedInAt: joined.checkedInAt || new Date().toISOString(),
      gameSessionUpdatedAt: currentGameSessionUpdatedAt,
      source: joined.source || "gas"
    };

    savePlayer(player);
    showGameView(player);
    updateSyncStatus(joined.existing ? "已讀取既有報到資料，請等待講師口令。" : "報到完成，請等待講師口令。");
    refreshPublicGameState();
  } catch (error) {
    checkinStatus.textContent = `報到失敗：${error.message}`;
    checkinSubmitButton.disabled = false;
    setTeamChoiceButtonsDisabled(false);
  }
}

function setTeamChoiceButtonsDisabled(disabled) {
  [...teamChoiceGrid.querySelectorAll("button")].forEach(button => {
    button.disabled = disabled;
  });
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isTeamChoiceReady) {
    checkinStatus.textContent = "分隊設定仍在讀取中，請稍候。";
    return;
  }

  const nickname = nicknameInput.value.trim();

  try {
    const state = await getStartupGameState();
    updateTeamChoiceVisibility(state);
    if (!isGameOpenForCheckin(state)) {
      checkinStatus.textContent = "講師尚未啟動場次，請稍候再重新整理。";
      return;
    }
    if (allowFreeTeamChoice) {
      pendingNickname = nickname;
      teamChoiceField.hidden = false;
      checkinStatus.textContent = "請點選一個戰隊完成報到。";
      return;
    }
    await performCheckin(nickname, "");
  } catch (error) {
    checkinStatus.textContent = `報到失敗：${error.message}`;
  }
});

teamChoiceGrid.addEventListener("click", async event => {
  const button = event.target.closest("button[data-team-id]");
  if (!button) return;
  const nickname = pendingNickname || nicknameInput.value.trim();
  if (!nickname) {
    checkinStatus.textContent = "請先輸入暱稱。";
    return;
  }
  [...teamChoiceGrid.querySelectorAll("button")].forEach(item => {
    item.classList.toggle("is-selected", item === button);
  });
  await performCheckin(nickname, button.dataset.teamId || "");
});

refreshQuestionButton.addEventListener("click", refreshQuestion);
refreshInventoryButton.addEventListener("click", refreshInventory);
refreshAchievementsButton.addEventListener("click", refreshAchievements);
openInventoryPanelButton.addEventListener("click", () => openUtilityPanel("inventory"));
openAchievementPanelButton.addEventListener("click", () => openUtilityPanel("achievement"));
closeUtilityPanelButton.addEventListener("click", closeUtilityPanel);
utilityDialog.addEventListener("click", event => {
  if (event.target?.dataset?.closeUtility !== undefined) {
    closeUtilityPanel();
  }
});
closeChallengeDialogButton.addEventListener("click", closeChallengeDialog);
challengeDialog.addEventListener("click", event => {
  if (event.target?.dataset?.closeChallenge !== undefined) {
    closeChallengeDialog();
  }
});
challengeTeamGrid.addEventListener("click", event => {
  const button = event.target.closest("button[data-team-id]");
  if (!button || button.disabled) return;
  [...challengeTeamGrid.querySelectorAll("button")].forEach(item => {
    item.classList.toggle("is-selected", item === button);
  });
  useChallengeItem(button.dataset.teamId || "");
});
if (creativeForm) {
  creativeForm.addEventListener("submit", submitCreativeAnswer);
}
if (abandonCreativeButton) {
  abandonCreativeButton.addEventListener("click", abandonCreativeAnswer);
}
if (refreshCreativePoolButton) {
  refreshCreativePoolButton.addEventListener("click", refreshCreativePool);
}
if (refreshCreativeFinalistsButton) {
  refreshCreativeFinalistsButton.addEventListener("click", refreshCreativeFinalists);
}
if (openLeaderboardsButton) {
  openLeaderboardsButton.addEventListener("click", openLeaderboards);
}
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
