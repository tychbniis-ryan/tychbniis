import { callGameApi, getConfig, getPublicGameState } from "./api.js";

const form = document.querySelector("#checkinForm");
const nicknameInput = document.querySelector("#nickname");
const teamSelect = document.querySelector("#teamId");
const playerName = document.querySelector("#playerName");
const playerTeam = document.querySelector("#playerTeam");
const connectionMode = document.querySelector("#connectionMode");
const gameIdText = document.querySelector("#gameIdText");
const questionText = document.querySelector("#questionText");
const optionList = document.querySelector("#optionList");
const refreshQuestionButton = document.querySelector("#refreshQuestion");
const syncStatus = document.querySelector("#syncStatus");

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
let answeredQuestionId = "";
let isRefreshing = false;
let gameStateTimer = null;
let lastFirebaseQuestionId = "";

function updateConnectionStatus() {
  const config = getConfig();
  connectionMode.textContent = config.apiMode === "gas" ? "GAS 後端" : "示範模式";
  gameIdText.textContent = config.gameId;
}

function renderQuestion(question) {
  if (!question) {
    currentQuestion = null;
    currentQuestionId = "";
    answeredQuestionId = "";
    questionText.textContent = "目前尚未開題，請等待講師口令。";
    optionList.replaceChildren();
    return;
  }

  currentQuestion = question;
  currentQuestionId = question.questionId;
  answeredQuestionId = "";
  questionText.textContent = question.title || question.text || "題目內容未設定。";
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

function hasCheckedIn() {
  const saved = getSavedPlayer();
  return Boolean(saved && saved.playerId);
}

function renderPublicGameState(state) {
  if (!state || !hasCheckedIn()) {
    return;
  }

  const status = state.status || "";
  const questionId = state.currentQuestionId || "";

  if (status === "question_open" && questionId && questionId !== currentQuestionId) {
    lastFirebaseQuestionId = questionId;
    updateSyncStatus(`講師已開放 ${questionId}，請按「翻開試卷」。`);
    return;
  }

  if (status === "question_closed" && questionId && questionId === currentQuestionId) {
    updateSyncStatus(`${questionId} 已關題，請等待講師下一個口令。`);
    return;
  }

  if (status === "created" && !lastFirebaseQuestionId) {
    updateSyncStatus("場次已啟動，請等待講師口令。");
  }
}

async function refreshPublicGameState() {
  try {
    const state = await getPublicGameState();
    renderPublicGameState(state);
  } catch (error) {
    if (hasCheckedIn() && !currentQuestion) {
      updateSyncStatus("Firebase 公開狀態暫不可用，仍可依講師口令手動翻開試卷。");
    }
  }
}

function startGameStateWatcher() {
  const config = getConfig();
  if (!config.firebaseDatabaseUrl || gameStateTimer) {
    return;
  }

  refreshPublicGameState();
  gameStateTimer = window.setInterval(refreshPublicGameState, config.firebaseGameStatePollMs);
}

async function refreshQuestion() {
  if (isRefreshing) return;

  isRefreshing = true;
  refreshQuestionButton.disabled = true;
  questionText.textContent = "正在翻開試卷。";
  updateSyncStatus("正在向 GAS 後端確認目前題目。");

  try {
    const saved = getSavedPlayer();
    if (!saved || !saved.playerId) {
      questionText.textContent = "請先完成報到，再翻開試卷。";
      optionList.replaceChildren();
      updateSyncStatus("尚未報到。");
      return;
    }

    const result = await callGameApi("getCurrentQuestion", {
      playerId: saved.playerId
    });

    if (shouldRenderQuestion(result)) {
      renderQuestion(result.question);
    }

    lastGameStatus = result.status || "";
    updateSyncStatus(result.question ? "試卷已翻開，請選擇答案。" : "講師尚未開題，請等待口令。");
  } catch (error) {
    questionText.textContent = error.message;
    optionList.replaceChildren();
    updateSyncStatus("翻開試卷失敗，請依講師指示重試。");
  } finally {
    isRefreshing = false;
    refreshQuestionButton.disabled = false;
  }
}

async function submitAnswer(answer) {
  const saved = getSavedPlayer();
  if (!saved || !saved.playerId) {
    questionText.textContent = "請先完成報到，再作答。";
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

  try {
    await callGameApi("submitAnswer", {
      playerId: saved.playerId,
      questionId: currentQuestion.questionId,
      answer: [answer]
    });

    [...optionList.querySelectorAll("button")].forEach(item => {
      item.disabled = true;
    });
    answeredQuestionId = currentQuestion.questionId;
    questionText.textContent = "答案已送出，請等待講師關題與計分。";
    updateSyncStatus("本題已完成送出。");
  } catch (error) {
    questionText.textContent = error.message;
  }
}

function restoreCheckin() {
  const saved = getSavedPlayer();
  if (!saved) return;

  nicknameInput.value = saved.nickname;
  teamSelect.value = saved.teamId;
  playerName.textContent = saved.nickname;
  playerTeam.textContent = teamNames[saved.teamId] || "自動分隊";
  updateSyncStatus("已讀取上次報到資料，請等待講師口令。");
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const nickname = nicknameInput.value.trim();
  const requestedTeamId = teamSelect.value;

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
      checkedInAt: new Date().toISOString()
    };

    localStorage.setItem("vaccineGamePlayer", JSON.stringify(player));
    playerName.textContent = player.nickname;
    playerTeam.textContent = teamNames[player.teamId] || player.teamId;
    teamSelect.value = player.teamId;
    updateSyncStatus("報到完成，請等待講師口令。");
    refreshPublicGameState();
  } catch (error) {
    playerName.textContent = "報到失敗";
    playerTeam.textContent = error.message;
  }
});

refreshQuestionButton.addEventListener("click", refreshQuestion);

updateConnectionStatus();
restoreCheckin();
startGameStateWatcher();
