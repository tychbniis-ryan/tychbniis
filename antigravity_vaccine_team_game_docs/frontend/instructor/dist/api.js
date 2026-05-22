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
    apiMode: config.gasWebAppUrl ? "gas" : config.apiMode || "demo",
    apiTransport: config.apiTransport || "jsonp"
  };
}

export function clearLegacyGasUrl() {
  localStorage.removeItem("vaccineGameGasUrl");
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
    cache: "no-store"
  }, 8000)
    .then(async response => {
      if (!response.ok) {
        throw new Error("無法讀取公開題庫。");
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
    // 瀏覽器暫存失敗時不阻擋講師操作。
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
  if (action === "createGame") {
    return {
      gameId: currentConfig.gameId,
      status: "created",
      allowFreeTeamChoice: Boolean(data.allowFreeTeamChoice)
    };
  }

  if (action === "resetGameData") {
    return {
      gameId: currentConfig.gameId,
      status: "draft",
      message: "示範模式：遊戲資料已初始化。"
    };
  }

  if (action === "openQuestion") {
    return {
      gameId: currentConfig.gameId,
      questionId: data.questionId,
      status: "question_open"
    };
  }

  if (action === "closeAndScoreQuestion") {
    return {
      gameId: currentConfig.gameId,
      questionId: data.questionId,
      status: "question_closed",
      scoredCount: 0,
      submittedCount: 0,
      correctAnswer: "A",
      correctAnswerText: "A. 示範答案",
      explanation: "示範模式未連接正式 GAS。",
      scoreboard: [
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
        }
      ]
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
        }
      ]
    };
  }

  if (action === "getTeamCreativeCandidates") {
    return {
      gameId: currentConfig.gameId,
      teams: {
        team_1: [
          {
            submissionId: "demo_submission_001",
            teamId: "team_1",
            content: "接種前核對對象、疫苗與紀錄。",
            voteCount: 3,
            selectedByInstructor: false,
            finalAlias: ""
          }
        ],
        team_2: [
          {
            submissionId: "demo_submission_002",
            teamId: "team_2",
            content: "冷鏈異常先隔離與通報。",
            voteCount: 2,
            selectedByInstructor: false,
            finalAlias: ""
          }
        ]
      }
    };
  }

  if (action === "selectCreativeFinalists") {
    return {
      gameId: currentConfig.gameId,
      rows: (data.finalists || []).map((row, index) => ({
        submissionId: row.submissionId,
        teamId: row.teamId,
        finalAlias: String.fromCharCode(65 + index),
        content: "示範代表作品"
      }))
    };
  }

  if (action === "getCreativeVoteResult") {
    return {
      gameId: currentConfig.gameId,
      totalVotes: 3,
      rows: [
        {
          submissionId: "demo_submission_002",
          teamId: "team_2",
          finalAlias: "B",
          content: "冷鏈異常先隔離與通報。",
          voteCount: 3
        }
      ]
    };
  }

  if (action === "exportGameReport") {
    return {
      gameId: currentConfig.gameId,
      exportedAt: new Date().toISOString(),
      spreadsheetId: "demo_report",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/demo_report",
      sheetCount: 10
    };
  }

  return {};
}
