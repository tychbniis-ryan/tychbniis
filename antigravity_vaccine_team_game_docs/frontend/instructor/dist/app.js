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

const items = [
  "Firebase 專案已建立",
  "Authentication 匿名登入已啟用",
  "Firestore 已建立",
  "Realtime Database 已建立",
  "題庫 Google Sheets 已建立",
  "至少完成一次模擬測試"
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

backendForm.addEventListener("submit", event => {
  event.preventDefault();
  saveGasUrl(gasWebAppUrl.value);
  sessionStorage.setItem("vaccineGameAdminSecret", adminSecret.value);
  updateBackendStatus();
});

document.querySelector("#startGame").addEventListener("click", async () => {
  try {
    await callGameApi("createGame", {}, { adminSecret: getAdminSecret() });
    gameStatus.textContent = "進行中";
  } catch (error) {
    gameStatus.textContent = error.message;
  }
});

document.querySelector("#pauseGame").addEventListener("click", () => {
  gameStatus.textContent = "暫停";
});

document.querySelector("#endGame").addEventListener("click", () => {
  gameStatus.textContent = "已結束";
});

document.querySelector("#openQuestion").addEventListener("click", async () => {
  try {
    const result = await callGameApi("openQuestion", {
      questionId: questionIdInput.value.trim()
    }, { adminSecret: getAdminSecret() });
    questionStatus.textContent = `題目已開放：${result.questionId}`;
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

document.querySelector("#closeQuestion").addEventListener("click", async () => {
  try {
    const result = await callGameApi("closeAndScoreQuestion", {
      questionId: questionIdInput.value.trim()
    }, { adminSecret: getAdminSecret() });
    questionStatus.textContent = `題目已關閉，已計分 ${result.scoredCount || 0} 筆。`;
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

items.forEach(text => {
  const item = document.createElement("li");
  item.textContent = text;
  checklist.append(item);
});

updateBackendStatus();
