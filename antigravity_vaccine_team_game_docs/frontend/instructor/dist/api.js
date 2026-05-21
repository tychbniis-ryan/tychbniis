const config = window.VACCINE_GAME_CONFIG || {};

export function getConfig() {
  const localGasUrl = localStorage.getItem("vaccineGameGasUrl") || "";
  return {
    gameId: config.gameId || "game_YYYYMMDD_vaccine_training",
    gasWebAppUrl: localGasUrl || config.gasWebAppUrl || "",
    apiMode: localGasUrl || config.gasWebAppUrl ? "gas" : config.apiMode || "demo"
  };
}

export function saveGasUrl(url) {
  localStorage.setItem("vaccineGameGasUrl", url.trim());
}

export async function callGameApi(action, data = {}, options = {}) {
  const currentConfig = getConfig();

  if (currentConfig.apiMode !== "gas" || !currentConfig.gasWebAppUrl) {
    return demoResponse(action, data, currentConfig);
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

function demoResponse(action, data, currentConfig) {
  if (action === "createGame") {
    return {
      gameId: currentConfig.gameId,
      status: "draft"
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

  return {};
}

