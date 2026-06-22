const defaultStaticConfigUrl = "./v4-static-config.json";

export async function loadV4StaticConfig(url = defaultStaticConfigUrl) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const config = await response.json();
    return config && typeof config === "object" ? config : null;
  } catch (error) {
    return null;
  }
}

export function buildPublicQuestionCache(staticConfig) {
  const rows = Array.isArray(staticConfig?.questions) ? staticConfig.questions : [];
  return rows
    .filter(question => question && question.enabled !== false && question.questionId)
    .reduce((cache, question) => {
      cache[question.questionId] = {
        questionId: question.questionId,
        order: question.order,
        type: question.type || "choice",
        title: question.title || question.text || "",
        text: question.text || question.title || "",
        options: Array.isArray(question.options) ? question.options : [],
        timeLimitSec: Number(question.timeLimitSec || 60),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || ""
      };
      return cache;
    }, {});
}

export function normalizeStaticAnswer(value) {
  return (Array.isArray(value) ? value : [value])
    .map(item => String(item || "").trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function calculateStaticQuestionResult(staticConfig, question, answer, responseSeconds) {
  const scoreRules = staticConfig?.scoreRules || {};
  const buckets = Array.isArray(scoreRules.buckets) ? scoreRules.buckets : [];
  const correctAnswer = question?.correctAnswer;
  const isCorrect = normalizeStaticAnswer(answer) === normalizeStaticAnswer(correctAnswer);
  const bucket = buckets.find(row => Number(responseSeconds || 999) <= Number(row.maxSeconds || 999));
  const baseScore = isCorrect && bucket ? Number(bucket.score || 0) : 0;

  return {
    isCorrect,
    baseScore,
    bonusScore: 0,
    finalQuestionScore: baseScore,
    firstCorrectBonus: Number(scoreRules.firstCorrectBonus || 0)
  };
}

export function buildClientSubmitId(gameId, questionId, playerId) {
  return [gameId, questionId, playerId].map(part => String(part || "")).join(":");
}

export function getStaticGameSeed(staticConfig, gameId) {
  return String(staticConfig?.gameSessionSeed || staticConfig?.gameSeed || staticConfig?.generatedAt || gameId || "v4-static-seed");
}

export function hashStringToUint32(text) {
  let hash = 2166136261;
  for (let index = 0; index < String(text || "").length; index += 1) {
    hash ^= String(text).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seedText) {
  let state = hashStringToUint32(seedText) || 1;
  state = Math.imul(state ^ (state >>> 15), 1 | state);
  state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
}

export function drawWeightedItem(itemWeights, seedText) {
  const rows = Array.isArray(itemWeights) && itemWeights.length
    ? itemWeights
    : [{ itemType: "empty", weight: 1 }];
  const totalWeight = rows.reduce((total, row) => total + Math.max(0, Number(row.weight || 0)), 0) || 1;
  let cursor = seededRandom(seedText) * totalWeight;
  for (const row of rows) {
    cursor -= Math.max(0, Number(row.weight || 0));
    if (cursor <= 0) {
      return String(row.itemType || "empty");
    }
  }
  return String(rows[rows.length - 1]?.itemType || "empty");
}

export function buildStaticTreasurePlan(staticConfig, gameId, playerId) {
  const seed = getStaticGameSeed(staticConfig, gameId);
  const treasureRules = staticConfig?.treasureRules || {};
  const chance = Number(treasureRules.perQuestionBoxChance ?? 0.3);
  const maxQuestionSlots = Math.max(1, Number(treasureRules.maxQuestionSlots || 100));
  const itemWeights = treasureRules.itemWeights || [];
  const questions = (staticConfig?.questions || [])
    .filter(question => question && question.enabled !== false && question.type !== "creative" && question.questionId)
    .slice(0, maxQuestionSlots);
  return questions.reduce((plan, question) => {
    const questionId = question.questionId;
    const boxRoll = seededRandom([seed, playerId, questionId, "box"].join(":"));
    const hasBox = boxRoll < chance;
    if (!hasBox) {
      plan[questionId] = { hasBox: false };
      return plan;
    }

    let itemType = drawWeightedItem(itemWeights, [seed, playerId, questionId, "item"].join(":"));
    if (itemType === "special") itemType = "empty";
    if (itemType === "double") {
      const hasPreviousDouble = Object.values(plan).some(row => row.itemType === "double");
      if (hasPreviousDouble) itemType = "score_5";
    }
    if (itemType === "comeback") {
      const hasPreviousComeback = Object.values(plan).some(row => row.itemType === "comeback");
      if (hasPreviousComeback) itemType = "score_5";
    }
    plan[questionId] = {
      hasBox: true,
      boxId: ["local_box", hashStringToUint32([seed, playerId, questionId, "boxId"].join(":")).toString(36)].join("_"),
      sourceType: "question_correct",
      sourceQuestionId: questionId,
      itemType
    };
    return plan;
  }, {});
}

export function getPerfectAwardCandidate(staticConfig, localAnswers) {
  const questions = (staticConfig?.questions || []).filter(question =>
    question && question.enabled !== false && question.type !== "creative"
  );
  if (!questions.length) return false;
  return questions.every(question => localAnswers?.[question.questionId]?.isCorrect === true);
}
