const config = window.VACCINE_GAME_CONFIG || {};
const PUBLIC_QUESTIONS_CACHE_MS = 10 * 60 * 1000;
const GAS_FETCH_ATTEMPTS = 4;
const GAS_JSONP_ATTEMPTS = 4;
const GAS_FETCH_TIMEOUT_MS = 20000;
const GAS_JSONP_TIMEOUT_MS = 30000;
let publicQuestionsRequest = null;

export function getConfig() {
  localStorage.removeItem("vaccineGameGasUrl");
  return {
    clientVersion: config.clientVersion || "0.0.0",
    gameId: config.gameId || "game_YYYYMMDD_vaccine_training",
    gasWebAppUrl: config.gasWebAppUrl || "",
    firebaseDatabaseUrl: config.firebaseDatabaseUrl || "",
    firebaseGameStatePollMs: Number(config.firebaseGameStatePollMs || 5000),
    apiMode: config.gasWebAppUrl ? "gas" : config.apiMode || "demo",
    apiTransport: config.apiTransport || "jsonp"
  };
}

export async function getPublicGameState() {
  const currentConfig = getConfig();

  if (!currentConfig.firebaseDatabaseUrl) {
    return null;
  }

  const baseUrl = currentConfig.firebaseDatabaseUrl.replace(/\/$/, "");
  const gameId = encodeURIComponent(currentConfig.gameId);
  const response = await fetchWithTimeout(`${baseUrl}/gameState/${gameId}.json`, {
    cache: "no-store"
  }, 5000);

  if (!response.ok) {
    throw new Error("無法讀取 Firebase 公開狀態。");
  }

  return response.json();
}

export async function getPublicQuestions() {
  const currentConfig = getConfig();

  if (!currentConfig.firebaseDatabaseUrl) {
    return null;
  }

  const cached = readCachedPublicQuestions(currentConfig.gameId);
  if (cached) {
    return cached;
  }

  if (publicQuestionsRequest) {
    return publicQuestionsRequest;
  }

  const baseUrl = currentConfig.firebaseDatabaseUrl.replace(/\/$/, "");
  const gameId = encodeURIComponent(currentConfig.gameId);
  publicQuestionsRequest = fetchWithTimeout(`${baseUrl}/publicQuestions/${gameId}.json`, {
    cache: "force-cache"
  }, 8000)
    .then(async response => {
      if (!response.ok) {
        throw new Error("無法讀取 Firebase 公開題庫。");
      }
      const questions = await response.json();
      writeCachedPublicQuestions(currentConfig.gameId, questions);
      return questions;
    })
    .finally(() => {
      publicQuestionsRequest = null;
    });

  return publicQuestionsRequest;
}

export async function getPublicQuestion(questionId) {
  const currentConfig = getConfig();

  if (!currentConfig.firebaseDatabaseUrl || !questionId) {
    return null;
  }

  const baseUrl = currentConfig.firebaseDatabaseUrl.replace(/\/$/, "");
  const gameId = encodeURIComponent(currentConfig.gameId);
  const safeQuestionId = encodeURIComponent(questionId);
  const cached = readCachedPublicQuestions(currentConfig.gameId);
  if (cached && cached[questionId]) {
    return cached[questionId];
  }

  const response = await fetchWithTimeout(`${baseUrl}/publicQuestions/${gameId}/${safeQuestionId}.json`, {
    cache: "force-cache"
  }, 5000);

  if (!response.ok) {
    throw new Error("無法讀取 Firebase 公開題目。");
  }

  return response.json();
}

export async function joinFastPlayer(data) {
  const currentConfig = getConfig();
  const gameId = requireFirebaseKey(data.gameId || currentConfig.gameId, "gameId");
  const clientKey = String(data.clientKey || "");
  const clientKeyHash = await hashClientKey(clientKey);
  const playerId = requireFirebaseKey(clientKeyHash ? `player_${clientKeyHash.slice(0, 24)}` : `player_${Date.now()}`, "playerId");
  const teamId = String(data.teamId || pickStableTeam(clientKeyHash || clientKey));
  const now = new Date().toISOString();
  const payload = {
    gameId,
    playerId,
    nickname: String(data.nickname || "").slice(0, 20),
    teamId,
    clientKeyHash,
    clientVersion: currentConfig.clientVersion,
    status: "checked_in",
    checkedInAt: now,
    updatedAt: now,
    source: "student_firebase"
  };

  try {
    await firebasePut(`players/${gameId}/${playerId}`, payload);
    return {
      ...payload,
      existing: false
    };
  } catch (error) {
    if (String(error.message || "").includes("HTTP 401") || String(error.message || "").includes("HTTP 403")) {
      return {
        ...payload,
        existing: true
      };
    }
    throw error;
  }
}

export async function submitFastAnswer(data) {
  const currentConfig = getConfig();
  const playerId = requireFirebaseKey(data.playerId, "playerId");
  const questionId = requireFirebaseKey(data.questionId, "questionId");
  const gameId = requireFirebaseKey(data.gameId || currentConfig.gameId, "gameId");
  const submittedAt = new Date().toISOString();
  const payload = {
    gameId,
    questionId,
    playerId,
    teamId: String(data.teamId || ""),
    selectedAnswer: Array.isArray(data.answer) ? data.answer : [data.answer].filter(Boolean),
    submittedAt,
    firstSubmittedAt: submittedAt,
    clientKeyHash: await hashClientKey(data.clientKey || ""),
    clientVersion: currentConfig.clientVersion,
    status: "submitted",
    answerSource: "student",
    responseSeconds: Number(data.responseSeconds || 0),
    clientSubmitId: String(data.clientSubmitId || ""),
    isCorrect: data.isCorrect === undefined ? null : Boolean(data.isCorrect),
    baseScore: Number(data.baseScore || 0),
    bonusScore: Number(data.bonusScore || 0),
    finalQuestionScore: Number(data.finalQuestionScore || 0),
    firstCorrectBonus: Number(data.firstCorrectBonus || 0),
    perfectAwardCandidate: Boolean(data.perfectAwardCandidate)
  };

  await firebasePut(`answers/${gameId}/${questionId}/${playerId}`, payload);
  return payload;
}

export async function requestFastItemUse(data) {
  const currentConfig = getConfig();
  const itemId = requireFirebaseKey(data.itemId, "itemId");
  const gameId = requireFirebaseKey(data.gameId || currentConfig.gameId, "gameId");
  const now = new Date().toISOString();
  const payload = {
    gameId,
    itemUseId: itemId,
    itemId,
    playerId: String(data.playerId || ""),
    teamId: String(data.teamId || ""),
    itemType: String(data.itemType || ""),
    targetQuestionId: String(data.targetQuestionId || ""),
    targetTeamId: String(data.targetTeamId || ""),
    clientItemUseId: String(data.clientItemUseId || ""),
    effectScore: Number(data.effectScore || 0),
    useWindowClosesAt: String(data.useWindowClosesAt || ""),
    status: "pending",
    createdAt: now,
    clientVersion: currentConfig.clientVersion
  };

  await firebasePut(`itemUses/${gameId}/${itemId}`, payload);
  return payload;
}

export async function requestFastTreasureOpen(data) {
  const currentConfig = getConfig();
  const boxId = requireFirebaseKey(data.boxId, "boxId");
  const gameId = requireFirebaseKey(data.gameId || currentConfig.gameId, "gameId");
  const now = new Date().toISOString();
  const payload = {
    gameId,
    boxId,
    ownerPlayerId: String(data.playerId || ""),
    teamId: String(data.teamId || ""),
    status: "opened_request",
    requestedAt: now,
    clientVersion: currentConfig.clientVersion
  };

  await firebasePut(`treasureBoxOpenRequests/${gameId}/${boxId}`, payload);
  return payload;
}

export async function requestFastAchievementClaim(data) {
  const currentConfig = getConfig();
  const achievementId = requireFirebaseKey(data.achievementId, "achievementId");
  const playerId = requireFirebaseKey(data.playerId, "playerId");
  const gameId = requireFirebaseKey(data.gameId || currentConfig.gameId, "gameId");
  const claimId = `${playerId}_${achievementId}`;
  const now = new Date().toISOString();
  const payload = {
    gameId,
    claimId,
    achievementId,
    playerId,
    teamId: String(data.teamId || ""),
    status: "pending",
    requestedAt: now,
    clientVersion: currentConfig.clientVersion
  };

  await firebasePut(`achievementClaimRequests/${gameId}/${claimId}`, payload);
  return payload;
}

export async function submitFastCreativeSubmission(data) {
  const currentConfig = getConfig();
  const playerId = requireFirebaseKey(data.playerId, "playerId");
  const questionId = requireFirebaseKey(data.questionId || "creative", "questionId");
  const gameId = requireFirebaseKey(data.gameId || currentConfig.gameId, "gameId");
  const submissionId = `${questionId}_${playerId}`;
  const now = new Date().toISOString();
  const payload = {
    gameId,
    questionId,
    submissionId,
    playerId,
    teamId: String(data.teamId || ""),
    content: String(data.content || "").slice(0, 500),
    isAbandoned: Boolean(data.abandon),
    status: "submitted",
    submittedAt: now,
    clientVersion: currentConfig.clientVersion,
    source: "student_firebase"
  };

  try {
    await firebasePut(`creativeSubmissions/${gameId}/${questionId}/${playerId}`, payload);
    return payload;
  } catch (error) {
    if (isFirebasePermissionDenied(error)) {
      return {
        ...payload,
        existing: true
      };
    }
    throw error;
  }
}

export async function submitFastCreativeTeamVote(data) {
  const currentConfig = getConfig();
  const playerId = requireFirebaseKey(data.playerId, "playerId");
  const questionId = requireFirebaseKey(data.questionId || "creative", "questionId");
  const gameId = requireFirebaseKey(data.gameId || currentConfig.gameId, "gameId");
  const now = new Date().toISOString();
  const payload = {
    gameId,
    questionId,
    playerId,
    teamId: String(data.teamId || ""),
    submissionId: String(data.submissionId || ""),
    status: "submitted",
    votedAt: now,
    clientVersion: currentConfig.clientVersion,
    source: "student_firebase"
  };

  try {
    await firebasePut(`creativeTeamVotes/${gameId}/${questionId}/${playerId}`, payload);
    return payload;
  } catch (error) {
    if (isFirebasePermissionDenied(error)) {
      return {
        ...payload,
        existing: true
      };
    }
    throw error;
  }
}

export async function submitFastCreativeFinalVote(data) {
  const currentConfig = getConfig();
  const playerId = requireFirebaseKey(data.playerId, "playerId");
  const questionId = requireFirebaseKey(data.questionId || "creative_final", "questionId");
  const gameId = requireFirebaseKey(data.gameId || currentConfig.gameId, "gameId");
  const now = new Date().toISOString();
  const payload = {
    gameId,
    questionId,
    playerId,
    teamId: String(data.teamId || ""),
    submissionId: String(data.submissionId || ""),
    status: "submitted",
    votedAt: now,
    clientVersion: currentConfig.clientVersion,
    source: "student_firebase"
  };

  try {
    await firebasePut(`creativeFinalVotes/${gameId}/${questionId}/${playerId}`, payload);
    return payload;
  } catch (error) {
    if (isFirebasePermissionDenied(error)) {
      return {
        ...payload,
        existing: true
      };
    }
    throw error;
  }
}

export async function getScoreboardSnapshot() {
  const currentConfig = getConfig();
  const gameId = requireFirebaseKey(currentConfig.gameId, "gameId");
  const snapshot = await firebaseGet(`publicScoreboards/${gameId}`);
  if (!snapshot) {
    return null;
  }
  return {
    gameId,
    updatedAt: snapshot.updatedAt || "",
    isTemporary: snapshot.isTemporary !== false,
    source: snapshot.source || "scoreboard_snapshot",
    teams: normalizeSnapshotRows(snapshot.teams || snapshot.rows || []),
    players: normalizeSnapshotRows(snapshot.players || [])
  };
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function firebaseGet(path) {
  const currentConfig = getConfig();
  if (!currentConfig.firebaseDatabaseUrl) {
    throw new Error("尚未設定 Firebase Realtime Database URL。");
  }

  const response = await fetchWithTimeout(`${getDatabaseBaseUrl(currentConfig)}/${path}.json`, {
    cache: "no-store"
  }, 5000);
  if (!response.ok) {
    throw new Error(`Firebase 讀取失敗：HTTP ${response.status}`);
  }
  return response.json();
}

async function firebasePut(path, payload) {
  const currentConfig = getConfig();
  if (!currentConfig.firebaseDatabaseUrl) {
    throw new Error("尚未設定 Firebase Realtime Database URL。");
  }

  const response = await fetchWithTimeout(`${getDatabaseBaseUrl(currentConfig)}/${path}.json`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json;charset=utf-8"
    },
    body: JSON.stringify(payload)
  }, 5000);
  if (!response.ok) {
    throw new Error(`Firebase 寫入失敗：HTTP ${response.status}`);
  }
  return response.json();
}

function getDatabaseBaseUrl(currentConfig) {
  return currentConfig.firebaseDatabaseUrl.replace(/\/$/, "");
}

function requireFirebaseKey(value, fieldName) {
  const text = String(value || "").trim();
  if (!text || /[.#$/\[\]]/.test(text)) {
    throw new Error(`${fieldName} 不符合 Firebase 路徑格式。`);
  }
  return encodeURIComponent(text);
}

async function hashClientKey(clientKey) {
  const text = String(clientKey || "");
  if (!text || !window.crypto?.subtle) {
    return "";
  }
  const bytes = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

function normalizeSnapshotRows(rows) {
  if (Array.isArray(rows)) return rows;
  if (rows && typeof rows === "object") return Object.values(rows);
  return [];
}

function pickStableTeam(seed) {
  const teams = ["team_1", "team_2", "team_3", "team_4", "team_5"];
  const text = String(seed || Date.now());
  let total = 0;
  for (let index = 0; index < text.length; index += 1) {
    total = (total + text.charCodeAt(index)) % teams.length;
  }
  return teams[total];
}

function isFirebasePermissionDenied(error) {
  const message = String(error?.message || "");
  return message.includes("HTTP 401") || message.includes("HTTP 403");
}

class GameApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "GameApiError";
    this.isGameApiError = true;
  }
}

function createGameApiError(message) {
  return new GameApiError(message || "GAS 回傳錯誤。");
}

function readCachedPublicQuestions(gameId) {
  try {
    const raw = sessionStorage.getItem(`vaccineGamePublicQuestions:${gameId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - Number(cached.cachedAt || 0) > PUBLIC_QUESTIONS_CACHE_MS) {
      sessionStorage.removeItem(`vaccineGamePublicQuestions:${gameId}`);
      return null;
    }
    return cached.questions || null;
  } catch (error) {
    return null;
  }
}

function writeCachedPublicQuestions(gameId, questions) {
  if (!questions || typeof questions !== "object") return;
  try {
    sessionStorage.setItem(`vaccineGamePublicQuestions:${gameId}`, JSON.stringify({
      cachedAt: Date.now(),
      questions
    }));
  } catch (error) {
    // 瀏覽器暫存滿了也不影響作答流程。
  }
}

export async function callGameApi(action, data = {}, options = {}) {
  const currentConfig = getConfig();

  if (currentConfig.apiMode !== "gas" || !currentConfig.gasWebAppUrl) {
    return demoResponse(action, data, currentConfig);
  }

  if (currentConfig.apiTransport === "jsonp") {
    return callGasGetWithRetry(currentConfig.gasWebAppUrl, {
      action,
      data: {
        gameId: currentConfig.gameId,
        ...data
      },
      adminSecret: options.adminSecret || ""
    });
  }

  const response = await fetch(currentConfig.gasWebAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      data: {
        gameId: currentConfig.gameId,
        ...data
      },
      adminSecret: options.adminSecret || ""
    })
  });

  const payload = await response.json();
  if (!payload.ok) {
    throw createGameApiError(payload.error?.message);
  }

  return payload.result;
}

async function callGasGetWithRetry(url, payload) {
  try {
    return await callFetchGetWithRetry(url, payload);
  } catch (fetchError) {
    if (fetchError?.isGameApiError) {
      throw fetchError;
    }
    try {
      return await callJsonpWithRetry(url, payload);
    } catch (jsonpError) {
      if (jsonpError?.isGameApiError) {
        throw jsonpError;
      }
      throw new Error("無法連線到 GAS。請重新整理頁面後再試；若仍失敗，請改用另一個瀏覽器或行動網路。");
    }
  }
}

async function callFetchGetWithRetry(url, payload) {
  let lastError = null;

  for (let attempt = 1; attempt <= GAS_FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await callFetchGet(url, payload);
    } catch (error) {
      lastError = error;
      if (error?.isGameApiError) {
        throw error;
      }
      if (attempt < GAS_FETCH_ATTEMPTS) {
        await wait(600 * attempt);
      }
    }
  }

  throw lastError || new Error("GAS 後端暫時無法回應。");
}

async function callFetchGet(url, payload) {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set("callback", "cb");
  requestUrl.searchParams.set("payload", JSON.stringify(payload));
  requestUrl.searchParams.set("_ts", `${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const response = await fetchWithTimeout(requestUrl.toString(), {
    cache: "no-store"
  }, GAS_FETCH_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error("GAS 後端 HTTP " + response.status);
  }

  const text = await response.text();
  const wrapped = text.match(/^[^(]+\(([\s\S]*)\);?$/);
  if (!wrapped) {
    throw new Error("GAS 後端回應格式錯誤。");
  }

  const result = JSON.parse(wrapped[1]);
  if (!result.ok) {
    throw createGameApiError(result.error?.message);
  }

  return result.result;
}

async function callJsonpWithRetry(url, payload) {
  let lastError = null;

  for (let attempt = 1; attempt <= GAS_JSONP_ATTEMPTS; attempt += 1) {
    try {
      return await callJsonp(url, payload);
    } catch (error) {
      lastError = error;
      if (error?.isGameApiError) {
        throw error;
      }
      if (attempt < GAS_JSONP_ATTEMPTS) {
        await wait(900 * attempt);
      }
    }
  }

  throw lastError || new Error("GAS 後端暫時無法回應。");
}

function callJsonp(url, payload) {
  return new Promise((resolve, reject) => {
    const callbackName = `vaccineGameJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const requestUrl = new URL(url);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("GAS 後端回應逾時，請重試。"));
    }, GAS_JSONP_TIMEOUT_MS);

    requestUrl.searchParams.set("callback", callbackName);
    requestUrl.searchParams.set("payload", JSON.stringify(payload));
    requestUrl.searchParams.set("_ts", `${Date.now()}_${Math.random().toString(36).slice(2)}`);

    window[callbackName] = response => {
      cleanup();
      if (!response || response.ok === false) {
        reject(createGameApiError(response?.error?.message));
        return;
      }
      resolve(response.result);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("無法連線到 GAS Web App。"));
    };

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    script.src = requestUrl.toString();
    document.body.append(script);
  });
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function demoResponse(action, data, currentConfig) {
  if (action === "joinGame") {
    const teamId = data.teamId || pickDemoTeam();
    return {
      playerId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      gameId: currentConfig.gameId,
      nickname: data.nickname,
      teamId
    };
  }

  if (action === "submitAnswer") {
    return {
      submitted: true,
      gameId: currentConfig.gameId,
      questionId: data.questionId,
      paperOpenedAt: new Date().toISOString(),
      responseSeconds: 0
    };
  }

  if (action === "getPlayerSummary") {
    return {
      gameId: currentConfig.gameId,
      playerId: data.playerId,
      teamId: "team_1",
      playerScore: 35,
      teamScore: 38,
      hasInventoryNotice: true,
      hasAchievementNotice: true,
      updatedAt: new Date().toISOString(),
      lastAnswer: data.questionId
        ? { questionId: data.questionId, score: 35, isCorrect: true }
        : null
    };
  }

  if (action === "getScoreboard") {
    return {
      gameId: currentConfig.gameId,
      rows: [
        {
          teamId: "team_1",
          playerCount: 1,
          effectivePlayerCount: 1,
          closedQuestionCount: 1,
          correctAnswerCount: 1,
          correctRate: 1,
          currentQuestionCorrectRate: 1,
          totalScore: 35,
          averageScore: 35,
          teamBonusScore: 3,
          finalScore: 38,
          weightedAverageScore: 38
        },
        {
          teamId: "team_2",
          playerCount: 1,
          effectivePlayerCount: 1,
          closedQuestionCount: 1,
          correctAnswerCount: 0,
          correctRate: 0,
          currentQuestionCorrectRate: 0,
          totalScore: 20,
          averageScore: 20,
          teamBonusScore: 0,
          finalScore: 20,
          weightedAverageScore: 20
        }
      ]
    };
  }

  if (action === "getPlayerLeaderboard") {
    return {
      gameId: currentConfig.gameId,
      rows: [
        { nickname: "測試學員", teamId: "team_1", score: 35 },
        { nickname: "示範學員", teamId: "team_2", score: 20 }
      ]
    };
  }

  if (action === "getPlayerInventory") {
    return {
      gameId: currentConfig.gameId,
      playerId: data.playerId,
      teamId: "team_1",
      unopenedBoxCount: 1,
      maxUnopenedBoxCount: 3,
      boxes: [
        {
          boxId: "demo_box_001",
          sourceType: "correct_drop",
          status: "unopened",
          awardedAt: new Date().toISOString(),
          openedAt: "",
          expiredAt: "",
          itemType: "",
          itemLabel: ""
        },
        {
          boxId: "demo_box_002",
          sourceType: "correct_count_3",
          status: "opened",
          awardedAt: new Date().toISOString(),
          openedAt: new Date().toISOString(),
          expiredAt: "",
          itemType: "score_3",
          itemLabel: "中加分卡：戰隊 +3"
        }
      ],
      items: [
        {
          itemId: "demo_item_001",
          itemType: "score_3",
          itemLabel: "中加分卡：戰隊 +3",
          sourceBoxId: "demo_box_002",
          status: "available",
          usedAt: "",
          targetQuestionId: "",
          targetTeamId: "",
          effectScore: ""
        }
      ]
    };
  }

  if (action === "openTreasureBox") {
    return {
      gameId: currentConfig.gameId,
      playerId: data.playerId,
      boxId: data.boxId,
      openedAt: new Date().toISOString(),
      itemType: "score_1",
      itemLabel: "小加分卡：戰隊 +1",
      message: "",
      item: {
        itemId: "demo_item_opened",
        itemType: "score_1",
        itemLabel: "小加分卡：戰隊 +1",
        status: "available",
        sourceBoxId: data.boxId
      }
    };
  }

  if (action === "useItem") {
    return {
      gameId: currentConfig.gameId,
      playerId: data.playerId,
      teamId: "team_1",
      itemId: data.itemId,
      itemType: "score_3",
      itemLabel: "中加分卡：戰隊 +3",
      status: "used",
      effectScore: 3,
      targetQuestionId: data.targetQuestionId || "demo_q002",
      targetTeamId: data.targetTeamId || ""
    };
  }

  if (action === "getPlayerAchievements") {
    return {
      gameId: currentConfig.gameId,
      playerId: data.playerId,
      teamId: "team_1",
      correctCount: 3,
      correctStreak: 3,
      itemUseCount: 1,
      unopenedBoxCount: 1,
      hasNotice: true,
      achievements: [
        {
          achievementId: "correct_3",
          title: "累積答對 3 題",
          description: "達成後可獲得 1 個寶箱。",
          current: 3,
          target: 3,
          completed: true,
          rewarded: true
        },
        {
          achievementId: "correct_5",
          title: "累積答對 5 題",
          description: "達成後可獲得 1 個寶箱。",
          current: 3,
          target: 5,
          completed: false,
          rewarded: false
        }
      ]
    };
  }

  if (action === "claimAchievementReward") {
    return {
      gameId: currentConfig.gameId,
      playerId: data.playerId,
      achievementId: data.achievementId,
      awardedCount: 1,
      boxes: [
        {
          boxId: "demo_claimed_box",
          status: "unopened"
        }
      ]
    };
  }

  if (action === "submitCreativeAnswer") {
    return {
      gameId: currentConfig.gameId,
      submissionId: "demo_submission_001",
      teamId: "team_1",
      submittedAt: new Date().toISOString(),
      status: "submitted"
    };
  }

  if (action === "getTeamCreativePool") {
    return {
      gameId: currentConfig.gameId,
      teamId: "team_1",
      rows: [
        {
          submissionId: "demo_submission_001",
          content: "接種前先核對對象、疫苗與紀錄，確保安全。",
          submittedAt: new Date().toISOString(),
          voteCount: 2,
          isOwn: true
        },
        {
          submissionId: "demo_submission_002",
          content: "冷鏈異常先隔離、記錄，再依規定通報處理。",
          submittedAt: new Date().toISOString(),
          voteCount: 1,
          isOwn: false
        }
      ],
      ownSubmissionId: "",
      votedSubmissionId: "",
      phase: "team_vote",
      remainingSeconds: 30,
      answerSeconds: 180,
      teamVoteSeconds: 30
    };
  }

  if (action === "voteTeamCreative") {
    return {
      gameId: currentConfig.gameId,
      teamId: "team_1",
      submissionId: data.submissionId,
      votedAt: new Date().toISOString()
    };
  }

  if (action === "getCreativeFinalists") {
    return {
      gameId: currentConfig.gameId,
      rows: [
        {
          submissionId: "demo_final_a",
          finalAlias: "A",
          content: "接種前核對對象、疫苗與紀錄，守住安全第一關。",
          isOwnTeam: true
        },
        {
          submissionId: "demo_final_b",
          finalAlias: "B",
          content: "冷鏈異常先隔離記錄，再依規定通報與判定。",
          isOwnTeam: false
        }
      ],
      votedSubmissionId: "",
      phase: "final_vote",
      remainingSeconds: 30,
      finalVoteSeconds: 30
    };
  }

  if (action === "voteCreativeFinal") {
    return {
      gameId: currentConfig.gameId,
      submissionId: data.submissionId,
      finalAlias: "B",
      votedAt: new Date().toISOString()
    };
  }

  if (action === "getFinalResults") {
    return {
      gameId: currentConfig.gameId,
      playerId: data.playerId,
      nickname: "示範學員",
      teamId: "team_1",
      playerScore: 135,
      playerRank: 3,
      playerCount: 12,
      teamRank: 1,
      teamScore: 168,
      hasAward: true,
      awards: [
        { awardType: "perfect", rank: 2 }
      ]
    };
  }

  if (action === "getCurrentQuestion") {
    return {
      gameId: currentConfig.gameId,
      status: "question_open",
      paperOpenedAt: new Date().toISOString(),
      question: {
        questionId: "demo_q001",
        order: 1,
        type: "single",
        section: "demo",
        title: "下列何者是預防接種作業中最重要的基本原則？",
        options: [
          { id: "A", text: "依規定核對對象、疫苗與接種紀錄" },
          { id: "B", text: "只要現場速度夠快即可" },
          { id: "C", text: "先接種再補資料" },
          { id: "D", text: "只需口頭確認姓名" }
        ],
        timeLimitSec: 60,
        scoreMode: "timeBucket",
        isBossQuestion: false,
        isCreativeVote: false
      }
    };
  }

  if (action === "getGameState") {
    return {
      gameId: currentConfig.gameId,
      status: "created",
      currentQuestionId: "demo_q001",
      allowFreeTeamChoice: false
    };
  }

  return {};
}

function pickDemoTeam() {
  const teams = ["team_1", "team_2", "team_3", "team_4", "team_5"];
  return teams[Math.floor(Math.random() * teams.length)];
}
