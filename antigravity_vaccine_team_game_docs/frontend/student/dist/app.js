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
} from "./api.js?v=0.5.20";
import {
  buildClientSubmitId,
  buildPublicQuestionCache,
  buildStaticTreasurePlan,
  calculateStaticQuestionResult,
  getPerfectAwardCandidate,
  getStaticGameSeed,
  hashStringToUint32,
  loadV4StaticConfig
} from "./static-v4.js?v=0.5.20";

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
const scoreUpdatedAt = document.querySelector("#scoreUpdatedAt");
const scoreStripLabels = document.querySelectorAll(".score-strip span");
const connectionMode = document.querySelector("#connectionMode");
const gameIdText = document.querySelector("#gameIdText");
const questionText = document.querySelector("#questionText");
const questionTitle = document.querySelector("#question-title");
const optionList = document.querySelector("#optionList");
const refreshQuestionButton = document.querySelector("#refreshQuestion");
const answerQuestionPanel = document.querySelector("#question-title")?.closest(".panel");
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
const utilityTitle = document.querySelector("#utility-title");
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
  team_1: "冷鏈守護隊",
  team_2: "安全接種隊",
  team_3: "疫苗尖兵隊",
  team_4: "衛教溝通隊",
  team_5: "接種品質隊"
};
const teamIconLabels = {
  team_1: "冷",
  team_2: "安",
  team_3: "疫",
  team_4: "衛",
  team_5: "質"
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
const answerTimeLimitSeconds = 65;
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
  score_1: "立即加分。",
  score_3: "立即加分。",
  score_5: "立即加分。",
  score_10: "立即加分。",
  double: "下題答對分數加倍。",
  comeback: "依目前排行加分。",
  challenge: "猜大小，答中加分。",
  special: "幸運箱會在最後結算時確認。"
};
const itemScoreBadges = {
  empty: "+0 分",
  score_1: "+1 分",
  score_3: "+3 分",
  score_5: "+5 分",
  score_10: "+10 分",
  double: "x2",
  comeback: "+5 分",
  challenge: "+10 分",
  special: "幸運"
};
const achievementIconImages = {
  correct_3: "./assets/images/achievements/achievement-correct-3.png",
  correct_5: "./assets/images/achievements/achievement-correct-5.png",
  correct_10: "./assets/images/achievements/achievement-correct-10.png",
  streak_3: "./assets/images/achievements/achievement-streak-3.png",
  streak_5: "./assets/images/achievements/achievement-streak-5.png",
  item_use_3: "./assets/images/achievements/achievement-item-use-3.png",
  perfect_personal: "./assets/images/achievements/achievement-perfect.png"
};
const itemIconImages = {
  empty: "./assets/images/items/item-empty.png",
  closed_box: "./assets/images/items/item-chest-closed.png",
  score_1: "./assets/images/items/item-score-1.png",
  score_3: "./assets/images/items/item-score-3.png",
  score_5: "./assets/images/items/item-score-5.png",
  score_10: "./assets/images/items/item-score-10.png",
  double: "./assets/images/items/item-double.png",
  comeback: "./assets/images/items/item-comeback.png",
  challenge: "./assets/images/items/item-challenge.png",
  special: "./assets/images/awards/award-lucky-purple.png"
};
const challengeChoiceImages = {
  big: "./assets/images/challenge/challenge-choice-big.png",
  small: "./assets/images/challenge/challenge-choice-small.png",
  skip: "./assets/images/challenge/challenge-choice-skip.png"
};
const challengeResultImages = {
  success: "./assets/images/challenge/challenge-result-success.png",
  miss: "./assets/images/challenge/challenge-result-miss.png",
  skip: "./assets/images/challenge/challenge-result-skip.png"
};
const teamRankIconImages = [
  "./assets/images/awards/award-rank-rainbow.png",
  "./assets/images/awards/award-rank-purple.png",
  "./assets/images/awards/award-rank-gold.png",
  "./assets/images/awards/award-rank-silver.png",
  "./assets/images/awards/award-rank-bronze.png"
];
const playerRankIconImages = [
  "./assets/images/awards/award-player-rank-1.png",
  "./assets/images/awards/award-player-rank-2.png",
  "./assets/images/awards/award-player-rank-3.png",
  "./assets/images/awards/award-player-rank-4.png",
  "./assets/images/awards/award-player-rank-5.png"
];
const ADDITIONAL_TREASURE_BOX_LIMIT = 5;
const ADDITIONAL_TREASURE_ITEM_TYPES = ["score_3", "score_5", "challenge", "score_10", "empty"];
const LAGGING_TREASURE_ITEM_TYPES = ["score_1", "score_3", "score_5", "challenge", "double", "empty"];
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
let challengeRevealTimer = null;
let pendingChallengeResult = null;

function showGameConfirm(message, options = {}) {
  return new Promise(resolve => {
    const dialog = document.createElement("section");
    dialog.className = "game-confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.innerHTML = `
      <div class="game-confirm-backdrop"></div>
      <section class="panel game-confirm-panel">
        <h2>${options.title || "任務確認"}</h2>
        <p>${message}</p>
        <div class="game-confirm-actions">
          <button type="button" class="secondary-action" data-confirm-value="false">${options.cancelText || "再想一下"}</button>
          <button type="button" class="primary-action" data-confirm-value="true">${options.confirmText || "確認"}</button>
        </div>
      </section>
    `;
    const finish = value => {
      dialog.remove();
      resolve(value);
    };
    dialog.addEventListener("click", event => {
      const button = event.target.closest("[data-confirm-value]");
      if (!button) return;
      finish(button.dataset.confirmValue === "true");
    });
    document.body.append(dialog);
    dialog.querySelector("[data-confirm-value='true']")?.focus();
  });
}

const emptyTreasureMessages = [
  "空寶箱：這次沒有取得道具，不會扣分，也不需要再操作。",
  "空寶箱：沒有道具，但答題紀錄已保留。",
  "空寶箱：本次沒有獎勵道具，請繼續作答。"
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
    ? normalizeResponseSeconds(Math.max(0, Math.floor((Date.now() - questionOpenedAtMs) / 1000)))
    : Number(responseSecondsOverride || 0);
  rows[question.questionId] = {
    questionId: question.questionId,
    answer: [answer].filter(Boolean),
    responseSeconds: elapsedSeconds,
    submittedAt: new Date().toISOString(),
    score: result ? Number(result.finalQuestionScore || result.baseScore || 0) : rows[question.questionId]?.score || 0,
    baseScore: result ? Number(result.baseScore || 0) : rows[question.questionId]?.baseScore || 0,
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

function normalizeResponseSeconds(rawSeconds) {
  const seconds = Math.max(0, Math.floor(Number(rawSeconds || 0)));
  const remainingSeconds = Math.max(0, answerTimeLimitSeconds - seconds);
  if (remainingSeconds > 60) return 1;
  return Math.max(1, 60 - remainingSeconds);
}

function getLocalAnswerScore() {
  return Object.values(getLocalAnswers())
    .filter(row => row.scored)
    .reduce((total, row) => {
      const fallbackAnswerScore = Number(row.score || 0) - Number(row.itemBonusScore || 0);
      const answerScore = row.baseScore === "" || row.baseScore === undefined || row.baseScore === null
        ? fallbackAnswerScore
        : Number(row.baseScore || 0);
      return total + Number(answerScore || 0);
    }, 0);
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
  const localAnswerScore = getLocalAnswerScore();
  const localItemScore = getLocalItemScore();
  const localScore = localAnswerScore + localItemScore;
  const backendAnswerScore = Number(saved?.answerScore ?? 0);
  const backendItemScore = Number(saved?.itemScore ?? 0);
  const useBackendBreakdown = backendScore > localScore && (backendAnswerScore > 0 || backendItemScore > 0);
  updateScoreSummary({
    playerScore: Math.max(localScore, backendScore),
    answerScore: useBackendBreakdown ? backendAnswerScore : localAnswerScore,
    itemScore: useBackendBreakdown ? backendItemScore : localItemScore,
    updatedAt: updatedAt || new Date().toISOString()
  });
}

function updateClosedQuestionResultText(questionId, isCorrect, baseScore, itemBonusScore) {
  const answer = getLocalAnswers()[questionId];
  const selected = normalizeAnswer(answer?.answer || "").replaceAll(",", "、") || "未選擇";
  if (selectedAnswerSummary) {
    selectedAnswerSummary.hidden = false;
    selectedAnswerSummary.textContent = `${getQuestionDisplayName(questionId)}已關題。已選擇 ${selected}，花費 ${Number(answer?.responseSeconds || 0)} 秒。`;
  }
  const resultText = isCorrect
    ? `答對了，防線穩住。本題 ${baseScore + itemBonusScore} 分。`
    : `答錯了，這題先補強觀念。本題 ${itemBonusScore} 分。`;
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
    baseScore,
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

function hasQuestionAfter(questionId) {
  const rows = getFormalQuestionsForAchievements(v4StaticConfig)
    .map(row => row.questionId)
    .filter(Boolean);
  const index = rows.indexOf(questionId);
  return index >= 0 && index < rows.length - 1;
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
    ? `${notices.join("，")}。請點上方寶箱或成就按鈕處理。`
    : "等待獎勵出現…";
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
    const icon = createAssetIcon(itemIconImages[row.itemType] || itemIconImages.empty, "inventory-icon item-use-icon", getItemLabel(row.itemType));
    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const label = getItemLabel(row.itemType);
    const effectScore = Number(row.effectScore || 0);
    const scoreBadge = document.createElement("span");
    scoreBadge.className = "item-score-badge";
    scoreBadge.textContent = getItemScoreBadge(row.itemType, effectScore, row);
    const scoreText = getItemUseLogSummary(row, effectScore);
    title.textContent = label;
    meta.textContent = scoreText;
    body.append(title, meta);
    item.append(scoreBadge);
    item.prepend(icon, body);
    itemUseLog.append(item);
  });
}

function getItemScoreBadge(itemType, effectScore = 0, row = {}) {
  if (itemType === "challenge") return `+${Math.max(0, Math.ceil(effectScore || 0))} 分`;
  if (itemType === "double") return row.noEffect ? "+0 分" : "x2";
  if (itemType === "empty") return "+0 分";
  if (Number.isFinite(Number(effectScore)) && Number(effectScore) > 0) {
    return `+${Math.ceil(Number(effectScore))} 分`;
  }
  return itemScoreBadges[itemType] || "+0 分";
}

function getItemUseLogSummary(row, effectScore = 0) {
  const questionText = getQuestionDisplayName(row.usedAfterQuestionId || row.targetQuestionId || row.appliedQuestionId);
  if (row.itemType === "empty" || row.noEffect && row.itemType === "empty") return "空箱，無道具";
  if (row.itemType === "double") {
    return row.noEffect ? "無下一題，未加分" : "已裝備，下題答對 x2";
  }
  if (row.itemType === "challenge") {
    return `猜${row.challengeGuessLabel || "不猜"}，抽 ${row.challengeNumber ?? "?"}，${Math.ceil(effectScore)} 分`;
  }
  if (row.itemType === "comeback") return `${questionText}，翻身分已套用`;
  if (["score_1", "score_3", "score_5", "score_10"].includes(row.itemType)) return `${questionText} 已套用`;
  if (isNextQuestionItem(row.itemType)) return "下一題套用";
  return "已使用";
}

function appendLocalItemUseLog(row) {
  const rows = getQueuedItemUses();
  rows.push({
    queuedAt: new Date().toISOString(),
    status: "sent",
    ...row
  });
  saveQueuedItemUses(rows);
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
        { itemType: "score_1", weight: 22 },
        { itemType: "score_3", weight: 18 },
        { itemType: "score_5", weight: 12 },
        { itemType: "score_10", weight: 5 },
        { itemType: "double", weight: 10 },
        { itemType: "comeback", weight: 5 },
        { itemType: "challenge", weight: 20 },
        { itemType: "special", weight: 3 },
        { itemType: "empty", weight: 5 }
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
  const rowsById = new Map();
  staticRows.forEach(question => {
    if (question?.questionId) rowsById.set(question.questionId, question);
  });
  Object.values(publicQuestionCache || {}).forEach(question => {
    if (question?.questionId) rowsById.set(question.questionId, {
      ...(rowsById.get(question.questionId) || {}),
      ...question
    });
  });
  return Array.from(rowsById.values())
    .filter(question => question && question.questionId && question.enabled !== false && question.type !== "creative")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.questionId).localeCompare(String(b.questionId)));
}

function getLocalAchievementSummary() {
  const answerMap = getLocalAnswers();
  const answers = Object.values(answerMap);
  const isCorrectAnswer = row => row && (row.isCorrect === true || String(row.isCorrect).toLowerCase() === "true");
  const correctRows = answers.filter(row => isCorrectAnswer(row));
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
      if (isCorrectAnswer(row)) {
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
  const formalCorrectCount = formalQuestions.filter(question => isCorrectAnswer(answerMap[question.questionId])).length;
  const hasStartedFormalAnswer = answeredFormalCount > 0;
  const hasWrongFormalAnswer = formalQuestions.some(question => {
    const answer = answerMap[question.questionId];
    return answer && !isCorrectAnswer(answer);
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

function buildAdditionalTreasureBox(slot) {
  const config = getConfig();
  const saved = getSavedPlayer();
  const safeSlot = Math.max(1, Math.min(ADDITIONAL_TREASURE_BOX_LIMIT, Number(slot || 1)));
  const source = [currentGameSessionSeed || currentGameSessionStartedAt || config.gameId, saved?.playerId || "", "additional", safeSlot].join(":");
  const itemType = ADDITIONAL_TREASURE_ITEM_TYPES[(safeSlot - 1) % ADDITIONAL_TREASURE_ITEM_TYPES.length];
  return {
    boxId: `local_additional_treasure_${safeSlot}_${hashStringToUint32(source).toString(36)}`,
    sourceType: "additional_treasure",
    sourceQuestionId: "",
    status: "unopened",
    awardedAt: new Date().toISOString(),
    openedAt: "",
    itemType,
    itemLabel: getItemLabel(itemType),
    isLuckyBox: false,
    grantSlot: safeSlot
  };
}

function buildLaggingTreasureBox(teamId) {
  const config = getConfig();
  const saved = getSavedPlayer();
  const safeTeamId = String(teamId || saved?.teamId || "");
  const source = [currentGameSessionSeed || currentGameSessionStartedAt || config.gameId, saved?.playerId || "", "lagging", safeTeamId].join(":");
  const itemType = LAGGING_TREASURE_ITEM_TYPES[hashStringToUint32(source) % LAGGING_TREASURE_ITEM_TYPES.length];
  return {
    boxId: `local_lagging_treasure_${safeTeamId}_${hashStringToUint32(source).toString(36)}`,
    sourceType: "lagging_treasure",
    sourceQuestionId: "",
    status: "unopened",
    awardedAt: new Date().toISOString(),
    openedAt: "",
    itemType,
    itemLabel: getItemLabel(itemType),
    isLuckyBox: false,
    grantTeamId: safeTeamId
  };
}

function awardLocalTreasureBox(box, seenKey) {
  if (!hasCheckedIn()) return null;
  const inventory = getLocalInventory();
  if (localStorage.getItem(seenKey)) return null;
  if (inventory.boxes.some(row => row.boxId === box.boxId)) {
    localStorage.setItem(seenKey, "1");
    return null;
  }
  inventory.boxes.push(box);
  saveLocalInventory(inventory);
  localStorage.setItem(seenKey, "1");
  cachedInventory = inventory;
  renderInventory(inventory);
  return box;
}

function awardAdditionalTreasureBox(slot) {
  const saved = getSavedPlayer();
  const sessionKey = currentGameSessionSeed || currentGameSessionStartedAt || "default";
  const seenKey = `vaccineGameAdditionalTreasure:${getConfig().gameId}:${saved?.playerId || "anonymous"}:${sessionKey}:${slot}`;
  return awardLocalTreasureBox(buildAdditionalTreasureBox(slot), seenKey);
}

function awardLaggingTreasureBox(teamId) {
  const saved = getSavedPlayer();
  const sessionKey = currentGameSessionSeed || currentGameSessionStartedAt || "default";
  const seenKey = `vaccineGameLaggingTreasure:${getConfig().gameId}:${saved?.playerId || "anonymous"}:${sessionKey}:${teamId}`;
  return awardLocalTreasureBox(buildLaggingTreasureBox(teamId), seenKey);
}

function parseEnabledSlots(state) {
  const rawSlots = String(state?.additionalTreasureBoxSlots || "")
    .split(",")
    .map(value => Number(value.trim()))
    .filter(value => Number.isFinite(value) && value >= 1 && value <= ADDITIONAL_TREASURE_BOX_LIMIT);
  if (rawSlots.length) return [...new Set(rawSlots)].sort((a, b) => a - b);
  const level = Math.max(0, Math.min(ADDITIONAL_TREASURE_BOX_LIMIT, Number(state?.additionalTreasureBoxLevel || 0)));
  return Array.from({ length: level }, (_, index) => index + 1);
}

function parseEnabledTeams(value) {
  return String(value || "")
    .split(",")
    .map(teamId => teamId.trim())
    .filter(Boolean);
}

function applyAdditionalTreasureBoxes(state) {
  if (!hasCheckedIn()) return;
  let awardedCount = 0;
  parseEnabledSlots(state).forEach(slot => {
    if (awardAdditionalTreasureBox(slot)) {
      awardedCount += 1;
    }
  });
  const saved = getSavedPlayer();
  const laggingTeams = parseEnabledTeams(state?.laggingTreasureBoxTeams);
  if (saved?.teamId && laggingTeams.includes(saved.teamId) && awardLaggingTreasureBox(saved.teamId)) {
    awardedCount += 1;
  }
  if (awardedCount > 0) {
    inventoryNotice.hidden = false;
    updateAnswerPageNotice();
  }
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
  const finalizing = latestPublicGameState?.status === "finalizing_countdown" || lastGameStatus === "finalizing_countdown";
  if (finalizing) {
    const endsAt = Date.parse(latestPublicGameState?.finalItemUseEndsAt || "");
    if (Number.isFinite(endsAt) && Date.now() > endsAt) {
      return { isOpen: false, questionId: "", closesAt: "" };
    }
  }
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
    const finalizing = latestPublicGameState?.status === "finalizing_countdown" || lastGameStatus === "finalizing_countdown";
    const endsAt = Date.parse(latestPublicGameState?.finalItemUseEndsAt || "");
    if (finalizing && Number.isFinite(endsAt)) {
      itemUseCountdown.textContent = `最後道具使用倒數 ${formatRemainingTime(endsAt - Date.now())}，請立即使用。`;
      return;
    }
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
  if (latestPublicGameState?.status === "finalizing_countdown" || lastGameStatus === "finalizing_countdown") {
    itemUseCountdown.textContent = "最後道具使用時間已結束，講師正在結算成績。";
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
  checkinSubmitButton.hidden = allowFreeTeamChoice;
  checkinSubmitButton.disabled = allowFreeTeamChoice || checkinSubmitButton.disabled;
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
  playerTeam.dataset.teamId = player.teamId || "";
  gameView.dataset.teamId = player.teamId || "";
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
    scoreStripLabels[2].textContent = "\u500b\u4eba\u7a4d\u5206";
  }
}

function updateScoreSummary(summary) {
  const answerScore = Math.ceil(Number(summary.answerScore || 0));
  const itemScore = Math.ceil(Number(summary.itemScore || 0));
  const totalScore = Math.ceil(Number(summary.playerScore ?? (answerScore + itemScore)));
  playerScore.textContent = `${totalScore}\u5206`;
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
  answerDialogQuestion.textContent = question.title || question.text || "請選擇答案。";
  answerDialogOptions.replaceChildren();
  (question.options || []).forEach((option, index) => {
    const optionId = option.id || String.fromCharCode(65 + index);
    const optionText = option.text || String(option);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.dataset.optionId = optionId;
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

function showSubmittedMissionState(question) {
  if (questionTitle) questionTitle.textContent = `${getQuestionDisplayName(question?.questionId || currentQuestionId)} 已提交`;
  questionText.textContent = "防線已部署，等待講師公布結果。";
  optionList.replaceChildren();
  closeAnswerDialog();
  if (selectedAnswerSummary) selectedAnswerSummary.hidden = true;
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
    questionText.textContent = "";
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
    showSubmittedMissionState(question);
    updateSyncStatus("答案已送出，等待講師關題。");
    countdownText.textContent = "已送出";
    return;
  }

  if (shouldOpenDialog) {
    openAnswerDialog(question);
  } else {
    closeAnswerDialog();
  }
  startCountdown(answerTimeLimitSeconds);
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
  const safeTotal = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : answerTimeLimitSeconds;
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

function markSelectedAnswer(answer, state = "selected") {
  const selector = `button[data-option-id="${CSS.escape(String(answer))}"]`;
  [...optionList.querySelectorAll(".option-button"), ...answerDialogOptions.querySelectorAll(".option-button")].forEach(item => {
    const isSelected = item.matches(selector);
    item.classList.toggle("is-selected", isSelected);
    item.classList.toggle("is-submitted", isSelected && state === "submitted");
  });
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

  rows.slice(0, 5).forEach((row, index) => {
    const item = document.createElement("li");
    const teamName = teamNames[row.teamId] || row.teamId || "未分隊";
    const icon = createAssetIcon(teamRankIconImages[index] || teamRankIconImages[4], "rank-list-icon", `第 ${index + 1} 名`);
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    const totalScore = Number(row.finalScore || row.totalScore || 0);
    name.textContent = teamName;
    meta.textContent = `${Math.ceil(totalScore)} 分`;
    item.append(icon, name, meta);
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

  rows.slice(0, 5).forEach((row, index) => {
    const item = document.createElement("li");
    const teamName = teamNames[row.teamId] || row.teamId || "未分隊";
    const icon = createAssetIcon(playerRankIconImages[index] || playerRankIconImages[4], "rank-list-icon", `第 ${index + 1} 名`);
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    name.textContent = row.nickname || "學員";
    meta.textContent = `${Number(row.score || 0)} 分｜${teamName}`;
    item.append(icon, name, meta);
    playerLeaderboard.append(item);
  });
}

async function refreshLeaderboards() {
  if (!hasCheckedIn()) return;

  refreshLeaderboardsButton.disabled = true;
  leaderboardStatus.hidden = false;
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
          answerScore: Number(selfRow.answerScore || 0),
          itemScore: Number(selfRow.itemScore || 0),
          totalResponseSeconds: Number(selfRow.totalResponseSeconds || saved.totalResponseSeconds || 0),
          updatedAt: snapshot.updatedAt || new Date().toISOString()
        });
        updateLocalScoreSummary(snapshot.updatedAt || "");
      }
      const updatedAt = snapshot.updatedAt
        ? new Date(snapshot.updatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
        : "尚未標記";
      leaderboardStatus.textContent = "";
      leaderboardStatus.hidden = true;
      return;
    }
    renderTeamLeaderboard([]);
    renderPlayerLeaderboard([]);
    leaderboardStatus.textContent = "";
    leaderboardStatus.hidden = true;
  } catch (error) {
    leaderboardStatus.hidden = false;
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
  inventoryStatus.textContent = "";
  updateAnswerPageNotice();
  renderItemUseLog();
}

function createPixelIcon(className, label = "") {
  const icon = document.createElement("span");
  icon.className = `pixel-icon ${className}`;
  icon.setAttribute("aria-hidden", "true");
  if (label) icon.title = label;
  return icon;
}

function createAssetIcon(src, className, label = "") {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = label;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function getAchievementIconClass(row) {
  if (row.achievementId === "perfect_personal" || row.type === "perfect") return "icon-trophy";
  if (row.type === "correctStreak") return "icon-star";
  if (row.type === "itemUse") return "icon-card";
  return "icon-check-double";
}

function getAchievementGlyph(row) {
  if (row.achievementId === "perfect_personal" || row.type === "perfect") return "全";
  if (row.type === "correctStreak") return "連";
  if (row.type === "itemUse") return "道";
  return "答";
}

function getAchievementIconImage(row) {
  if (row.achievementId && achievementIconImages[row.achievementId]) return achievementIconImages[row.achievementId];
  if (row.type === "correctStreak") return row.target >= 5 ? achievementIconImages.streak_5 : achievementIconImages.streak_3;
  if (row.type === "itemUse") return achievementIconImages.item_use_3;
  if (row.type === "perfect") return achievementIconImages.perfect_personal;
  if (row.target >= 10) return achievementIconImages.correct_10;
  if (row.target >= 5) return achievementIconImages.correct_5;
  return achievementIconImages.correct_3;
}

function renderAchievements(result) {
  const rows = result?.achievements || [];
  const hasClaimable = rows.some(row => row.claimable);
  achievementList.replaceChildren();
  achievementNotice.hidden = !hasClaimable;

  if (!rows.length) {
    achievementList.append(createEmptyInventoryItem("目前沒有成就資料。"));
    achievementStatus.textContent = "";
    return;
  }

  rows.forEach(row => {
    const item = document.createElement("article");
    item.className = `inventory-item achievement-item ${row.rewarded ? "is-rewarded" : row.claimable ? "is-claimable" : row.completed ? "is-complete" : "is-progress"}`;
    const icon = createAssetIcon(getAchievementIconImage(row), "achievement-icon", row.title || "成就");
    const body = document.createElement("div");
    body.className = "achievement-copy";
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = row.title || "成就";
    const progressText = row.type === "perfect" || row.achievementId === "perfect_personal"
      ? row.completed ? "已達成" : "尚未達成"
      : `進度 ${row.current || 0} / ${row.target || 0}`;
    meta.textContent = `${row.description || ""} ${progressText}${row.rewarded ? "，已領取" : ""}`;
    body.append(title, meta);
    if (row.claimable) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "secondary-action compact-action";
      action.textContent = "領取";
      action.addEventListener("click", () => claimAchievement(row.achievementId));
      item.append(icon, body, action);
    } else {
      const badge = document.createElement("span");
      badge.className = row.rewarded ? "achievement-badge is-rewarded" : row.completed ? "achievement-badge is-complete" : "achievement-badge";
      badge.textContent = row.rewarded ? "已領取" : row.completed ? "完成" : "進行中";
      item.append(icon, body, badge);
    }
    achievementList.append(item);
  });

  achievementStatus.textContent = "";
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
  if (utilityTitle) {
    utilityTitle.textContent = panelName === "achievement" ? "成就" : "寶箱";
  }
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
    row.className = "inventory-item inventory-item--box is-unopened";
    const icon = createAssetIcon(itemIconImages.closed_box, "inventory-icon", "寶箱");

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
    action.addEventListener("click", () => {
      row.classList.add("is-opening");
      openBox(box);
    });

    row.append(icon, body, action);
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
    row.className = `inventory-item inventory-item--item item-type-${normalizeItemTypeClass(item.itemType)} is-${item.status || "available"}`;
    const iconSrc = itemIconImages[item.itemType] || itemIconImages.empty;
    const icon = createAssetIcon(iconSrc, "inventory-icon", item.itemLabel || "道具");

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const scoreBadge = document.createElement("span");
    scoreBadge.className = "item-score-badge";
    title.textContent = item.itemLabel || item.itemType || "道具";
    meta.textContent = itemDescriptions[item.itemType] || "";
    scoreBadge.textContent = getItemScoreBadge(item.itemType, Number(item.effectScore || localItemEffects[item.itemType] || 0), item);
    body.append(title, meta);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "secondary-action compact-action";
    action.textContent = getItemActionText(item);
    action.dataset.itemId = item.itemId;
    action.disabled = !canUseItem(item);
    action.addEventListener("click", () => useInventoryItem(item));

    row.append(icon, body, scoreBadge, action);
    itemList.append(row);
  });
}

function createEmptyInventoryItem(text) {
  const row = document.createElement("article");
  row.className = "inventory-item is-empty";
  row.textContent = text;
  return row;
}

function normalizeItemTypeClass(itemType) {
  return String(itemType || "unknown").replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
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
    return "已指定";
  }
  const statusText = {
    available: "",
    armed: "已指定",
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
      inventoryStatus.textContent = "";
      inventoryStatus.hidden = true;
      inventoryStatus.classList.remove("treasure-open-message");
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

  showInventoryMessage("寶箱已開啟。");
  const targetButton = findBoxButton(boxId);
  if (targetButton) {
    targetButton.disabled = true;
  }
  const inventory = getLocalInventory();
  const targetBox = inventory.boxes.find(row => row.boxId === boxId);
  if (!targetBox || targetBox.status !== "unopened") {
    showInventoryMessage("這個寶箱已開啟或不存在。");
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
  } else if (itemType === "empty") {
    appendLocalItemUseLog({
      itemId: `empty_box_${hashStringToUint32([boxId, "empty", targetBox.openedAt].join(":")).toString(36)}`,
      itemType: "empty",
      itemLabel: getItemLabel("empty"),
      effectScore: 0,
      noEffect: true,
      usedAfterQuestionId: currentQuestionId || lastClosedQuestionId || "",
      sourceBoxId: boxId
    });
  }
  saveLocalInventory(inventory);
  cachedInventory = inventory;
  renderInventory(inventory);
  showInventoryMessage(
    itemType === "empty"
      ? pickEmptyTreasureMessage()
      : itemType === "special"
        ? "已開啟幸運箱，將於最終結算確認幸運獎。"
        : `恭喜獲得：${getItemLabel(itemType)}！`,
    itemType === "empty"
  );

  updateAnswerPageNotice();

  if (isLuckyBox || itemType === "special") {
    try {
      await callGameApi("recordLuckyBoxOpened", {
        playerId: saved.playerId,
        boxId,
        openedAt: new Date().toISOString()
      });
    } catch (recordError) {
      showInventoryMessage("幸運箱已開啟。");
      console.warn("Lucky box open record failed.", recordError);
    }
  }
}

function removeBoxFromLocalList(boxId) {
  const button = findBoxButton(boxId);
  const row = button?.closest(".inventory-item");
  if (row) {
    row.classList.remove("is-opening");
    row.classList.add("is-opened");
    setTimeout(() => row.remove(), 180);
  }
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

function showInventoryMessage(message, emphasis = false) {
  if (!inventoryStatus) return;
  inventoryStatus.hidden = false;
  inventoryStatus.textContent = message;
  inventoryStatus.classList.toggle("treasure-open-message", emphasis);
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
    const windowState = getItemUseWindow();
    const noEffect = item.itemType === "double" && !hasQuestionAfter(windowState.questionId);
    await sendItemUseNow({
      playerId: saved.playerId,
      teamId: saved.teamId,
      itemId: item.itemId,
      itemType: item.itemType,
      noEffect
    });
    const immediateApplied = ["score_1", "score_3", "score_5", "score_10"].includes(item.itemType);
    inventoryStatus.textContent = noEffect
      ? "加倍卡已送出；因為已經沒有下一題，本次不會加分。"
      : immediateApplied
        ? "道具已送出，分數已先套用，稍後完成確認。"
        : "道具已送出，會在下一次關題計分時套用。";
    markItemPending(item.itemId, noEffect);
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
  challengeStatus.textContent = "抽 0 到 9。0-4 小，5-9 大。不猜 +3 分。";
  challengeTeamGrid.replaceChildren();
  [
    { choice: "big", label: "猜大", description: "5-9：+10 分", image: challengeChoiceImages.big },
    { choice: "small", label: "猜小", description: "0-4：+10 分", image: challengeChoiceImages.small },
    { choice: "skip", label: "不猜", description: "直接 +3 分", image: challengeChoiceImages.skip }
  ].forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `team-choice-card challenge-choice-card choice-${option.choice}`;
    button.dataset.challengeChoice = option.choice;
    button.append(createAssetIcon(option.image, "challenge-choice-icon", option.label), document.createElement("strong"), document.createElement("small"));
    button.querySelector("strong").textContent = option.label;
    button.querySelector("small").textContent = option.description;
    challengeTeamGrid.append(button);
  });
}

function closeChallengeDialog() {
  pendingChallengeItem = null;
  pendingChallengeResult = null;
  window.clearTimeout(challengeRevealTimer);
  challengeRevealTimer = null;
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
  challengeStatus.textContent = "正在抽號碼...";
  renderChallengeRolling(result.challengeNumber);
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
    if (challengeTitle) challengeTitle.textContent = "挑戰卡抽號";
    challengeStatus.textContent = `抽到 ${result.challengeNumber} 號。點擊揭曉，或等 5 秒。`;
    renderChallengeRevealPrompt(result);
    pendingChallengeItem = null;
  } catch (error) {
    challengeStatus.textContent = `挑戰卡使用失敗：${error.message}`;
  }
}

function renderChallengeRolling(finalNumber) {
  challengeTeamGrid.replaceChildren();
  const roller = document.createElement("section");
  roller.className = "challenge-number-roller";
  for (let number = 0; number <= 9; number += 1) {
    const card = document.createElement("span");
    card.className = "challenge-number-card";
    card.dataset.number = String(number);
    const image = createAssetIcon(`./assets/images/challenge/challenge-number-${number}.png`, "challenge-number-image", `${number} 號`);
    card.append(image);
    if (number === Number(finalNumber)) card.classList.add("is-final");
    roller.append(card);
  }
  challengeTeamGrid.append(roller);
}

function renderChallengeRevealPrompt(result) {
  window.clearTimeout(challengeRevealTimer);
  pendingChallengeResult = result;
  renderChallengeRolling(result.challengeNumber);
  const revealButton = document.createElement("button");
  revealButton.type = "button";
  revealButton.className = "primary-action challenge-reveal-action";
  revealButton.dataset.challengeReveal = "result";
  revealButton.textContent = "揭曉結果";
  challengeTeamGrid.append(revealButton);
  challengeRevealTimer = window.setTimeout(() => {
    renderChallengeResult(result);
  }, 5000);
}

function renderChallengeResult(result) {
  window.clearTimeout(challengeRevealTimer);
  challengeRevealTimer = null;
  pendingChallengeResult = null;
  challengeTeamGrid.replaceChildren();
  const resultCard = document.createElement("article");
  const resultClass = result.effectScore >= 10 ? "is-success" : result.effectScore > 0 ? "is-skip" : "is-miss";
  const title = result.effectScore >= 10 ? "挑戰成功" : result.effectScore > 0 ? "放棄猜測" : "挑戰失敗";
  const resultImage = result.effectScore >= 10 ? challengeResultImages.success : result.effectScore > 0 ? challengeResultImages.skip : challengeResultImages.miss;
  resultCard.className = `challenge-result-card ${resultClass}`;
  resultCard.append(createAssetIcon(resultImage, "challenge-result-icon", title), document.createElement("strong"), document.createElement("span"), document.createElement("span"));
  resultCard.querySelector("strong").textContent = title;
  const spans = resultCard.querySelectorAll("span:not(.pixel-icon)");
  spans[0].textContent = `抽到 ${result.challengeNumber} 號`;
  spans[1].textContent = `獲得 ${result.effectScore} 分`;
  challengeTeamGrid.append(resultCard);
}

function markItemPending(itemId, noEffect = false) {
  markLocalInventoryItemUsed(itemId, "used");
  const button = findItemButton(itemId);
  const row = button?.closest(".inventory-item");
  if (!row) return;
  const meta = row.querySelector("span");
  if (meta) {
    meta.textContent = noEffect ? "已使用，本次沒有加分。" : "已使用，下一題套用。";
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
  const confirmed = await showGameConfirm("放棄後本題不會送出創作內容。", {
    title: "放棄創作？",
    confirmText: "放棄",
    cancelText: "返回"
  });
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
  finalResultPanel.classList.add("final-result-panel");
  finalResultStatus.textContent = "正在讀取最終結果...";
  try {
    const result = await callGameApi("getFinalResults", {
      playerId: saved.playerId
    });
    const teamRank = result.teamRank ? `戰隊第 ${result.teamRank} 名` : "戰隊排名未產生";
    const playerRank = result.playerRank ? `個人第 ${result.playerRank} 名` : "個人排名未產生";
    const finalPlayerScore = Math.ceil(Number(result.playerScore || saved.playerScore || saved.score || 0));
    const finalTeamScore = Math.ceil(Number(result.teamScore || 0));
    const luckyAwards = (result.awards || []).filter(row => getAwardType(row) === "lucky");
    const awardText = luckyAwards.length ? "獲得幸運獎，請聽候講師唱名。" : "請保留畫面，等待講師公布。";
    finalResultStatus.textContent = [
      `任務結算完成。${teamRank}，戰隊 ${finalTeamScore} 分。${playerRank}，個人 ${finalPlayerScore} 分。`,
      awardText
    ].filter(Boolean).join(" ");
    finalResultStatus.className = luckyAwards.length ? "answer-result is-correct" : "sync-status";
    savePlayer({
      ...saved,
      score: finalPlayerScore,
      playerScore: finalPlayerScore,
      updatedAt: result.updatedAt || new Date().toISOString()
    });
    updateLocalScoreSummary(result.updatedAt || "");
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
  if ((status === "draft" || status === "created") && stateSession && savedSession === stateSession) {
    return false;
  }
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
  applyAdditionalTreasureBoxes(state);
  updateTeamChoiceVisibility(state);
  const status = state.status || "";
  const questionId = state.currentQuestionId || "";
  if (answerQuestionPanel) {
    answerQuestionPanel.hidden = status === "finalized";
  }

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
    updateSyncStatus("");
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
    updateSyncStatus("競賽已結算。");
    if (!finalResultsLoaded) {
      finalResultsLoaded = true;
      refreshFinalResults();
    }
    return;
  }

  if (status === "finalizing_countdown") {
    stopCountdown();
    disableOptions();
    lastGameStatus = status;
    updateItemUseCountdown();
    updateSyncStatus("最後道具使用倒數中。");
    return;
  }

  if (status === "created" && !lastFirebaseQuestionId) {
    updateSyncStatus("請等待講師開題。");
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
      updateSyncStatus("請等待講師開題。");
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
      updateSyncStatus("請等待講師開題。");
    }
  } catch (error) {
    if (hasCheckedIn() && !currentQuestion) {
      updateSyncStatus("請等待講師開題。");
    }
  }
}

async function refreshPublicGameState() {
  try {
    const state = await getPublicGameState();
    renderPublicGameState(state);
  } catch (error) {
    if (hasCheckedIn() && !currentQuestion) {
      updateSyncStatus("請等待講師開題。");
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
  updateSyncStatus("請等待講師開題。");
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
      answerScore: Number(result.answerScore ?? getLocalAnswerScore()),
      itemScore: Number(result.itemScore ?? getLocalItemScore()),
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
  questionText.textContent = "正在確認題目...";
  answerResult.textContent = "";
  updateSyncStatus("正在確認題目。");

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
      updateSyncStatus("正在確認題目。");
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

  const confirmed = await showGameConfirm("送出後就不能更改，請確認你的選擇。", {
    title: "送出答案？",
    confirmText: "送出",
    cancelText: "再想一下"
  });
  if (!confirmed) {
    return;
  }

  markSelectedAnswer(answer, "submitted");
  stopCountdown();
  disableOptions();
  answeredQuestionId = currentQuestion.questionId;
  closeAnswerDialog();
  answerResult.textContent = "答案已送出，等待講師關題。";
  answerResult.className = "answer-result is-pending";
  updateSyncStatus("答案已送出，等待講師關題。");
  const responseSeconds = normalizeResponseSeconds(Math.max(0, Math.floor((Date.now() - questionOpenedAtMs) / 1000)));
  updateSelectedAnswerSummary(answer, responseSeconds);
  showSubmittedMissionState(currentQuestion);
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
    let submissionResult = staticQuestionResult;
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
      console.warn("Answer submit failed.", firebaseError);
      throw firebaseError;
    }
    recordLocalAnswer(currentQuestion, answer, submissionResult, responseSeconds);
    if (perfectAwardCandidate) {
      callGameApi("recordPerfectAwardCandidate", {
        playerId: saved.playerId,
        finalQuestionId: currentQuestion.questionId,
        completedAt: new Date().toISOString()
      }).catch(recordError => {
        console.warn("Perfect award candidate record failed.", recordError);
      });
    }
    if (submissionResult?.isCorrect === true) {
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
    answerResult.textContent = "送出失敗，請確認網路後再次送出。";
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
      ? "請輸入暱稱後直接選擇戰隊。"
      : "請輸入暱稱後完成報到，系統會自動分隊。";
    checkinSubmitButton.disabled = allowFreeTeamChoice;
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
  updateSyncStatus("已完成報到，請等待講師開題。");
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
      checkinStatus.textContent = "請直接點選戰隊完成報到。";
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
    item.setAttribute("aria-pressed", item === button ? "true" : "false");
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
  const revealButton = event.target.closest("button[data-challenge-reveal]");
  if (revealButton && pendingChallengeResult) {
    renderChallengeResult(pendingChallengeResult);
    return;
  }
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
initializeLoadingStateObserver();
initTeamChoiceMode();
restoreCheckin();

function initializeLoadingStateObserver() {
  const loadingPattern = /(正在|讀取|等待|確認|送出|結算|同步|稍候)/;
  const targets = [
    checkinStatus,
    syncStatus,
    inventoryStatus,
    achievementStatus,
    leaderboardStatus,
    challengeStatus,
    finalResultStatus,
    answerItemUseCountdown,
    answerPageNotice
  ].filter(Boolean);
  const update = node => {
    node.classList.toggle("is-loading", loadingPattern.test(node.textContent || ""));
  };
  targets.forEach(node => {
    update(node);
    new MutationObserver(() => update(node)).observe(node, { childList: true, subtree: true, characterData: true });
  });
}
