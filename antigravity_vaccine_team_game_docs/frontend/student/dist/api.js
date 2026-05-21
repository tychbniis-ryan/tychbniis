const config = window.VACCINE_GAME_CONFIG || {};

export function getConfig() {
  const localGasUrl = localStorage.getItem("vaccineGameGasUrl") || "";
  return {
    gameId: config.gameId || "game_YYYYMMDD_vaccine_training",
    gasWebAppUrl: localGasUrl || config.gasWebAppUrl || "",
    apiMode: localGasUrl || config.gasWebAppUrl ? "gas" : config.apiMode || "demo"
  };
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
      responseSeconds: 0
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

