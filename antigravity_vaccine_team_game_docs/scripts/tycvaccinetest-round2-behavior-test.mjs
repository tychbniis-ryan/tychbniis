import { chromium } from "playwright";

const baseUrl = process.argv[2] || process.env.TYCVACCINETEST_URL || "http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
let questions = [];

try {
  await page.addInitScript(() => {
    localStorage.setItem("tycVaccineTestPlayerId", "solo_test_7");
    localStorage.removeItem("tycVaccineTestSoloDraft");
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.fill("#nicknameInput", "round2");
  await page.click("#startBtn");
  await page.waitForSelector("#showOptionsBtn");

  questions = await page.evaluate(async () => {
    const response = await fetch("./soloQuestions.v0_1_0.json", { cache: "no-store" });
    return response.json();
  });

  await answerCorrect(0);
  await page.waitForSelector('[data-panel="treasure"] .notice-dot');
  await page.evaluate(() => window.scrollTo(0, 200));
  const scrollState = await page.evaluate(() => ({
    scrollY: Math.round(window.scrollY),
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
    bodyOverflow: getComputedStyle(document.body).overflow
  }));
  assert(scrollState.scrollY === 0, `Mobile quiz body should not scroll, got ${scrollState.scrollY}`);
  assert(scrollState.bodyOverflow.includes("hidden"), `Mobile quiz body overflow should be hidden, got ${scrollState.bodyOverflow}`);

  await page.click('[data-panel="treasure"]');
  await page.waitForSelector("[data-box]");
  await page.click("[data-box]");
  await page.waitForFunction(() => document.querySelector(".utility-panel")?.innerText.includes("寶箱"));

  await page.click('.utility-panel [data-close-panel]');
  await page.click('[data-panel="items"]');
  await page.waitForSelector('.utility-panel [data-item="challenge"]:not([disabled])');
  await page.click('.utility-panel [data-item="challenge"]');
  await page.waitForSelector('[data-challenge-choice="skip"]');
  await page.click('[data-challenge-choice="skip"]');
  await page.waitForFunction(() => document.querySelector(".utility-panel")?.innerText.includes("3"));

  await page.click('.utility-panel [data-close-panel]');
  await page.click("#nextQuestionBtn");
  await page.waitForSelector("#showOptionsBtn");
  await answerCorrect(1);
  await page.click("#nextQuestionBtn");
  await page.waitForSelector("#showOptionsBtn");
  await answerCorrect(2);

  await page.waitForSelector('[data-panel="achievements"] .notice-dot');
  await page.click('[data-panel="achievements"]');
  await page.waitForSelector("[data-achievement]");
  const claimableCount = await page.locator("[data-achievement]").count();
  assert(claimableCount > 0, "Achievement panel should show claimable achievements");
  await page.locator("[data-achievement]").first().click();
  await page.click('.utility-panel [data-close-panel]');
  await page.click('[data-panel="treasure"]');
  await page.waitForSelector("[data-box]");
  const boxCountAfterClaim = await page.locator("[data-box]").count();
  assert(boxCountAfterClaim > 0, "Claiming achievement should add unopened treasure boxes");

  console.log("TYC_VaccineTest round2 behavior test OK");
} finally {
  await browser.close();
}

async function answerCorrect(index) {
  await page.waitForSelector("#showOptionsBtn");
  await page.click("#showOptionsBtn");
  await page.waitForSelector("#submitAnswerBtn");
  const answers = String(questions[index].correctAnswer || "").split(",").map(item => item.trim()).filter(Boolean);
  for (const answer of answers) {
    await page.click(`button[data-answer="${answer}"]`);
  }
  await page.click("#submitAnswerBtn");
  await page.waitForSelector("#nextQuestionBtn");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
