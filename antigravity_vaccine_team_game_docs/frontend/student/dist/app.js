import { callGameApi, getConfig, getPublicGameState, getPublicQuestion, getPublicQuestions } from "./api.js?v=0.2.7";

const checkinView = document.querySelector("#checkinView");
const gameView = document.querySelector("#gameView");
const form = document.querySelector("#checkinForm");
const nicknameInput = document.querySelector("#nickname");
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

const teamNames = {
  team_1: "第 1 隊",
  team_2: "第 2 隊",
  team_3: "第 3 隊",
  team_4: "第 4 隊",
  team_5: "第 5 隊"
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

function updateSyncStatus(message) {
  syncStatus.textContent = message;
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

function hasCheckedIn() {
  const saved = getSavedPlayer();
  return Boolean(saved && saved.playerId);
}

function renderPublicGameState(state) {
  if (!state || !hasCheckedIn()) {
    return;
  }

  latestPublicGameState = state;
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
      teamScore: result.teamScore || 0,
      updatedAt: result.updatedAt || new Date().toISOString()
    };
    savePlayer(updatedPlayer);
    updateScoreSummary(updatedPlayer);

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

  try {
    await callGameApi("submitAnswer", {
      playerId: saved.playerId,
      questionId: currentQuestion.questionId,
      answer: [answer]
    });

    stopCountdown();
    disableOptions();
    answeredQuestionId = currentQuestion.questionId;
    answerResult.textContent = "答案已送出。為避免互相提示，分數會在講師關題後公布。";
    answerResult.className = "answer-result is-pending";
    updateSyncStatus("答案已送出，請等待講師關題計分。");
  } catch (error) {
    questionText.textContent = error.message;
  }
}

function restoreCheckin() {
  const saved = getSavedPlayer();
  if (!saved) return;

  nicknameInput.value = saved.nickname;
  teamSelect.value = saved.teamId;
  showGameView(saved);
  updateSyncStatus("已讀取本機報到資料，請等待講師開題。");
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const nickname = nicknameInput.value.trim();
  const requestedTeamId = teamSelect.value;
  checkinStatus.textContent = "正在報到...";

  try {
    const joined = await callGameApi("joinGame", {
      nickname,
      teamId: requestedTeamId
    });
    const player = {
      playerId: joined.playerId,
      gameId: joined.gameId,
      nickname: joined.nickname || nickname,
      teamId: joined.teamId,
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

resetClientCacheIfVersionChanged();
updateConnectionStatus();
restoreCheckin();
