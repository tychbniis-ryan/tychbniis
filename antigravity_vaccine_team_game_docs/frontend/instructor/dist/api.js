const config = window.VACCINE_GAME_CONFIG || {};

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
    throw new Error(payload.error?.message || "GAS 後端回傳錯誤。");
  }

  return payload.result;
}

async function callGasGetWithRetry(url, payload) {
  try {
    return await callFetchGetWithRetry(url, payload);
  } catch (fetchError) {
    try {
      return await callJsonpWithRetry(url, payload);
    } catch (jsonpError) {
      throw new Error("無法連線到 GAS。請重新整理頁面後再試；若仍失敗，請改用另一個瀏覽器或行動網路。");
    }
  }
}

async function callFetchGetWithRetry(url, payload) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await callFetchGet(url, payload);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await wait(500 * attempt);
      }
    }
  }

  throw lastError || new Error("GAS 後端暫時無法回應。");
}

async function callFetchGet(url, payload) {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set("callback", "cb");
  requestUrl.searchParams.set("payload", JSON.stringify(payload));

  const response = await fetch(requestUrl.toString(), {
    cache: "no-store"
  });

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
    throw new Error(result.error?.message || "GAS 後端回傳錯誤。");
  }

  return result.result;
}

async function callJsonpWithRetry(url, payload) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await callJsonp(url, payload);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await wait(800 * attempt);
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
    }, 25000);

    requestUrl.searchParams.set("callback", callbackName);
    requestUrl.searchParams.set("payload", JSON.stringify(payload));

    window[callbackName] = response => {
      cleanup();
      if (!response.ok) {
        reject(new Error(response.error?.message || "GAS 後端回傳錯誤。"));
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
      status: "created"
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
      scoredCount: 0
    };
  }

  if (action === "getScoreboard") {
    return {
      gameId: currentConfig.gameId,
      rows: []
    };
  }

  return {};
}
