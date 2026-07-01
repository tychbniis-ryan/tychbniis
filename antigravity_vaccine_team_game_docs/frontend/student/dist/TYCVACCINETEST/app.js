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
    answerStartedAt: 0,
    timerId: 0,
    remainingSeconds: DEFAULT_TIME_LIMIT,
    phase: "home",
    inventory: {},
    achievementIds: new Set(),
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
    activePanel: ""
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

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const savedNickname = window.localStorage.getItem(NICKNAME_KEY) || "";
    const nicknameInput = document.getElementById("nicknameInput");
    const startBtn = document.getElementById("startBtn");
    const leaderboardBtn = document.getElementById("leaderboardBtn");
    const resumeBtn = document.getElementById("resumeBtn");
    const discardDraftBtn = document.getElementById("discardDraftBtn");

    if (nicknameInput) {
      nicknameInput.value = savedNickname;
      nicknameInput.addEventListener("input", validateHome);
    }
    if (startBtn) startBtn.addEventListener("click", startGame);
    if (leaderboardBtn) leaderboardBtn.addEventListener("click", () => loadLeaderboard("homeLeaderboard"));
    if (resumeBtn) resumeBtn.addEventListener("click", resumeGame);
    if (discardDraftBtn) discardDraftBtn.addEventListener("click", discardDraft);

    validateHome();
    preloadQuestionStatus();
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
    state.achievementIds = new Set();
    state.score = 0;
    state.answerScore = 0;
    state.itemScore = 0;
    state.achievementScore = 0;
    state.correctCount = 0;
    state.currentBaseScore = 0;
    state.activeDoubleCount = 0;
    state.lastResult = null;
    state.lastTreasure = null;
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
      <div class="options-grid">${optionButtons}</div>
      ${answered ? "" : `
        <div class="answer-submit">
          <button id="submitAnswerBtn" class="primary-btn" type="button" disabled>送出答案</button>
        </div>
      `}
    `;

    if (!answered) {
      document.querySelectorAll(".option-btn").forEach(button => {
        button.addEventListener("click", () => toggleAnswer(button.dataset.answer));
      });
      document.getElementById("submitAnswerBtn").addEventListener("click", () => submitAnswer(false));
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
    document.querySelectorAll("[data-panel]").forEach(button => {
      button.addEventListener("click", () => openUtilityPanel(button.dataset.panel));
    });
  }

  function openUtilityPanel(panelName, message) {
    const modal = document.getElementById("utilityModal");
    if (!modal) return;
    state.activePanel = panelName;
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
    if (panelName === "leaderboard") {
      loadLeaderboard("utilityPanelBody");
    }
  }

  function closeUtilityPanel() {
    const modal = document.getElementById("utilityModal");
    if (!modal) return;
    modal.hidden = true;
    modal.innerHTML = "";
    state.activePanel = "";
  }

  function panelTitle(panelName) {
    const titles = {
      status: "闖關狀態",
      treasure: "寶箱",
      achievements: "成就",
      items: "道具",
      explanation: "解析",
      leaderboard: "排行榜"
    };
    return titles[panelName] || "測驗工具";
  }

  function renderUtilityPanelBody(panelName, message) {
    if (panelName === "status") return renderStatusPanel();
    if (panelName === "treasure") return renderTreasurePanel();
    if (panelName === "achievements") return renderAchievementsPanel();
    if (panelName === "items") return renderItemsPanel(message);
    if (panelName === "explanation") return renderExplanationPanel();
    if (panelName === "leaderboard") return `<p class="status-text">排行榜讀取中。</p>`;
    return "";
  }

  function renderStatusPanel() {
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

  function renderItemsPanel(message) {
    const canUse = state.phase === "between";
    return `
      ${message ? `<p class="status-text success">${escapeHtml(message)}</p>` : ""}
      <p class="status-text">${canUse ? "答題完成後，可以在開始下一題前使用道具。" : "道具只能在答題後、開始下一題前使用。"}</p>
      <div class="item-grid">${renderInventoryButtons(canUse)}</div>
    `;
  }

  function renderExplanationPanel() {
    const question = currentQuestion();
    const result = state.lastResult;
    if (!question || !result) return `<p class="status-text">答題後才會顯示解析。</p>`;
    return `
      <div class="answer-summary">
        <h3>作答結果</h3>
        ${renderAnswerSummary(result, question)}
      </div>
      <div class="readable-section">
        <h3>題目</h3>
        ${renderReadableText(question.title, "question")}
      </div>
      <div class="readable-section">
        <h3>解析</h3>
        ${renderReadableText(question.explanation || "本題尚未提供解析。", "explanation")}
      </div>
    `;
  }

  function toggleAnswer(answer) {
    if (state.phase !== "question") return;
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
    state.lastTreasure = maybeDropTreasure(question, isCorrect) || null;
    renderAnswerResult();
    saveDraft();
  }

  function renderAnswerResult() {
    const question = currentQuestion();
    const result = state.lastResult;
    if (!result) return;
    const feedbackClass = result.isCorrect ? "correct" : "wrong";
    const feedbackText = result.isCorrect ? "答對了" : result.selectedAnswer ? "答錯了" : "時間到，未作答";
    const actionLabel = state.questionIndex + 1 >= state.questions.length ? "查看結算" : "前往下一題";

    document.querySelectorAll(".option-btn").forEach(button => {
      button.disabled = true;
    });
    const existingResult = document.getElementById("answerResultBlock");
    const existingActions = document.getElementById("betweenActions");
    const answerSubmit = document.querySelector(".answer-submit");
    if (existingResult) existingResult.remove();
    if (existingActions) existingActions.remove();
    if (answerSubmit) answerSubmit.remove();
    document.querySelectorAll(".utility-bar").forEach(bar => bar.remove());

    const questionArea = document.getElementById("questionArea");
    questionArea.classList.add("is-answered");
    questionArea.insertAdjacentHTML("beforeend", `
      <div id="answerResultBlock" class="answer-result ${result.isCorrect ? "is-correct" : "is-wrong"}">
        <strong class="${feedbackClass}">${feedbackText}</strong>
        ${renderAnswerSummary(result, question)}
        ${renderUtilityButtons()}
      </div>
      <div id="betweenActions" class="between-actions">
        ${renderBetweenActions("", actionLabel)}
      </div>
    `);
    bindUtilityButtons();
    bindBetweenActions();
    renderSideArea();
    const resultBlock = document.getElementById("answerResultBlock");
    if (resultBlock) {
      window.requestAnimationFrame(() => resultBlock.scrollIntoView({ block: "start", behavior: "smooth" }));
    }
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
    return Object.keys(itemLabels)
      .filter(itemType => itemType !== "empty")
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
    if (state.activePanel === "items") {
      openUtilityPanel("items", note);
    }
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
    const totalSeconds = state.answers.reduce((sum, item) => sum + Number(item.responseSeconds || 0), 0);
    document.getElementById("app").className = "main-grid summary-page";
    document.getElementById("app").innerHTML = `
      <section class="panel summary-panel">
        <h2>成績結算</h2>
        <div class="summary-grid">
          <div class="stat">總分<strong>${state.score}</strong></div>
          <div class="stat">答對題數<strong>${state.correctCount} / ${state.questions.length}</strong></div>
          <div class="stat">總作答時間<strong>${totalSeconds} 秒</strong></div>
          <div class="stat">成就加分<strong>${state.achievementScore}</strong></div>
          <div class="stat">答題分<strong>${state.answerScore}</strong></div>
          <div class="stat">道具加分<strong>${state.itemScore}</strong></div>
          <div class="stat">使用道具<strong>${state.itemUses.length}</strong></div>
          <div class="stat">取得成就<strong>${state.achievements.length}</strong></div>
        </div>
        <div class="review-toolbar">
          <h3>各題結果</h3>
          <button id="wrongOnlyBtn" class="filter-btn" type="button" data-wrong-only="0">只看錯題</button>
        </div>
        <div id="reviewList" class="review-list">${renderReviewCards(false)}</div>
      </section>
      <section class="panel">
        <h2>成績送出</h2>
        <p id="submitStatus" class="status-text">正在送出成績，完成後顯示排行榜。</p>
      </section>
      <section class="panel">
        <h2>前 10 名排行榜</h2>
        <div id="summaryLeaderboard" class="leaderboard compact-list"></div>
      </section>
    `;
    document.getElementById("wrongOnlyBtn").addEventListener("click", event => {
      const wrongOnly = event.currentTarget.dataset.wrongOnly !== "1";
      event.currentTarget.dataset.wrongOnly = wrongOnly ? "1" : "0";
      event.currentTarget.textContent = wrongOnly ? "顯示全部題目" : "只看錯題";
      document.getElementById("reviewList").innerHTML = renderReviewCards(wrongOnly);
    });
  }

  function renderReviewCards(wrongOnly) {
    const rows = wrongOnly ? state.answers.filter(item => !item.isCorrect) : state.answers;
    if (!rows.length) return `<p class="status-text">目前沒有符合條件的題目。</p>`;
    return rows.map(item => `
      <article class="review-card ${item.isCorrect ? "" : "is-wrong"}">
        <p class="review-meta">第 ${item.order} 題｜${item.isCorrect ? "答對" : "答錯"}｜${item.finalQuestionScore} 分</p>
        <div class="readable-section">${renderReadableText(item.title, "question")}</div>
        ${renderAnswerSummary(item, {
          correctAnswer: item.correctAnswer,
          options: currentQuestionById(item.questionId)?.options || {}
        })}
        <div class="readable-section muted">${renderReadableText(item.explanation || "本題尚未提供解析。", "explanation")}</div>
      </article>
    `).join("");
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
      answers: state.answers,
      itemUses: state.itemUses,
      achievements: state.achievements
    };
    try {
      const result = await callGasApi("submitSoloResult", payload);
      if (status) {
        status.className = "status-text success";
        status.textContent = result.bestUpdated ? "成績已送出，這是目前最佳成績。" : "成績已送出，排行榜保留你的最佳成績。";
      }
      renderLeaderboardRows("summaryLeaderboard", getLeaderboardRows(result));
    } catch (error) {
      if (status) {
        status.className = "status-text error";
        status.textContent = `成績送出失敗：${error.message}`;
      }
    }
  }

  async function loadLeaderboard(targetId) {
    const target = document.getElementById(targetId);
    if (target) target.innerHTML = `<p class="status-text">排行榜讀取中。</p>`;
    try {
      const result = await callGasApi("getSoloLeaderboard", { soloVersion: config.soloVersion, limit: 10 });
      renderLeaderboardRows(targetId, getLeaderboardRows(result));
    } catch (error) {
      if (target) target.innerHTML = `<p class="status-text error">排行榜讀取失敗：${escapeHtml(error.message)}</p>`;
    }
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

  async function callGasApi(action, data) {
    if (!config.gasWebAppUrl) {
      return Promise.reject(new Error("成績服務尚未設定"));
    }
    return new Promise((resolve, reject) => {
      const callbackName = `tycVaccineTestJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("成績服務逾時"));
      }, 20000);
      const url = new URL(config.gasWebAppUrl);
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("payload", JSON.stringify({ action, data }));
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
      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }
      script.src = url.toString();
      document.body.append(script);
    });
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
      const itemType = pickWeightedItem(`${state.playerId}:${id}`);
      grantedItemType = itemType;
      if (itemType !== "empty") {
        state.inventory[itemType] = Number(state.inventory[itemType] || 0) + 1;
      }
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
    panel.hidden = !canResume;
    if (!canResume) return;
    resumeBtn.disabled = false;
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
      inventory: state.inventory,
      achievementIds: Array.from(state.achievementIds),
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
    state.inventory = draft.inventory && typeof draft.inventory === "object" ? draft.inventory : {};
    state.achievementIds = new Set(Array.isArray(draft.achievementIds) ? draft.achievementIds : []);
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

  function renderAnswerValue(answer, question) {
    const keys = String(answer || "").split(",").map(item => item.trim()).filter(Boolean);
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
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
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
