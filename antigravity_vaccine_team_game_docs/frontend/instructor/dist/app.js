import { callGameApi, clearLegacyGasUrl, getConfig, getPublicQuestions } from "./api.js?v=0.2.6";

const gameStatus = document.querySelector("#gameStatus");
const questionStatus = document.querySelector("#questionStatus");
const checklist = document.querySelector("#checklist");
const modeBadge = document.querySelector("#modeBadge");
const backendForm = document.querySelector("#backendForm");
const backendStatus = document.querySelector("#backendStatus");
const adminSecret = document.querySelector("#adminSecret");
const questionSelect = document.querySelector("#questionSelect");
const refreshQuestionsButton = document.querySelector("#refreshQuestions");
const refreshScoreboardButton = document.querySelector("#refreshScoreboard");
const scoreboardStatus = document.querySelector("#scoreboardStatus");
const scoreboardList = document.querySelector("#scoreboardList");

const fallbackQuestions = [
  { questionId: "demo_q001", order: 1, title: "示範題 1" },
  { questionId: "demo_q002", order: 2, title: "示範題 2" },
  { questionId: "demo_q003", order: 3, title: "示範題 3" }
];

const checklistItems = [
  "1. 輸入管理密碼並套用設定。",
  "2. 正式活動前先初始化遊戲資料，清除測試報到與作答紀錄。",
  "3. 啟動場次。",
  "4. 從題目清單選擇要開放的題目。",
  "5. 按「開放題目」後，再用口令請學員翻開試卷。",
  "6. 學員作答完成後，按「關閉題目並計分」。",
  "7. 讀取排行榜，確認戰隊分數。"
];

function getAdminSecret() {
  return sessionStorage.getItem("vaccineGameAdminSecret") || "";
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
    questionSelect.append(option);
  });

  questionStatus.textContent = rows.length
    ? `已載入 ${rows.length} 題，請從清單選題。`
    : "尚未讀到 Firebase 公開題庫，已先載入示範題清單。";
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

function renderScoreboard(rows) {
  scoreboardList.replaceChildren();

  if (!rows || rows.length === 0) {
    scoreboardStatus.textContent = "目前沒有排行榜資料。";
    return;
  }

  scoreboardStatus.textContent = `已讀取 ${rows.length} 筆戰隊成績。`;
  rows.forEach(row => {
    const item = document.createElement("div");
    item.className = "scoreboard-item";

    const team = document.createElement("strong");
    team.textContent = row.teamId || "未分隊";

    const playerCount = document.createElement("span");
    playerCount.textContent = `人數：${row.playerCount || 0}`;

    const totalScore = document.createElement("span");
    totalScore.textContent = `總分：${row.totalScore || 0}`;

    const averageScore = document.createElement("span");
    averageScore.textContent = `平均：${Number(row.averageScore || 0).toFixed(1)}`;

    item.append(team, playerCount, totalScore, averageScore);
    scoreboardList.append(item);
  });
}

backendForm.addEventListener("submit", event => {
  event.preventDefault();
  clearLegacyGasUrl();
  sessionStorage.setItem("vaccineGameAdminSecret", adminSecret.value);
  backendStatus.textContent = "講師已完成設定。管理密碼只保存在本機瀏覽器工作階段。";
});

document.querySelector("#startGame").addEventListener("click", async () => {
  try {
    const result = await callGameApi("createGame", {}, { adminSecret: getAdminSecret() });
    gameStatus.textContent = result.status === "created" || result.status === "draft"
      ? "場次已啟動"
      : result.status || "場次已啟動";
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
    renderScoreboard([]);
    await loadQuestionOptions();
  } catch (error) {
    gameStatus.textContent = error.message;
  }
});

document.querySelector("#openQuestion").addEventListener("click", async () => {
  try {
    const questionId = questionSelect.value;
    if (!questionId) {
      questionStatus.textContent = "請先選擇題目。";
      return;
    }

    const result = await callGameApi("openQuestion", {
      questionId
    }, { adminSecret: getAdminSecret() });
    questionStatus.textContent = `已開放題目：${result.questionId}`;
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
    await refreshScoreboard();
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

checklistItems.forEach(text => {
  const item = document.createElement("li");
  item.textContent = text;
  checklist.append(item);
});

updateBackendStatus();
loadQuestionOptions();
