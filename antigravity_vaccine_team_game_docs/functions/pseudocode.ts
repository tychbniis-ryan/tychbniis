/**
 * Cloud Functions pseudocode for Antigravity.
 * This file is not production-ready. Use it as implementation guidance.
 */

type ScoreBucket = { maxSeconds: number; score: number };

const SCORE_BUCKETS: ScoreBucket[] = [
  { maxSeconds: 10, score: 30 },
  { maxSeconds: 20, score: 25 },
  { maxSeconds: 30, score: 20 },
  { maxSeconds: 45, score: 15 },
  { maxSeconds: 60, score: 10 },
  { maxSeconds: 999, score: 5 },
];

function calculateBaseScore(isCorrect: boolean, responseSeconds: number): number {
  if (!isCorrect) return 0;
  const bucket = SCORE_BUCKETS.find(b => responseSeconds <= b.maxSeconds);
  return bucket ? bucket.score : 0;
}

function drawTreasure(luckyPrizeGranted: boolean, progressRatio: number): string {
  const specialRate = luckyPrizeGranted ? 0 : (progressRatio >= 0.7 ? 0.10 : 0.03);

  const table = [
    { type: "score_1", rate: 0.25 },
    { type: "score_3", rate: 0.20 },
    { type: "score_5", rate: 0.12 },
    { type: "score_10", rate: 0.05 },
    { type: "double", rate: 0.10 },
    { type: "comeback", rate: 0.08 },
    { type: "challenge", rate: 0.10 },
    { type: "special", rate: specialRate },
    { type: "empty", rate: luckyPrizeGranted ? 0.10 : 0.07 },
  ];

  const total = table.reduce((sum, x) => sum + x.rate, 0);
  let r = Math.random() * total;

  for (const row of table) {
    r -= row.rate;
    if (r <= 0) return row.type;
  }
  return "empty";
}

function enforceMaxBoxes(boxes: any[]): any[] {
  const unopened = boxes.filter(b => b.status === "unopened");
  if (unopened.length <= 3) return boxes;

  unopened.sort((a, b) => a.obtainedAt - b.obtainedAt);
  const toDiscard = unopened.slice(0, unopened.length - 3).map(b => b.boxId);

  return boxes.map(b => {
    if (toDiscard.includes(b.boxId)) {
      return {
        ...b,
        status: "discarded",
        discardedAt: Date.now(),
        discardReason: "EXCEED_MAX_3_BOXES"
      };
    }
    return b;
  });
}
