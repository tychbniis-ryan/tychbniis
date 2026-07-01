(function () {
  "use strict";

  const config = window.TYC_VACCINE_TEST_CONFIG || {};
  const PLAYER_ID_KEY = "tycVaccineTestPlayerId";
  const NICKNAME_KEY = "tycVaccineTestNickname";
  const DRAFT_KEY = "tycVaccineTestSoloDraft";
  const DEFAULT_TIME_LIMIT = Number(config.questionTimeLimitSec || 60);

  const state = {
    nickname: "",
    playerId: getOrCreatePlayerId(),
    questions: [],
    questionIndex: 0,
    selectedAnswers: new Set(),
    answerChoicesRevealed: false,
    answerStartedAt: 0,
    timerId: 0,
    remainingSeconds: DEFAULT_TIME_LIMIT,
    phase: "home",
    inventory: {},
    boxes: [],
    achievementIds: new Set(),
    claimedAchievementIds: new Set(),
    answers: [],
    itemUses: [],
    achievements: [],
    score: 0,
    answerScore: 0,
    itemScore: 0,
    achievementScore: 0,
    correctCount: 0,
    currentBaseScore: 0,
    activeDoubleCount: 0,
    lastResult: null,
    lastTreasure: null,
    challengeResult: null,
    activePanel: "",
    resultModalTimerId: 0,
    leaderboardRows: [],
    leaderboardStatus: "idle",
    leaderboardError: "",
    leaderboardLoadedAt: "",
    leaderboardPromise: null
  };

  const itemLabels = {
    score_1: "+1 加分卡",
    score_3: "+3 加分卡",
    score_5: "+5 加分卡",
    score_10: "+10 加分卡",
    double: "加倍卡",
    challenge: "挑戰卡",
    empty: "空寶箱"
  };

  const itemAssets = {
    score_1: "../assets/images/items/item-score-1.png",
    score_3: "../assets/images/items/item-score-3.png",
    score_5: "../assets/images/items/item-score-5.png",
    score_10: "../assets/images/items/item-score-10.png",
    double: "../assets/images/items/item-double.png",
    challenge: "../assets/images/items/item-challenge.png",
    empty: "../assets/images/items/item-empty.png"
  };

  const itemWeights = [
    ["score_1", 25],
    ["score_3", 20],
    ["score_5", 15],
    ["score_10", 8],
    ["double", 12],
    ["challenge", 15],
    ["empty", 5]
  ];

  const scoreCardValues = {
    score_1: 1,
    score_3: 3,
    score_5: 5,
    score_10: 10
  };

  const achievementDefinitions = [
    { id: "correct_3", type: "totalCorrect", threshold: 3, label: "累積答對 3 題", rewardBoxCount: 1 },
    { id: "correct_5", type: "totalCorrect", threshold: 5, label: "累積答對 5 題", rewardBoxCount: 1 },
    { id: "correct_10", type: "totalCorrect", threshold: 10, label: "累積答對 10 題", rewardBoxCount: 1 },
    { id: "correct_20", type: "totalCorrect", threshold: 20, label: "累積答對 20 題", rewardBoxCount: 1 },
    { id: "correct_30", type: "totalCorrect", threshold: 30, label: "累積答對 30 題", rewardBoxCount: 1 },
    { id: "correct_40", type: "totalCorrect", threshold: 40, label: "累積答對 40 題", rewardBoxCount: 1 },
    { id: "correct_50", type: "totalCorrect", threshold: 50, label: "累積答對 50 題", rewardBoxCount: 1 },
    { id: "correct_60", type: "totalCorrect", threshold: 60, label: "累積答對 60 題", rewardBoxCount: 1 },
    { id: "streak_3", type: "streak", threshold: 3, label: "連續答對 3 題", rewardBoxCount: 1 },
    { id: "streak_5", type: "streak", threshold: 5, label: "連續答對 5 題", rewardBoxCount: 1 },
    { id: "streak_10", type: "streak", threshold: 10, label: "連續答對 10 題", rewardBoxCount: 1 },
    { id: "streak_20", type: "streak", threshold: 20, label: "連續答對 20 題", rewardBoxCount: 1 },
    { id: "perfect_all", type: "perfect", threshold: "all", label: "個人全對", rewardBoxCount: 0, score: 100 }
  ];

  const achievementAssets = {
    correct_3: "../assets/images/achievements/achievement-correct-3.png",
    correct_5: "../assets/images/achievements/achievement-correct-5.png",
    correct_10: "../assets/images/achievements/achievement-correct-10.png",
    streak_3: "../assets/images/achievements/achievement-streak-3.png",
    streak_5: "../assets/images/achievements/achievement-streak-5.png",
    perfect_all: "../assets/images/achievements/achievement-perfect.png"
  };

  const challengeAssets = {
    big: "../assets/images/challenge/challenge-choice-big.png",
    small: "../assets/images/challenge/challenge-choice-small.png",
    skip: "../assets/images/challenge/challenge-choice-skip.png",
    success: "../assets/images/challenge/challenge-result-success.png",
    miss: "../assets/images/challenge/challenge-result-miss.png",
    skipResult: "../assets/images/challenge/challenge-result-skip.png"
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const savedNickname = window.localStorage.getItem(NICKNAME_KEY) || "";
    const openStartModalBtn = document.getElementById("openStartModalBtn");
    const leaderboardBtn = document.getElementById("leaderboardBtn");
    const resumeBtn = document.getElementById("resumeBtn");
    const discardDraftBtn = document.getElementById("discardDraftBtn");

    if (openStartModalBtn) openStartModalBtn.addEventListener("click", () => openStartModal(savedNickname));
    if (leaderboardBtn) leaderboardBtn.addEventListener("click", openHomeLeaderboardModal);
    if (resumeBtn) resumeBtn.addEventListener("click", resumeGame);
    if (discardDraftBtn) discardDraftBtn.addEventListener("click", discardDraft);

    validateHome();
    preloadQuestionStatus();
    preloadLeaderboard();
  }

  async function preloadQuestionStatus() {
    setStartStatus("題庫讀取中，請稍候。");
    try {
      const questions = await fetchQuestions();
      state.questions = questions;
      setStartStatus(`題庫已就緒，共 ${questions.length} 題。`, "success");
    } catch (error) {
      setStartStatus(`題庫讀取失敗：${error.message}`, "error");
    }
    renderDraftPanel();
    validateHome();
  }

  function validateHome() {
    const nicknameInput = document.getElementById("nicknameInput");
    const startBtn = document.getElementById("startBtn");
    const nickname = sanitizeNickname(nicknameInput ? nicknameInput.value : "");
    if (startBtn) startBtn.disabled = !nickname || !state.questions.length;
    renderDraftPanel();
  }

  function openStartModal(defaultNickname) {
    const modal = document.getElementById("homeModal");
    const template = document.getElementById("startModalTemplate");
    if (!modal || !template) return;
    modal.hidden = false;
    modal.innerHTML = template.innerHTML;
    document.body.classList.add("is-utility-open");
    const input = modal.querySelector("#nicknameInput");
    const startBtn = modal.querySelector("#startBtn");
    if (input) {
      input.value = defaultNickname || window.localStorage.getItem(NICKNAME_KEY) || "";
      input.addEventListener("input", validateHome);
      window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
    }
    if (startBtn) {
      startBtn.addEventListener("click", startGame);
    }
    modal.querySelectorAll("[data-close-home-modal]").forEach(button => {
      button.addEventListener("click", closeHomeModal);
    });
    validateHome();
  }

  function openHomeLeaderboardModal() {
    const modal = document.getElementById("homeModal");
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("is-utility-open");
    modal.innerHTML = `
      <div class="utility-backdrop" data-close-home-modal="1"></div>
      <section class="utility-panel home-modal-panel" role="dialog" aria-modal="true" aria-label="排行榜">
        <div class="utility-panel-header">
          <h2>排行榜</h2>
          <button class="icon-btn" type="button" data-close-home-modal="1" aria-label="關閉">X</button>
        </div>
        <div class="utility-panel-body">
          <div id="homeLeaderboard" class="leaderboard compact-list"></div>
        </div>
      </section>
    `;
    modal.querySelectorAll("[data-close-home-modal]").forEach(button => {
      button.addEventListener("click", closeHomeModal);
    });
    loadLeaderboard("homeLeaderboard");
  }

  function closeHomeModal() {
    const modal = document.getElementById("homeModal");
    if (!modal) return;
    modal.hidden = true;
    modal.innerHTML = "";
    document.body.classList.remove("is-utility-open");
  }

  function setStartStatus(message, type) {
    const el = document.getElementById("startStatus");
    if (!el) return;
    el.className = `status-text${type ? ` ${type}` : ""}`;
    el.textContent = message;
  }

  async function startGame() {
    const input = document.getElementById("nicknameInput");
    const nickname = sanitizeNickname(input ? input.value : "");
    if (!nickname) {
      setStartStatus("請先輸入暱稱。", "error");
      return;
    }
    if (!state.questions.length) {
      await preloadQuestionStatus();
      if (!state.questions.length) return;
    }
    window.localStorage.setItem(NICKNAME_KEY, nickname);
    closeHomeModal();
    resetRunState(nickname);
    renderQuiz();
    showQuestion();
  }

  function resetRunState(nickname) {
    clearTimer();
    state.nickname = nickname;
    state.questionIndex = 0;
    state.answers = [];
    state.itemUses = [];
    state.achievements = [];
    state.inventory = {};
    state.boxes = [];
    state.achievementIds = new Set();
    state.claimedAchievementIds = new Set();
    state.score = 0;
    state.answerScore = 0;
    state.itemScore = 0;
    state.achievementScore = 0;
    state.correctCount = 0;
    state.currentBaseScore = 0;
    state.activeDoubleCount = 0;
    state.lastResult = null;
    state.lastTreasure = null;
    state.challengeResult = null;
    state.phase = "question";
  }

  async function fetchQuestions() {
    const params = new URLSearchParams(window.location.search);
    const useLocal = params.get(config.localQuestionParam || "localQuestions") === "1";
    if (useLocal) {
      return normalizeQuestions(await fetchJson(config.localQuestionSeedUrl));
    }
    const baseUrl = String(config.firebaseDatabaseUrl || "").replace(/\/$/, "");
    const path = String(config.questionPath || "").replace(/^\/+/, "");
    if (!baseUrl || !path) {
      throw new Error("題庫服務設定未完成");
    }
    const url = `${baseUrl}/${path}.json?ts=${Date.now()}`;
    return normalizeQuestions(await fetchJson(url));
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function normalizeQuestions(raw) {
    const values = Array.isArray(raw) ? raw : Object.values(raw || {});
    const questions = values
      .filter(item => item && item.enabled !== false && item.enabled !== "FALSE")
      .map(item => ({
        questionId: String(item.questionId || ""),
        order: Number(item.order || 0),
        sourceBank: String(item.sourceBank || ""),
        type: String(item.type || "single"),
        title: String(item.title || ""),
        options: normalizeOptions(item.options),
        correctAnswer: normalizeAnswer(item.correctAnswer),
        explanation: String(item.explanation || ""),
        timeLimitSec: Number(item.timeLimitSec || DEFAULT_TIME_LIMIT),
        enabled: true
      }))
      .filter(item => item.questionId && item.title && Object.keys(item.options).length)
      .sort((a, b) => a.order - b.order || a.questionId.localeCompare(b.questionId));
    if (!questions.length) throw new Error("題庫目前沒有可使用的題目");
    return questions;
  }

  function normalizeOptions(options) {
    if (Array.isArray(options)) {
      return options.reduce((result, text, index) => {
        if (text) result[String.fromCharCode(65 + index)] = String(text);
        return result;
      }, {});
    }
    if (options && typeof options === "object") {
      return Object.entries(options).reduce((result, [key, value]) => {
        if (value !== undefined && value !== "") result[String(key).toUpperCase()] = String(value);
        return result;
      }, {});
    }
    return {};
  }

  function renderQuiz() {
    document.body.classList.add("is-solo-playing");
    document.body.classList.remove("is-solo-summary", "is-utility-open");
    document.getElementById("app").className = "quiz-layout";
    document.getElementById("app").innerHTML = `
      <section class="quiz-card" id="questionArea"></section>
      <aside class="panel side-panel" id="sideArea"></aside>
      <div id="utilityModal" class="utility-modal" hidden></div>
    `;
  }

  function showQuestion() {
    clearTimer();
    state.phase = "question";
    state.selectedAnswers = new Set();
    state.answerChoicesRevealed = false;
    state.lastResult = null;
    state.lastTreasure = null;
    state.currentBaseScore = 0;
    const question = currentQuestion();
    state.remainingSeconds = Number(question.timeLimitSec || DEFAULT_TIME_LIMIT);
    state.answerStartedAt = Date.now();
    renderQuestion();
    tickTimer();
    state.timerId = window.setInterval(tickTimer, 1000);
    saveDraft();
  }

  function renderQuestion(options = {}) {
    const question = currentQuestion();
    const answered = Boolean(options.answered);
    const choicesRevealed = answered || state.answerChoicesRevealed;
    const optionButtons = Object.entries(question.options).map(([key, text]) => {
      const isSelected = state.selectedAnswers.has(key);
      return `
        <button class="option-btn${isSelected ? " selected" : ""}" type="button" data-answer="${escapeHtml(key)}" ${answered ? "disabled" : ""}>
          <span class="option-key">${escapeHtml(key)}</span>
          <span class="option-text">${renderReadableText(text, "option")}</span>
        </button>
      `;
    }).join("");

    const questionArea = document.getElementById("questionArea");
    questionArea.classList.toggle("is-answered", answered);
    questionArea.innerHTML = `
      <div class="quiz-header">
        <div>
          <p class="eyebrow">${escapeHtml(question.sourceBank || "題庫")}</p>
          <h2>第 ${state.questionIndex + 1} 題 / 共 ${state.questions.length} 題</h2>
        </div>
        <div class="score-strip">
          <span class="pill">暱稱 ${escapeHtml(state.nickname)}</span>
          <span class="pill">分數 ${state.score}</span>
          <span id="timer" class="pill timer">${state.remainingSeconds} 秒</span>
        </div>
      </div>
      <div class="question-title">${renderReadableText(question.title, "question")}</div>
      ${renderUtilityButtons()}
      ${choicesRevealed ? `<div class="answer-reveal"><p class="status-text">請在彈出視窗選擇答案並確認送出。</p></div>` : `
        <div class="answer-reveal">
          <p class="status-text">請先閱讀題目，準備好後再開始選答案。</p>
          <button id="showOptionsBtn" class="primary-btn" type="button">開始作答</button>
        </div>
      `}
    `;

    if (!answered) {
      const showOptionsBtn = document.getElementById("showOptionsBtn");
      if (showOptionsBtn) showOptionsBtn.addEventListener("click", revealAnswerChoices);
    }
    bindUtilityButtons();
    renderSideArea();
  }

  function renderSideArea() {
    const side = document.getElementById("sideArea");
    if (!side) return;
    side.innerHTML = `
      <h2>闖關狀態</h2>
      <div class="compact-list score-list">
        <div class="rank-row"><span>答對</span><strong>${state.correctCount}</strong><span>題</span></div>
        <div class="rank-row"><span>答題分</span><strong>${state.answerScore}</strong><span>分</span></div>
        <div class="rank-row"><span>道具分</span><strong>${state.itemScore}</strong><span>分</span></div>
        <div class="rank-row"><span>成就分</span><strong>${state.achievementScore}</strong><span>分</span></div>
      </div>
      <div class="inventory-title">
        <h3>道具箱</h3>
        <img class="pixel-icon" src="../assets/images/items/item-chest-closed.png" alt="">
      </div>
      <div class="item-grid side-items">${renderInventoryButtons(false)}</div>
      <p class="status-text">道具只能在答題後、進入下一題前使用。</p>
    `;
  }

  function renderUtilityButtons() {
    const hasAnswer = state.phase !== "question" && Boolean(state.lastResult);
    return `
      <div class="utility-bar" aria-label="測驗工具">
        <button class="utility-btn" type="button" data-panel="status">狀態</button>
        <button class="utility-btn" type="button" data-panel="treasure" ${hasAnswer ? "" : "disabled"}>寶箱</button>
        <button class="utility-btn" type="button" data-panel="achievements">成就</button>
        <button class="utility-btn" type="button" data-panel="items">道具</button>
        <button class="utility-btn" type="button" data-panel="explanation" ${hasAnswer ? "" : "disabled"}>解析</button>
        <button class="utility-btn" type="button" data-panel="leaderboard">排行</button>
      </div>
    `;
  }

  function bindUtilityButtons() {
    decorateUtilityBadges();
    document.querySelectorAll("[data-panel]").forEach(button => {
      button.addEventListener("click", () => openUtilityPanel(button.dataset.panel));
    });
  }

  function decorateUtilityBadges() {
    const badges = {
      treasure: countUnopenedBoxes(),
      achievements: countClaimableAchievements()
    };
    Object.entries(badges).forEach(([panelName, count]) => {
      document.querySelectorAll(`[data-panel="${panelName}"]`).forEach(button => {
        button.classList.toggle("has-alert", count > 0);
        button.querySelectorAll(".notice-dot").forEach(dot => dot.remove());
        if (count > 0) {
          button.insertAdjacentHTML("beforeend", renderNotificationBadge(count));
        }
      });
    });
  }

  function countUnopenedBoxes() {
    return state.boxes.filter(box => box && box.status === "unopened").length;
  }

  function countClaimableAchievements() {
    return getAchievementRows().filter(row => row.claimable).length;
  }

  function renderNotificationBadge(count) {
    const value = Number(count || 0);
    if (!value) return "";
    return `<span class="notice-dot" aria-label="${value} 個待處理">${value > 9 ? "9+" : value}</span>`;
  }

  function openUtilityPanel(panelName, message) {
    const modal = document.getElementById("utilityModal");
    if (!modal) return;
    state.activePanel = panelName;
    document.body.classList.add("is-utility-open");
    modal.hidden = false;
    modal.innerHTML = `
      <div class="utility-backdrop" data-close-panel="1"></div>
      <section class="utility-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(panelTitle(panelName))}">
        <div class="utility-panel-header">
          <h2>${escapeHtml(panelTitle(panelName))}</h2>
          <button class="icon-btn" type="button" data-close-panel="1" aria-label="關閉">X</button>
        </div>
        <div id="utilityPanelBody" class="utility-panel-body">
          ${renderUtilityPanelBody(panelName, message)}
        </div>
      </section>
    `;
    modal.querySelectorAll("[data-close-panel]").forEach(button => {
      button.addEventListener("click", closeUtilityPanel);
    });
    modal.querySelectorAll("[data-item]").forEach(button => {
      button.addEventListener("click", () => useItem(button.dataset.item));
    });
    modal.querySelectorAll("[data-box]").forEach(button => {
      button.addEventListener("click", () => openTreasureBox(button.dataset.box));
    });
    modal.querySelectorAll("[data-achievement]").forEach(button => {
      button.addEventListener("click", () => claimAchievement(button.dataset.achievement));
    });
    modal.querySelectorAll("[data-challenge-choice]").forEach(button => {
      button.addEventListener("click", () => settleChallengeChoice(button.dataset.challengeChoice));
    });
    if (panelName === "leaderboard") {
      loadLeaderboard("utilityPanelBody");
    }
  }

  function closeUtilityPanel() {
    const modal = document.getElementById("utilityModal");
    if (!modal) return;
    window.clearTimeout(state.resultModalTimerId || 0);
    state.resultModalTimerId = 0;
    modal.hidden = true;
    modal.innerHTML = "";
    state.activePanel = "";
    document.body.classList.remove("is-utility-open");
  }

  function panelTitle(panelName) {
    const titles = {
      status: "闖關狀態",
      treasure: "寶箱",
      achievements: "成就",
      items: "道具",
      explanation: "解析",
      leaderboard: "排行榜",
      challenge: "挑戰卡"
    };
    return titles[panelName] || "測驗工具";
  }

  function renderUtilityPanelBody(panelName, message) {
    if (panelName === "status") return renderStatusPanel();
    if (panelName === "treasure") return renderTreasurePanelV2();
    if (panelName === "achievements") return renderAchievementsPanelV2();
    if (panelName === "items") return renderItemsPanel(message);
    if (panelName === "explanation") return renderExplanationPanel();
    if (panelName === "leaderboard") return `<p class="status-text">排行榜讀取中。</p>`;
    if (panelName === "challenge") return renderChallengePanel(message);
    return "";
  }

  function renderStatusPanel() {
    const currentQuestionNumber = Math.min(state.questionIndex + 1, state.questions.length);
    const totalQuestions = state.questions.length || 0;
    const answeredCount = state.answers.length || 0;
    const accuracy = answeredCount ? Math.round((state.correctCount / answeredCount) * 100) : 0;
    return `
      <div class="status-dashboard">
        <article class="status-hero-card">
          <span>目前總分</span>
          <strong>${state.score}</strong>
          <small>第 ${currentQuestionNumber} / ${totalQuestions} 題</small>
        </article>
        <div class="status-metric-grid">
          ${renderStatusMetric("答對", state.correctCount, "題")}
          ${renderStatusMetric("正確率", accuracy, "%")}
          ${renderStatusMetric("答題分", state.answerScore, "分")}
          ${renderStatusMetric("道具分", state.itemScore, "分")}
          ${renderStatusMetric("成就分", state.achievementScore, "分")}
          ${renderStatusMetric("剩餘秒數", state.remainingSeconds, "秒")}
        </div>
      </div>
    `;
    return `
      <div class="compact-list score-list">
        <div class="rank-row"><span>目前題數</span><strong>${Math.min(state.questionIndex + 1, state.questions.length)}</strong><span>題</span></div>
        <div class="rank-row"><span>總分</span><strong>${state.score}</strong><span>分</span></div>
        <div class="rank-row"><span>答對</span><strong>${state.correctCount}</strong><span>題</span></div>
        <div class="rank-row"><span>答題分</span><strong>${state.answerScore}</strong><span>分</span></div>
        <div class="rank-row"><span>道具分</span><strong>${state.itemScore}</strong><span>分</span></div>
        <div class="rank-row"><span>成就分</span><strong>${state.achievementScore}</strong><span>分</span></div>
      </div>
    `;
  }

  function renderStatusMetric(label, value, unit) {
    return `
      <div class="status-metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}<small>${escapeHtml(unit)}</small></strong>
      </div>
    `;
  }

  function renderTreasurePanel() {
    if (!state.lastResult) return `<p class="status-text">答題後才會顯示寶箱結果。</p>`;
    if (!state.lastTreasure) {
      return `
        <div class="treasure-open-message">
          <img class="pixel-icon" src="../assets/images/items/item-chest-closed.png" alt="">
          <span>本題沒有開出寶箱。</span>
        </div>
      `;
    }
    return renderTreasureResult();
  }

  function renderAchievementsPanel() {
    if (!state.achievements.length) return `<p class="status-text">目前尚未取得成就。</p>`;
    return `
      <div class="compact-list">
        ${state.achievements.map(item => `
          <div class="rank-row achievement-row">
            <span>${escapeHtml(item.label || "成就")}</span>
            <strong>${Number(item.score || 0)}</strong>
            <span>分</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderTreasurePanelV2() {
    const unopened = state.boxes.filter(box => box.status === "unopened");
    const list = unopened.length
      ? unopened.map(box => `
        <article class="inventory-item inventory-item--box is-unopened">
          <img class="inventory-icon" src="../assets/images/items/item-chest-closed.png" alt="">
          <div>
            <strong>未開啟寶箱</strong>
            <span>${escapeHtml(getBoxSourceLabel(box.sourceType))}</span>
          </div>
          <button class="secondary-btn compact-action" type="button" data-box="${escapeHtml(box.boxId)}">打開</button>
        </article>
      `).join("")
      : `<p class="status-text">目前沒有未開啟寶箱。答對題目或領取成就後，寶箱會出現在這裡。</p>`;
    return `
      ${renderTreasureResultV2()}
      <div class="compact-list">${list}</div>
    `;
  }

  function renderAchievementsPanelV2() {
    const rows = getAchievementRows();
    return `
      <div class="compact-list achievement-list">
        ${rows.map(row => `
          <article class="achievement-card ${row.claimable ? "is-claimable" : row.claimed ? "is-claimed" : row.completed ? "is-complete" : "is-progress"}">
            <img class="achievement-icon" src="${getAchievementAsset(row)}" alt="">
            <div class="achievement-copy">
              <strong>${escapeHtml(row.label)}</strong>
              <span>${escapeHtml(row.description)}</span>
              <meter min="0" max="${Number(row.target || 1)}" value="${Number(row.current || 0)}"></meter>
            </div>
            ${row.claimable
              ? `<button class="secondary-btn compact-action" type="button" data-achievement="${escapeHtml(row.id)}">領取</button>`
              : `<span class="achievement-badge">${escapeHtml(row.badge)}</span>`}
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderTreasureResultV2() {
    if (!state.lastTreasure) return "";
    const box = state.lastTreasure;
    const itemType = box.itemType || "empty";
    const isOpened = box.status === "opened";
    const src = isOpened ? (itemAssets[itemType] || itemAssets.empty) : "../assets/images/items/item-chest-closed.png";
    const label = itemLabels[itemType] || "寶箱";
    const message = isOpened
      ? itemType === "empty"
        ? "寶箱已打開，這次是空寶箱。"
        : `寶箱已打開，獲得 ${label}。`
      : "獲得 1 個寶箱，請到寶箱面板自行打開。";
    return `
      <div class="treasure-open-message">
        <img class="pixel-icon" src="${src}" alt="">
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function getBoxSourceLabel(sourceType) {
    if (sourceType === "achievement") return "成就獎勵";
    if (sourceType === "correct") return "答對題目獎勵";
    return "測驗獎勵";
  }

  function getAchievementAsset(row) {
    if (achievementAssets[row.id]) return achievementAssets[row.id];
    if (row.type === "streak") return row.threshold >= 5 ? achievementAssets.streak_5 : achievementAssets.streak_3;
    if (row.type === "perfect") return achievementAssets.perfect_all;
    if (row.threshold >= 10) return achievementAssets.correct_10;
    if (row.threshold >= 5) return achievementAssets.correct_5;
    return achievementAssets.correct_3;
  }

  function getAchievementRows() {
    const streak = getCurrentCorrectStreak();
    return achievementDefinitions.map(definition => {
      const completed = state.achievementIds.has(definition.id);
      const claimed = state.claimedAchievementIds.has(definition.id);
      const current = definition.type === "streak"
        ? streak
        : definition.type === "perfect"
          ? state.correctCount
          : state.correctCount;
      const target = definition.type === "perfect" ? state.questions.length || 1 : Number(definition.threshold || 1);
      const claimable = completed && !claimed && Number(definition.rewardBoxCount || 0) > 0;
      return {
        ...definition,
        current: Math.min(Number(current || 0), Number(target || 1)),
        target,
        completed,
        claimed,
        claimable,
        description: definition.type === "perfect"
          ? completed ? "所有題目都答對，直接獲得 100 分。" : "所有題目都答對可直接獲得 100 分。"
          : `進度 ${Math.min(Number(current || 0), Number(target || 1))} / ${target}，達成後可領取寶箱。`,
        badge: claimed ? "已領取" : completed ? (claimable ? "可領取" : "已達成") : "進行中"
      };
    });
  }

  function getCurrentCorrectStreak() {
    let streak = 0;
    for (let index = state.answers.length - 1; index >= 0; index -= 1) {
      if (!state.answers[index].isCorrect) break;
      streak += 1;
    }
    return streak;
  }

  function renderItemsPanel(message) {
    const canUse = state.phase === "between";
    return `
      ${message ? `<p class="status-text success">${escapeHtml(message)}</p>` : ""}
      <p class="status-text">${canUse ? "答題完成後，可以在開始下一題前使用道具。" : "道具只能在答題後、開始下一題前使用。"}</p>
      <div class="item-grid">${renderInventoryButtons(canUse)}</div>
    `;
  }

  function renderChallengePanel(message) {
    const canUse = state.phase === "between" && Number(state.inventory.challenge || 0) > 0;
    const result = state.challengeResult;
    if (result) {
      const image = result.effectScore >= 10 ? challengeAssets.success : result.effectScore > 0 ? challengeAssets.skipResult : challengeAssets.miss;
      return `
        ${message ? `<p class="status-text success">${escapeHtml(message)}</p>` : ""}
        <article class="challenge-result-card ${result.effectScore >= 10 ? "is-success" : result.effectScore > 0 ? "is-skip" : "is-miss"}">
          <img class="challenge-result-icon" src="${image}" alt="">
          <strong>${escapeHtml(result.title)}</strong>
          ${result.choice === "skip" ? "" : `<img class="challenge-result-number" src="../assets/images/challenge/challenge-number-v523-${result.number}.png" alt="">`}
          <span>${escapeHtml(result.detail)}</span>
          <span>本次加 ${Number(result.effectScore || 0)} 分</span>
        </article>
      `;
    }
    return `
      ${message ? `<p class="status-text success">${escapeHtml(message)}</p>` : ""}
      <p class="status-text">${canUse ? "選擇猜大、猜小或不猜。0-4 是小，5-9 是大。" : "目前沒有可使用的挑戰卡。"}</p>
      <div class="challenge-choice-grid">
        ${[
          { choice: "big", label: "猜大", description: "抽到 5-9 加 10 分", image: challengeAssets.big },
          { choice: "small", label: "猜小", description: "抽到 0-4 加 10 分", image: challengeAssets.small },
          { choice: "skip", label: "不猜", description: "直接加 3 分", image: challengeAssets.skip }
        ].map(option => `
          <button class="challenge-choice-card choice-${option.choice}" type="button" data-challenge-choice="${option.choice}" ${canUse ? "" : "disabled"}>
            <img class="challenge-choice-icon" src="${option.image}" alt="">
            <strong>${option.label}</strong>
            <small>${option.description}</small>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderExplanationPanel() {
    const question = currentQuestion();
    const result = state.lastResult;
    if (!question || !result) return `<p class="status-text">答題後才會顯示解析。</p>`;
    return `<div class="explanation-review">${renderReviewDetail({ ...result, title: question.title, explanation: question.explanation })}</div>`;
  }

  function toggleAnswer(answer) {
    if (state.phase !== "question") return;
    if (!state.answerChoicesRevealed) return;
    const question = currentQuestion();
    if (question.type === "multiple") {
      if (state.selectedAnswers.has(answer)) {
        state.selectedAnswers.delete(answer);
      } else {
        state.selectedAnswers.add(answer);
      }
    } else {
      state.selectedAnswers = new Set([answer]);
    }
    document.querySelectorAll(".option-btn").forEach(button => {
      button.classList.toggle("selected", state.selectedAnswers.has(button.dataset.answer));
    });
    document.getElementById("submitAnswerBtn").disabled = state.selectedAnswers.size === 0;
  }

  function revealAnswerChoices() {
    if (state.phase !== "question") return;
    state.answerChoicesRevealed = true;
    renderQuestion();
    openAnswerChoiceModal();
    saveDraft();
  }

  function openAnswerChoiceModal() {
    const modal = document.getElementById("utilityModal");
    const question = currentQuestion();
    if (!modal || !question) return;
    document.body.classList.add("is-utility-open");
    modal.hidden = false;
    modal.innerHTML = `
      <div class="utility-backdrop" data-close-answer-modal="1"></div>
      <section class="utility-panel answer-choice-panel" role="dialog" aria-modal="true" aria-label="選擇答案">
        <div class="utility-panel-header">
          <h2>選擇答案</h2>
          <button class="icon-btn" type="button" data-close-answer-modal="1" aria-label="關閉">X</button>
        </div>
        <div class="utility-panel-body">
          <div class="options-grid answer-choice-grid">
            ${Object.entries(question.options).map(([key, text]) => `
              <button class="option-btn${state.selectedAnswers.has(key) ? " selected" : ""}" type="button" data-answer="${escapeHtml(key)}">
                <span class="option-key">${escapeHtml(key)}</span>
                <span class="option-text">${renderReadableText(text, "option")}</span>
              </button>
            `).join("")}
          </div>
          <button id="submitAnswerBtn" class="primary-btn answer-confirm-btn" type="button" ${state.selectedAnswers.size ? "" : "disabled"}>確認送出</button>
        </div>
      </section>
    `;
    modal.querySelectorAll("[data-close-answer-modal]").forEach(button => {
      button.addEventListener("click", closeAnswerChoiceModal);
    });
    modal.querySelectorAll(".option-btn").forEach(button => {
      button.addEventListener("click", () => toggleAnswer(button.dataset.answer));
    });
    const submitBtn = modal.querySelector("#submitAnswerBtn");
    if (submitBtn) submitBtn.addEventListener("click", () => submitAnswer(false));
  }

  function closeAnswerChoiceModal() {
    if (state.phase === "question") {
      state.answerChoicesRevealed = false;
      state.selectedAnswers = new Set();
      closeUtilityPanel();
      renderQuestion();
      saveDraft();
      return;
    }
    closeUtilityPanel();
  }

  function tickTimer() {
    const timer = document.getElementById("timer");
    if (!timer) return;
    timer.textContent = `${state.remainingSeconds} 秒`;
    timer.classList.toggle("warn", state.remainingSeconds <= 20 && state.remainingSeconds > 10);
    timer.classList.toggle("danger", state.remainingSeconds <= 10);
    if (state.remainingSeconds <= 0) {
      submitAnswer(true);
      return;
    }
    state.remainingSeconds -= 1;
  }

  function submitAnswer(isTimeout) {
    if (state.phase !== "question") return;
    clearTimer();
    state.phase = "between";
    const question = currentQuestion();
    const selectedAnswer = isTimeout ? "" : Array.from(state.selectedAnswers).sort().join(",");
    const responseSeconds = Math.min(
      Number(question.timeLimitSec || DEFAULT_TIME_LIMIT),
      Math.max(0, Math.round((Date.now() - state.answerStartedAt) / 1000))
    );
    const isCorrect = Boolean(selectedAnswer) && selectedAnswer === question.correctAnswer;
    const baseScore = isCorrect ? scoreBySeconds(responseSeconds) : 0;
    const doubleBonus = isCorrect && state.activeDoubleCount > 0 ? baseScore * state.activeDoubleCount : 0;
    state.activeDoubleCount = 0;
    state.currentBaseScore = baseScore + doubleBonus;
    state.answerScore += baseScore;
    state.itemScore += doubleBonus;
    state.score += baseScore + doubleBonus;
    if (isCorrect) state.correctCount += 1;

    const answerRecord = {
      questionId: question.questionId,
      order: question.order,
      title: question.title,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      responseSeconds,
      baseScore,
      itemBonusScore: doubleBonus,
      finalQuestionScore: baseScore + doubleBonus,
      explanation: question.explanation,
      answeredAt: new Date().toISOString()
    };
    state.answers.push(answerRecord);
    state.lastResult = answerRecord;
    grantAchievementIfNeeded();
    state.lastTreasure = maybeDropTreasureV2(question, isCorrect) || null;
    closeUtilityPanel();
    renderAnswerResult();
    saveDraft();
  }

  function renderAnswerResult() {
    const question = currentQuestion();
    const result = state.lastResult;
    if (!result) return;
    const actionLabel = state.questionIndex + 1 >= state.questions.length ? "查看結算" : "前往下一題";

    document.querySelectorAll(".option-btn").forEach(button => {
      button.disabled = true;
    });
    const existingResult = document.getElementById("answerResultBlock");
    const existingMarker = document.getElementById("answerMarkerBlock");
    const existingActions = document.getElementById("betweenActions");
    const answerSubmit = document.querySelector(".answer-submit");
    if (existingResult) existingResult.remove();
    if (existingMarker) existingMarker.remove();
    if (existingActions) existingActions.remove();
    if (answerSubmit) answerSubmit.remove();
    document.querySelectorAll(".utility-bar").forEach(bar => bar.remove());

    const questionArea = document.getElementById("questionArea");
    questionArea.classList.add("is-answered");
    questionArea.insertAdjacentHTML("beforeend", `
      ${renderAnswerMarkerPanel(result, question)}
      ${renderUtilityButtons()}
      <div id="betweenActions" class="between-actions">
        ${renderBetweenActions("", actionLabel)}
      </div>
    `);
    bindUtilityButtons();
    bindBetweenActions();
    renderSideArea();
    openAnswerResultModal(result, question, actionLabel);
    const markerBlock = document.getElementById("answerMarkerBlock");
    if (markerBlock && window.innerWidth > 900) {
      window.requestAnimationFrame(() => markerBlock.scrollIntoView({ block: "start", behavior: "smooth" }));
    } else {
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  }

  function openAnswerResultModal(result, question, actionLabel) {
    const modal = document.getElementById("utilityModal");
    if (!modal || !result) return;
    const score = Number(result.finalQuestionScore || 0);
    const statusText = result.isCorrect ? "答對了" : result.selectedAnswer ? "答錯了" : "時間到";
    const statusClass = result.isCorrect ? "is-correct" : "is-wrong";
    document.body.classList.add("is-utility-open");
    modal.hidden = false;
    modal.innerHTML = `
      <div class="utility-backdrop" data-close-result-modal="1"></div>
      <section class="utility-panel answer-result-panel ${statusClass}" role="dialog" aria-modal="true" aria-label="作答結果">
        <div class="utility-panel-header answer-result-header">
          <h2>作答結果</h2>
          <button class="icon-btn" type="button" data-close-result-modal="1" aria-label="關閉">X</button>
        </div>
        <div class="utility-panel-body">
          <div class="result-hero ${statusClass}">
            <strong>${escapeHtml(statusText)}</strong>
            <span>本題得分</span>
            <b>${score}</b>
          </div>
          ${renderAnswerSummary(result, question)}
          <div class="result-actions">
            <button class="secondary-btn" type="button" data-result-action="explanation">查看解析</button>
            <button class="primary-btn" type="button" data-result-action="next">${escapeHtml(actionLabel)}</button>
          </div>
          <p class="status-text result-countdown">此視窗將於 10 秒後自動關閉。</p>
        </div>
      </section>
    `;
    modal.querySelectorAll("[data-close-result-modal]").forEach(button => {
      button.addEventListener("click", closeUtilityPanel);
    });
    modal.querySelector('[data-result-action="explanation"]')?.addEventListener("click", () => openUtilityPanel("explanation"));
    modal.querySelector('[data-result-action="next"]')?.addEventListener("click", () => {
      closeUtilityPanel();
      nextStep();
    });
    window.clearTimeout(state.resultModalTimerId || 0);
    state.resultModalTimerId = window.setTimeout(() => {
      const activeModal = document.getElementById("utilityModal");
      if (activeModal && activeModal.querySelector(".answer-result-panel")) {
        closeUtilityPanel();
      }
    }, 10000);
  }

  function renderTreasureResult() {
    if (!state.lastTreasure) return "";
    const itemType = state.lastTreasure.itemType;
    const label = itemLabels[itemType] || "寶箱";
    const src = itemAssets[itemType] || itemAssets.empty;
    const message = itemType === "empty" ? "寶箱開啟，這次是空寶箱。" : `寶箱開啟，獲得 ${label}。`;
    return `
      <div class="treasure-open-message">
        <img class="pixel-icon" src="${src}" alt="">
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function renderBetweenActions(message, actionLabel) {
    return `
      <h3>下一步</h3>
      <p class="status-text">${message ? escapeHtml(message) : "如需使用道具，請按上方「道具」開啟道具箱。"}</p>
      <button id="nextQuestionBtn" class="primary-btn" type="button">${escapeHtml(actionLabel)}</button>
    `;
  }

  function renderInventoryButtons(enabled) {
    const ownedItems = Object.keys(itemLabels)
      .filter(itemType => itemType !== "empty")
      .filter(itemType => Number(state.inventory[itemType] || 0) > 0);
    if (!ownedItems.length) {
      return `<p class="status-text inventory-empty">目前尚未取得道具。</p>`;
    }
    return ownedItems
      .map(itemType => {
        const count = Number(state.inventory[itemType] || 0);
        const disabled = enabled && count > 0 ? "" : "disabled";
        return `
          <button class="item-btn" type="button" data-item="${itemType}" ${disabled}>
            <img class="inventory-icon" src="${itemAssets[itemType]}" alt="">
            <span>${itemLabels[itemType]}</span>
            <strong>x${count}</strong>
          </button>
        `;
      }).join("");
  }

  function openTreasureBox(boxId) {
    const box = state.boxes.find(item => item.boxId === boxId && item.status === "unopened");
    if (!box) return;
    box.status = "opened";
    box.openedAt = new Date().toISOString();
    if (box.itemType && box.itemType !== "empty") {
      state.inventory[box.itemType] = Number(state.inventory[box.itemType] || 0) + 1;
    }
    state.lastTreasure = box;
    openUtilityPanel("treasure");
    renderSideArea();
    decorateUtilityBadges();
    refreshBetweenBlock(box.itemType === "empty" ? "寶箱已打開，這次是空寶箱。" : `寶箱已打開，獲得 ${itemLabels[box.itemType] || "道具"}。`);
    saveDraft();
  }

  function claimAchievement(achievementId) {
    const row = getAchievementRows().find(item => item.id === achievementId);
    if (!row || !row.claimable) return;
    state.claimedAchievementIds.add(achievementId);
    const count = Number(row.rewardBoxCount || 1);
    for (let index = 0; index < count; index += 1) {
      state.boxes.push(createTreasureBox({
        seed: `${state.playerId}:${achievementId}:${index}`,
        sourceType: "achievement",
        questionId: achievementId
      }));
    }
    openUtilityPanel("achievements");
    renderSideArea();
    decorateUtilityBadges();
    refreshBetweenBlock(`已領取 ${count} 個成就寶箱，請到寶箱面板自行打開。`);
    saveDraft();
  }

  function bindBetweenActions() {
    const nextBtn = document.getElementById("nextQuestionBtn");
    if (nextBtn) nextBtn.addEventListener("click", nextStep);
    document.querySelectorAll("[data-item]").forEach(button => {
      button.addEventListener("click", () => useItem(button.dataset.item));
    });
  }

  function useItem(itemType) {
    if (state.phase !== "between") return;
    if (Number(state.inventory[itemType] || 0) <= 0) return;
    if (itemType === "challenge") {
      state.challengeResult = null;
      openUtilityPanel("challenge");
      return;
    }
    state.inventory[itemType] -= 1;
    let effectScore = 0;
    let note = "";
    if (scoreCardValues[itemType]) {
      effectScore = scoreCardValues[itemType];
      note = `${itemLabels[itemType]} 增加 ${effectScore} 分。`;
    } else if (itemType === "double") {
      state.activeDoubleCount += 1;
      note = "加倍卡已啟用，下一題答對時加倍計分。";
    } else if (itemType === "challenge") {
      const n = Math.floor(Math.random() * 10);
      const guessBig = window.confirm("挑戰卡：按確定猜 5-9，按取消猜 0-4。");
      const win = guessBig ? n >= 5 : n <= 4;
      effectScore = win ? 10 : 3;
      note = `挑戰結果 ${n}，${win ? "挑戰成功" : "挑戰未成功"}，增加 ${effectScore} 分。`;
    }
    if (effectScore > 0) {
      state.itemScore += effectScore;
      state.score += effectScore;
    }
    state.itemUses.push({
      itemType,
      effectScore,
      note,
      usedAfterQuestionId: currentQuestion().questionId,
      usedAt: new Date().toISOString()
    });
    refreshBetweenBlock(note);
    decorateUtilityBadges();
    if (state.activePanel === "items") {
      openUtilityPanel("items", note);
    }
    saveDraft();
  }

  function settleChallengeChoice(choice) {
    if (state.phase !== "between") return;
    if (Number(state.inventory.challenge || 0) <= 0) return;
    const normalizedChoice = choice === "big" || choice === "small" ? choice : "skip";
    const question = currentQuestion();
    const number = Math.floor(seededNumber(`${state.playerId}:${question.questionId}:${state.itemUses.length}:challenge`) * 10);
    const answer = number >= 5 ? "big" : "small";
    const effectScore = normalizedChoice === "skip" ? 3 : normalizedChoice === answer ? 10 : 0;
    const title = effectScore >= 10 ? "挑戰成功" : effectScore > 0 ? "不猜保底" : "挑戰失敗";
    const detail = normalizedChoice === "skip"
      ? "選擇不猜，直接取得保底分。"
      : `抽到 ${number} 號，${number >= 5 ? "大" : "小"}；你的選擇是${normalizedChoice === "big" ? "大" : "小"}。`;
    state.inventory.challenge -= 1;
    if (effectScore > 0) {
      state.itemScore += effectScore;
      state.score += effectScore;
    }
    state.challengeResult = {
      choice: normalizedChoice,
      number,
      answer,
      effectScore,
      title,
      detail
    };
    state.itemUses.push({
      itemType: "challenge",
      effectScore,
      note: `${title}，${detail}`,
      challengeNumber: number,
      challengeAnswer: answer,
      challengeGuess: normalizedChoice,
      usedAfterQuestionId: question.questionId,
      usedAt: new Date().toISOString()
    });
    openUtilityPanel("challenge", `${title}，本次加 ${effectScore} 分。`);
    refreshBetweenBlock(`${title}，本次加 ${effectScore} 分。`);
    renderSideArea();
    saveDraft();
  }

  function refreshBetweenBlock(message) {
    const block = document.getElementById("betweenActions");
    if (!block) return;
    const actionLabel = state.questionIndex + 1 >= state.questions.length ? "查看結算" : "前往下一題";
    block.innerHTML = renderBetweenActions(message || "道具已使用。", actionLabel);
    bindBetweenActions();
    renderSideArea();
  }

  function nextStep() {
    if (state.questionIndex + 1 >= state.questions.length) {
      finishGame();
      return;
    }
    state.questionIndex += 1;
    showQuestion();
  }

  function finishGame() {
    clearTimer();
    if (state.answers.length !== state.questions.length) {
      state.phase = "between";
      return;
    }
    state.phase = "summary";
    if (state.correctCount === state.questions.length) {
      addAchievement("perfect_all", "個人全對", 100, false);
    }
    clearDraft();
    renderSummary();
    submitResult();
  }

  function renderSummary() {
    document.body.classList.remove("is-solo-playing", "is-utility-open");
    document.body.classList.add("is-solo-summary");
    const totalSeconds = state.answers.reduce((sum, item) => sum + Number(item.responseSeconds || 0), 0);
    const firstReviewItem = getReviewRows(false)[0];
    document.getElementById("app").className = "summary-page";
    document.getElementById("app").innerHTML = `
      <section class="panel summary-panel">
        <div class="summary-header">
          <div>
            <p class="eyebrow">單機闖關版</p>
            <h2>成績結算</h2>
          </div>
          <strong class="summary-score">${state.score}<span>分</span></strong>
        </div>

        <div class="summary-grid">
          <div class="stat">答對題數<strong>${state.correctCount} / ${state.questions.length}</strong></div>
          <div class="stat">總作答時間<strong>${totalSeconds} 秒</strong></div>
          <div class="stat">答題分<strong>${state.answerScore}</strong></div>
          <div class="stat">道具加分<strong>${state.itemScore}</strong></div>
          <div class="stat">成就加分<strong>${state.achievementScore}</strong></div>
          <div class="stat">使用道具<strong>${state.itemUses.length}</strong></div>
          <div class="stat">取得成就<strong>${state.achievements.length}</strong></div>
          <div class="stat">版本<strong>${escapeHtml(config.soloVersion)}</strong></div>
        </div>

        <div class="summary-service-grid">
          <section class="summary-service-card">
            <h3>成績送出</h3>
            <p id="submitStatus" class="status-text">正在送出成績，完成後顯示排行榜。</p>
          </section>
          <section class="summary-service-card">
            <h3>前 10 名排行榜</h3>
            <div id="summaryLeaderboard" class="leaderboard compact-list"></div>
          </section>
        </div>

        <section id="reviewPanel" class="summary-review-panel" data-wrong-only="0" data-selected-question-id="${escapeHtml(firstReviewItem?.questionId || "")}">
          <div class="review-toolbar">
            <h3>各題結果</h3>
            <div class="segmented-control" role="group" aria-label="答題結果篩選">
              <button class="filter-btn is-active" type="button" data-review-filter="all">全部</button>
              <button class="filter-btn" type="button" data-review-filter="wrong">看錯題</button>
            </div>
          </div>
          <div id="reviewQuestionGrid" class="review-question-grid">${renderReviewQuestionGrid(false, firstReviewItem?.questionId || "")}</div>
          <div id="reviewDetail" class="review-detail">${renderReviewDetail(firstReviewItem)}</div>
        </section>
      </section>
    `;
    bindSummaryReview();
  }

  function bindSummaryReview() {
    const panel = document.getElementById("reviewPanel");
    if (!panel) return;
    panel.addEventListener("click", event => {
      const filterButton = event.target.closest("[data-review-filter]");
      if (filterButton) {
        const wrongOnly = filterButton.dataset.reviewFilter === "wrong";
        updateSummaryReview(wrongOnly, "");
        return;
      }
      const questionButton = event.target.closest("[data-review-question-id]");
      if (questionButton) {
        updateSummaryReview(panel.dataset.wrongOnly === "1", questionButton.dataset.reviewQuestionId);
      }
    });
  }

  function updateSummaryReview(wrongOnly, selectedQuestionId) {
    const panel = document.getElementById("reviewPanel");
    const grid = document.getElementById("reviewQuestionGrid");
    const detail = document.getElementById("reviewDetail");
    if (!panel || !grid || !detail) return;
    const rows = getReviewRows(wrongOnly);
    const selected = rows.find(item => item.questionId === selectedQuestionId) || rows[0] || null;
    panel.dataset.wrongOnly = wrongOnly ? "1" : "0";
    panel.dataset.selectedQuestionId = selected?.questionId || "";
    panel.querySelectorAll("[data-review-filter]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.reviewFilter === (wrongOnly ? "wrong" : "all"));
    });
    grid.innerHTML = renderReviewQuestionGrid(wrongOnly, selected?.questionId || "");
    detail.innerHTML = renderReviewDetail(selected);
  }

  function getReviewRows(wrongOnly) {
    return wrongOnly ? state.answers.filter(item => !item.isCorrect) : state.answers;
  }

  function renderReviewQuestionGrid(wrongOnly, selectedQuestionId) {
    const rows = getReviewRows(wrongOnly);
    if (!rows.length) return `<p class="status-text">目前沒有符合條件的題目。</p>`;
    return rows.map(item => {
      const status = getAnswerStatus(item);
      return `
        <button class="review-question-btn ${status.className} ${item.questionId === selectedQuestionId ? "is-selected" : ""}" type="button" data-review-question-id="${escapeHtml(item.questionId)}" aria-label="第 ${Number(item.order || 0)} 題 ${status.label}">
          ${Number(item.order || 0)}
        </button>
      `;
    }).join("");
  }

  function renderReviewDetail(item) {
    if (!item) return `<p class="status-text">目前沒有符合條件的題目。</p>`;
    const question = currentQuestionById(item.questionId) || {};
    const status = getAnswerStatus(item);
    return `
      <article class="review-card ${status.className}">
        <div class="review-detail-header">
          <p class="review-meta">第 ${Number(item.order || 0)} 題｜${escapeHtml(status.label)}｜${Number(item.finalQuestionScore || 0)} 分</p>
        </div>
        <div class="readable-section review-question-text">${renderReadableText(item.title || question.title || "", "question")}</div>
        ${renderAnswerSummary(item, {
          correctAnswer: item.correctAnswer,
          options: question.options || {}
        })}
        ${renderAnswerOptionReview(item, question)}
        <div class="readable-section muted">
          <h4>解析</h4>
          ${renderReadableText(item.explanation || question.explanation || "本題尚未提供解析。", "explanation")}
        </div>
      </article>
    `;
  }

  function getAnswerStatus(item) {
    if (!item || !item.selectedAnswer) return { className: "is-unanswered", label: "未答題" };
    if (item.isCorrect) return { className: "is-correct", label: "答對" };
    return { className: "is-wrong", label: "答錯" };
  }

  function renderAnswerOptionReview(result, question) {
    const options = Object.entries(question.options || {}).filter(([, text]) => text !== undefined && text !== "");
    if (!options.length) return "";
    const selectedSet = new Set(parseAnswerKeys(result.selectedAnswer));
    const correctSet = new Set(parseAnswerKeys(question.correctAnswer || result.correctAnswer));
    return `
      <div class="answer-option-review" aria-label="選擇項">
        ${options.map(([key, text]) => {
          const isSelected = selectedSet.has(key);
          const isCorrect = correctSet.has(key);
          const classes = ["answer-option-review-row"];
          if (isCorrect) classes.push("is-correct");
          if (isSelected && !isCorrect) classes.push("is-wrong");
          if (isSelected) classes.push("is-selected");
          return `
            <div class="${classes.join(" ")}">
              <strong>${escapeHtml(key)}</strong>
              <span>${escapeHtml(text)}</span>
              <small>${[
                isSelected ? "已選" : "",
                isCorrect ? "答案" : ""
              ].filter(Boolean).join(" / ")}</small>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  async function submitResult() {
    const totalSeconds = state.answers.reduce((sum, item) => sum + Number(item.responseSeconds || 0), 0);
    const status = document.getElementById("submitStatus");
    if (state.questions.length === 0 || state.answers.length !== state.questions.length) {
      if (status) {
        status.className = "status-text error";
        status.textContent = "測驗尚未完成，成績不會送出。";
      }
      return;
    }
    const payload = {
      soloVersion: config.soloVersion,
      playerId: state.playerId,
      nickname: state.nickname,
      score: state.score,
      answerScore: state.answerScore,
      itemScore: state.itemScore,
      achievementScore: state.achievementScore,
      correctCount: state.correctCount,
      totalQuestions: state.questions.length,
      totalResponseSeconds: totalSeconds,
      completedAt: new Date().toISOString(),
      answers: buildSubmitAnswers(),
      itemUses: [],
      achievements: buildSubmitAchievements()
    };
    try {
      const result = await callGasApiWithRetry("submitSoloResult", payload, 2, { queryMode: "payload", timeoutMs: 60000 });
      if (status) {
        status.className = "status-text success";
        status.textContent = result.bestUpdated ? "成績已送出，這是目前最佳成績。" : "成績已送出，排行榜保留你的最佳成績。";
      }
      state.leaderboardRows = getLeaderboardRows(result);
      state.leaderboardLoadedAt = new Date().toISOString();
      state.leaderboardStatus = "ready";
      renderLeaderboardRows("summaryLeaderboard", state.leaderboardRows);
    } catch (error) {
      if (status) {
        status.className = "status-text error";
        status.innerHTML = `
          成績送出失敗：${escapeHtml(error.message)}
          <button class="secondary-btn compact-action" type="button" id="retrySubmitResultBtn">重新送出</button>
        `;
        document.getElementById("retrySubmitResultBtn")?.addEventListener("click", submitResult);
      }
    }
  }

  function buildSubmitAnswers() {
    // JSONP uses a GET URL. Keep the final-score submission small and leave per-question review in the local summary UI.
    return [];
  }

  function buildSubmitAchievements() {
    return state.achievements.map(item => ({
      id: item.id,
      label: item.label,
      score: Number(item.score || 0)
    }));
  }

  function preloadLeaderboard(force = false) {
    if (state.leaderboardPromise && !force) return state.leaderboardPromise;
    state.leaderboardStatus = "loading";
    state.leaderboardError = "";
    state.leaderboardPromise = fetchLatestLeaderboardRows()
      .then(rows => {
        state.leaderboardRows = rows;
        state.leaderboardLoadedAt = new Date().toISOString();
        state.leaderboardStatus = "ready";
        renderOpenLeaderboardTargets();
        return rows;
      })
      .catch(error => {
        state.leaderboardRows = [];
        state.leaderboardError = error.message;
        state.leaderboardStatus = "error";
        renderOpenLeaderboardTargets();
        return [];
      })
      .finally(() => {
        state.leaderboardPromise = null;
      });
    renderOpenLeaderboardTargets();
    return state.leaderboardPromise;
  }

  async function fetchLatestLeaderboardRows() {
    const requestData = { soloVersion: config.soloVersion, limit: 10 };
    try {
      const result = await callGasApiWithRetry("getSoloLeaderboard", requestData, 2, { queryMode: "payload", timeoutMs: 30000 });
      return getLeaderboardRows(result);
    } catch (primaryError) {
      const result = await callGasApiWithRetry("getSoloLeaderboard", requestData, 2, { queryMode: "actionData", timeoutMs: 30000 });
      return getLeaderboardRows(result);
    }
  }

  function renderOpenLeaderboardTargets() {
    ["homeLeaderboard", "summaryLeaderboard", "utilityPanelBody"].forEach(targetId => {
      if (document.getElementById(targetId)) renderLeaderboardState(targetId);
    });
  }

  function loadLeaderboard(targetId) {
    renderLeaderboardState(targetId);
    if (state.leaderboardStatus === "idle") preloadLeaderboard();
  }

  function renderLeaderboardState(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (state.leaderboardStatus === "loading" || state.leaderboardStatus === "idle") {
      target.innerHTML = `<p class="status-text">排行榜讀取中。</p>`;
      return;
    }
    if (state.leaderboardStatus === "error") {
      target.innerHTML = `
        <p class="status-text error">排行榜讀取失敗：${escapeHtml(state.leaderboardError || "無法取得排行榜")}</p>
        <button class="secondary-btn compact-action" type="button" data-retry-leaderboard="${escapeHtml(targetId)}">重新讀取</button>
      `;
      target.querySelector("[data-retry-leaderboard]")?.addEventListener("click", () => {
        preloadLeaderboard(true);
      });
      return;
    }
    renderLeaderboardRows(targetId, state.leaderboardRows);
  }

  function renderLeaderboardRows(targetId, rows) {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = `<p class="status-text">目前尚無排行榜資料。</p>`;
      return;
    }
    target.innerHTML = rows.slice(0, 10).map((row, index) => `
      <div class="rank-row">
        <strong>#${escapeHtml(row.rank || index + 1)}</strong>
        <span>${escapeHtml(row.nickname || "未命名")}</span>
        <span class="rank-score">${Number(row.score || 0)} 分</span>
      </div>
    `).join("");
  }

  async function callGasApi(action, data, options = {}) {
    if (!config.gasWebAppUrl) {
      return Promise.reject(new Error("成績服務尚未設定"));
    }
    return new Promise((resolve, reject) => {
      const callbackName = `tycVaccineTestJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("成績服務逾時"));
      }, Number(options.timeoutMs || 60000));
      const url = new URL(config.gasWebAppUrl);
      url.searchParams.set("callback", callbackName);
      if (action === "getSoloLeaderboard" && options.queryMode !== "payload") {
        url.searchParams.set("action", action);
        url.searchParams.set("data", JSON.stringify(data || {}));
      } else {
        url.searchParams.set("payload", JSON.stringify({ action, data }));
      }
      url.searchParams.set("_ts", `${Date.now()}`);
      window[callbackName] = response => {
        cleanup();
        if (!response || response.ok === false) {
          reject(new Error(response?.error?.message || "成績服務回傳失敗"));
          return;
        }
        resolve(response.result || response);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("無法連線到成績服務"));
      };
      script.async = true;
      script.referrerPolicy = "no-referrer-when-downgrade";
      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }
      script.src = url.toString();
      document.body.append(script);
    });
  }

  async function callGasApiWithRetry(action, data, attempts, options = {}) {
    let lastError = null;
    const totalAttempts = Math.max(1, Number(attempts || 1));
    for (let index = 0; index < totalAttempts; index += 1) {
      try {
        return await callGasApi(action, data, options);
      } catch (error) {
        lastError = error;
        await wait(800 * (index + 1));
      }
    }
    throw lastError || new Error("排行榜讀取失敗");
  }

  function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function maybeDropTreasure(question, isCorrect) {
    if (!isCorrect) return null;
    const seed = `${state.playerId}:${question.questionId}:${state.answers.length}`;
    if (seededNumber(seed) >= 0.3) return null;
    const itemType = pickWeightedItem(`${seed}:item`);
    if (itemType === "empty") {
      state.itemUses.push({
        itemType: "empty",
        effectScore: 0,
        note: "開啟空寶箱，沒有獲得道具。",
        usedAfterQuestionId: question.questionId,
        usedAt: new Date().toISOString()
      });
      return { itemType };
    }
    state.inventory[itemType] = Number(state.inventory[itemType] || 0) + 1;
    return { itemType };
  }

  function maybeDropTreasureV2(question, isCorrect) {
    if (!isCorrect) return null;
    const seed = `${state.playerId}:${question.questionId}:${state.answers.length}`;
    if (seededNumber(seed) >= 0.3) return null;
    const box = createTreasureBox({
      seed,
      sourceType: "correct",
      questionId: question.questionId
    });
    state.boxes.push(box);
    return box;
  }

  function createTreasureBox(options) {
    const seed = options.seed || `${state.playerId}:${Date.now()}:${state.boxes.length}`;
    return {
      boxId: `solo_box_${hashStringToUint32(seed).toString(36)}`,
      sourceType: options.sourceType || "correct",
      questionId: options.questionId || "",
      itemType: pickWeightedItem(`${seed}:item`),
      status: "unopened",
      createdAt: new Date().toISOString()
    };
  }

  function pickWeightedItem(seed) {
    const total = itemWeights.reduce((sum, item) => sum + item[1], 0);
    let target = seededNumber(seed) * total;
    for (const [itemType, weight] of itemWeights) {
      target -= weight;
      if (target <= 0) return itemType;
    }
    return "empty";
  }

  function grantAchievementIfNeeded() {
    const cumulative = [3, 5, 10, 20, 30, 40, 50, 60];
    cumulative.forEach(threshold => {
      if (state.correctCount >= threshold) {
        addAchievement(`correct_${threshold}`, `累積答對 ${threshold} 題`, 0, true);
      }
    });
    let streak = 0;
    for (let index = state.answers.length - 1; index >= 0; index -= 1) {
      if (!state.answers[index].isCorrect) break;
      streak += 1;
    }
    [3, 5, 10, 20].forEach(threshold => {
      if (streak >= threshold) {
        addAchievement(`streak_${threshold}`, `連續答對 ${threshold} 題`, 0, true);
      }
    });
  }

  function addAchievement(id, label, score, grantItem) {
    if (state.achievementIds.has(id)) return;
    state.achievementIds.add(id);
    if (score > 0) {
      state.achievementScore += score;
      state.score += score;
    }
    let grantedItemType = "";
    if (grantItem) {
      grantedItemType = "box";
    }
    state.achievements.push({
      achievementId: id,
      label,
      score,
      grantedItemType,
      achievedAt: new Date().toISOString()
    });
  }

  function renderDraftPanel() {
    const panel = document.getElementById("resumePanel");
    const summary = document.getElementById("resumeSummary");
    const resumeBtn = document.getElementById("resumeBtn");
    if (!panel || !summary || !resumeBtn) return;
    const draft = readDraft();
    const nicknameInput = document.getElementById("nicknameInput");
    const currentNickname = sanitizeNickname(nicknameInput ? nicknameInput.value : "");
    const canResume = Boolean(
      draft &&
      draft.playerId === state.playerId &&
      draft.questionSignature === getQuestionSignature() &&
      draft.answers &&
      draft.answers.length > 0 &&
      draft.answers.length < state.questions.length &&
      (!currentNickname || currentNickname === draft.nickname)
    );
    panel.hidden = true;
    resumeBtn.disabled = !canResume;
    resumeBtn.classList.toggle("is-ready", canResume);
    if (!canResume) {
      summary.textContent = "尚未找到可載入的進度。";
      return;
    }
    const savedAt = draft.savedAt ? new Date(draft.savedAt).toLocaleString("zh-TW", { hour12: false }) : "未知時間";
    summary.textContent = `${draft.nickname} 已完成 ${draft.answers.length} / ${state.questions.length} 題，暫存時間：${savedAt}`;
  }

  function resumeGame() {
    const draft = readDraft();
    if (!draft || draft.playerId !== state.playerId || draft.questionSignature !== getQuestionSignature()) {
      setStartStatus("找不到可續答的進度。", "error");
      renderDraftPanel();
      return;
    }
    applyDraft(draft);
    window.localStorage.setItem(NICKNAME_KEY, state.nickname);
    renderQuiz();
    if (state.phase === "between" && state.lastResult) {
      state.selectedAnswers = new Set(String(state.lastResult.selectedAnswer || "").split(",").filter(Boolean));
      renderQuestion({ answered: true });
      renderAnswerResult();
      saveDraft();
      return;
    }
    showQuestion();
  }

  function discardDraft() {
    clearDraft();
    setStartStatus("已清除本機暫存進度。", "success");
    renderDraftPanel();
  }

  function readDraft() {
    try {
      const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
      if (!draft || draft.soloVersion !== config.soloVersion) return null;
      if (!Array.isArray(draft.answers)) return null;
      return draft;
    } catch (error) {
      return null;
    }
  }

  function saveDraft() {
    if (!state.questions.length) return;
    if (state.phase === "summary") return;
    if (state.answers.length >= state.questions.length) return;
    const draft = {
      soloVersion: config.soloVersion,
      playerId: state.playerId,
      nickname: state.nickname,
      questionSignature: getQuestionSignature(),
      questionIndex: state.questionIndex,
      phase: state.phase,
      answerChoicesRevealed: state.answerChoicesRevealed,
      inventory: state.inventory,
      boxes: state.boxes,
      achievementIds: Array.from(state.achievementIds),
      claimedAchievementIds: Array.from(state.claimedAchievementIds),
      answers: state.answers,
      itemUses: state.itemUses,
      achievements: state.achievements,
      score: state.score,
      answerScore: state.answerScore,
      itemScore: state.itemScore,
      achievementScore: state.achievementScore,
      correctCount: state.correctCount,
      currentBaseScore: state.currentBaseScore,
      activeDoubleCount: state.activeDoubleCount,
      lastResult: state.lastResult,
      lastTreasure: state.lastTreasure,
      challengeResult: state.challengeResult,
      savedAt: new Date().toISOString()
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
  }

  function applyDraft(draft) {
    clearTimer();
    state.nickname = sanitizeNickname(draft.nickname);
    state.questionIndex = Math.min(Number(draft.questionIndex || 0), Math.max(0, state.questions.length - 1));
    state.phase = draft.phase === "between" ? "between" : "question";
    state.answerChoicesRevealed = draft.phase === "between" || draft.answerChoicesRevealed === true;
    state.inventory = draft.inventory && typeof draft.inventory === "object" ? draft.inventory : {};
    state.boxes = Array.isArray(draft.boxes) ? draft.boxes : [];
    state.achievementIds = new Set(Array.isArray(draft.achievementIds) ? draft.achievementIds : []);
    state.claimedAchievementIds = new Set(Array.isArray(draft.claimedAchievementIds) ? draft.claimedAchievementIds : []);
    state.answers = Array.isArray(draft.answers) ? draft.answers : [];
    state.itemUses = Array.isArray(draft.itemUses) ? draft.itemUses : [];
    state.achievements = Array.isArray(draft.achievements) ? draft.achievements : [];
    state.score = Number(draft.score || 0);
    state.answerScore = Number(draft.answerScore || 0);
    state.itemScore = Number(draft.itemScore || 0);
    state.achievementScore = Number(draft.achievementScore || 0);
    state.correctCount = Number(draft.correctCount || 0);
    state.currentBaseScore = Number(draft.currentBaseScore || 0);
    state.activeDoubleCount = Number(draft.activeDoubleCount || 0);
    state.lastResult = draft.lastResult || state.answers[state.answers.length - 1] || null;
    state.lastTreasure = draft.lastTreasure || null;
    state.challengeResult = draft.challengeResult || null;
  }

  function getQuestionSignature() {
    if (!state.questions.length) return "";
    const first = state.questions[0]?.questionId || "";
    const last = state.questions[state.questions.length - 1]?.questionId || "";
    return `${config.soloVersion}:${state.questions.length}:${first}:${last}`;
  }

  function getLeaderboardRows(result) {
    if (!result) return [];
    if (Array.isArray(result.leaderboard)) return result.leaderboard;
    if (Array.isArray(result.rows)) return result.rows;
    if (result.result) return getLeaderboardRows(result.result);
    return [];
  }

  function renderAnswerSummary(result, question) {
    return `
      <div class="answer-lines">
        <div>
          <span class="answer-label">你的答案</span>
          ${renderAnswerValue(result.selectedAnswer, question)}
        </div>
        <div>
          <span class="answer-label">正確答案</span>
          ${renderAnswerValue(question.correctAnswer, question)}
        </div>
        <div>
          <span class="answer-label">本題得分</span>
          <strong>${Number(result.finalQuestionScore || 0)} 分</strong>
        </div>
      </div>
    `;
  }

  function renderAnswerMarkerPanel(result, question) {
    const correctKeys = parseAnswerKeys(question.correctAnswer);
    const optionRows = correctKeys.map(key => {
      const text = question.options?.[key] || "";
      return `
        <div class="answer-option-marker is-correct-answer is-solution-only">
          <strong>${escapeHtml(key)}</strong>
          <span>${escapeHtml(text)}</span>
        </div>
      `;
    }).join("");

    return `
      <div id="answerMarkerBlock" class="answer-marker-panel is-solution-only">
        <div class="answer-option-markers">${optionRows || `<p class="status-text">本題沒有可顯示的解答選項。</p>`}</div>
      </div>
    `;
  }

  function renderAnswerValue(answer, question) {
    const keys = parseAnswerKeys(answer);
    if (!keys.length) return `<p class="answer-value">未作答</p>`;
    return `
      <ul class="answer-value-list">
        ${keys.map(key => `
          <li>
            <strong>${escapeHtml(key)}</strong>
            <span>${escapeHtml(question.options[key] || "")}</span>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function parseAnswerKeys(answer) {
    return String(answer || "").split(",").map(item => item.trim()).filter(Boolean);
  }

  function formatAnswerDisplay(answer, question) {
    const keys = parseAnswerKeys(answer);
    if (!keys.length) return "未作答";
    return keys.map(key => {
      const text = normalizeInlineText(question.options?.[key] || "");
      return `${escapeHtml(key)}${text ? ` ${escapeHtml(text)}` : ""}`;
    }).join("、");
  }

  function normalizeInlineText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function renderReadableText(value, type) {
    const parts = splitReadableText(value, type);
    const className = `readable-text readable-${type || "body"}`;
    if (!parts.length) return `<div class="${className}"><p></p></div>`;
    return `<div class="${className}">${parts.map(part => `<p>${escapeHtml(part)}</p>`).join("")}</div>`;
  }

  function splitReadableText(value, type) {
    const text = String(value || "").replace(/\r/g, "\n").trim();
    if (!text) return [];
    if (text.includes("\n")) {
      return text.split(/\n+/).map(part => part.trim()).filter(Boolean);
    }
    if (type === "explanation") {
      const withBreaks = text
        .replace(/\s*(?=([A-ZＡ-Ｚ]|[0-9]+)[：:])/g, "\n")
        .replace(/；\s*/g, "；\n")
        .replace(/。\s*(?=([A-ZＡ-Ｚ]|[0-9]+)[：:])/g, "。\n");
      const parts = withBreaks.split(/\n+/).map(part => part.trim()).filter(Boolean);
      if (parts.length > 1) return parts;
    }
    if (type === "question" && text.length > 34) {
      return text.split(/(?<=[。？！?])\s*/).map(part => part.trim()).filter(Boolean);
    }
    return [text];
  }

  function scoreBySeconds(seconds) {
    if (seconds <= 10) return 30;
    if (seconds <= 20) return 25;
    if (seconds <= 30) return 20;
    if (seconds <= 45) return 15;
    if (seconds <= 60) return 10;
    return 5;
  }

  function currentQuestion() {
    return state.questions[state.questionIndex];
  }

  function currentQuestionById(questionId) {
    return state.questions.find(question => question.questionId === questionId);
  }

  function clearTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = 0;
    }
  }

  function sanitizeNickname(value) {
    return String(value || "").replace(/[<>"'`]/g, "").trim().slice(0, 20);
  }

  function normalizeAnswer(value) {
    return String(value || "")
      .split(",")
      .map(part => part.trim().toUpperCase())
      .filter(Boolean)
      .sort()
      .join(",");
  }

  function getOrCreatePlayerId() {
    const existing = window.localStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;
    const random = window.crypto && window.crypto.getRandomValues
      ? Array.from(window.crypto.getRandomValues(new Uint32Array(2))).map(n => n.toString(36)).join("")
      : Math.random().toString(36).slice(2);
    const playerId = `solo_${Date.now().toString(36)}_${random}`;
    window.localStorage.setItem(PLAYER_ID_KEY, playerId);
    return playerId;
  }

  function seededNumber(seed) {
    return hashStringToUint32(seed) / 4294967295;
  }

  function hashStringToUint32(seed) {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
