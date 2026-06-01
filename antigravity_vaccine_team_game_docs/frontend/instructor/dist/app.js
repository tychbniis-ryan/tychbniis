import { callGameApi, clearLegacyGasUrl, getConfig, getPublicQuestions } from "./api.js?v=0.6.7";

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
const questionBankLink = document.querySelector("#questionBankLink");
const questionBankStatus = document.querySelector("#questionBankStatus");
const importTaiwanQuestionBankButton = document.querySelector("#importTaiwanQuestionBank");
const refreshQuestionsButton = document.querySelector("#refreshQuestions");
const refreshScoreboardButton = document.querySelector("#refreshScoreboard");
const scoreboardStatus = document.querySelector("#scoreboardStatus");
const scoreboardList = document.querySelector("#scoreboardList");
const answerReveal = document.querySelector("#answerReveal");
const answerPanel = document.querySelector("#answerPanel");
const resetGameDataInQuestionButton = document.querySelector("#resetGameDataInQuestion");
const grantTreasureBoxButtons = [...document.querySelectorAll("[data-grant-slot]")];
const grantLaggingTreasureBoxButton = document.querySelector("#grantLaggingTreasureBox");
const laggingTreasureTeamSelect = document.querySelector("#laggingTreasureTeam");
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
const finalItemUseCountdownMs = 15000;
const finalSettlementDelayMs = 20000;
const teamNames = {
  team_1: "冷鏈守護隊",
  team_2: "安全接種隊",
  team_3: "疫苗尖兵隊",
  team_4: "衛教溝通隊",
  team_5: "接種品質隊"
};

function getTeamLabel(teamId, teamName = "") {
  return teamName || teamNames[teamId] || teamId || "未分隊";
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function showInstructorConfirm({
  title = "確認操作",
  message = "",
  confirmLabel = "確認",
  cancelLabel = "取消",
  tone = "default"
} = {}) {
  return new Promise(resolve => {
    const dialog = document.createElement("section");
    dialog.className = `game-confirm-dialog instructor-confirm-dialog tone-${tone}`;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const backdrop = document.createElement("div");
    backdrop.className = "game-confirm-backdrop";

    const panel = document.createElement("section");
    panel.className = "panel game-confirm-panel";

    const heading = document.createElement("h2");
    heading.textContent = title;

    const content = document.createElement("p");
    content.textContent = message;

    const actions = document.createElement("div");
    actions.className = "game-confirm-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "secondary";
    cancelButton.dataset.confirmValue = "false";
    cancelButton.textContent = cancelLabel;

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.dataset.confirmValue = "true";
    confirmButton.textContent = confirmLabel;

    actions.append(cancelButton, confirmButton);
    panel.append(heading, content, actions);
    dialog.append(backdrop, panel);

    const finish = value => {
      dialog.remove();
      resolve(value);
    };

    dialog.addEventListener("click", event => {
      const target = event.target;
      if (target === backdrop) {
        finish(false);
        return;
      }
      if (target instanceof HTMLElement && target.dataset.confirmValue) {
        finish(target.dataset.confirmValue === "true");
      }
    });

    document.body.append(dialog);
    confirmButton.focus();
  });
}

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
  { questionId: "q001", order: 1, title: "臺灣夜市常見的「大腸包小腸」是由什麼包著什麼？" },
  { questionId: "q002", order: 2, title: "臺北捷運中的優先座位通常稱為什麼？" },
  { questionId: "q003", order: 3, title: "臺灣最高峰是哪一座山？" },
  { questionId: "q004", order: 4, title: "端午節最具代表性的食物是什麼？" },
  { questionId: "q005", order: 5, title: "臺灣便利商店最常見的服務之一是？" },
  { questionId: "q006", order: 6, title: "珍珠奶茶中的珍珠通常是什麼製成？" },
  { questionId: "q007", order: 7, title: "日月潭位於哪個縣市？" },
  { questionId: "q008", order: 8, title: "臺灣垃圾車常播放哪類音樂提醒民眾？" },
  { questionId: "q009", order: 9, title: "農曆新年發紅包時使用的袋子通常是什麼顏色？" },
  { questionId: "q010", order: 10, title: "悠遊卡主要用途是什麼？" },
  { questionId: "q011", order: 11, title: "牛肉麵常被認為是臺灣哪類代表性美食？" },
  { questionId: "q012", order: 12, title: "臺灣最南端著名景點是？" },
  { questionId: "q013", order: 13, title: "媽祖遶境活動主要與哪種信仰有關？" },
  { questionId: "q014", order: 14, title: "在臺灣購物時最常見的發票制度是？" },
  { questionId: "q015", order: 15, title: "哪一項運動被稱為臺灣國球？" },
  { questionId: "q016", order: 16, title: "阿里山最有名的景觀之一是？" },
  { questionId: "q017", order: 17, title: "臺灣臭豆腐的特色是什麼？" },
  { questionId: "q018", order: 18, title: "臺灣民眾看病最常使用哪種證件？" },
  { questionId: "q019", order: 19, title: "每年九月開始的新學期稱為？" },
  { questionId: "q020", order: 20, title: "每年春季大量遊客前往澎湖欣賞什麼活動？" }
];

const openedQuestionIds = new Set();
const adminSecretKey = "vaccineGameAdminSecret";
const gameStartedKey = "vaccineGameStarted";
const teamChoiceKey = "vaccineGameAllowFreeTeamChoice";
const questionBankUrlKey = "vaccineGameQuestionBankUrl";
const questionBankMessageKey = "vaccineGameQuestionBankMessage";
let instructorQuestionCache = {};
let isClosingQuestion = false;

const checklistItems = [
  "輸入管理密碼並套用設定。",
  "正式活動前先清空資料。",
  "啟動場次。",
  "從題目清單選擇要開放的題目。",
  "按「開放題目」後，再用口令請學員翻開試卷。",
  "學員作答完成後，按「關閉題目並計分」。",
  "投影畫面會顯示正確答案與排行榜。"
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
  updateInstructorFlowStage(stage);
}

function updateInstructorFlowStage(stage) {
  const currentStage = stage || "backend";
  const stepOrder = ["backend", "start", "question"];
  const currentIndex = stepOrder.indexOf(currentStage);
  [
    { key: "backend", element: backendPanel },
    { key: "start", element: startPanel },
    { key: "question", element: questionPanel }
  ].forEach(({ key, element }, index) => {
    if (!element) return;
    element.classList.toggle("is-flow-active", key === currentStage);
    element.classList.toggle("is-flow-complete", currentIndex > index);
  });
  if (modeBadge) {
    modeBadge.dataset.stage = currentStage;
  }
}

function getEnabledAdditionalTreasureSlots(source) {
  return new Set(
    String(source?.additionalTreasureBoxSlots || "")
      .split(",")
      .map(value => Number(value.trim()))
      .filter(value => Number.isFinite(value) && value >= 1 && value <= 5)
  );
}

function updateAdditionalTreasureButtons(source) {
  const enabledSlots = getEnabledAdditionalTreasureSlots(source);
  grantTreasureBoxButtons.forEach(button => {
    const slot = Number(button.dataset.grantSlot || 0);
    const isEnabled = enabledSlots.has(slot);
    button.classList.toggle("is-treasure-enabled", isEnabled);
    button.setAttribute("aria-pressed", isEnabled ? "true" : "false");
    button.setAttribute("aria-label", isEnabled ? `第 ${slot} 箱已啟用` : `啟用第 ${slot} 箱`);
    button.textContent = isEnabled ? `已開 ${slot}` : `第 ${slot} 箱`;
    button.title = isEnabled ? `第 ${slot} 箱已啟用` : `啟用第 ${slot} 箱`;
  });
}

async function syncInitialStage() {
  const savedSecret = getAdminSecret();
  if (savedSecret) {
    adminSecret.value = savedSecret;
    syncTeamChoiceInputs(localStorage.getItem(teamChoiceKey) === "true");
    allowFreeTeamChoiceInput.disabled = isGameStarted();
    showPanel(isGameStarted() ? "question" : "start");
    useCachedQuestionBankLink();
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
  modeBadge.dataset.mode = config.apiMode === "gas" ? "gas" : "demo";
  backendStatus.textContent = config.apiMode === "gas"
    ? "請輸入管理密碼並套用設定。"
    : "目前為示範模式，尚未連接正式 GAS 後端。";
}

function setQuestionBankLinkDisabled(message) {
  if (!questionBankLink) return;
  questionBankLink.href = "#";
  questionBankLink.classList.add("is-disabled");
  questionBankLink.setAttribute("aria-disabled", "true");
  if (questionBankStatus) {
    questionBankStatus.textContent = message;
  }
}

function useCachedQuestionBankLink() {
  if (!questionBankLink) return false;
  const cachedUrl = localStorage.getItem(questionBankUrlKey) || "";
  if (!cachedUrl) return false;
  questionBankLink.href = cachedUrl;
  questionBankLink.classList.remove("is-disabled");
  questionBankLink.setAttribute("aria-disabled", "false");
  if (questionBankStatus) {
    questionBankStatus.textContent = localStorage.getItem(questionBankMessageKey) || "已載入上次取得的題庫連結。";
  }
  return true;
}

async function loadQuestionBankLink(options = {}) {
  if (!questionBankLink) return;
  const forceRefresh = Boolean(options.forceRefresh);
  if (!forceRefresh && useCachedQuestionBankLink()) return;
  const adminSecretValue = getAdminSecret();
  if (!adminSecretValue) {
    setQuestionBankLinkDisabled("套用管理密碼後，可開啟正式 Google Sheet 題庫。");
    return;
  }

  if (questionBankStatus) {
    questionBankStatus.textContent = "正在取得題庫連結…";
  }
  try {
    const result = await callGameApi("getQuestionBankInfo", {}, { adminSecret: adminSecretValue });
    questionBankLink.href = result.questionBankUrl || result.spreadsheetUrl || "#";
    questionBankLink.classList.remove("is-disabled");
    questionBankLink.setAttribute("aria-disabled", "false");
    localStorage.setItem(questionBankUrlKey, questionBankLink.href);
    localStorage.setItem(questionBankMessageKey, result.message || "已取得題庫連結；中文欄位說明已建立在 Google Sheet。");
    if (questionBankStatus) {
      questionBankStatus.textContent = result.message || "已取得題庫連結；中文欄位說明已建立在 Google Sheet。";
    }
  } catch (error) {
    setQuestionBankLinkDisabled(error.message || "無法取得題庫連結。");
  }
}

async function importTaiwanQuestionBank() {
  const confirmed = await showConfirmDialog({
    title: "匯入臺灣題庫",
    message: "會以 20 題臺灣生活趣味問答取代目前 Google Sheet 題庫，原題庫資料列會被清除。",
    confirmText: "匯入題庫",
    cancelText: "取消"
  });
  if (!confirmed) return;

  const adminSecretValue = getAdminSecret();
  if (!adminSecretValue) {
    if (questionBankStatus) questionBankStatus.textContent = "請先套用管理密碼。";
    return;
  }

  importTaiwanQuestionBankButton.disabled = true;
  if (questionBankStatus) questionBankStatus.textContent = "正在匯入臺灣生活趣味題庫…";
  try {
    const result = await callGameApi("replaceQuestionBankWithTaiwanQuestions", {}, { adminSecret: adminSecretValue });
    if (questionBankStatus) {
      questionBankStatus.textContent = result.message || `題庫已匯入，共 ${result.questionCount || 0} 題。`;
    }
    await loadQuestionOptions({ forceRefresh: true });
  } catch (error) {
    if (questionBankStatus) questionBankStatus.textContent = error.message || "匯入題庫失敗。";
  } finally {
    importTaiwanQuestionBankButton.disabled = false;
  }
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
    : "尚未讀到 Firebase 公開題庫，已先載入臺灣生活趣味題庫備用清單。";
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

async function loadQuestionOptions(options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  refreshQuestionsButton.disabled = true;
  questionStatus.textContent = forceRefresh ? "正在同步 Google Sheet 題庫並重新讀取…" : "正在讀取題目清單…";

  try {
    if (forceRefresh) {
      const result = await callGameApi("refreshQuestionBank", {}, { adminSecret: getAdminSecret() });
      questionStatus.textContent = `題庫已同步，共 ${result.questionCount || 0} 題，正在更新清單…`;
    }
    const questions = await getPublicQuestions({ forceRefresh });
    renderQuestionOptions(questions);
  } catch (error) {
    if (forceRefresh) {
      questionStatus.textContent = error.message || "重新讀取題目清單失敗。";
    } else {
      renderQuestionOptions(null);
    }
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

    const rank = document.createElement("strong");
    rank.textContent = `第 ${index + 1} 名　${getTeamLabel(row.teamId, row.teamName)}　獲得總分 ${Math.ceil(totalScoreValue)} 分`;

    const playerCountNode = document.createElement("span");
    playerCountNode.textContent = `戰隊人數：${playerCount}`;

    const totalScore = document.createElement("span");
    totalScore.textContent = `答題總分：${Number(row.totalScore || 0).toFixed(1)}`;

    const averageScoreNode = document.createElement("span");
    averageScoreNode.textContent = `答題平均：${averageScore.toFixed(1)}`;

    const bonusScore = document.createElement("span");
    bonusScore.textContent = `道具加成：+${teamBonusScore}`;

    const finalScoreNode = document.createElement("span");
    finalScoreNode.textContent = `獲得總分：${totalScoreValue.toFixed(1)}（平均分 ${averageScore.toFixed(1)}／道具 ${teamBonusScore.toFixed(1)}）`;

    item.append(rank, playerCountNode, totalScore, averageScoreNode, bonusScore, finalScoreNode);
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
    creativeStatus.textContent = "正在讀取隊內候選…";
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
    reportStatus.textContent = "正在建立賽後報表…";
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
  computerPlayerStatus.textContent = "正在加入電腦學員…";
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
  computerPlayerStatus.textContent = "電腦學員正在作答目前題目…";
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
  const confirmed = await showInstructorConfirm({
    title: "結算競賽",
    message: `投影端會先顯示 ${Math.ceil(finalItemUseCountdownMs / 1000)} 秒最後道具使用倒數，接著公布正式成績。`,
    confirmLabel: "開始結算",
    tone: "danger"
  });
  if (!confirmed) return;

  finalizeCompetitionButton.disabled = true;
  try {
    const countdown = await callGameApi("startFinalSettlementCountdown", {}, { adminSecret: getAdminSecret() });
    const endAt = Date.parse(countdown.finalItemUseEndsAt || "");
    finalizeStatus.textContent = "已通知投影端顯示最後道具使用倒數，20 秒後正式結算。";
    if (Number.isFinite(endAt)) {
      const renderCountdown = () => {
        const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        finalizeStatus.textContent = remaining > 0
          ? `最後道具使用倒數 ${remaining} 秒。`
          : "最後道具使用時間已結束，準備結算。";
      };
      renderCountdown();
      const timer = window.setInterval(renderCountdown, 500);
      await wait(finalSettlementDelayMs);
      window.clearInterval(timer);
    } else {
      await wait(finalSettlementDelayMs);
    }
    finalizeStatus.textContent = "正在結算競賽…";
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
  backendStatus.textContent = "講師已完成設定。";
  loadQuestionBankLink({ forceRefresh: true });
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
    loadQuestionBankLink({ forceRefresh: true });
    await loadQuestionOptions();
  } catch (error) {
    gameStatus.textContent = error.message;
  }
});

document.querySelector("#resetGameData").addEventListener("click", async () => {
  try {
    const confirmed = await showInstructorConfirm({
      title: "清空資料",
      message: "會清空本場玩家、作答、排行榜、寶箱、道具與獎項紀錄；題庫與戰隊設定會保留。",
      confirmLabel: "清空資料",
      tone: "danger"
    });
    if (!confirmed) return;

    const result = await callGameApi("resetGameData", {}, { adminSecret: getAdminSecret() });
    gameStatus.textContent = result.message || "已清空資料，請重新啟動場次。";
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

async function grantTreasureBox(payload, button, successMessage) {
  try {
    button.disabled = true;
    questionStatus.textContent = "正在啟用寶箱…";
    const result = await callGameApi("grantTreasureBoxes", payload, { adminSecret: getAdminSecret() });
    updateAdditionalTreasureButtons(result);
    questionStatus.textContent = successMessage(result);
  } catch (error) {
    questionStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

grantTreasureBoxButtons.forEach(button => {
  button.addEventListener("click", async () => {
    const slot = Number(button.dataset.grantSlot || 0);
    await grantTreasureBox(
      { grantType: "additional", slot },
      button,
      () => `已啟用追加寶箱第 ${slot} 箱。`
    );
  });
});

grantLaggingTreasureBoxButton?.addEventListener("click", async () => {
  const teamId = laggingTreasureTeamSelect?.value || "";
  if (!teamId) {
    questionStatus.textContent = "請先選擇要啟用落後寶箱的戰隊。";
    return;
  }
  await grantTreasureBox(
    { grantType: "lagging", teamId },
    grantLaggingTreasureBoxButton,
    () => `已啟用 ${getTeamLabel(teamId)} 的落後寶箱。`
  );
});

document.querySelector("#reopenQuestion")?.addEventListener("click", async () => {
  try {
    const questionId = questionSelect.value;
    if (!questionId) {
      questionStatus.textContent = "請先選擇題目。";
      return;
    }

    const confirmed = await showInstructorConfirm({
      title: "重新開題",
      message: "只會開放尚未作答的學員繼續作答；已作答學員仍會維持鎖定。",
      confirmLabel: "重新開放",
      tone: "default"
    });
    if (!confirmed) return;

    const result = await callGameApi("reopenQuestion", {
      questionId
    }, { adminSecret: getAdminSecret() });
    rememberOpenedQuestionIds(result.openedQuestionIds || result.questionId);
    [...questionSelect.options].forEach(option => {
      option.disabled = openedQuestionIds.has(option.value);
    });
    setQuestionFlowStatus(`已重新開放 ${result.questionId}`, "尚未作答的學員可以重新作答，已作答學員會維持鎖定。");
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

    setQuestionFlowStatus("關題中，正在公布答案並準備結算。", "關題中，請等待成績結算。");
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
  if (isClosingQuestion) {
    return;
  }
  isClosingQuestion = true;
  const closeButton = event.currentTarget;
  if (closeButton) closeButton.disabled = true;
  try {
    const questionId = questionSelect.value;
    if (!questionId) {
      questionStatus.textContent = "請先選擇題目。";
      return;
    }

    setQuestionFlowStatus("已關題，先公布答案。正在結算成績。");
    renderLocalAnswerReveal(getSelectedQuestion());
    const result = await callGameApi("closeAndScoreQuestion", {
      questionId
    }, { adminSecret: getAdminSecret() });
    questionStatus.textContent = "已關題並公布答案。講解期間會繼續結算成績。";
    renderAnswerReveal(result);
    renderLocalAnswerReveal({
      correctAnswerText: result.correctAnswerText || result.correctAnswer || "",
      explanation: result.explanation || ""
    });
    scoreboardStatus.textContent = "正在結算本題成績，完成後會更新排行榜。";
    runCloseScoring(questionId).finally(() => {
      isClosingQuestion = false;
      if (closeButton) closeButton.disabled = false;
    });
    return;
  } catch (error) {
    questionStatus.textContent = error.message;
    isClosingQuestion = false;
    if (closeButton) closeButton.disabled = false;
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
  finalResultSummary.textContent = `競賽已結算，共 ${rows.length} 筆戰隊成績。`;
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

refreshQuestionsButton.addEventListener("click", () => loadQuestionOptions({ forceRefresh: true }));
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
if (questionBankLink) {
  questionBankLink.addEventListener("click", event => {
    if (questionBankLink.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
    }
  });
}
if (importTaiwanQuestionBankButton) {
  importTaiwanQuestionBankButton.addEventListener("click", importTaiwanQuestionBank);
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
initializeLoadingStateObserver();
syncInitialStage();

function initializeLoadingStateObserver() {
  const loadingPattern = /(正在|讀取|等待|確認|送出|結算|同步|稍候)/;
  const targets = [
    backendStatus,
    gameStatus,
    questionStatus,
    questionBankStatus,
    scoreboardStatus,
    computerPlayerStatus,
    finalizeStatus,
    finalResultSummary
  ].filter(Boolean);
  const update = node => {
    node.classList.toggle("is-loading", loadingPattern.test(node.textContent || ""));
  };
  targets.forEach(node => {
    update(node);
    new MutationObserver(() => update(node)).observe(node, { childList: true, subtree: true, characterData: true });
  });
}
