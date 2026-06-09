import { callGameApi, getConfig } from "./api.js?v=0.7.18";

const displayStatus = document.querySelector("#displayStatus");
const displayCountdown = document.querySelector("#displayCountdown");
const displayQuestionText = document.querySelector("#displayQuestionText");
const displayOptions = document.querySelector("#displayOptions");
const displayReveal = document.querySelector("#displayReveal");
const displayAnswer = document.querySelector("#displayAnswer");
const displayExplanation = document.querySelector("#displayExplanation");
const displayTopTeams = document.querySelector("#displayTopTeams");
const displayLiveGrid = document.querySelector("#displayLiveGrid");
const displayFinal = document.querySelector("#displayFinal");
const displayFinalTeams = document.querySelector("#displayFinalTeams");
const displayFinalPlayers = document.querySelector("#displayFinalPlayers");
const displayAwards = document.querySelector("#displayAwards");
const refreshDisplayButton = document.querySelector("#refreshDisplay");
const teamNames = {
  team_1: "冷鏈守護隊",
  team_2: "安全接種隊",
  team_3: "疫苗尖兵隊",
  team_4: "衛教溝通隊",
  team_5: "接種品質隊"
};
const rankAwardImages = [
  "./assets/images/awards/award-rank-rainbow.png",
  "./assets/images/awards/award-rank-purple.png",
  "./assets/images/awards/award-rank-gold.png",
  "./assets/images/awards/award-rank-silver.png",
  "./assets/images/awards/award-rank-bronze.png"
];
const playerRankImages = [
  "./assets/images/awards/award-player-medal-v523-1.png",
  "./assets/images/awards/award-player-medal-v523-2.png",
  "./assets/images/awards/award-player-medal-v523-3.png",
  "./assets/images/awards/award-player-medal-v523-4.png",
  "./assets/images/awards/award-player-medal-v523-5.png"
];
const awardImages = {
  perfect: "./assets/images/awards/award-perfect-rainbow.png",
  lucky: "./assets/images/awards/award-lucky-purple.png",
  other: "./assets/images/awards/award-rank-other.png"
};

let countdownTimer = null;
let lastState = null;
let questionCache = null;
let gameStateStream = null;
let streamRefreshTimer = null;

async function firebaseGet(path) {
  const config = getConfig();
  if (!config.firebaseDatabaseUrl) return null;
  const baseUrl = config.firebaseDatabaseUrl.replace(/\/$/, "");
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${baseUrl}/${path}.json${separator}_ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Firebase 讀取失敗：HTTP ${response.status}`);
  }
  return response.json();
}

async function getPublicGameState() {
  const config = getConfig();
  return firebaseGet(`gameState/${encodeURIComponent(config.gameId)}`);
}

function startGameStateStream() {
  const config = getConfig();
  if (!config.firebaseDatabaseUrl || gameStateStream) return;
  const baseUrl = config.firebaseDatabaseUrl.replace(/\/$/, "");
  const gameId = encodeURIComponent(config.gameId);
  gameStateStream = new EventSource(`${baseUrl}/gameState/${gameId}.json`);
  gameStateStream.addEventListener("put", scheduleFirebaseRefresh);
  gameStateStream.addEventListener("patch", scheduleFirebaseRefresh);
  gameStateStream.onerror = () => {
    if (gameStateStream) {
      gameStateStream.close();
      gameStateStream = null;
    }
  };
}

function scheduleFirebaseRefresh() {
  if (streamRefreshTimer) window.clearTimeout(streamRefreshTimer);
  streamRefreshTimer = window.setTimeout(() => refreshDisplay(), 120);
}

async function getGasGameStateFallback(firebaseState) {
  try {
    const gasState = await callGameApi("getGameState");
    if (!gasState || !gasState.status) return firebaseState;
    const firebaseStatus = firebaseState?.status || "";
    const firebaseQuestionId = firebaseState?.currentQuestionId || firebaseState?.publicQuestion?.questionId || "";
    const gasQuestionId = gasState.currentQuestionId || "";
    const firebaseUpdatedAt = Date.parse(firebaseState?.updatedAt || firebaseState?.questionOpenedAt || "") || 0;
    const gasUpdatedAt = Date.parse(gasState.updatedAt || gasState.questionOpenedAt || "") || 0;
    const shouldPreferGas = gasState.status === "question_open" && (
      firebaseStatus !== "question_open" ||
      (gasQuestionId && gasQuestionId !== firebaseQuestionId) ||
      (gasUpdatedAt && firebaseUpdatedAt && gasUpdatedAt >= firebaseUpdatedAt)
    );
    const shouldFillOpenQuestion = firebaseStatus === "question_open" && !firebaseState?.publicQuestion;

    if (shouldPreferGas || shouldFillOpenQuestion) {
      try {
        const questionResult = await callGameApi("getCurrentQuestion");
        if (questionResult?.question) {
          return {
            ...firebaseState,
            ...gasState,
            status: "question_open",
            currentQuestionId: questionResult.question.questionId,
            questionOpenedAt: questionResult.questionOpenedAt || gasState.questionOpenedAt || firebaseState?.questionOpenedAt || "",
            updatedAt: gasState.updatedAt || questionResult.questionOpenedAt || firebaseState?.updatedAt || "",
            publicQuestion: questionResult.question
          };
        }
      } catch (questionError) {
        console.warn("GAS current question fallback failed.", questionError);
      }
    }
    if (!firebaseStatus || (gasUpdatedAt && firebaseUpdatedAt && gasUpdatedAt > firebaseUpdatedAt)) {
      return { ...firebaseState, ...gasState };
    }
    return firebaseState;
  } catch (error) {
    console.warn("GAS game state fallback failed.", error);
    return firebaseState;
  }
}

async function getPublicQuestions({ force = false } = {}) {
  if (questionCache && !force) return questionCache;
  const config = getConfig();
  const nextCache = await firebaseGet(`publicQuestions/${encodeURIComponent(config.gameId)}`) || {};
  if (Object.keys(nextCache).length || force || !questionCache) {
    questionCache = nextCache;
  }
  return questionCache;
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

function getQuestionFromState(state) {
  const questionId = state?.publicQuestion?.questionId || state?.currentQuestionId || "";
  return state?.publicQuestion || questionCache?.[questionId] || null;
}

function normalizeAnswer(value) {
  return (Array.isArray(value) ? value : [value])
    .map(item => String(item || "").trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

function getCorrectAnswerValue(state, question) {
  const reveal = state?.answerReveal || {};
  return reveal.correctAnswer || reveal.correctAnswers || question?.correctAnswer || question?.correctAnswers || "";
}

function startCountdown(state) {
  stopCountdown();
  const question = getQuestionFromState(state) || {};
  const openedAt = Date.parse(state.questionOpenedAt || state.updatedAt || "");
  const total = Math.max(65, Number(question.timeLimitSec || 65));
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

function startFinalSettlementCountdown(state) {
  stopCountdown();
  const itemUseEndsAt = Date.parse(state.finalItemUseEndsAt || "");
  const render = () => {
    const remaining = Number.isFinite(itemUseEndsAt)
      ? Math.max(0, Math.ceil((itemUseEndsAt - Date.now()) / 1000))
      : 15;
    if (remaining > 0) {
      setStatus("目前狀態：最後道具使用倒數");
      displayCountdown.textContent = formatSeconds(remaining);
      displayQuestionText.textContent = "請學員使用最後的道具。倒數結束後將進入結算。";
    } else {
      setStatus("目前狀態：講師結算成績中");
      displayCountdown.textContent = "結算中";
      displayQuestionText.textContent = "最後道具使用時間已結束，講師正在結算成績。";
    }
  };
  render();
  countdownTimer = window.setInterval(render, 500);
}

function renderQuestion(state, revealAnswer = false) {
  const question = getQuestionFromState(state) || {};
  displayQuestionText.textContent = question.title || question.text || "請等待講師開題。";
  displayOptions.replaceChildren();
  const correctAnswer = normalizeAnswer(getCorrectAnswerValue(state, question));
  const correctSet = new Set(correctAnswer.split(",").filter(Boolean));
  (question.options || []).forEach((option, index) => {
    const item = document.createElement("div");
    item.className = "display-option";
    const optionId = option.id || String.fromCharCode(65 + index);
    if (revealAnswer && correctSet.has(normalizeAnswer(optionId))) {
      item.classList.add("is-correct");
    }
    item.textContent = `${optionId}. ${option.text || option}`;
    displayOptions.append(item);
  });
}

function renderReveal(state) {
  const reveal = state.answerReveal || {};
  const question = getQuestionFromState(state) || {};
  const answer = reveal.correctAnswerText || getCorrectAnswerValue(state, question) || question.correctAnswerText || "尚未提供正確答案";
  displayAnswer.textContent = `正確答案：${Array.isArray(answer) ? answer.join("、") : answer}`;
  displayExplanation.textContent = reveal.explanation || question.explanation || "目前尚未提供解析。";
  displayReveal.hidden = false;
}

function getSortedTeams(rows) {
  return (rows || [])
    .slice()
    .sort((a, b) =>
      getTeamRankScore(b) - getTeamRankScore(a) ||
      String(a.teamId || "").localeCompare(String(b.teamId || ""))
    );
}

function getTeamRankScore(row) {
  return Number(row?.weightedAverageScore ?? row?.finalScore ?? row?.totalScore ?? 0);
}

function getTeamLabel(teamId, teamName = "") {
  return teamName || teamNames[teamId] || teamId || "未分隊";
}

function createDisplayImage(src, className, alt = "") {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function renderTeams(rows, target, limit = 5) {
  target.replaceChildren();
  const teams = getSortedTeams(rows).slice(0, limit);
  if (!teams.length) {
    const empty = document.createElement("li");
    empty.textContent = "尚未產生排行榜。";
    target.append(empty);
    return;
  }
  teams.forEach((row, index) => {
    const item = document.createElement("li");
    item.className = `display-rank-item rank-${index < 3 ? index + 1 : "other"}`;
    if (target === displayTopTeams) item.classList.add("is-live-rank");
    const score = getTeamRankScore(row);
    const average = Number(row.averageScore || 0);
    const bonus = Number(row.teamBonusScore || 0);
    const playerCount = Number(row.playerCount || 0);
    const trophy = createDisplayImage(rankAwardImages[index] || awardImages.other, "rank-award-icon", `第 ${index + 1} 名`);
    const name = document.createElement("strong");
    name.textContent = getTeamLabel(row.teamId, row.teamName);
    const scoreLine = document.createElement("span");
    scoreLine.textContent = target === displayTopTeams
      ? `總分 ${score.toFixed(0)} 分｜平均 ${average.toFixed(1)}｜道具 ${bonus.toFixed(1)}`
      : `獲得總分 ${score.toFixed(0)} 分（平均分 ${average.toFixed(1)} 分／道具 ${bonus.toFixed(1)} 分）`;
    const playerLine = document.createElement("span");
    playerLine.textContent = target === displayTopTeams ? `${playerCount} 人` : `戰隊人數 ${playerCount} 人`;
    item.append(trophy, name, scoreLine, playerLine);
    target.append(item);
  });
}

function renderPlayers(rows, target, limit = 5) {
  target.replaceChildren();
  const players = (rows || [])
    .slice()
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, limit);
  if (!players.length) {
    const empty = document.createElement("li");
    empty.textContent = "目前沒有個人排名。";
    target.append(empty);
    return;
  }
  players.forEach((row, index) => {
    const item = document.createElement("li");
    item.className = `display-rank-item player-rank-item rank-${index < 3 ? index + 1 : "other"}`;
    const totalSeconds = Math.max(0, Math.round(Number(row.totalResponseSeconds || 0)));
    const rankIcon = createDisplayImage(playerRankImages[index] || awardImages.other, "rank-award-icon player-rank-icon", `第 ${index + 1} 名`);
    const name = document.createElement("strong");
    name.textContent = row.nickname || "學員";
    const meta = document.createElement("span");
    meta.textContent = `${getTeamLabel(row.teamId)}，個人積分 ${Math.ceil(Number(row.score || 0))} 分，答對 ${Number(row.correctCount || 0)} 題，作答總秒數 ${totalSeconds} 秒`;
    item.append(rankIcon, name, meta);
    target.append(item);
  });
}

function renderAwards(snapshot) {
  displayAwards.replaceChildren();
  const awards = snapshot?.awards || [];
  const luckyRows = awards.filter(row => row.awardType === "lucky" || row.awardType === "lucky_box");
  const hasFinalPerfectAward = awards.some(row => row.awardType === "perfect");
  const perfectRows = dedupeAwardRows(awards.filter(row =>
    row.awardType === "perfect" || (!hasFinalPerfectAward && row.awardType === "perfect_candidate")
  ));
  const lines = [
    { label: "幸運獎", className: "award-lucky", image: awardImages.lucky, names: luckyRows.map(row => row.nickname || row.playerId || "未命名") },
    { label: "全對獎", className: "award-perfect", image: awardImages.perfect, names: perfectRows.map(row => row.nickname || row.playerId || "未命名") }
  ];
  lines.forEach(row => {
    const item = document.createElement("div");
    item.className = `award-card ${row.className}`;
    const icon = createDisplayImage(row.image, "award-icon", row.label);
    const title = document.createElement("strong");
    title.textContent = row.label;
    const names = document.createElement("span");
    names.textContent = row.names.join("、") || "尚未產生";
    item.append(icon, title, names);
    displayAwards.append(item);
  });
}

function dedupeAwardRows(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = [row.awardType === "perfect_candidate" ? "perfect" : row.awardType, row.playerId || row.nickname || ""].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function refreshScoreboard() {
  const snapshot = await getScoreboardSnapshot();
  const rows = snapshot?.scoreboard || snapshot?.teams || snapshot?.rows || [];
  renderTeams(rows, displayTopTeams, 5);
  if (lastState?.status === "finalized") {
    displayFinal.hidden = false;
    displayLiveGrid.hidden = true;
    renderTeams(rows, displayFinalTeams, 5);
    renderPlayers(snapshot?.players || [], displayFinalPlayers, 5);
    renderAwards(snapshot);
  }
}

async function ensureQuestionCacheForState(state) {
  const questionId = state?.publicQuestion?.questionId || state?.currentQuestionId || "";
  if (!questionId) return;
  if (!questionCache || !questionCache[questionId]) {
    await getPublicQuestions({ force: true });
  }
}

async function ensureQuestionCacheFromGas(state) {
  const questionId = state?.currentQuestionId || "";
  if (!questionId || state?.publicQuestion || questionCache?.[questionId]) return;
    try {
      const questionResult = await callGameApi("getCurrentQuestion");
      if (questionResult?.question?.questionId === questionId) {
        questionCache = {
          ...(questionCache || {}),
          [questionId]: questionResult.question
        };
      }
    } catch (error) {
      console.warn("Display question fallback failed.", error);
    }
}

async function refreshDisplay(options = {}) {
  try {
    const state = await getPublicGameState();
    lastState = options.allowGasFallback
      ? await getGasGameStateFallback(state || {})
      : state || {};
    const status = lastState.status || "draft";
    document.body.classList.toggle("is-finalized-display", status === "finalized");
    if (status === "question_open") {
      await ensureQuestionCacheForState(lastState);
      if (options.allowGasFallback) await ensureQuestionCacheFromGas(lastState);
      displayLiveGrid.hidden = false;
      displayFinal.hidden = true;
      setStatus("目前狀態：已開題");
      displayReveal.hidden = true;
      renderQuestion(lastState);
      startCountdown(lastState);
    } else if (status === "question_closed") {
      await ensureQuestionCacheForState(lastState);
      displayLiveGrid.hidden = false;
      displayFinal.hidden = true;
      setStatus("目前狀態：已關題，公布答案與解析");
      stopCountdown();
      displayCountdown.textContent = "已關題";
      renderQuestion(lastState, true);
      renderReveal(lastState);
      await refreshScoreboard();
    } else if (status === "finalizing_countdown") {
      displayLiveGrid.hidden = false;
      displayFinal.hidden = true;
      displayOptions.replaceChildren();
      displayReveal.hidden = true;
      startFinalSettlementCountdown(lastState);
    } else if (status === "finalized") {
      setStatus("目前狀態：已結算");
      stopCountdown();
      displayCountdown.textContent = "已結算";
      await refreshScoreboard();
    } else {
      displayLiveGrid.hidden = false;
      displayFinal.hidden = true;
      setStatus(status === "created" ? "目前狀態：場次已建立，等待講師開題" : "目前狀態：等待講師建立場次");
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

refreshDisplayButton.addEventListener("click", () => refreshDisplay({ allowGasFallback: true }));
startGameStateStream();
initializeLoadingStateObserver();
setInterval(refreshDisplay, Math.max(Number(getConfig().firebaseGameStatePollMs || 5000), 5000));
refreshDisplay();

function initializeLoadingStateObserver() {
  const loadingPattern = /(正在|讀取|等待|開題|結算|同步|稍候)/;
  const targets = [displayStatus, displayQuestionText].filter(Boolean);
  const update = node => {
    node.classList.toggle("is-loading", loadingPattern.test(node.textContent || ""));
  };
  targets.forEach(node => {
    update(node);
    new MutationObserver(() => update(node)).observe(node, { childList: true, subtree: true, characterData: true });
  });
}
