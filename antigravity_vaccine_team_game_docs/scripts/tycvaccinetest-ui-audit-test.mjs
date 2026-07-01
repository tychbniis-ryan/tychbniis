import { chromium } from "playwright";

const baseUrl = process.argv[2] || process.env.TYCVACCINETEST_URL || "http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

try {
  await page.addInitScript(() => {
    localStorage.setItem("tycVaccineTestPlayerId", "solo_test_7");
    localStorage.removeItem("tycVaccineTestSoloDraft");
  });

  await page.route("https://example.test/tyc-gas**", async route => {
    const requestUrl = new URL(route.request().url());
    const callback = requestUrl.searchParams.get("callback") || "callback";
    await route.fulfill({
      contentType: "application/javascript",
      body: `${callback}(${JSON.stringify({
        ok: true,
        result: {
          rows: [
            { rank: 1, nickname: "ui-audit", score: 77, correctCount: 7, totalQuestions: 10 }
          ]
        }
      })});`
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.TYC_VACCINE_TEST_CONFIG.gasWebAppUrl = "https://example.test/tyc-gas";
  });
  const homeText = await page.locator("body").innerText();
  assert(homeText.includes("0.1.1"), "Homepage should show version 0.1.1");
  await page.fill("#nicknameInput", "ui-audit");
  await page.click("#startBtn");
  await page.waitForSelector("#showOptionsBtn");

  const beforeAnswer = await page.evaluate(() => {
    const utility = document.querySelector(".utility-bar").getBoundingClientRect();
    const question = document.querySelector(".question-title").getBoundingClientRect();
    return {
      optionCount: document.querySelectorAll(".option-btn").length,
      utilityBottom: Math.round(utility.bottom),
      questionTop: Math.round(question.top),
      overlapsToolbar: utility.bottom > question.top,
      bodyOverflow: getComputedStyle(document.body).overflow
    };
  });
  assert(beforeAnswer.optionCount === 0, "Options should be hidden before clicking start-answer");
  assert(beforeAnswer.overlapsToolbar === false, `Question overlaps toolbar: ${JSON.stringify(beforeAnswer)}`);

  await page.click("#showOptionsBtn");
  await page.waitForSelector("#submitAnswerBtn");
  const questions = await page.evaluate(async () => {
    const response = await fetch("./soloQuestions.v0_1_0.json", { cache: "no-store" });
    return response.json();
  });
  const correctAnswers = String(questions[0].correctAnswer || "").split(",").map(item => item.trim()).filter(Boolean);
  for (const answer of correctAnswers) {
    await page.click(`button[data-answer="${answer}"]`);
  }
  await page.click("#submitAnswerBtn");
  await page.waitForSelector("#nextQuestionBtn");

  const afterAnswer = await page.evaluate(() => ({
    treasureDot: Boolean(document.querySelector('[data-panel="treasure"] .notice-dot')),
    visibleAnswerRows: Array.from(document.querySelectorAll(".answer-lines > div")).filter(el => getComputedStyle(el).display !== "none").length,
    visibleOptions: getComputedStyle(document.querySelector(".options-grid")).display,
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight
  }));
  assert(afterAnswer.treasureDot === true, "Treasure red dot should appear when unopened boxes exist");
  assert(afterAnswer.visibleAnswerRows === 2, `Answer summary should show only 2 rows, got ${afterAnswer.visibleAnswerRows}`);
  assert(afterAnswer.visibleOptions === "none", "Options should collapse after answering");

  await page.click('[data-panel="items"]');
  await page.waitForSelector(".utility-panel");
  const itemPanel = await page.evaluate(() => ({
    itemButtons: document.querySelectorAll(".utility-panel [data-item]").length,
    emptyText: document.querySelector(".utility-panel")?.innerText.includes("目前尚未取得道具")
  }));
  assert(itemPanel.itemButtons === 0, "Unowned items should not be rendered as item buttons");
  assert(itemPanel.emptyText === true, "Item panel should show an empty owned-item state");
  await page.click(".utility-panel [data-close-panel]");

  await page.click('[data-panel="treasure"]');
  await page.waitForSelector(".utility-panel [data-box]");
  const treasureLayout = await page.evaluate(() => {
    const card = document.querySelector(".inventory-item").getBoundingClientRect();
    const action = document.querySelector(".inventory-item .compact-action").getBoundingClientRect();
    return {
      cardTop: Math.round(card.top),
      actionTop: Math.round(action.top),
      sameRow: Math.abs(card.top - action.top) < 24
    };
  });
  assert(treasureLayout.sameRow === true, `Treasure action should be on the same row: ${JSON.stringify(treasureLayout)}`);

  await page.click(".utility-panel [data-close-panel]");
  await page.click('[data-panel="leaderboard"]');
  await page.waitForFunction(() => document.querySelector(".utility-panel")?.innerText.includes("ui-audit"));

  console.log("TYC_VaccineTest UI audit test OK");
} finally {
  await browser.close();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
