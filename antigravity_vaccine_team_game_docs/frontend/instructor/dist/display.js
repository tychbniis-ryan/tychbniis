import { getConfig } from "./api.js?v=0.4.15";

const displayStatus = document.querySelector("#displayStatus");
const displayCountdown = document.querySelector("#displayCountdown");
const displayQuestionText = document.querySelector("#displayQuestionText");
const displayOptions = document.querySelector("#displayOptions");
const displayReveal = document.querySelector("#displayReveal");
const displayAnswer = document.querySelector("#displayAnswer");
const displayExplanation = document.querySelector("#displayExplanation");
const displayTopTeams = document.querySelector("#displayTopTeams");
const displayFinal = document.querySelector("#displayFinal");
const displayFinalList = document.querySelector("#displayFinalList");
const refreshDisplayButton = document.querySelector("#refreshDisplay");

let countdownTimer = null;
let lastState = null;

async function firebaseGet(path) {
  const config = getConfig();
  if (!config.firebaseDatabaseUrl) return null;
  const baseUrl = config.firebaseDatabaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/${path}.json`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Firebase 讀取失敗：HTTP ${response.status}`);
  }
  return response.json();
}

async function getPublicGameState() {
  const config = getConfig();
  return firebaseGet(`gameState/${encodeURIComponent(config.gameId)}`);
}

async function getScoreboardSnapshot() {
  const config = getConfig();
  return firebaseGet(`publicScoreboards/${encodeURIComponent(config.gameId)}`);
}

function setStatus(message) {
  displayStatus.textContent = message;
}

function formatSeconds(seconds) {
  return `${Math.max(0, Math.ceil(seconds))} 秒`;
}

function stopCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startCountdown(state) {
  stopCountdown();
  const question = state.publicQuestion || {};
  const openedAt = Date.parse(state.questionOpenedAt || state.updatedAt || "");
  const total = Number(question.timeLimitSec || 60);
  if (!Number.isFinite(openedAt)) {
    displayCountdown.textContent = "--";
    return;
  }
  const render = () => {
    const elapsed = Math.floor((Date.now() - openedAt) / 1000);
    displayCountdown.textContent = formatSeconds(total - elapsed);
  };
  render();
  countdownTimer = window.setInterval(render, 500);
}

function renderQuestion(state) {
  const question = state.publicQuestion || {};
  displayQuestionText.textContent = question.title || question.text || "請等待講師開題。";
  displayOptions.replaceChildren();
  (question.options || []).forEach((option, index) => {
    const item = document.createElement("div");
    item.className = "display-option";
    const optionId = option.id || String.fromCharCode(65 + index);
    item.textContent = `${optionId}. ${option.text || option}`;
    displayOptions.append(item);
  });
}

function renderReveal(state) {
  const reveal = state.answerReveal || {};
  const question = state.publicQuestion || {};
  const answer = reveal.correctAnswerText || reveal.correctAnswer || question.correctAnswerText || question.correctAnswer || "尚未提供正確答案";
  displayAnswer.textContent = `正確答案：${Array.isArray(answer) ? answer.join("、") : answer}`;
  displayExplanation.textContent = reveal.explanation || question.explanation || "目前尚未提供解析。";
  displayReveal.hidden = false;
}

function renderTeams(rows, target) {
  target.replaceChildren();
  const teams = (rows || [])
    .slice()
    .sort((a, b) => Number(b.finalScore || b.totalScore || 0) - Number(a.finalScore || a.totalScore || 0))
    .slice(0, 5);
  if (!teams.length) {
    const empty = document.createElement("li");
    empty.textContent = "尚未產生排行榜。";
    target.append(empty);
    return;
  }
  teams.forEach((row, index) => {
    const item = document.createElement("li");
    const teamName = row.teamName || row.teamId || `第 ${index + 1} 隊`;
    const score = Number(row.finalScore || row.totalScore || 0);
    const average = Number(row.averageScore || 0);
    item.innerHTML = `<strong>${index + 1}. ${teamName}</strong><span>${Math.ceil(score)} 分，平均 ${average.toFixed(1)} 分</span>`;
    target.append(item);
  });
}

async function refreshScoreboard() {
  try {
    const snapshot = await getScoreboardSnapshot();
    const rows = snapshot?.scoreboard || snapshot?.teams || snapshot?.rows || [];
    renderTeams(rows, displayTopTeams);
    if (lastState?.status === "finalized") {
      displayFinal.hidden = false;
      renderTeams(rows, displayFinalList);
    }
  } catch (error) {
    const empty = document.createElement("li");
    empty.textContent = `排行榜讀取失敗：${error.message}`;
    displayTopTeams.replaceChildren(empty);
  }
}

async function refreshDisplay() {
  try {
    const state = await getPublicGameState();
    lastState = state || {};
    const status = lastState.status || "draft";
    if (status === "question_open") {
      setStatus("題目已開放回答。");
      displayReveal.hidden = true;
      renderQuestion(lastState);
      startCountdown(lastState);
    } else if (status === "question_closed") {
      setStatus("題目已關閉，顯示答案與排行榜快照。");
      stopCountdown();
      displayCountdown.textContent = "已關題";
      renderQuestion(lastState);
      renderReveal(lastState);
      await refreshScoreboard();
    } else if (status === "finalized") {
      setStatus("競賽已完成結算。");
      stopCountdown();
      displayCountdown.textContent = "結算";
      displayFinal.hidden = false;
      await refreshScoreboard();
    } else {
      setStatus(status === "created" ? "場次已建立，等待講師開題。" : "等待講師開啟場次。");
      stopCountdown();
      displayCountdown.textContent = "--";
      displayQuestionText.textContent = "請等待講師開題。";
      displayOptions.replaceChildren();
      displayReveal.hidden = true;
    }
  } catch (error) {
    setStatus(`讀取失敗：${error.message}`);
  }
}

refreshDisplayButton.addEventListener("click", refreshDisplay);
setInterval(refreshDisplay, Number(getConfig().firebaseGameStatePollMs || 5000));
refreshDisplay();
