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

export function getPerfectAwardCandidate(staticConfig, localAnswers) {
  const questions = (staticConfig?.questions || []).filter(question =>
    question && question.enabled !== false && question.type !== "creative"
  );
  if (!questions.length) return false;
  return questions.every(question => localAnswers?.[question.questionId]?.isCorrect === true);
}
