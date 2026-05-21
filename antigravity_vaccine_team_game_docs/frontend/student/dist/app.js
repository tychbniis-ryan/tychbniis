import { callGameApi, getConfig } from "./api.js";

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
    questionText.textContent = "目前尚未開題，請等待講師。";
    optionList.replaceChildren();
    return;
  }

  currentQuestion = question;
  currentQuestionId = question.questionId;
  answeredQuestionId = "";
  questionText.textContent = question.title || question.text || "未命名題目";
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

async function refreshQuestion() {
  if (isRefreshing) return;

  isRefreshing = true;
  refreshQuestionButton.disabled = true;
  questionText.textContent = "正在翻開目前試卷。";
  updateSyncStatus("正在向講師端確認目前題目。");

  try {
    const saved = JSON.parse(localStorage.getItem("vaccineGamePlayer") || "null");
    if (!saved || !saved.playerId) {
      questionText.textContent = "請先完成報到後再翻開試卷。";
      optionList.replaceChildren();
      updateSyncStatus("尚未報到，系統不會開始計時。");
      return;
    }
    const result = await callGameApi("getCurrentQuestion", {
      playerId: saved.playerId
    });
    if (shouldRenderQuestion(result)) {
      renderQuestion(result.question);
    }
    lastGameStatus = result.status || "";
    updateSyncStatus(result.question ? "試卷已翻開，請作答。" : "講師尚未開題，請等待口令後再翻開。");
  } catch (error) {
    questionText.textContent = error.message;
    optionList.replaceChildren();
    updateSyncStatus("翻開試卷失敗，請稍後再試。");
  } finally {
    isRefreshing = false;
    refreshQuestionButton.disabled = false;
  }
}

async function submitAnswer(answer) {
  const saved = JSON.parse(localStorage.getItem("vaccineGamePlayer") || "null");
  if (!saved || !saved.playerId) {
    questionText.textContent = "請先完成報到後再作答。";
    return;
  }
  if (!currentQuestion || !currentQuestion.questionId) {
    questionText.textContent = "目前沒有可作答的題目。";
    return;
  }
  if (answeredQuestionId === currentQuestion.questionId) {
    questionText.textContent = "本題答案已送出，請等待講師下一題。";
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
  } catch (error) {
    questionText.textContent = error.message;
  }
}

function restoreCheckin() {
  const saved = JSON.parse(localStorage.getItem("vaccineGamePlayer") || "null");
  if (!saved) return;

  nicknameInput.value = saved.nickname;
  teamSelect.value = saved.teamId;
  playerName.textContent = saved.nickname;
  playerTeam.textContent = teamNames[saved.teamId] || "自動分隊";
  updateSyncStatus("已報到，請等待講師口令後翻開試卷。");
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
    updateSyncStatus("已報到，請等待講師口令後翻開試卷。");
  } catch (error) {
    playerName.textContent = "報到失敗";
    playerTeam.textContent = error.message;
  }
});

refreshQuestionButton.addEventListener("click", refreshQuestion);

updateConnectionStatus();
restoreCheckin();
