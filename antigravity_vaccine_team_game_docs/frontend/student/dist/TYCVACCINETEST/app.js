(function () {
  "use strict";

  const config = window.TYC_VACCINE_TEST_CONFIG || {};
  const state = {
    nickname: "",
    playerId: getOrCreatePlayerId(),
    questions: [],
    questionIndex: 0,
    selectedAnswers: new Set(),
    answerStartedAt: 0,
    timerId: 0,
    remainingSeconds: config.questionTimeLimitSec || 60,
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
    lastResult: null
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
    const savedNickname = window.localStorage.getItem("tycVaccineTestNickname") || "";
    const nicknameInput = document.getElementById("nicknameInput");
    if (nicknameInput) {
      nicknameInput.value = savedNickname;
      nicknameInput.addEventListener("input", validateHome);
    }
    const startBtn = document.getElementById("startBtn");
    const leaderboardBtn = document.getElementById("leaderboardBtn");
    if (startBtn) startBtn.addEventListener("click", startGame);
    if (leaderboardBtn) leaderboardBtn.addEventListener("click", () => loadLeaderboard("homeLeaderboard"));
    validateHome();
    preloadQuestionStatus();
  }

  async function preloadQuestionStatus() {
    setStartStatus("題庫狀態檢查中。");
    try {
      const questions = await fetchQuestions();
      state.questions = questions;
      setStartStatus(`題庫已就緒，共 ${questions.length} 題。`, "success");
    } catch (error) {
      setStartStatus(`題庫讀取失敗：${error.message}`, "error");
    }
    validateHome();
  }

  function validateHome() {
    const nicknameInput = document.getElementById("nicknameInput");
    const startBtn = document.getElementById("startBtn");
    const nickname = sanitizeNickname(nicknameInput ? nicknameInput.value : "");
    if (!startBtn) return;
    startBtn.disabled = !nickname || !state.questions.length;
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
    window.localStorage.setItem("tycVaccineTestNickname", nickname);
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
    state.activeDoubleCount = 0;
    state.phase = "question";
    renderQuiz();
    showQuestion();
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
      throw new Error("Firebase 題庫設定不完整。");
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
        timeLimitSec: Number(item.timeLimitSec || config.questionTimeLimitSec || 60),
        enabled: true
      }))
      .filter(item => item.questionId && item.title && Object.keys(item.options).length)
      .sort((a, b) => a.order - b.order || a.questionId.localeCompare(b.questionId));
    if (!questions.length) throw new Error("Firebase 指定路徑沒有可用題目。");
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
      <aside class="panel" id="sideArea"></aside>
    `;
  }

  function showQuestion() {
    clearTimer();
    state.phase = "question";
    state.selectedAnswers = new Set();
    state.lastResult = null;
    state.currentBaseScore = 0;
    const question = currentQuestion();
    state.remainingSeconds = Number(question.timeLimitSec || config.questionTimeLimitSec || 60);
    state.answerStartedAt = Date.now();
    renderQuestion();
    tickTimer();
    state.timerId = window.setInterval(tickTimer, 1000);
  }

  function renderQuestion() {
    const question = currentQuestion();
    const optionButtons = Object.entries(question.options).map(([key, text]) => `
      <button class="option-btn" type="button" data-answer="${escapeHtml(key)}">
        <span class="option-key">${escapeHtml(key)}</span>
        <span>${escapeHtml(text)}</span>
      </button>
    `).join("");

    document.getElementById("questionArea").innerHTML = `
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
      <h3 class="question-title">${escapeHtml(question.title)}</h3>
      <div class="options-grid">${optionButtons}</div>
      <div class="between-actions">
        <button id="submitAnswerBtn" class="primary-btn" type="button" disabled>送出答案</button>
      </div>
    `;
    document.querySelectorAll(".option-btn").forEach(button => {
      button.addEventListener("click", () => toggleAnswer(button.dataset.answer));
    });
    document.getElementById("submitAnswerBtn").addEventListener("click", () => submitAnswer(false));
    renderSideArea();
  }

  function renderSideArea() {
    document.getElementById("sideArea").innerHTML = `
      <h2>目前狀態</h2>
      <div class="compact-list">
        <div class="rank-row"><span>答對</span><strong>${state.correctCount}</strong><span>題</span></div>
        <div class="rank-row"><span>答題分</span><strong>${state.answerScore}</strong><span>分</span></div>
        <div class="rank-row"><span>道具分</span><strong>${state.itemScore}</strong><span>分</span></div>
        <div class="rank-row"><span>成就分</span><strong>${state.achievementScore}</strong><span>分</span></div>
      </div>
      <h3 style="margin-top:18px;">道具</h3>
      <div class="item-grid">${renderInventoryButtons(false)}</div>
      <p class="status-text">道具只能在答題完畢後、下一題前使用。</p>
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
      Number(question.timeLimitSec || 60),
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
    maybeDropTreasure(question, isCorrect);
    renderAnswerResult();
  }

  function renderAnswerResult() {
    const question = currentQuestion();
    const result = state.lastResult;
    const feedbackClass = result.isCorrect ? "correct" : "wrong";
    const feedbackText = result.isCorrect ? "答對" : result.selectedAnswer ? "答錯" : "時間到，未作答";
    document.querySelectorAll(".option-btn").forEach(button => {
      button.disabled = true;
    });
    const actionLabel = state.questionIndex + 1 >= state.questions.length ? "查看結算" : "下一題";
    const resultHtml = `
      <div class="answer-result">
        <strong class="${feedbackClass}">${feedbackText}</strong>
        <span>你的答案：${escapeHtml(result.selectedAnswer || "未作答")}</span>
        <span>正確答案：${escapeHtml(question.correctAnswer)}</span>
        <span>本題得分：${result.finalQuestionScore} 分</span>
        <p>${escapeHtml(question.explanation || "本題未提供解析。")}</p>
      </div>
      <div class="between-actions">
        <h3>可使用道具</h3>
        <div class="item-grid">${renderInventoryButtons(true)}</div>
        <button id="nextQuestionBtn" class="primary-btn" type="button">${actionLabel}</button>
      </div>
    `;
    document.getElementById("questionArea").insertAdjacentHTML("beforeend", resultHtml);
    document.getElementById("nextQuestionBtn").addEventListener("click", nextStep);
    document.querySelectorAll("[data-item]").forEach(button => {
      button.addEventListener("click", () => useItem(button.dataset.item));
    });
    renderSideArea();
  }

  function renderInventoryButtons(enabled) {
    return Object.keys(itemLabels)
      .filter(itemType => itemType !== "empty")
      .map(itemType => {
        const count = Number(state.inventory[itemType] || 0);
        return `<button class="item-btn" type="button" data-item="${itemType}" ${enabled && count > 0 ? "" : "disabled"}>${itemLabels[itemType]} x${count}</button>`;
      }).join("");
  }

  function useItem(itemType) {
    if (state.phase !== "between") return;
    if (Number(state.inventory[itemType] || 0) <= 0) return;
    state.inventory[itemType] -= 1;
    let effectScore = 0;
    let note = "";
    if (scoreCardValues[itemType]) {
      effectScore = scoreCardValues[itemType];
      note = `${itemLabels[itemType]} 增加 ${effectScore} 分`;
    } else if (itemType === "double") {
      state.activeDoubleCount += 1;
      note = "下一題答對時加倍本題答題分。";
    } else if (itemType === "challenge") {
      const n = Math.floor(Math.random() * 10);
      const guessBig = window.confirm("挑戰卡：按確定猜大 5-9，按取消猜小 0-4。");
      const win = guessBig ? n >= 5 : n <= 4;
      effectScore = win ? 10 : 3;
      note = `挑戰數字 ${n}，${win ? "挑戰成功" : "挑戰未中"}，取得 ${effectScore} 分`;
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
  }

  function refreshBetweenBlock(message) {
    const blocks = document.querySelectorAll(".between-actions");
    const existing = blocks[blocks.length - 1];
    if (!existing) return;
    const actionLabel = state.questionIndex + 1 >= state.questions.length ? "查看結算" : "下一題";
    existing.innerHTML = `
      <h3>可使用道具</h3>
      <p class="status-text success">${escapeHtml(message || "道具已更新。")}</p>
      <div class="item-grid">${renderInventoryButtons(true)}</div>
      <button id="nextQuestionBtn" class="primary-btn" type="button">${actionLabel}</button>
    `;
    existing.querySelectorAll("[data-item]").forEach(button => {
      button.addEventListener("click", () => useItem(button.dataset.item));
    });
    document.getElementById("nextQuestionBtn").addEventListener("click", nextStep);
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
    state.phase = "summary";
    if (state.correctCount === state.questions.length) {
      addAchievement("perfect_all", "個人全對", 100);
    }
    renderSummary();
    submitResult();
  }

  function renderSummary() {
    const totalSeconds = state.answers.reduce((sum, item) => sum + Number(item.responseSeconds || 0), 0);
    document.getElementById("app").className = "main-grid";
    document.getElementById("app").innerHTML = `
      <section class="panel" style="grid-column:1 / -1;">
        <h2>成績結算</h2>
        <div class="summary-grid">
          <div class="stat">總分<strong>${state.score}</strong></div>
          <div class="stat">答對題數<strong>${state.correctCount} / ${state.questions.length}</strong></div>
          <div class="stat">總時間<strong>${totalSeconds} 秒</strong></div>
          <div class="stat">成就加分<strong>${state.achievementScore}</strong></div>
          <div class="stat">答題分<strong>${state.answerScore}</strong></div>
          <div class="stat">道具加分<strong>${state.itemScore}</strong></div>
          <div class="stat">已用道具<strong>${state.itemUses.length}</strong></div>
          <div class="stat">成就<strong>${state.achievements.length}</strong></div>
        </div>
        <div class="review-toolbar">
          <h3>答題結果</h3>
          <button id="wrongOnlyBtn" class="filter-btn" type="button" data-wrong-only="0">只看錯題</button>
        </div>
        <div id="reviewList" class="review-list">${renderReviewCards(false)}</div>
      </section>
      <section class="panel">
        <h2>送出成績</h2>
        <p id="submitStatus" class="status-text">正在送出 GAS，完成後顯示排行榜。</p>
      </section>
      <section class="panel">
        <h2>排行榜前 10 名</h2>
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
    if (!rows.length) return `<p class="status-text">沒有符合條件的題目。</p>`;
    return rows.map(item => `
      <article class="review-card ${item.isCorrect ? "" : "is-wrong"}">
        <p class="review-meta">第 ${item.order} 題 ${item.isCorrect ? "答對" : "答錯"}，得 ${item.finalQuestionScore} 分</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>你的答案：${escapeHtml(item.selectedAnswer || "未作答")}；正確答案：${escapeHtml(item.correctAnswer)}</p>
        <p class="muted">${escapeHtml(item.explanation || "本題未提供解析。")}</p>
      </article>
    `).join("");
  }

  async function submitResult() {
    const totalSeconds = state.answers.reduce((sum, item) => sum + Number(item.responseSeconds || 0), 0);
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
      const status = document.getElementById("submitStatus");
      if (status) {
        status.className = "status-text success";
        status.textContent = result.bestUpdated ? "成績已送出，並更新為個人最佳成績。" : "成績已送出，排行榜保留個人最佳成績。";
      }
      renderLeaderboardRows("summaryLeaderboard", result.leaderboard || []);
    } catch (error) {
      const status = document.getElementById("submitStatus");
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
      const result = await callGasApi("getSoloLeaderboard", {
        soloVersion: config.soloVersion,
        limit: config.leaderboardLimit || 10
      });
      renderLeaderboardRows(targetId, result.rows || result.leaderboard || []);
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
    target.innerHTML = rows.slice(0, 10).map(row => `
      <div class="rank-row">
        <strong>#${escapeHtml(row.rank || "")}</strong>
        <span>${escapeHtml(row.nickname || "未命名")}<br><small>${escapeHtml(row.correctCount || 0)} / ${escapeHtml(row.totalQuestions || 0)} 題</small></span>
        <span class="rank-score">${escapeHtml(row.score || 0)} 分</span>
      </div>
    `).join("");
  }

  function callGasApi(action, data) {
    if (!config.gasWebAppUrl) {
      return Promise.reject(new Error("GAS Web App URL 未設定。"));
    }
    return new Promise((resolve, reject) => {
      const callbackName = `tycVaccineTestJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("GAS 回應逾時。"));
      }, 20000);
      const url = new URL(config.gasWebAppUrl);
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("payload", JSON.stringify({ action, data }));
      url.searchParams.set("_ts", `${Date.now()}`);
      window[callbackName] = response => {
        cleanup();
        if (!response || response.ok === false) {
          reject(new Error(response?.error?.message || "GAS 回傳失敗。"));
          return;
        }
        resolve(response.result || response);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("無法連線 GAS。"));
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
    if (!isCorrect) return;
    const seed = `${state.playerId}:${question.questionId}:${state.answers.length}`;
    if (seededNumber(seed) >= 0.3) return;
    const itemType = pickWeightedItem(`${seed}:item`);
    if (itemType === "empty") {
      state.itemUses.push({
        itemType: "empty",
        effectScore: 0,
        note: "空寶箱，沒有取得道具。",
        usedAfterQuestionId: question.questionId,
        usedAt: new Date().toISOString()
      });
      return;
    }
    state.inventory[itemType] = Number(state.inventory[itemType] || 0) + 1;
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
    if (grantItem) {
      const itemType = pickWeightedItem(`${state.playerId}:${id}`);
      if (itemType !== "empty") {
        state.inventory[itemType] = Number(state.inventory[itemType] || 0) + 1;
      }
    }
    state.achievements.push({
      achievementId: id,
      label,
      score,
      grantedItemType: grantItem ? "treasure_roll" : "",
      achievedAt: new Date().toISOString()
    });
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
    const key = "tycVaccineTestPlayerId";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const random = window.crypto && window.crypto.getRandomValues
      ? Array.from(window.crypto.getRandomValues(new Uint32Array(2))).map(n => n.toString(36)).join("")
      : Math.random().toString(36).slice(2);
    const playerId = `solo_${Date.now().toString(36)}_${random}`;
    window.localStorage.setItem(key, playerId);
    return playerId;
  }

  function loadJson(key, fallback) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
      return fallback;
    }
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
