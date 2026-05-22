import { callGameApi, clearLegacyGasUrl, getConfig, getPublicQuestions } from "./api.js?v=0.2.11";

const gameStatus = document.querySelector("#gameStatus");
const questionStatus = document.querySelector("#questionStatus");
const checklist = document.querySelector("#checklist");
const modeBadge = document.querySelector("#modeBadge");
const backendPanel = document.querySelector("#backendPanel");
const startPanel = document.querySelector("#startPanel");
const questionPanel = document.querySelector("#questionPanel");
const backendForm = document.querySelector("#backendForm");
const backendStatus = document.querySelector("#backendStatus");
const adminSecret = document.querySelector("#adminSecret");
const allowFreeTeamChoiceInput = document.querySelector("#allowFreeTeamChoice");
const allowFreeTeamChoiceInQuestionInput = document.querySelector("#allowFreeTeamChoiceInQuestion");
const questionSelect = document.querySelector("#questionSelect");
const refreshQuestionsButton = document.querySelector("#refreshQuestions");
const refreshScoreboardButton = document.querySelector("#refreshScoreboard");
const scoreboardStatus = document.querySelector("#scoreboardStatus");
const scoreboardList = document.querySelector("#scoreboardList");
const answerReveal = document.querySelector("#answerReveal");
const resetGameDataInQuestionButton = document.querySelector("#resetGameDataInQuestion");

const fallbackQuestions = [
  { questionId: "demo_q001", order: 1, title: "示範題 1" },
  { questionId: "demo_q002", order: 2, title: "示範題 2" },
  { questionId: "demo_q003", order: 3, title: "示範題 3" }
];

const openedQuestionIds = new Set();
const adminSecretKey = "vaccineGameAdminSecret";
const gameStartedKey = "vaccineGameStarted";
const teamChoiceKey = "vaccineGameAllowFreeTeamChoice";

const checklistItems = [
  "1. 輸入管理密碼並套用設定。",
  "2. 正式活動前先初始化遊戲資料，清除測試報到與作答紀錄。",
  "3. 啟動場次。",
  "4. 從題目清單選擇要開放的題目。",
  "5. 按「開放題目」後，再用口令請學員翻開試卷。",
  "6. 學員作答完成後，按「關閉題目並計分」。",
  "7. 投影畫面會顯示正確答案與排行榜。"
];

function getAdminSecret() {
  return localStorage.getItem(adminSecretKey) || sessionStorage.getItem(adminSecretKey) || "";
}

function isGameStarted() {
  return localStorage.getItem(gameStartedKey) === "true";
}

function setGameStarted(value) {
  localStorage.setItem(gameStartedKey, value ? "true" : "false");
}

function syncTeamChoiceInputs(value) {
  const enabled = Boolean(value);
  allowFreeTeamChoiceInput.checked = enabled;
  allowFreeTeamChoiceInQuestionInput.checked = enabled;
  localStorage.setItem(teamChoiceKey, enabled ? "true" : "false");
}

async function updateTeamChoiceMode(value) {
  syncTeamChoiceInputs(value);
  try {
    await callGameApi("setTeamChoiceMode", {
      allowFreeTeamChoice: Boolean(value)
    }, { adminSecret: getAdminSecret() });
  } catch (error) {
    questionStatus.textContent = error.message;
  }
}

function showPanel(stage) {
  backendPanel.hidden = stage !== "backend";
  startPanel.hidden = stage !== "start";
  questionPanel.hidden = stage !== "question";
}

function syncInitialStage() {
  const savedSecret = getAdminSecret();
  if (savedSecret) {
    adminSecret.value = savedSecret;
    syncTeamChoiceInputs(localStorage.getItem(teamChoiceKey) === "true");
    showPanel(isGameStarted() ? "question" : "start");
    if (isGameStarted()) {
      loadQuestionOptions();
    }
    return;
  }
  showPanel("backend");
}

function updateBackendStatus() {
  const config = getConfig();
  modeBadge.textContent = config.apiMode === "gas" ? "GAS 後端" : "示範模式";
  backendStatus.textContent = config.apiMode === "gas"
    ? "請輸入管理密碼並套用設定。"
    : "目前為示範模式，尚未連接正式 GAS 後端。";
}

function renderQuestionOptions(questions) {
  const rows = Object.values(questions || {})
    .filter(question => question && question.questionId)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const source = rows.length ? rows : fallbackQuestions;

  questionSelect.replaceChildren();
  source.forEach(question => {
    const option = document.createElement("option");
    option.value = question.questionId;
    option.textContent = `${question.order || ""}. ${question.title || question.questionId}`;
    option.disabled = openedQuestionIds.has(question.questionId);
    questionSelect.append(option);
  });

  questionStatus.textContent = rows.length
    ? `已載入 ${rows.length} 題，請從清單選題。`
    : "尚未讀到 Firebase 公開題庫，已先載入示範題清單。";
}

function rememberOpenedQuestionIds(value) {
  String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(questionId => openedQuestionIds.add(questionId));
}

async function loadQuestionOptions() {
  refreshQuestionsButton.disabled = true;
  questionStatus.textContent = "正在讀取題目清單...";

  try {
    const questions = await getPublicQuestions();
    renderQuestionOptions(questions);
  } catch (error) {
    renderQuestionOptions(null);
  } finally {
    refreshQuestionsButton.disabled = false;
  }
}

function renderAnswerReveal(result) {
  const answer = result.correctAnswerText || result.correctAnswer || "未提供答案";
  const explanation = result.explanation ? `\n${result.explanation}` : "";
  answerReveal.textContent = `正確答案：${answer}${explanation}`;
}

function renderScoreboard(rows) {
  scoreboardList.replaceChildren();

  if (!rows || rows.length === 0) {
    scoreboardStatus.textContent = "目前沒有排行榜資料。";
    return;
  }

  scoreboardStatus.textContent = `已讀取 ${rows.length} 筆戰隊成績。`;
  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "scoreboard-item";
    const weightedAverageScore = Number(row.weightedAverageScore || row.averageScore || 0);
    const averageScore = Number(row.averageScore || 0);
    const teamBonusScore = Number(row.teamBonusScore || 0);
    const finalScore = Number(row.finalScore || row.totalScore || 0);
    const effectivePlayerCount = Number(row.effectivePlayerCount || row.playerCount || 0);

    const rank = document.createElement("strong");
    rank.textContent = `第 ${index + 1} 名　${row.teamId || "未分隊"}　排名分 ${weightedAverageScore.toFixed(1)}`;

    const playerCount = document.createElement("span");
    playerCount.textContent = `有效人數：${effectivePlayerCount} / 報到 ${row.playerCount || 0}`;

    const totalScore = document.createElement("span");
    totalScore.textContent = `答題總分：${Number(row.totalScore || 0).toFixed(1)}`;

    const averageScoreNode = document.createElement("span");
    averageScoreNode.textContent = `答題平均：${averageScore.toFixed(1)}`;

    const bonusScore = document.createElement("span");
    bonusScore.textContent = `道具加成：+${teamBonusScore}`;

    const finalScoreNode = document.createElement("span");
    finalScoreNode.textContent = `最終總分：${finalScore.toFixed(1)}`;

    item.append(rank, playerCount, totalScore, averageScoreNode, bonusScore, finalScoreNode);
    scoreboardList.append(item);
  });
}

backendForm.addEventListener("submit", event => {
  event.preventDefault();
  clearLegacyGasUrl();
  localStorage.setItem(adminSecretKey, adminSecret.value);
  sessionStorage.setItem(adminSecretKey, adminSecret.value);
  showPanel(isGameStarted() ? "question" : "start");
  backendStatus.textContent = "講師已完成設定。管理密碼只保存在本機瀏覽器工作階段。";
});

document.querySelector("#startGame").addEventListener("click", async () => {
  try {
    const result = await callGameApi("createGame", {}, { adminSecret: getAdminSecret() });
    if (allowFreeTeamChoiceInput.checked) {
      await updateTeamChoiceMode(true);
    } else {
      syncTeamChoiceInputs(false);
    }
    gameStatus.textContent = result.status === "created" || result.status === "draft"
      ? "場次已啟動"
      : result.status || "場次已啟動";
    answerReveal.textContent = "尚未關題。";
    openedQuestionIds.clear();
    setGameStarted(true);
    showPanel("question");
    await loadQuestionOptions();
  } catch (error) {
    gameStatus.textContent = error.message;
  }
});

document.querySelector("#resetGameData").addEventListener("click", async () => {
  try {
    const confirmed = window.confirm("確定要初始化遊戲資料？這會清除玩家、作答、翻卷與排行榜資料，但保留題庫與戰隊設定。");
    if (!confirmed) return;

    const result = await callGameApi("resetGameData", {}, { adminSecret: getAdminSecret() });
    gameStatus.textContent = result.message || "遊戲資料已初始化。";
    questionStatus.textContent = "尚未開題。";
    answerReveal.textContent = "尚未關題。";
    renderScoreboard([]);
    openedQuestionIds.clear();
    setGameStarted(false);
    showPanel("start");
    await loadQuestionOptions();
  } catch (error) {
    gameStatus.textContent = error.message;
  }
});

resetGameDataInQuestionButton.addEventListener("click", () => {
  document.querySelector("#resetGameData").click();
});

document.querySelector("#openQuestion").addEventListener("click", async () => {
  try {
    const questionId = questionSelect.value;
    if (!questionId) {
      questionStatus.textContent = "請先選擇題目。";
      return;
    }

    if (openedQuestionIds.has(questionId)) {
      questionStatus.textContent = "此題已開放過，請改選其他題目。";
      return;
    }

    const result = await callGameApi("openQuestion", {
      questionId
    }, { adminSecret: getAdminSecret() });
    rememberOpenedQuestionIds(result.openedQuestionIds || result.questionId);
    [...questionSelect.options].forEach(option => {
      option.disabled = openedQuestionIds.has(option.value);
    });
    questionStatus.textContent = `已開放題目：${result.questionId}`;
    answerReveal.textContent = "本題作答中，關題後公布答案。";
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

document.querySelector("#closeQuestion").addEventListener("click", async () => {
  try {
    const questionId = questionSelect.value;
    if (!questionId) {
      questionStatus.textContent = "請先選擇題目。";
      return;
    }

    const result = await callGameApi("closeAndScoreQuestion", {
      questionId
    }, { adminSecret: getAdminSecret() });
    const submittedCount = Number(result.submittedCount ?? result.scoredCount ?? 0);
    const scoredCount = Number(result.scoredCount || 0);
    questionStatus.textContent = `已關題並計分，收到 ${submittedCount} 筆作答，新計分 ${scoredCount} 筆。`;
    renderAnswerReveal(result);
    renderScoreboard(result.scoreboard || []);
    if (!result.scoreboard || result.scoreboard.length === 0) {
      await refreshScoreboard();
    }
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

async function refreshScoreboard() {
  try {
    const result = await callGameApi("getScoreboard", {}, { adminSecret: getAdminSecret() });
    renderScoreboard(result.rows || []);
  } catch (error) {
    scoreboardStatus.textContent = error.message;
    scoreboardList.replaceChildren();
  }
}

refreshQuestionsButton.addEventListener("click", loadQuestionOptions);
refreshScoreboardButton.addEventListener("click", refreshScoreboard);
allowFreeTeamChoiceInput.addEventListener("change", event => updateTeamChoiceMode(event.target.checked));
allowFreeTeamChoiceInQuestionInput.addEventListener("change", event => updateTeamChoiceMode(event.target.checked));

checklistItems.forEach(text => {
  const item = document.createElement("li");
  item.textContent = text;
  checklist.append(item);
});

updateBackendStatus();
syncInitialStage();
