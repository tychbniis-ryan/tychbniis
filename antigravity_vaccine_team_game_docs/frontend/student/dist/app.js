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
} from "./api.js?v=0.4.24";
import {
  buildClientSubmitId,
  buildPublicQuestionCache,
  buildStaticTreasurePlan,
  calculateStaticQuestionResult,
  getPerfectAwardCandidate,
  getStaticGameSeed,
  hashStringToUint32,
  loadV4StaticConfig
} from "./static-v4.js?v=0.4.24";

const checkinView = document.querySelector("#checkinView");
const gameView = document.querySelector("#gameView");
const form = document.querySelector("#checkinForm");
const checkinSubmitButton = form.querySelector("button[type='submit']");
const nicknameInput = document.querySelector("#nickname");
const teamChoiceField = document.querySelector("#teamChoiceField");
const teamChoiceGrid = document.querySelector("#teamChoiceGrid");
const checkinStatus = document.querySelector("#checkinStatus");
const playerName = document.querySelector("#playerName");
const playerTopName = document.querySelector("#playerTopName");
const playerTeam = document.querySelector("#playerTeam");
const playerScore = document.querySelector("#playerScore");
const teamScore = document.querySelector("#teamScore");
const scoreUpdatedAt = document.querySelector("#scoreUpdatedAt");
const scoreStripLabels = document.querySelectorAll(".score-strip span");
const connectionMode = document.querySelector("#connectionMode");
const gameIdText = document.querySelector("#gameIdText");
const questionText = document.querySelector("#questionText");
const questionTitle = document.querySelector("#question-title");
const optionList = document.querySelector("#optionList");
const refreshQuestionButton = document.querySelector("#refreshQuestion");
const syncStatus = document.querySelector("#syncStatus");
const countdownText = document.querySelector("#countdownText");
const answerResult = document.querySelector("#answerResult");
const selectedAnswerSummary = document.querySelector("#selectedAnswerSummary");
const answerDialog = document.querySelector("#answerDialog");
const closeAnswerDialogButton = document.querySelector("#closeAnswerDialog");
const answerDialogCountdown = document.querySelector("#answerDialogCountdown");
const answerDialogTitle = document.querySelector("#answer-dialog-title");
const answerDialogQuestion = document.querySelector("#answerDialogQuestion");
const answerDialogOptions = document.querySelector("#answerDialogOptions");
const openLeaderboardsButton = document.querySelector("#openLeaderboards");
const leaderboardDialog = document.querySelector("#leaderboardDialog");
const closeLeaderboardsButton = document.querySelector("#closeLeaderboards");
const refreshLeaderboardsButton = document.querySelector("#refreshLeaderboards");
const leaderboardStatus = document.querySelector("#leaderboardStatus");
const teamLeaderboard = document.querySelector("#teamLeaderboard");
const playerLeaderboard = document.querySelector("#playerLeaderboard");
const refreshInventoryButton = document.querySelector("#refreshInventory");
const inventoryStatus = document.querySelector("#inventoryStatus");
const itemUseCountdown = document.querySelector("#answerItemUseCountdown") || document.querySelector("#itemUseCountdown");
const answerPageNotice = document.querySelector("#answerPageNotice");
const itemUseLog = document.querySelector("#itemUseLog");
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
const challengeTitle = document.querySelector("#challenge-title");
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
  challenge: "choice",
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
  comeback: 5,
  challenge: 3
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
  score_1: "關題後、結算前使用，立即增加個人道具分 1 分。",
  score_3: "關題後、結算前使用，立即增加個人道具分 3 分。",
  score_5: "關題後、結算前使用，立即增加個人道具分 5 分。",
  score_10: "關題後、結算前使用，立即增加個人道具分 10 分。",
  double: "關題後、結算前使用，下一次答對時加計同等個人分數。",
  comeback: "關題後、結算前使用，依使用當下題號的排行結果計分。",
  challenge: "關題後、結算前使用，猜 0 到 9 整數的大或小；0 到 4 為小，5 到 9 為大。",
  special: "幸運箱開啟後會立即記錄，最後結算判斷幸運獎。"
};
let currentQuestion = null;
let currentQuestionId = "";
let currentQuestionOpenedAt = "";
let lastGameStatus = "";
let lastClosedScoreQuestionId = "";
let lastClosedQuestionId = "";
let lastClosedQuestionAtMs = 0;
let answeredQuestionId = "";
let isRefreshing = false;
let gameStateTimer = null;
let countdownTimer = null;
let answerDialogTimer = null;
let questionOpenedAtMs = 0;
let lastFirebaseQuestionId = "";
let latestPublicGameState = null;
let publicQuestionCache = {};
let v4StaticConfig = null;
let cachedInventory = null;
let cachedAchievements = null;
let currentGameSessionUpdatedAt = "";
let currentGameSessionStartedAt = "";
let currentGameSessionSeed = "";
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
  const sessionKey = getStableLocalSessionKey(saved, config);
  return `vaccineGameLocalAnswers:${config.gameId}:${sessionKey}:${saved?.playerId || "anonymous"}`;
}

function getQuestionOpenTimeKey(questionId) {
  const config = getConfig();
  const saved = getSavedPlayer();
  const sessionKey = getStableLocalSessionKey(saved, config);
  return `vaccineGameQuestionOpenTime:${config.gameId}:${sessionKey}:${saved?.playerId || "anonymous"}:${questionId || "unknown"}`;
}

function getLockedQuestionOpenTime(questionId, openedAt = "") {
  if (!questionId) return Date.now();
  const key = getQuestionOpenTimeKey(questionId);
  const savedMs = Number(sessionStorage.getItem(key) || 0);
  if (savedMs > 0) return savedMs;
  const authoritativeMs = toTimeMs(openedAt);
  const startMs = authoritativeMs > 0 ? authoritativeMs : Date.now();
  sessionStorage.setItem(key, String(startMs));
  return startMs;
}

function getStableLocalSessionKey(saved = getSavedPlayer(), config = getConfig()) {
  return saved?.gameSessionStartedAt || currentGameSessionStartedAt || saved?.gameSessionUpdatedAt || saved?.checkedInAt || config.clientVersion;
}

function readLocalJsonWithFallback(primaryKey, fallbackPrefix, fallbackSuffix, fallbackValue, scoreFn) {
  try {
    const primaryRaw = localStorage.getItem(primaryKey);
    if (primaryRaw) return JSON.parse(primaryRaw);
    let bestValue = null;
    let bestScore = -1;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || "";
      if (key === primaryKey || !key.startsWith(fallbackPrefix) || !key.endsWith(fallbackSuffix)) continue;
      const value = JSON.parse(localStorage.getItem(key) || "null");
      const score = Number(scoreFn(value) || 0);
      if (score > bestScore) {
        bestScore = score;
        bestValue = value;
      }
    }
    if (bestValue !== null) {
      localStorage.setItem(primaryKey, JSON.stringify(bestValue));
      return bestValue;
    }
  } catch (error) {
    return fallbackValue;
  }
  return fallbackValue;
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

function getLocalImmediateItemScore() {
  return getQueuedItemUses()
    .filter(row => row.status === "queued" || row.status === "sent")
    .filter(row => isImmediateScoreItem(row.itemType) || row.itemType === "challenge")
    .reduce((total, row) => total + Number(row.effectScore || 0), 0);
}

function getLocalItemScore() {
  const answerBonus = Object.values(getLocalAnswers())
    .filter(row => row.scored)
    .reduce((total, row) => total + Number(row.itemBonusScore || 0), 0);
  const itemBonus = getLocalImmediateItemScore();
  return answerBonus + itemBonus;
}

function updateLocalScoreSummary(updatedAt = "") {
  const saved = getSavedPlayer();
  const backendScore = Number(saved?.playerScore ?? saved?.score ?? 0);
  const localScore = getLocalAnswerScore() + getLocalImmediateItemScore();
  updateScoreSummary({
    playerScore: Math.max(localScore, backendScore),
    itemScore: getLocalItemScore(),
    updatedAt: updatedAt || new Date().toISOString()
  });
}

function updateClosedQuestionResultText(questionId, isCorrect, baseScore, itemBonusScore) {
  const answer = getLocalAnswers()[questionId];
  const selected = normalizeAnswer(answer?.answer || "").replaceAll(",", "、") || "未選擇";
  if (selectedAnswerSummary) {
    selectedAnswerSummary.hidden = false;
    selectedAnswerSummary.textContent = `已選擇 ${selected}，花費 ${Number(answer?.responseSeconds || 0)} 秒。`;
  }
  const resultText = isCorrect
    ? `答對了，防線穩住。本題 ${baseScore} 分，道具加分 ${itemBonusScore} 分。`
    : `答錯了，這題先補強觀念。本題 0 分，道具加分 ${itemBonusScore} 分。`;
  answerResult.textContent = resultText;
  answerResult.className = isCorrect ? "answer-result is-correct" : "answer-result is-wrong";
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
  const doubleUse = getPendingNextQuestionItemUse(questionId, "double");
  const comebackUse = getPendingNextQuestionItemUse(questionId, "comeback");
  const doubleScore = isCorrect && doubleUse ? baseScore : 0;
  const comebackScore = comebackUse ? Number(localItemEffects.comeback || 0) : 0;
  const itemBonusScore = doubleScore + comebackScore;
  if (doubleUse) {
    markItemUseApplied(doubleUse.itemId, questionId, doubleScore, isCorrect ? "加倍卡答對套用" : "加倍卡本題未答對，不加分");
  }
  if (comebackUse) {
    markItemUseApplied(comebackUse.itemId, questionId, comebackScore, `翻身卡於 ${getQuestionDisplayName(questionId)} 套用`);
  }
  answers[questionId] = {
    ...localAnswer,
    score: baseScore + itemBonusScore,
    itemBonusScore,
    isCorrect,
    scored: true,
    scoredAt: new Date().toISOString()
  };
  saveLocalAnswers(answers);
  updateClosedQuestionResultText(questionId, isCorrect, baseScore, itemBonusScore);
  cachedAchievements = getLocalAchievementSummary();
  achievementNotice.hidden = !cachedAchievements.hasNotice;
  updateLocalScoreSummary(state.updatedAt || "");
  updateAnswerPageNotice();
  renderItemUseLog();
}

function getQueuedItemUseKey() {
  const config = getConfig();
  const saved = getSavedPlayer();
  const sessionKey = getStableLocalSessionKey(saved, config);
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

function isImmediateScoreItem(itemType) {
  return ["score_1", "score_3", "score_5", "score_10"].includes(itemType);
}

function getImmediateItemEffectScore(itemType) {
  return isImmediateScoreItem(itemType) ? Number(localItemEffects[itemType] || 0) : 0;
}

function isNextQuestionItem(itemType) {
  return itemType === "double" || itemType === "comeback";
}

function getPendingNextQuestionItemUse(questionId, itemType) {
  return getQueuedItemUses().find(row =>
    row.itemType === itemType &&
    (row.status === "sent" || row.status === "queued") &&
    !row.appliedQuestionId &&
    row.usedAfterQuestionId &&
    row.usedAfterQuestionId !== questionId
  ) || null;
}

function markItemUseApplied(itemId, questionId, effectScore, note = "") {
  const rows = getQueuedItemUses();
  const index = rows.findIndex(row => row.itemId === itemId);
  if (index < 0) return;
  rows[index] = {
    ...rows[index],
    effectScore: Number(effectScore || 0),
    appliedQuestionId: questionId,
    appliedAt: new Date().toISOString(),
    applyNote: note
  };
  saveQueuedItemUses(rows);
}

function updateAnswerPageNotice() {
  if (!answerPageNotice) return;
  const inventory = getLocalInventory();
  const unopenedBoxCount = inventory.boxes.filter(box => box.status === "unopened").length;
  const claimableCount = (cachedAchievements?.achievements || getLocalAchievementSummary().achievements || [])
    .filter(row => row.claimable).length;
  const notices = [];
  if (unopenedBoxCount > 0) notices.push(`有 ${unopenedBoxCount} 個寶箱可開啟`);
  if (claimableCount > 0) notices.push(`有 ${claimableCount} 個成就可領取`);
  answerPageNotice.textContent = notices.length
    ? `${notices.join("，")}。請點右側寶箱或成就按鈕處理。`
    : "作答後若取得寶箱或成就，會在這裡提示。";
  inventoryNotice.hidden = unopenedBoxCount <= 0;
  achievementNotice.hidden = claimableCount <= 0;
}

function renderItemUseLog() {
  if (!itemUseLog) return;
  itemUseLog.replaceChildren();
  const rows = getQueuedItemUses()
    .slice()
    .sort((a, b) => String(b.queuedAt || "").localeCompare(String(a.queuedAt || "")));
  if (!rows.length) {
    itemUseLog.append(createEmptyInventoryItem("尚無道具使用紀錄。"));
    return;
  }
  rows.forEach(row => {
    const item = document.createElement("article");
    item.className = "inventory-item item-use-record";
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const label = getItemLabel(row.itemType);
    const effectScore = Number(row.effectScore || 0);
    const targetQuestionText = row.itemType === "challenge"
      ? `${getQuestionDisplayName(row.usedAfterQuestionId || row.targetQuestionId)}已套用`
      : row.appliedQuestionId
      ? `${getQuestionDisplayName(row.appliedQuestionId)}已套用`
      : row.targetQuestionId && !String(row.targetQuestionId).startsWith("next:")
        ? `${getQuestionDisplayName(row.targetQuestionId)}待套用`
        : isNextQuestionItem(row.itemType)
          ? "下一題套用"
          : "立即套用";
    const challengeText = row.itemType === "challenge"
      ? `猜${row.challengeGuessLabel || "未猜"}，答案數字 ${row.challengeNumber ?? "?"}，獲得 ${Math.ceil(effectScore)} 分`
      : "";
    const scoreText = challengeText || `獲得 ${Math.ceil(effectScore)} 分`;
    title.textContent = label;
    meta.textContent = `${scoreText}，${targetQuestionText}${row.status === "queued" ? "，待同步" : ""}`;
    item.append(title, meta);
    itemUseLog.append(item);
  });
}

function getLocalInventoryKey() {
  const config = getConfig();
  const saved = getSavedPlayer();
  const sessionKey = getStableLocalSessionKey(saved, config);
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

function markLocalInventoryItemUsed(itemId, status = "used") {
  const inventory = getLocalInventory();
  const item = inventory.items.find(row => row.itemId === itemId);
  if (!item) return;
  item.status = status;
  item.usedAt = new Date().toISOString();
  saveLocalInventory(inventory);
  cachedInventory = inventory;
}

function getLocalTreasurePlanKey() {
  const config = getConfig();
  const saved = getSavedPlayer();
  const sessionKey = getStableLocalSessionKey(saved, config);
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

function buildRuntimeStaticConfigFromQuestions(questions) {
  const rows = Object.values(questions || {})
    .filter(question => question && question.questionId && question.enabled !== false && question.type !== "creative")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return {
    schemaVersion: getConfig().clientVersion,
    gameId: getConfig().gameId,
    gameSeed: currentGameSessionSeed || currentGameSessionStartedAt || getConfig().gameId,
    gameSessionSeed: currentGameSessionSeed || currentGameSessionStartedAt || getConfig().gameId,
    questions: rows,
    scoreRules: {
      firstCorrectBonus: 0,
      buckets: [
        { maxSeconds: 10, score: 30 },
        { maxSeconds: 20, score: 25 },
        { maxSeconds: 30, score: 20 },
        { maxSeconds: 45, score: 15 },
        { maxSeconds: 60, score: 10 },
        { maxSeconds: 999, score: 5 }
      ]
    },
    treasureRules: {
      maxUnopenedBoxes: 3,
      perQuestionBoxChance: 0.3,
      itemWeights: [
        { itemType: "score_1", weight: 30 },
        { itemType: "score_3", weight: 20 },
        { itemType: "score_5", weight: 10 },
        { itemType: "score_10", weight: 5 },
        { itemType: "double", weight: 5 },
        { itemType: "comeback", weight: 10 },
        { itemType: "challenge", weight: 10 },
        { itemType: "empty", weight: 10 }
      ]
    },
    achievementRules: []
  };
}

function ensureLocalTreasurePlan() {
  const saved = getSavedPlayer();
  if (!v4StaticConfig && Object.keys(publicQuestionCache || {}).length) {
    v4StaticConfig = buildRuntimeStaticConfigFromQuestions(publicQuestionCache);
  }
  if (!saved || !saved.playerId || !v4StaticConfig) return getLocalTreasurePlan();
  v4StaticConfig = {
    ...v4StaticConfig,
    gameSessionSeed: currentGameSessionSeed || currentGameSessionStartedAt || v4StaticConfig.gameSessionSeed || v4StaticConfig.gameSeed
  };
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
  const defaults = [
    { achievementId: "correct_3", type: "totalCorrect", threshold: 3, rewardBoxCount: 1, title: "累積答對 3 題", description: "答對任意 3 題即可領取寶箱。" },
    { achievementId: "correct_5", type: "totalCorrect", threshold: 5, rewardBoxCount: 1, title: "累積答對 5 題", description: "答對任意 5 題即可領取寶箱。" },
    { achievementId: "correct_10", type: "totalCorrect", threshold: 10, rewardBoxCount: 1, title: "累積答對 10 題", description: "答對任意 10 題即可領取寶箱。" },
    { achievementId: "streak_3", type: "correctStreak", threshold: 3, rewardBoxCount: 1, title: "連續答對 3 題", description: "連續 3 題答對即可領取寶箱。" },
    { achievementId: "streak_5", type: "correctStreak", threshold: 5, rewardBoxCount: 1, title: "連續答對 5 題", description: "連續 5 題答對即可領取寶箱。" },
    { achievementId: "item_use_3", type: "itemUse", threshold: 3, rewardBoxCount: 1, title: "使用 3 張道具", description: "累積使用 3 張道具即可領取寶箱。" },
    { achievementId: "perfect_personal", type: "perfect", threshold: "all", rewardBoxCount: 0, title: "個人全對", description: "所有正式題目都答對即可達成，後端會延後確認紀錄。", reportToGas: true }
  ];
  const configuredRows = Array.isArray(v4StaticConfig?.achievementRules) ? v4StaticConfig.achievementRules : [];
  const byId = new Map(defaults.map(row => [row.achievementId, row]));
  configuredRows.forEach(row => {
    if (!row || !row.achievementId) return;
    if (row.type === "luckyBox" || row.achievementId === "lucky_box_opened") return;
    byId.set(row.achievementId, { ...(byId.get(row.achievementId) || {}), ...row });
  });
  return Array.from(byId.values()).filter(row => row.type !== "luckyBox" && row.achievementId !== "lucky_box_opened");
}

function getFormalQuestionsForAchievements() {
  const staticRows = Array.isArray(v4StaticConfig?.questions) ? v4StaticConfig.questions : [];
  const rows = staticRows.length ? staticRows : Object.values(publicQuestionCache || {});
  return rows
    .filter(question => question && question.questionId && question.enabled !== false && question.type !== "creative")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.questionId).localeCompare(String(b.questionId)));
}

function getLocalAchievementSummary() {
  const answerMap = getLocalAnswers();
  const answers = Object.values(answerMap);
  const correctRows = answers.filter(row => row.isCorrect === true);
  const correctCount = correctRows.length;
  let streak = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  const formalQuestions = getFormalQuestionsForAchievements();
  const orderedRows = formalQuestions.length
    ? formalQuestions
      .filter(question => answerMap[question.questionId])
      .map(question => answerMap[question.questionId])
    : answers.slice().sort((a, b) => String(a.questionId || "").localeCompare(String(b.questionId || "")));
  orderedRows.forEach(row => {
      if (row.isCorrect === true) {
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }
    });
  currentStreak = streak;
  const itemUseCount = getQueuedItemUses().filter(row => row.status === "sent" || row.status === "queued").length;
  const inventory = getLocalInventory();
  const claimed = inventory.claimedAchievements || {};
  const definitions = buildAchievementDefinitions();
  const totalQuestions = formalQuestions.length;
  const answeredFormalCount = formalQuestions.filter(question => answerMap[question.questionId]).length;
  const formalCorrectCount = formalQuestions.filter(question => answerMap[question.questionId]?.isCorrect === true).length;
  const hasStartedFormalAnswer = answeredFormalCount > 0;
  const hasWrongFormalAnswer = formalQuestions.some(question => {
    const answer = answerMap[question.questionId];
    return answer && answer.isCorrect !== true;
  });
  const hasMissingFormalAnswer = totalQuestions > 0 && answeredFormalCount < totalQuestions;
  const achievements = definitions.map(rule => {
    const threshold = rule.threshold === "all" ? totalQuestions : Number(rule.threshold || 0);
    const isRewarded = Boolean(claimed[rule.achievementId]);
    const isStreakRule = rule.type === "correctStreak";
    const current = isStreakRule
      ? currentStreak
      : rule.type === "itemUse"
        ? itemUseCount
        : rule.type === "perfect"
          ? (hasStartedFormalAnswer && !hasWrongFormalAnswer ? formalCorrectCount : 0)
          : correctCount;
    const completed = rule.type === "perfect"
      ? totalQuestions > 0 && hasStartedFormalAnswer && !hasWrongFormalAnswer && !hasMissingFormalAnswer
      : rule.type === "correctStreak"
        ? bestStreak >= threshold
      : current >= threshold;
    const displayCurrent = isStreakRule && (completed || isRewarded)
      ? threshold
      : Math.min(current, threshold);
    return {
      achievementId: rule.achievementId,
      type: rule.type || "",
      title: rule.title || rule.achievementId,
      description: rule.description || "達成後可領取寶箱。",
      current: displayCurrent,
      target: threshold,
      completed,
      rewarded: isRewarded,
      claimable: completed && !isRewarded && Number(rule.rewardBoxCount || 0) > 0,
      rewardBoxCount: Number(rule.rewardBoxCount || 0),
      reportToGas: Boolean(rule.reportToGas)
    };
  });
  return {
    correctCount,
    correctStreak: currentStreak,
    bestCorrectStreak: bestStreak,
    itemUseCount,
    achievements,
    hasNotice: achievements.some(row => row.claimable)
  };
}

function buildAchievementBox(achievementId, index) {
  const config = getConfig();
  const saved = getSavedPlayer();
  const source = [currentGameSessionSeed || currentGameSessionStartedAt || config.gameId, saved?.playerId || "", achievementId, index].join(":");
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

function hasHeldOrUsedDoubleCard(inventory) {
  return (inventory?.items || []).some(item => item.itemType === "double") ||
    getQueuedItemUses().some(row => row.itemType === "double");
}

function normalizeOpenedItemType(itemType, inventory) {
  if (itemType === "special") return "empty";
  if (itemType === "double" && hasHeldOrUsedDoubleCard(inventory)) return "score_5";
  return itemType || "empty";
}

function getItemUseWindow() {
  const finalized = latestPublicGameState?.status === "finalized" || lastGameStatus === "finalized";
  if (!lastClosedQuestionId || finalized) {
    return { isOpen: false, questionId: "", closesAt: "" };
  }
  return {
    isOpen: true,
    questionId: lastClosedQuestionId,
    closesAt: ""
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
  if (windowState.isOpen) {
    itemUseCountdown.textContent = `已關閉 ${getQuestionDisplayName(windowState.questionId)}，競賽結算前可使用道具。`;
    return;
  }
  if (latestPublicGameState?.status === "question_open" || lastGameStatus === "question_open") {
    itemUseCountdown.textContent = "回答期間不能使用道具，請等講師關題後再使用。";
    return;
  }
  if (latestPublicGameState?.status === "finalized" || lastGameStatus === "finalized") {
    itemUseCountdown.textContent = "競賽已結算，道具使用已關閉。";
    return;
  }
  itemUseCountdown.textContent = "關題後到競賽結算前可使用道具。";
}

function buildClientItemUseId(itemId, questionId) {
  const config = getConfig();
  const saved = getSavedPlayer();
  return [config.gameId, questionId, saved?.playerId || "", itemId].join(":");
}

function queueItemUse(payload) {
  const rows = getQueuedItemUses().filter(row => row.itemId !== payload.itemId);
  const windowState = getItemUseWindow();
  const targetQuestionId = isNextQuestionItem(payload.itemType)
    ? `next:${windowState.questionId || "unknown"}`
    : payload.targetQuestionId || windowState.questionId;
  rows.push({
    ...payload,
    targetQuestionId,
    usedAfterQuestionId: windowState.questionId,
    clientItemUseId: payload.clientItemUseId || buildClientItemUseId(payload.itemId, windowState.questionId),
    effectScore: Number(payload.effectScore ?? getImmediateItemEffectScore(payload.itemType)),
    useWindowClosesAt: windowState.closesAt,
    status: "queued",
    queuedAt: new Date().toISOString()
  });
  saveQueuedItemUses(rows);
  updateLocalScoreSummary();
  renderItemUseLog();
}

async function sendItemUseNow(payload) {
  const windowState = getItemUseWindow();
  const targetQuestionId = isNextQuestionItem(payload.itemType)
    ? `next:${windowState.questionId || "unknown"}`
    : payload.targetQuestionId || windowState.questionId;
  const itemUse = {
    ...payload,
    targetQuestionId,
    usedAfterQuestionId: windowState.questionId,
    clientItemUseId: payload.clientItemUseId || buildClientItemUseId(payload.itemId, windowState.questionId),
    effectScore: Number(payload.effectScore ?? getImmediateItemEffectScore(payload.itemType)),
    useWindowClosesAt: windowState.closesAt,
    status: "sent",
    queuedAt: new Date().toISOString()
  };
  if (itemUse.itemType !== "challenge") {
    await requestFastItemUse(itemUse);
  }
  const rows = getQueuedItemUses().filter(row => row.itemId !== itemUse.itemId);
  rows.push({
    ...itemUse,
    sentAt: new Date().toISOString()
  });
  saveQueuedItemUses(rows);
  updateLocalScoreSummary();
  renderItemUseLog();
}

async function flushQueuedItemUses(questionId) {
  if (!questionId) return;
  const rows = getQueuedItemUses();
  const pendingRows = rows.filter(row => row.status === "queued");
  if (!pendingRows.length) return;

  const nextRows = rows.slice();
  for (const row of pendingRows) {
    try {
      if (row.itemType !== "challenge") {
        await requestFastItemUse({
          ...row,
          targetQuestionId: questionId
        });
      }
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
  renderItemUseLog();
}

function updateTeamChoiceVisibility(state) {
  allowFreeTeamChoice = Boolean(state?.allowFreeTeamChoice);
  teamChoiceField.hidden = !allowFreeTeamChoice;
}

function showGameView(player) {
  checkinView.hidden = true;
  gameView.hidden = false;
  const itemUseLogDetails = document.querySelector("#itemUseLogDetails");
  if (itemUseLogDetails) itemUseLogDetails.hidden = false;
  configureScoreStripLabels();
  if (openLeaderboardsButton) {
    openLeaderboardsButton.hidden = false;
  }
  playerName.textContent = player.nickname || "\u5b78\u54e1";
  if (playerTopName) playerTopName.textContent = player.nickname || "\u5b78\u54e1";
  playerTeam.textContent = teamNames[player.teamId] || player.teamId || "\u672a\u5206\u968a";
  updateConnectionStatus();
  updateLocalScoreSummary(player.updatedAt || "");
  startGameStateWatcher();
  updateItemUseCountdown();
  updateAnswerPageNotice();
  renderItemUseLog();
  window.setTimeout(() => {
    refreshInventory({ silent: true });
    refreshAchievements({ silent: true });
  }, 300);
}

function configureScoreStripLabels() {
  if (scoreStripLabels[0]) {
    scoreStripLabels[0].textContent = "\u5b78\u54e1";
  }
  if (scoreStripLabels[1]) {
    scoreStripLabels[1].textContent = "\u6230\u968a";
  }
  if (scoreStripLabels[2]) {
    scoreStripLabels[2].textContent = "\u500b\u4eba\u5f97\u5206";
  }
  if (scoreStripLabels[3]) {
    scoreStripLabels[3].textContent = "\u9053\u5177\u4f7f\u7528\u5206";
  }
}

function updateScoreSummary(summary) {
  playerScore.textContent = Math.ceil(Number(summary.playerScore || 0));
  teamScore.textContent = Math.ceil(Number(summary.itemScore || 0));
  scoreUpdatedAt.textContent = summary.updatedAt
    ? new Date(summary.updatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
    : "尚未更新";
}

function openAnswerDialog(question) {
  if (!answerDialog || !answerDialogOptions || !question) return;
  answerDialog.hidden = false;
  const questionName = getQuestionDisplayName(question.questionId);
  if (answerDialogTitle) {
    answerDialogTitle.textContent = `${questionName} 作答`;
  }
  answerDialogQuestion.textContent = `${questionName}：${question.title || question.text || "請選擇答案。"}`;
  answerDialogOptions.replaceChildren();
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
    answerDialogOptions.append(button);
  });
}

function closeAnswerDialog() {
  if (answerDialog) answerDialog.hidden = true;
}

function updateSelectedAnswerSummary(answer, seconds) {
  if (!selectedAnswerSummary) return;
  selectedAnswerSummary.hidden = false;
  selectedAnswerSummary.textContent = `已選擇 ${answer}，花費 ${Number(seconds || 0)} 秒。`;
}

function renderQuestion(question, options = {}) {
  const shouldOpenDialog = options.openDialog !== false;
  stopCountdown();
  answerResult.textContent = "";
  answerResult.className = "answer-result";
  if (selectedAnswerSummary) selectedAnswerSummary.hidden = true;

  if (!question) {
    currentQuestion = null;
    currentQuestionId = "";
    currentQuestionOpenedAt = "";
    answeredQuestionId = "";
    questionOpenedAtMs = 0;
    countdownText.textContent = "尚未開題";
    if (answerDialogCountdown) answerDialogCountdown.textContent = "--";
    questionText.textContent = "目前尚未開放題目，請等待講師指示。";
    optionList.replaceChildren();
    if (answerDialogOptions) answerDialogOptions.replaceChildren();
    closeAnswerDialog();
    updateCreativeVisibility(null);
    return;
  }

  const previousQuestionId = currentQuestionId;
  const localAnswer = getLocalAnswers()[question.questionId];
  currentQuestion = question;
  currentQuestionId = question.questionId;
  currentQuestionOpenedAt = question.questionOpenedAt || latestPublicGameState?.questionOpenedAt || latestPublicGameState?.updatedAt || currentQuestionOpenedAt || new Date().toISOString();
  answeredQuestionId = localAnswer ? question.questionId : (previousQuestionId === question.questionId ? answeredQuestionId : "");
  questionOpenedAtMs = getLockedQuestionOpenTime(question.questionId, currentQuestionOpenedAt);
  if (questionTitle) {
    questionTitle.textContent = `${getQuestionDisplayName(question.questionId)} 作答`;
  }
  questionText.textContent = question.title || question.text || "題目資料已載入。";
  optionList.replaceChildren();
  updateCreativeVisibility(question);

  if (question.type === "creative") {
    countdownText.textContent = "不適用";
    questionText.textContent = "第 4 版已移除創作題，請等待下一題。";
    updateSyncStatus("第 4 版不使用創作題。");
    return;
  }

  if (localAnswer) {
    updateSelectedAnswerSummary(normalizeAnswer(localAnswer.answer || ""), Number(localAnswer.responseSeconds || 0));
    updateSyncStatus(`${getQuestionDisplayName(question.questionId)} 已送出作答，請等待講師關題。`);
    countdownText.textContent = "已送出";
    closeAnswerDialog();
    return;
  }

  if (shouldOpenDialog) {
    openAnswerDialog(question);
  } else {
    closeAnswerDialog();
  }
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
      updateSyncStatus("\u5012\u6578\u5df2\u7d50\u675f\uff0c\u4f46\u4ecd\u9700\u7b49\u8b1b\u5e2b\u95dc\u984c\u624d\u6703\u505c\u6b62\u4f5c\u7b54\u3002");
    }
  }, 500);
}

function updateCountdown(remainingSeconds) {
  countdownText.textContent = `${remainingSeconds} 秒`;
  countdownText.classList.toggle("is-warning", remainingSeconds <= 10);
  if (answerDialogCountdown) {
    answerDialogCountdown.textContent = `${remainingSeconds} 秒`;
    answerDialogCountdown.classList.toggle("is-warning", remainingSeconds <= 10);
  }
}

function stopCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function disableOptions() {
  [...optionList.querySelectorAll("button"), ...answerDialogOptions.querySelectorAll("button")].forEach(item => {
    item.disabled = true;
  });
}

function enableOptions() {
  [...optionList.querySelectorAll("button"), ...answerDialogOptions.querySelectorAll("button")].forEach(item => {
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
    item.textContent = "目前沒有個人排名。";
    playerLeaderboard.append(item);
    return;
  }

  rows.slice(0, 10).forEach(row => {
    const item = document.createElement("li");
    const teamName = teamNames[row.teamId] || row.teamId || "未分隊";
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    const totalSeconds = Math.max(0, Math.round(Number(row.totalResponseSeconds || 0)));
    name.textContent = row.nickname || "學員";
    meta.textContent = `${Number(row.score || 0)} 分，${teamName}，作答總秒數 ${totalSeconds} 秒`;
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
      const saved = getSavedPlayer();
      const playerRows = snapshot.players || [];
      const selfRow = saved?.playerId
        ? playerRows.find(row => row.playerId === saved.playerId)
        : playerRows.find(row => row.nickname && row.nickname === saved?.nickname);
      if (saved && selfRow) {
        savePlayer({
          ...saved,
          score: Number(selfRow.score || 0),
          playerScore: Number(selfRow.score || 0),
          totalResponseSeconds: Number(selfRow.totalResponseSeconds || saved.totalResponseSeconds || 0),
          updatedAt: snapshot.updatedAt || new Date().toISOString()
        });
        updateLocalScoreSummary(snapshot.updatedAt || "");
      }
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
  updateAnswerPageNotice();
  renderItemUseLog();
}

function renderAchievements(result) {
  const rows = result?.achievements || [];
  const hasClaimable = rows.some(row => row.claimable);
  achievementList.replaceChildren();
  achievementNotice.hidden = !hasClaimable;

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
    const progressText = row.type === "perfect" || row.achievementId === "perfect_personal"
      ? row.completed ? "已達成" : "尚未達成"
      : `進度 ${row.current || 0} / ${row.target || 0}`;
    meta.textContent = `${row.description || ""} ${progressText}${row.rewarded ? "，寶箱已發放" : ""}`;
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
  updateAnswerPageNotice();
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
  updateAnswerPageNotice();
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
  const isLuckyBox = Boolean(box?.isLuckyBox);

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
  const itemType = normalizeOpenedItemType(targetBox.itemType || "empty", inventory);
  targetBox.itemType = itemType;
  targetBox.itemLabel = getItemLabel(itemType);
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

  updateAnswerPageNotice();

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
    inventoryStatus.textContent = "道具只能在講師關題後、競賽結算前使用。";
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
    renderItemUseLog();
  } catch (error) {
    inventoryStatus.textContent = `道具送出失敗：${error.message}`;
    if (button) button.disabled = false;
  }
}

function getChallengeNumber(item, questionId) {
  const config = getConfig();
  const saved = getSavedPlayer();
  const seed = getStaticGameSeed(v4StaticConfig, config.gameId);
  return hashStringToUint32([seed, saved?.playerId || "", item?.itemId || "", questionId || "", "challenge_size"].join(":")) % 10;
}

function getChallengeResult(item, guess) {
  const windowState = getItemUseWindow();
  const number = getChallengeNumber(item, windowState.questionId);
  const answer = number <= 4 ? "small" : "big";
  const normalizedGuess = guess === "big" || guess === "small" ? guess : "skip";
  const effectScore = normalizedGuess === "skip" ? 3 : normalizedGuess === answer ? 10 : 0;
  return {
    challengeNumber: number,
    challengeAnswer: answer,
    challengeGuess: normalizedGuess,
    challengeAnswerLabel: answer === "big" ? "大" : "小",
    challengeGuessLabel: normalizedGuess === "big" ? "大" : normalizedGuess === "small" ? "小" : "不猜",
    effectScore
  };
}

function openChallengeDialog(item) {
  pendingChallengeItem = item;
  challengeDialog.hidden = false;
  if (challengeTitle) challengeTitle.textContent = "使用挑戰卡";
  challengeStatus.textContent = "挑戰卡：猜系統預先產生的 0 到 9 整數是大或小。0 到 4 為小，5 到 9 為大；不猜得 3 分。";
  challengeTeamGrid.replaceChildren();
  [
    { choice: "big", label: "猜大", description: "答案為 5 到 9 可得 10 分" },
    { choice: "small", label: "猜小", description: "答案為 0 到 4 可得 10 分" },
    { choice: "skip", label: "不猜", description: "直接獲得 3 分" }
  ].forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "team-choice-card";
    button.dataset.challengeChoice = option.choice;
    button.innerHTML = `<span class="art-slot" aria-hidden="true"></span><strong>${option.label}</strong><small>${option.description}</small>`;
    challengeTeamGrid.append(button);
  });
}

function closeChallengeDialog() {
  pendingChallengeItem = null;
  challengeDialog.hidden = true;
  if (challengeTitle) challengeTitle.textContent = "使用挑戰卡";
}

async function useChallengeItem(choice) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId || !pendingChallengeItem) return;
  if (!getItemUseWindow().isOpen) {
    challengeStatus.textContent = "挑戰卡只能在講師關題後、競賽結算前使用。";
    return;
  }

  const result = getChallengeResult(pendingChallengeItem, choice);
  challengeStatus.textContent = "正在記錄挑戰卡結果。";
  try {
    await sendItemUseNow({
      playerId: saved.playerId,
      itemId: pendingChallengeItem.itemId,
      itemType: pendingChallengeItem.itemType,
      teamId: saved.teamId,
      targetTeamId: "",
      challengeNumber: result.challengeNumber,
      challengeAnswer: result.challengeAnswer,
      challengeAnswerLabel: result.challengeAnswerLabel,
      challengeGuess: result.challengeGuess,
      challengeGuessLabel: result.challengeGuessLabel,
      effectScore: result.effectScore
    });
    markItemPending(pendingChallengeItem.itemId);
    renderItemUseLog();
    updateLocalScoreSummary();
    inventoryStatus.textContent = `挑戰卡已使用，獲得 ${result.effectScore} 分。`;
    if (challengeTitle) challengeTitle.textContent = "挑戰卡結果";
    challengeStatus.textContent = `你選擇${result.challengeGuessLabel}，答案數字 ${result.challengeNumber}，代表${result.challengeAnswerLabel}，獲得 ${result.effectScore} 分。`;
    challengeTeamGrid.replaceChildren();
    const resultCard = document.createElement("article");
    resultCard.className = `challenge-result-card ${result.effectScore >= 10 ? "is-success" : result.effectScore > 0 ? "is-skip" : "is-miss"}`;
    resultCard.innerHTML = `<strong>${result.effectScore >= 10 ? "挑戰成功" : result.effectScore > 0 ? "保守得分" : "挑戰未中"}</strong><span>答案數字：${result.challengeNumber}</span><span>本次獲得：${result.effectScore} 分</span>`;
    challengeTeamGrid.append(resultCard);
    pendingChallengeItem = null;
  } catch (error) {
    challengeStatus.textContent = `挑戰卡使用失敗：${error.message}`;
  }
}

function markItemPending(itemId) {
  markLocalInventoryItemUsed(itemId, "used");
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
  finalResultStatus.textContent = "正在讀取最終結果...";
  try {
    const result = await callGameApi("getFinalResults", {
      playerId: saved.playerId
    });
    const teamRank = result.teamRank ? `戰隊第 ${result.teamRank} 名` : "戰隊排名未產生";
    const playerRank = result.playerRank ? `個人第 ${result.playerRank} 名` : "個人排名未產生";
    const luckyAwards = (result.awards || []).filter(row => getAwardType(row) === "lucky");
    const awardText = luckyAwards.length ? "\u606d\u559c\u7372\u5f97\u5e78\u904b\u734e\uff0c\u8acb\u4e0a\u53f0\u9818\u734e\u3002" : "";
    finalResultStatus.textContent = [
      `${teamRank}\uff0c\u6230\u968a\u7a4d\u5206 ${Math.ceil(Number(result.teamScore || 0))}\u3002${playerRank}\uff0c\u500b\u4eba\u7a4d\u5206 ${Math.ceil(Number(result.playerScore || 0))}\u3002`,
      awardText
    ].filter(Boolean).join("");
    finalResultStatus.className = luckyAwards.length ? "answer-result is-correct" : "sync-status";
  } catch (error) {
    finalResultStatus.textContent = `最終結果讀取失敗：${error.message}`;
  }
}

function getAwardType(row) {
  if (typeof row === "string") return row === "lucky_box" ? "lucky" : row;
  return row?.awardType === "lucky_box" ? "lucky" : String(row?.awardType || "");
}

function formatAwardName(row) {
  if (typeof row === "string") {
    return {
      perfect_candidate: "個人全對獎",
      perfect: "個人全對獎",
      lucky: "幸運獎",
      lucky_box: "幸運獎"
    }[row] || "獎項";
  }
  if (row.awardType === "lucky") return "幸運獎";
  if (row.awardType === "perfect") return `全對獎第 ${row.rank || ""} 名`;
  return {
    perfect_candidate: "個人全對獎",
    lucky_box: "幸運獎"
  }[row.awardType] || "獎項";
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
  const stateSession = String(state.sessionStartedAt || "");
  const savedSession = String(saved.gameSessionStartedAt || "");
  if (stateSession && savedSession && stateSession !== savedSession) return true;
  if (stateSession && !savedSession) {
    const checkedInAt = toTimeMs(saved.checkedInAt || saved.updatedAt);
    return checkedInAt > 0 && checkedInAt < toTimeMs(stateSession);
  }
  const status = state.status || "";
  const stateUpdatedAt = toTimeMs(state.updatedAt);
  const checkedInAt = toTimeMs(saved.checkedInAt || saved.updatedAt);
  return (status === "draft" || status === "created") && stateUpdatedAt > 0 && checkedInAt > 0 && checkedInAt < stateUpdatedAt;
}

function updateCurrentGameSession(state) {
  currentGameSessionUpdatedAt = state?.updatedAt || currentGameSessionUpdatedAt;
  currentGameSessionStartedAt = state?.sessionStartedAt || currentGameSessionStartedAt || currentGameSessionUpdatedAt;
  currentGameSessionSeed = state?.gameSessionSeed || currentGameSessionSeed || currentGameSessionStartedAt;
  if (v4StaticConfig) {
    v4StaticConfig = {
      ...v4StaticConfig,
      gameSessionSeed: currentGameSessionSeed,
      gameSeed: currentGameSessionSeed || v4StaticConfig.gameSeed
    };
  }
}

function shouldIgnoreStaleGameState(state) {
  if (!state || !latestPublicGameState) return false;
  const nextTime = toTimeMs(state.updatedAt || state.questionOpenedAt);
  const latestTime = toTimeMs(latestPublicGameState.updatedAt || latestPublicGameState.questionOpenedAt);
  if (nextTime > 0 && latestTime > 0 && nextTime < latestTime) return true;

  const status = state.status || "";
  const questionId = state.currentQuestionId || "";
  if (status === "question_closed" && questionId && questionId === currentQuestionId) {
    const closedAt = toTimeMs(state.updatedAt);
    const openedAt = toTimeMs(currentQuestionOpenedAt);
    if (closedAt > 0 && openedAt > 0 && closedAt < openedAt) return true;
  }
  return false;
}

function renderPublicGameState(state) {
  if (!state || !hasCheckedIn()) {
    return;
  }

  const saved = getSavedPlayer();

  if (shouldIgnoreStaleGameState(state)) {
    return;
  }

  // 防呆：如果當前收到的狀態是 draft，但我們已經有已知的非 draft 狀態，且新狀態的更新時間並沒有比較新，則忽略
  // 這可以防止 Firebase 延遲回傳舊的 draft 資訊導致學員被誤踢
  if (state.status === "draft" && latestPublicGameState && latestPublicGameState.status !== "draft") {
    const stateTime = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
    const latestTime = latestPublicGameState.updatedAt ? new Date(latestPublicGameState.updatedAt).getTime() : 0;
    if (stateTime <= latestTime) {
      console.log("[Watcher] 忽略過時的 Firebase draft 狀態。");
      return;
    }
  }

  updateCurrentGameSession(state);
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

  if (status === "question_open" && questionId && (questionId !== currentQuestionId || !currentQuestion)) {
    flushQueuedItemUses(questionId);
    const publicQuestion = state.publicQuestion || publicQuestionCache[questionId];
    if (publicQuestion) {
      renderQuestion({
        ...publicQuestion,
        questionOpenedAt: state.questionOpenedAt || state.updatedAt || publicQuestion.questionOpenedAt || ""
      }, { openDialog: false });
    } else {
      getQuestionFromFirebase(questionId)
        .then(question => {
          if (!question) return;
          const latestStatus = latestPublicGameState?.status || "";
          const latestQuestionId = latestPublicGameState?.currentQuestionId || "";
          if (latestStatus === "question_open" && latestQuestionId === questionId) {
            renderQuestion({
              ...question,
              questionOpenedAt: latestPublicGameState.questionOpenedAt || latestPublicGameState.updatedAt || ""
            }, { openDialog: false });
          }
        })
        .catch(error => {
          console.warn("Auto question load failed.", error);
        });
    }
    lastFirebaseQuestionId = questionId;
    lastGameStatus = status;
    updateSyncStatus(`${getQuestionDisplayName(questionId)} 已開題，倒數已自動開始。`);
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
      if (!localAnswer || !localAnswer.scored) {
        answerResult.textContent = "講師已關題，這題沒有作答紀錄。";
        answerResult.className = "answer-result is-pending";
      }
    }
    return;
  }

  if (status === "finalized") {
    stopCountdown();
    disableOptions();
    lastGameStatus = status;
    updateItemUseCountdown();
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
      if (!v4StaticConfig) {
        v4StaticConfig = buildRuntimeStaticConfigFromQuestions(publicQuestionCache);
      }
      updateSyncStatus("公開題庫已預載，請等待講師開題。");
    }
  } catch (error) {
    if (hasCheckedIn() && !currentQuestion) {
      updateSyncStatus("公開題庫暫時無法讀取，開始作答時會改用 GAS 後端。");
    }
  }
}

async function refreshPublicGameState() {
  try {
    const state = await getPublicGameState();
    renderPublicGameState(state);
  } catch (error) {
    if (hasCheckedIn() && !currentQuestion) {
      updateSyncStatus("Firebase 公開狀態暫時無法讀取，仍可依講師口令開始作答。");
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
  updateSyncStatus("請看講師畫面；講師顯示已開題後，再按「開始作答」。");
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

  if (currentQuestion && currentQuestion.questionId && answeredQuestionId !== currentQuestion.questionId) {
    openAnswerDialog(currentQuestion);
    updateSyncStatus(`${getQuestionDisplayName(currentQuestion.questionId)} 已開題，倒數已自動開始。`);
    return;
  }

  isRefreshing = true;
  refreshQuestionButton.disabled = true;
  questionText.textContent = "正在開始作答...";
  answerResult.textContent = "";
  updateSyncStatus("正在確認講師開題狀態。");

  try {
    const saved = getSavedPlayer();
    if (!saved || !saved.playerId) {
      questionText.textContent = "請先完成報到，再開始作答。";
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
    updateSyncStatus("開始作答失敗，請重新整理後再試。");
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
  closeAnswerDialog();
  answerResult.textContent = "答案已送出，等待講師關題。";
  answerResult.className = "answer-result is-pending";
  updateSyncStatus("答案已送出，等待講師關題。");
  const responseSeconds = Math.max(0, Math.floor((Date.now() - questionOpenedAtMs) / 1000));
  updateSelectedAnswerSummary(answer, responseSeconds);
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
    } catch (firebaseError) {
      console.warn("Firebase answer submit failed.", firebaseError);
      throw firebaseError;
    }
    recordLocalAnswer(currentQuestion, answer, staticQuestionResult, responseSeconds);
    if (perfectAwardCandidate) {
      callGameApi("recordPerfectAwardCandidate", {
        playerId: saved.playerId,
        finalQuestionId: currentQuestion.questionId,
        completedAt: new Date().toISOString()
      }).catch(recordError => {
        console.warn("Perfect award candidate record failed.", recordError);
      });
    }
    if (staticQuestionResult?.isCorrect === true) {
      const awardedBox = awardLocalQuestionBox(currentQuestion.questionId);
      if (awardedBox) {
        inventoryNotice.hidden = false;
        answerResult.textContent = "答案已送出，並獲得 1 個待開啟寶箱。等待講師關題。";
      }
    }
    cachedAchievements = getLocalAchievementSummary();
    achievementNotice.hidden = !cachedAchievements.hasNotice;
    updateAnswerPageNotice();
    renderItemUseLog();
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
  let publicState = null;
  try {
    publicState = await getPublicGameState();
    if (publicState && publicState.status && publicState.status !== "draft") {
      latestPublicGameState = publicState; // 預先更新，防止 watcher 誤判
      return publicState;
    }
  } catch (error) {
    // Firebase 讀取失敗，後續會嘗試 GAS
  }

  try {
    const gasState = await callGameApi("getGameState");
    if (gasState && gasState.status) {
      if (gasState.status !== "draft") {
        latestPublicGameState = gasState; // 預先更新
      }
      return gasState;
    }
  } catch (error) {
    // 如果 Firebase 是 draft，但 GAS 呼叫失敗，拋出錯誤讓呼叫者處理（顯示連線失敗），
    // 而非直接回傳 draft 導致誤顯「講師尚未啟動」。
    if (publicState && publicState.status === "draft") {
      throw new Error("無法確認場次狀態，請檢查網路連線。");
    }
    if (publicState) {
      return publicState;
    }
    throw error;
  }

  return publicState;
}

async function initTeamChoiceMode() {
  isTeamChoiceReady = false;
  checkinSubmitButton.disabled = true;
  checkinStatus.textContent = "正在確認講師是否已啟動場次...";
  try {
    const state = await getStartupGameState();
    updateCurrentGameSession(state);
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
    updateCurrentGameSession(state);
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
    updateCurrentGameSession(startupState);
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
      gameSessionStartedAt: currentGameSessionStartedAt || currentGameSessionUpdatedAt,
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
  const button = event.target.closest("button[data-challenge-choice]");
  if (!button || button.disabled) return;
  [...challengeTeamGrid.querySelectorAll("button")].forEach(item => {
    item.classList.toggle("is-selected", item === button);
  });
  useChallengeItem(button.dataset.challengeChoice || "skip");
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
if (closeAnswerDialogButton) {
  closeAnswerDialogButton.addEventListener("click", closeAnswerDialog);
}
if (answerDialog) {
  answerDialog.addEventListener("click", event => {
    if (event.target?.dataset?.closeAnswerDialog !== undefined) {
      closeAnswerDialog();
    }
  });
}

resetClientCacheIfVersionChanged();
updateConnectionStatus();
initTeamChoiceMode();
restoreCheckin();
