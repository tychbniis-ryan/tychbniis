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
  "1. 講師端按「啟動場次」。",
  "2. 學員端完成報到。",
  "3. 講師端輸入題目 ID 並按「開放題目」。",
  "4. 學員端依口令按「翻開試卷」。",
  "5. 學員端選擇答案並送出。",
  "6. 講師端按「關題並計分」。",
  "7. 講師端讀取排行榜確認分數。"
];

function getAdminSecret() {
  return sessionStorage.getItem("vaccineGameAdminSecret") || "";
}

function updateBackendStatus() {
  const config = getConfig();
  modeBadge.textContent = config.apiMode === "gas" ? "GAS 後端" : "示範模式";
  gasWebAppUrl.value = config.gasWebAppUrl;
  backendStatus.textContent = config.apiMode === "gas"
    ? "已設定 GAS Web App URL。管理密鑰只保存在本機瀏覽器工作階段。"
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
    item.innerHTML = `
      <strong>${row.teamId || "未分隊"}</strong>
      <span>人數：${row.playerCount || 0}</span>
      <span>總分：${row.totalScore || 0}</span>
      <span>平均：${Number(row.averageScore || 0).toFixed(1)}</span>
    `;
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
