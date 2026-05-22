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
      teamScore: 35,
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
      targetQuestionId: data.targetQuestionId || "",
      targetTeamId: data.targetTeamId || ""
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
      teamVoteSeconds: 60
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
      finalVoteSeconds: 60
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
      status: "demo",
      currentQuestionId: "demo_q001"
    };
  }

  return {};
}

function pickDemoTeam() {
  const teams = ["team_1", "team_2", "team_3", "team_4", "team_5"];
  return teams[Math.floor(Math.random() * teams.length)];
}
