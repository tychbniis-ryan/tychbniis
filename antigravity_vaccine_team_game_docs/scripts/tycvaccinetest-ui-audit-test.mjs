import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.argv[2] || process.env.TYCVACCINETEST_URL || "http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1";
const screenshotDir = "screenshots/tycvaccinetest-ui-audit";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

try {
  await mkdir(screenshotDir, { recursive: true });

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
  assert(homeText.includes("桃園市政府衛生局"), "Homepage should show agency name");
  assert(homeText.includes("115年預防接種教育訓練測驗"), "Homepage should show current title");
  assert(!homeText.includes("單機闖關版"), "Homepage should not show removed subtitle");
  assert(await page.locator(".home-command-btn").count() === 3, "Homepage should have three command buttons");
  await page.screenshot({ path: `${screenshotDir}/01-home-mobile.png`, fullPage: true });

  await page.click("#openStartModalBtn");
  await page.waitForSelector("#nicknameInput");
  await page.screenshot({ path: `${screenshotDir}/02-start-modal.png`, fullPage: true });
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
      startButtonBottom: Math.round(document.querySelector("#showOptionsBtn").getBoundingClientRect().bottom),
      viewportHeight: window.innerHeight,
      overlapsToolbar: utility.bottom > question.top,
      bodyOverflow: getComputedStyle(document.body).overflow
    };
  });
  assert(beforeAnswer.optionCount === 0, "Options should be hidden before clicking start-answer");
  assert(beforeAnswer.overlapsToolbar === false, `Question overlaps toolbar: ${JSON.stringify(beforeAnswer)}`);
  assert(Math.abs(beforeAnswer.startButtonBottom - beforeAnswer.viewportHeight) < 12, `Start-answer button should sit at the bottom: ${JSON.stringify(beforeAnswer)}`);
  await page.screenshot({ path: `${screenshotDir}/03-question-before-answer.png`, fullPage: true });

  await page.click("#showOptionsBtn");
  await page.waitForSelector(".answer-choice-panel #submitAnswerBtn");
  await page.screenshot({ path: `${screenshotDir}/04-answer-choice-modal.png`, fullPage: true });
  const questions = await page.evaluate(async () => {
    const response = await fetch("./soloQuestions.v0_1_0.json", { cache: "no-store" });
    return response.json();
  });
  const choiceModalText = await page.locator(".answer-choice-panel").innerText();
  assert(!choiceModalText.includes(String(questions[0].title).slice(0, 18)), "Answer choice modal should not repeat the question text");
  const correctAnswers = String(questions[0].correctAnswer || "").split(",").map(item => item.trim()).filter(Boolean);
  for (const answer of correctAnswers) {
    await page.click(`.answer-choice-panel button[data-answer="${answer}"]`);
  }
  await page.click(".answer-choice-panel #submitAnswerBtn");
  await page.waitForSelector(".answer-result-panel");
  await page.screenshot({ path: `${screenshotDir}/05-answer-result-modal.png`, fullPage: true });
  const resultText = await page.locator(".answer-result-panel").innerText();
  assert(resultText.includes("本題得分"), "Answer result modal should show question score");
  assert(resultText.includes("查看解析"), "Answer result modal should offer explanation");
  await page.click("button[data-close-result-modal]");
  await page.waitForFunction(() => document.querySelector(".utility-modal")?.hasAttribute("hidden"));
  await page.waitForSelector("#nextQuestionBtn");
  await page.screenshot({ path: `${screenshotDir}/06-answer-markers-main.png`, fullPage: true });

  const afterAnswer = await page.evaluate(() => ({
    treasureDot: Boolean(document.querySelector('[data-panel="treasure"] .notice-dot')),
    markerCount: document.querySelectorAll(".answer-option-marker").length,
    correctMarkerCount: document.querySelectorAll(".answer-option-marker.is-correct-answer").length,
    finalLineText: document.querySelector(".answer-final-line")?.innerText || "",
    oldResultVisible: Boolean(document.querySelector("#answerResultBlock")),
    visibleOptions: document.querySelector(".quiz-card > .options-grid") ? getComputedStyle(document.querySelector(".quiz-card > .options-grid")).display : "none",
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight
  }));
  assert(afterAnswer.treasureDot === true, "Treasure red dot should appear when unopened boxes exist");
  assert(afterAnswer.markerCount >= 4, `Main answer page should mark answer options, got ${afterAnswer.markerCount}`);
  assert(afterAnswer.correctMarkerCount >= 1, "Main answer page should mark the correct answer");
  assert(afterAnswer.finalLineText.includes("答案為"), "Main answer page should show final answer line");
  assert(afterAnswer.oldResultVisible === false, "Main answer page should not show the old answer result block");
  assert(afterAnswer.visibleOptions === "none", "Options should collapse after answering");

  await page.click('[data-panel="status"]');
  await page.waitForSelector(".utility-panel");
  await page.screenshot({ path: `${screenshotDir}/07-status-panel.png`, fullPage: true });
  const statusText = await page.locator(".utility-panel").innerText();
  assert(statusText.includes("目前總分"), "Status panel should show total score summary");
  await page.click(".utility-panel [data-close-panel]");

  await page.click('[data-panel="items"]');
  await page.waitForSelector(".utility-panel");
  await page.screenshot({ path: `${screenshotDir}/08-items-panel.png`, fullPage: true });
  const itemPanel = await page.evaluate(() => ({
    itemButtons: document.querySelectorAll(".utility-panel [data-item]").length,
    emptyText: document.querySelector(".utility-panel")?.innerText.includes("目前尚未取得道具")
  }));
  assert(itemPanel.itemButtons === 0, "Unowned items should not be rendered as item buttons");
  assert(itemPanel.emptyText === true, "Item panel should show an empty owned-item state");
  await page.click(".utility-panel [data-close-panel]");

  await page.click('[data-panel="treasure"]');
  await page.waitForSelector(".utility-panel [data-box]");
  await page.screenshot({ path: `${screenshotDir}/09-treasure-panel.png`, fullPage: true });
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
