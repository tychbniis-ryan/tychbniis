import { callGameApi, getConfig, saveGasUrl } from "./api.js";

const gameStatus = document.querySelector("#gameStatus");
const questionStatus = document.querySelector("#questionStatus");
const checklist = document.querySelector("#checklist");
const modeBadge = document.querySelector("#modeBadge");
const backendForm = document.querySelector("#backendForm");
const backendStatus = document.querySelector("#backendStatus");
const gasWebAppUrl = document.querySelector("#gasWebAppUrl");
const adminSecret = document.querySelector("#adminSecret");
const questionIdInput = document.querySelector("#questionId");
const refreshScoreboardButton = document.querySelector("#refreshScoreboard");
const scoreboardStatus = document.querySelector("#scoreboardStatus");
const scoreboardList = document.querySelector("#scoreboardList");

const checklistItems = [
  "1. 輸入管理密碼並套用設定。",
  "2. 正式活動前按「初始化遊戲資料」，清空測試報到、作答與排行榜。",
  "3. 按「啟動場次」。",
  "4. 等學員完成報到。",
  "5. 輸入題目 ID，按「開放題目」。",
  "6. 請學員按「翻開試卷」並作答。",
  "7. 按「關題並計分」。",
  "8. 讀取排行榜確認分數。"
];

function getAdminSecret() {
  return sessionStorage.getItem("vaccineGameAdminSecret") || "";
}

function updateBackendStatus() {
  const config = getConfig();
  modeBadge.textContent = config.apiMode === "gas" ? "GAS 後端" : "示範模式";
  gasWebAppUrl.value = config.gasWebAppUrl;
  backendStatus.textContent = config.apiMode === "gas"
    ? "已設定 GAS Web App URL。管理密碼只保存在本機瀏覽器工作階段。"
    : "尚未設定 GAS Web App URL，系統使用示範模式。";
}

function renderScoreboard(rows) {
  scoreboardList.replaceChildren();

  if (!rows || rows.length === 0) {
    scoreboardStatus.textContent = "目前尚無排行榜資料。";
    return;
  }

  scoreboardStatus.textContent = `已讀取 ${rows.length} 筆排行榜資料。`;
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
  saveGasUrl(gasWebAppUrl.value);
  sessionStorage.setItem("vaccineGameAdminSecret", adminSecret.value);
  updateBackendStatus();
});

document.querySelector("#startGame").addEventListener("click", async () => {
  try {
    const result = await callGameApi("createGame", {}, { adminSecret: getAdminSecret() });
    gameStatus.textContent = result.status === "created" || result.status === "draft"
      ? "場次已啟動"
      : result.status || "場次已啟動";
  } catch (error) {
    gameStatus.textContent = error.message;
  }
});

document.querySelector("#resetGameData").addEventListener("click", async () => {
  try {
    const confirmed = window.confirm("初始化會清空玩家、作答、翻卷紀錄與排行榜，但會保留題庫與戰隊設定。確定要執行嗎？");
    if (!confirmed) return;

    const result = await callGameApi("resetGameData", {}, { adminSecret: getAdminSecret() });
    gameStatus.textContent = result.message || "遊戲資料已初始化。";
    questionStatus.textContent = "尚未開題。";
    renderScoreboard([]);
  } catch (error) {
    gameStatus.textContent = error.message;
  }
});

document.querySelector("#openQuestion").addEventListener("click", async () => {
  try {
    const result = await callGameApi("openQuestion", {
      questionId: questionIdInput.value.trim()
    }, { adminSecret: getAdminSecret() });
    questionStatus.textContent = `已開放題目：${result.questionId}`;
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

document.querySelector("#closeQuestion").addEventListener("click", async () => {
  try {
    const result = await callGameApi("closeAndScoreQuestion", {
      questionId: questionIdInput.value.trim()
    }, { adminSecret: getAdminSecret() });
    questionStatus.textContent = `已關題並計分，處理 ${result.scoredCount || 0} 筆作答。`;
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

refreshScoreboardButton.addEventListener("click", refreshScoreboard);

checklistItems.forEach(text => {
  const item = document.createElement("li");
  item.textContent = text;
  checklist.append(item);
});

updateBackendStatus();
