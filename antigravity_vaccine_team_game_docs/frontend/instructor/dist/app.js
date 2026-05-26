import { callGameApi, clearLegacyGasUrl, getConfig, getPublicQuestions } from "./api.js?v=0.4.20";

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
const questionSelect = document.querySelector("#questionSelect");
const refreshQuestionsButton = document.querySelector("#refreshQuestions");
const refreshScoreboardButton = document.querySelector("#refreshScoreboard");
const scoreboardStatus = document.querySelector("#scoreboardStatus");
const scoreboardList = document.querySelector("#scoreboardList");
const answerReveal = document.querySelector("#answerReveal");
const answerPanel = document.querySelector("#answerPanel");
const resetGameDataInQuestionButton = document.querySelector("#resetGameDataInQuestion");
const refreshCreativeCandidatesButton = document.querySelector("#refreshCreativeCandidates");
const selectCreativeFinalistsButton = document.querySelector("#selectCreativeFinalists");
const refreshCreativeResultButton = document.querySelector("#refreshCreativeResult");
const creativeStatus = document.querySelector("#creativeStatus");
const creativeCandidateList = document.querySelector("#creativeCandidateList");
const creativeResultList = document.querySelector("#creativeResultList");
const exportGameReportButton = document.querySelector("#exportGameReport");
const reportStatus = document.querySelector("#reportStatus");
const reportLink = document.querySelector("#reportLink");
const addComputerPlayersButton = document.querySelector("#addComputerPlayers");
const submitComputerAnswersButton = document.querySelector("#submitComputerAnswers");
const computerPlayerStatus = document.querySelector("#computerPlayerStatus");
const finalizeCompetitionButton = document.querySelector("#finalizeCompetition");
const finalizeStatus = document.querySelector("#finalizeStatus");
const finalResultDialog = document.querySelector("#finalResultDialog");
const closeFinalResultDialogButton = document.querySelector("#closeFinalResultDialog");
const finalResultSummary = document.querySelector("#finalResultSummary");
const finalResultList = document.querySelector("#finalResultList");

function setQuestionFlowStatus(message, revealMessage = "") {
  questionStatus.textContent = message;
  if (answerPanel) {
    answerPanel.hidden = false;
  }
  if (revealMessage) {
    answerReveal.textContent = revealMessage;
  }
}

const fallbackQuestions = [
  { questionId: "demo_q001", order: 1, title: "示範題 1" },
  { questionId: "demo_q002", order: 2, title: "示範題 2" },
  { questionId: "demo_q003", order: 3, title: "示範題 3" },
  { questionId: "demo_q004", order: 4, title: "示範題 4" },
  { questionId: "demo_q005", order: 5, title: "示範題 5" },
  { questionId: "demo_q006", order: 6, title: "示範題 6" },
  { questionId: "demo_q007", order: 7, title: "示範題 7" },
  { questionId: "demo_q008", order: 8, title: "示範題 8" },
  { questionId: "demo_q009", order: 9, title: "示範題 9" },
  { questionId: "demo_q010", order: 10, title: "示範題 10" }
];

const openedQuestionIds = new Set();
const adminSecretKey = "vaccineGameAdminSecret";
const gameStartedKey = "vaccineGameStarted";
const teamChoiceKey = "vaccineGameAllowFreeTeamChoice";
let instructorQuestionCache = {};

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
  allowFreeTeamChoiceInput.disabled = Boolean(value);
}

function syncTeamChoiceInputs(value) {
  const enabled = Boolean(value);
  allowFreeTeamChoiceInput.checked = enabled;
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
  const hasSecret = stage !== "backend";
  backendPanel.hidden = hasSecret;
  startPanel.hidden = !hasSecret || stage === "question";
  questionPanel.hidden = !hasSecret;
}

function syncInitialStage() {
  const savedSecret = getAdminSecret();
  if (savedSecret) {
    adminSecret.value = savedSecret;
    syncTeamChoiceInputs(localStorage.getItem(teamChoiceKey) === "true");
    allowFreeTeamChoiceInput.disabled = isGameStarted();
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
    .filter(question => question.type !== "creative")
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const source = rows.length ? rows : fallbackQuestions;
  instructorQuestionCache = source.reduce((map, question) => {
    map[question.questionId] = question;
    return map;
  }, {});

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

function getSelectedQuestion() {
  return instructorQuestionCache[questionSelect.value] || null;
}

function renderLocalAnswerReveal(question) {
  if (!question) {
    answerReveal.textContent = "已關題，答案讀取中。";
    return;
  }
  const correctAnswer = question.correctAnswerText || question.correctAnswer || "未提供答案";
  const explanation = question.explanation ? `\n${question.explanation}` : "";
  answerReveal.textContent = `正確答案：${correctAnswer}${explanation}`;
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
    const totalScoreValue = Number(row.finalScore || row.totalScore || 0);
    const averageScore = Number(row.averageScore || 0);
    const teamBonusScore = Number(row.teamBonusScore || 0);
    const playerCount = Number(row.playerCount || 0);
    const correctRate = Number(row.correctRate || 0) * 100;
    const currentQuestionCorrectRate = Number(row.currentQuestionCorrectRate || 0) * 100;

    const rank = document.createElement("strong");
    rank.textContent = `第 ${index + 1} 名　${row.teamId || "未分隊"}　獲得總分 ${Math.ceil(totalScoreValue)} 分`;

    const playerCountNode = document.createElement("span");
    playerCountNode.textContent = `戰隊人數：${playerCount}`;

    const overallRateNode = document.createElement("span");
    overallRateNode.className = "rate-block";
    overallRateNode.textContent = `整體答對率：${correctRate.toFixed(1)}%`;

    const currentRateNode = document.createElement("span");
    currentRateNode.className = "rate-block";
    currentRateNode.textContent = `當前題目答對率：${currentQuestionCorrectRate.toFixed(1)}%`;

    const totalScore = document.createElement("span");
    totalScore.textContent = `答題總分：${Number(row.totalScore || 0).toFixed(1)}`;

    const averageScoreNode = document.createElement("span");
    averageScoreNode.textContent = `答題平均：${averageScore.toFixed(1)}`;

    const bonusScore = document.createElement("span");
    bonusScore.textContent = `道具加成：+${teamBonusScore}`;

    const finalScoreNode = document.createElement("span");
    finalScoreNode.textContent = `獲得總分：${totalScoreValue.toFixed(1)}（平均分 ${averageScore.toFixed(1)}／道具 ${teamBonusScore.toFixed(1)}）`;

    item.append(rank, playerCountNode, overallRateNode, currentRateNode, totalScore, averageScoreNode, bonusScore, finalScoreNode);
    scoreboardList.append(item);
  });
}

function renderCreativeCandidates(teams) {
  creativeCandidateList.replaceChildren();
  const teamIds = Object.keys(teams || {}).sort();
  if (!teamIds.length) {
    creativeStatus.textContent = "目前沒有創作題候選資料。";
    return;
  }

  teamIds.forEach(teamId => {
    const section = document.createElement("section");
    section.className = "creative-team";
    const title = document.createElement("h3");
    title.textContent = teamId;
    const select = document.createElement("select");
    select.dataset.teamId = teamId;
    select.className = "creative-finalist-select";

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "不選代表作品";
    select.append(empty);

    (teams[teamId] || []).slice(0, 3).forEach(row => {
      const option = document.createElement("option");
      option.value = row.submissionId;
      option.textContent = `${row.voteCount || 0} 票｜${row.content || ""}`;
      if (row.selectedByInstructor) option.selected = true;
      select.append(option);
    });

    section.append(title, select);
    creativeCandidateList.append(section);
  });
}

function renderCreativeResult(rows) {
  creativeResultList.replaceChildren();
  if (!rows || !rows.length) {
    creativeResultList.textContent = "尚無匿名全體投票結果。";
    return;
  }

  rows.forEach(row => {
    const item = document.createElement("article");
    item.className = "creative-result-item";
    const title = document.createElement("strong");
    const content = document.createElement("p");
    const meta = document.createElement("span");
    title.textContent = `${row.finalAlias || ""}｜${row.voteCount || 0} 票`;
    content.textContent = row.content || "";
    meta.textContent = `來源戰隊：${row.teamId || ""}`;
    item.append(title, content, meta);
    creativeResultList.append(item);
  });
}

async function refreshCreativeCandidates() {
  try {
    creativeStatus.textContent = "正在讀取隊內候選...";
    const result = await callGameApi("getTeamCreativeCandidates", {}, { adminSecret: getAdminSecret() });
    renderCreativeCandidates(result.teams || {});
    creativeStatus.textContent = "已讀取隊內候選。每隊最多顯示前 3 名候選。";
  } catch (error) {
    creativeStatus.textContent = error.message;
  }
}

async function selectCreativeFinalists() {
  try {
    const finalists = [...document.querySelectorAll(".creative-finalist-select")]
      .map(select => ({ teamId: select.dataset.teamId, submissionId: select.value }))
      .filter(row => row.teamId && row.submissionId);
    if (!finalists.length) {
      creativeStatus.textContent = "請至少選擇 1 則代表作品。";
      return;
    }

    const result = await callGameApi("selectCreativeFinalists", { finalists }, { adminSecret: getAdminSecret() });
    creativeStatus.textContent = `已選出 ${result.rows?.length || 0} 則匿名決選作品。`;
    await refreshCreativeResult();
  } catch (error) {
    creativeStatus.textContent = error.message;
  }
}

async function refreshCreativeResult() {
  try {
    const result = await callGameApi("getCreativeVoteResult", {}, { adminSecret: getAdminSecret() });
    renderCreativeResult(result.rows || []);
    creativeStatus.textContent = `已讀取匿名全體投票結果，共 ${result.totalVotes || 0} 票。`;
  } catch (error) {
    creativeStatus.textContent = error.message;
  }
}

async function exportGameReport() {
  try {
    exportGameReportButton.disabled = true;
    reportStatus.textContent = "正在建立賽後報表...";
    reportLink.replaceChildren();
    const result = await callGameApi("exportGameReport", {}, { adminSecret: getAdminSecret() });
    reportStatus.textContent = `賽後報表已建立，共 ${result.sheetCount || 0} 個工作表。`;
    if (result.spreadsheetUrl) {
      const link = document.createElement("a");
      link.href = result.spreadsheetUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "開啟賽後報表試算表";
      reportLink.append(link);
    }
  } catch (error) {
    reportStatus.textContent = error.message;
  } finally {
    exportGameReportButton.disabled = false;
  }
}

async function addComputerPlayers() {
  if (!addComputerPlayersButton) return;
  addComputerPlayersButton.disabled = true;
  computerPlayerStatus.textContent = "正在加入電腦學員...";
  try {
    const result = await callGameApi("addComputerPlayers", {
      playersPerTeam: 2
    }, { adminSecret: getAdminSecret() });
    computerPlayerStatus.textContent = `已建立或確認 ${result.totalBotPlayers || 0} 位電腦學員。`;
    await refreshScoreboard();
  } catch (error) {
    computerPlayerStatus.textContent = error.message;
  } finally {
    addComputerPlayersButton.disabled = false;
  }
}

async function submitComputerAnswers() {
  if (!submitComputerAnswersButton) return;
  submitComputerAnswersButton.disabled = true;
  computerPlayerStatus.textContent = "電腦學員正在作答目前題目...";
  try {
    const result = await callGameApi("submitComputerAnswers", {}, { adminSecret: getAdminSecret() });
    computerPlayerStatus.textContent = `電腦學員已送出 ${result.submittedCount || 0} 筆作答。`;
  } catch (error) {
    computerPlayerStatus.textContent = error.message;
  } finally {
    submitComputerAnswersButton.disabled = false;
  }
}

async function finalizeCompetition() {
  if (!finalizeCompetitionButton) return;
  const confirmed = window.confirm("確定要結算競賽？結算後學員端會顯示最後成績與領獎提示。");
  if (!confirmed) return;

  finalizeCompetitionButton.disabled = true;
  finalizeStatus.textContent = "正在結算競賽...";
  try {
    const result = await callGameApi("finalizeCompetition", {}, { adminSecret: getAdminSecret() });
    finalizeStatus.textContent = "競賽已結算。第 4 版已移除創作題與票選加分。";
    renderScoreboard(result.scoreboard || []);
    renderFinalResultDialog(result);
  } catch (error) {
    finalizeStatus.textContent = error.message;
  } finally {
    finalizeCompetitionButton.disabled = false;
  }
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
    const allowFreeTeamChoice = allowFreeTeamChoiceInput.checked;
    const result = await callGameApi("createGame", {
      allowFreeTeamChoice
    }, { adminSecret: getAdminSecret() });
    syncTeamChoiceInputs(Boolean(result.allowFreeTeamChoice));
    gameStatus.textContent = result.status === "created" || result.status === "draft"
      ? "場次已啟動"
      : result.status || "場次已啟動";
    if (answerPanel) {
      answerPanel.hidden = true;
    }
    answerReveal.textContent = "出題中，尚未開放回答。";
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
    if (answerPanel) {
      answerPanel.hidden = true;
    }
    answerReveal.textContent = "出題中，尚未開放回答。";
    renderScoreboard([]);
    openedQuestionIds.clear();
    setGameStarted(false);
    allowFreeTeamChoiceInput.disabled = false;
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
    setQuestionFlowStatus(`已開放回答：${result.questionId}`, "已開放回答，關題後公布答案。");
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

    setQuestionFlowStatus("關題中，正在公布答案並準備結算。", "關題中，請等待後台結算成績。");
    const result = await callGameApi("closeAndScoreQuestion", {
      questionId
    }, { adminSecret: getAdminSecret() });
    const submittedCount = Number(result.submittedCount ?? result.scoredCount ?? 0);
    const scoredCount = Number(result.scoredCount || 0);
    questionStatus.textContent = `已關題結算成績，收到 ${submittedCount} 筆作答，新計分 ${scoredCount} 筆。`;
    renderAnswerReveal(result);
    if (result.scoreboard && result.scoreboard.length > 0) {
      renderScoreboard(result.scoreboard || []);
    } else {
      renderScoreboard([]);
    }
  } catch (error) {
    questionStatus.textContent = error.message;
  }
});

async function runCloseScoring(questionId) {
  try {
    const result = await callGameApi("scoreClosedQuestion", {
      questionId
    }, { adminSecret: getAdminSecret() });
    const submittedCount = Number(result.submittedCount ?? result.scoredCount ?? 0);
    const scoredCount = Number(result.scoredCount || 0);
    questionStatus.textContent = `已關題結算成績，收到 ${submittedCount} 筆作答，新計分 ${scoredCount} 筆。`;
    renderScoreboard(result.scoreboard || []);
  } catch (error) {
    scoreboardStatus.textContent = `\u5f8c\u53f0\u8a08\u5206\u5931\u6557\uff1a${error.message}`;
  }
}

document.querySelector("#closeQuestion").addEventListener("click", async event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    const questionId = questionSelect.value;
    if (!questionId) {
      questionStatus.textContent = "請先選擇題目。";
      return;
    }

    setQuestionFlowStatus("已關題，先公布答案。後台正在結算成績。");
    renderLocalAnswerReveal(getSelectedQuestion());
    const result = await callGameApi("closeAndScoreQuestion", {
      questionId
    }, { adminSecret: getAdminSecret() });
    questionStatus.textContent = "已關題並公布答案。講解期間後台會繼續結算成績。";
    renderAnswerReveal(result);
    renderLocalAnswerReveal({
      correctAnswerText: result.correctAnswerText || result.correctAnswer || "",
      explanation: result.explanation || ""
    });
    scoreboardStatus.textContent = "後台正在結算本題成績，完成後會更新排行榜。";
    runCloseScoring(questionId);
  } catch (error) {
    questionStatus.textContent = error.message;
  }
}, true);

async function refreshScoreboard() {
  try {
    const result = await callGameApi("getScoreboard", {}, { adminSecret: getAdminSecret() });
    renderScoreboard(result.rows || []);
  } catch (error) {
    scoreboardStatus.textContent = error.message;
  }
}

function renderFinalResultDialog(result) {
  if (!finalResultDialog || !finalResultSummary || !finalResultList) return;
  finalResultDialog.hidden = false;
  const rows = result.scoreboard || [];
  finalResultSummary.textContent = `競賽已結算，共 ${rows.length} 筆戰隊成績。學員端會讀取最後成績頁。`;
  finalResultList.replaceChildren();
  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "scoreboard-item";
    const title = document.createElement("strong");
    const totalScore = Number(row.finalScore || row.totalScore || 0);
    const averageScore = Number(row.averageScore || 0);
    const teamBonusScore = Number(row.teamBonusScore || 0);
    title.textContent = `第 ${index + 1} 名　${row.teamId || "未分隊"}　${Math.ceil(totalScore)} 分`;
    const meta = document.createElement("span");
    meta.textContent = `平均分 ${averageScore.toFixed(1)} 分／道具 ${teamBonusScore.toFixed(1)} 分，戰隊人數 ${Number(row.playerCount || 0)} 人`;
    item.append(title, meta);
    finalResultList.append(item);
  });
}

function closeFinalResultDialog() {
  if (finalResultDialog) {
    finalResultDialog.hidden = true;
  }
}

refreshQuestionsButton.addEventListener("click", loadQuestionOptions);
refreshScoreboardButton.addEventListener("click", refreshScoreboard);
if (refreshCreativeCandidatesButton) {
  refreshCreativeCandidatesButton.addEventListener("click", refreshCreativeCandidates);
}
if (selectCreativeFinalistsButton) {
  selectCreativeFinalistsButton.addEventListener("click", selectCreativeFinalists);
}
if (refreshCreativeResultButton) {
  refreshCreativeResultButton.addEventListener("click", refreshCreativeResult);
}
if (exportGameReportButton) {
  exportGameReportButton.addEventListener("click", exportGameReport);
}
if (addComputerPlayersButton) {
  addComputerPlayersButton.addEventListener("click", addComputerPlayers);
}
if (submitComputerAnswersButton) {
  submitComputerAnswersButton.addEventListener("click", submitComputerAnswers);
}
if (finalizeCompetitionButton) {
  finalizeCompetitionButton.addEventListener("click", finalizeCompetition);
}
if (closeFinalResultDialogButton) {
  closeFinalResultDialogButton.addEventListener("click", closeFinalResultDialog);
}
if (finalResultDialog) {
  finalResultDialog.addEventListener("click", event => {
    if (event.target?.matches("[data-close-final-result]")) {
      closeFinalResultDialog();
    }
  });
}
allowFreeTeamChoiceInput.addEventListener("change", event => updateTeamChoiceMode(event.target.checked));

checklistItems.forEach(text => {
  const item = document.createElement("li");
  item.textContent = text;
  checklist.append(item);
});

updateBackendStatus();
syncInitialStage();
