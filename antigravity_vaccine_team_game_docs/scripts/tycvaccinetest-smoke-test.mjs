import { chromium } from "playwright";

const baseUrl = process.argv[2] || process.env.TYCVACCINETEST_URL || "http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.route("https://example.test/tyc-gas**", async route => {
    const requestUrl = new URL(route.request().url());
    const callback = requestUrl.searchParams.get("callback") || "callback";
    await route.fulfill({
      contentType: "application/javascript",
      body: `${callback}(${JSON.stringify({
        ok: true,
        result: {
          bestUpdated: true,
          rows: [
            { rank: 1, nickname: "mock-rank", score: 100, correctCount: 60, totalQuestions: 60 }
          ]
        }
      })});`
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.TYC_VACCINE_TEST_CONFIG.gasWebAppUrl = "https://example.test/tyc-gas";
  });

  await page.waitForSelector("#startBtn");
  await page.waitForSelector("#leaderboardBtn");
  await page.waitForSelector("#nicknameInput");

  const visibleHomeText = await page.locator("body").innerText();
  assert(!visibleHomeText.includes("TYC_VaccineTest"), "Internal project code is visible on the page");
  assert(!visibleHomeText.includes("TYCVACCINETEST"), "Internal URL code is visible on the page");
  assert(!visibleHomeText.includes("Firebase"), "Internal data-service name is visible on the page");
  assert(!visibleHomeText.includes("GAS"), "Internal score-service name is visible on the page");

  await page.click("#leaderboardBtn");
  await page.waitForSelector("#homeLeaderboard .rank-row");
  const homeRankText = await page.locator("#homeLeaderboard").innerText();
  assert(homeRankText.includes("mock-rank"), "Leaderboard rows response was not rendered on home page");

  await page.fill("#nicknameInput", "smoke-user");
  await page.click("#startBtn");
  await page.waitForSelector("#showOptionsBtn");
  assert(await page.locator(".option-btn").count() === 0, "Options should stay hidden before clicking start-answer");

  const questions = await page.evaluate(async () => {
    const response = await fetch("./soloQuestions.v0_1_0.json", { cache: "no-store" });
    return response.json();
  });

  for (let index = 0; index < questions.length; index += 1) {
    await revealOptions();
    const correctAnswers = String(questions[index].correctAnswer || "").split(",").map(item => item.trim()).filter(Boolean);
    for (const answer of correctAnswers) {
      await page.click(`button[data-answer="${answer}"]`);
    }
    await page.click("#submitAnswerBtn");
    await page.waitForSelector("#nextQuestionBtn");
    await page.click("#nextQuestionBtn");
    if (index + 1 < questions.length) {
      await page.waitForSelector("#showOptionsBtn");
    }
  }

  await page.waitForSelector("#submitStatus");
  const summary = await page.locator("body").innerText();
  assert(summary.includes("60 / 60"), "Summary did not show 60 / 60 correct answers");
  assert(summary.includes("100"), "Summary did not include perfect-score achievement value");
  assert(summary.includes("mock-rank"), "Summary leaderboard rows response was not rendered");

  console.log("TYC_VaccineTest smoke test OK");
} finally {
  await browser.close();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function revealOptions() {
  await page.waitForSelector("#showOptionsBtn");
  await page.click("#showOptionsBtn");
  await page.waitForSelector("#submitAnswerBtn");
}
