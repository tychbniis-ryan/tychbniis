const config = window.VACCINE_GAME_CONFIG || {};

export function getConfig() {
  const localGasUrl = localStorage.getItem("vaccineGameGasUrl") || "";
  return {
    gameId: config.gameId || "game_YYYYMMDD_vaccine_training",
    gasWebAppUrl: localGasUrl || config.gasWebAppUrl || "",
    firebaseDatabaseUrl: config.firebaseDatabaseUrl || "",
    firebaseGameStatePollMs: Number(config.firebaseGameStatePollMs || 5000),
    apiMode: localGasUrl || config.gasWebAppUrl ? "gas" : config.apiMode || "demo",
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
  const response = await fetch(`${baseUrl}/gameState/${gameId}.json`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("無法讀取 Firebase 公開狀態。");
  }

  return response.json();
}

export async function callGameApi(action, data = {}, options = {}) {
  const currentConfig = getConfig();

  if (currentConfig.apiMode !== "gas" || !currentConfig.gasWebAppUrl) {
    return demoResponse(action, data, currentConfig);
  }

  if (currentConfig.apiTransport === "jsonp") {
    return callJsonp(currentConfig.gasWebAppUrl, {
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

function callJsonp(url, payload) {
  return new Promise((resolve, reject) => {
    const callbackName = `vaccineGameJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const requestUrl = new URL(url);

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
      delete window[callbackName];
      script.remove();
    }

    script.src = requestUrl.toString();
    document.body.append(script);
  });
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
