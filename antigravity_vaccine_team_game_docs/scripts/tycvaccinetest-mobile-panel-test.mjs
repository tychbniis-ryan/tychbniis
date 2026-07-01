import { chromium } from "playwright";

const baseUrl = process.argv[2] || process.env.TYCVACCINETEST_URL || "http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
let leaderboardActionDataAttempts = 0;
let leaderboardPayloadAttempts = 0;

try {
  await page.route(/https:\/\/(example\.test\/tyc-gas|script\.google\.com\/macros\/s\/).*$/, async route => {
    const requestUrl = new URL(route.request().url());
    const callback = requestUrl.searchParams.get("callback") || "callback";
    const payload = requestUrl.searchParams.get("payload");
    const action = requestUrl.searchParams.get("action");
    if (action === "getSoloLeaderboard" && !payload) {
      leaderboardActionDataAttempts += 1;
      await route.fulfill({
        contentType: "application/javascript",
        body: `${callback}(${JSON.stringify({
          ok: false,
          error: { message: "mobile action/data simulated failure" }
        })});`
      });
      return;
    }
    if (payload && payload.includes("getSoloLeaderboard")) {
      leaderboardPayloadAttempts += 1;
    }
    await route.fulfill({
      contentType: "application/javascript",
      body: `${callback}(${JSON.stringify({
        ok: true,
        result: {
          rows: [
            { rank: 1, nickname: "mobile-rank", score: 88, correctCount: 8, totalQuestions: 10 }
          ]
        }
      })});`
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.TYC_VACCINE_TEST_CONFIG.gasWebAppUrl = "https://example.test/tyc-gas";
  });
  assert(leaderboardPayloadAttempts > 0, "Mobile leaderboard should preload from GAS when the site enters");
  const homeLayout = await page.evaluate(() => {
    const panel = document.querySelector(".home-command-panel").getBoundingClientRect();
    const buttons = [...document.querySelectorAll(".home-command-btn")].map(button => button.getBoundingClientRect());
    return {
      panelWidth: Math.round(panel.width),
      viewportWidth: window.innerWidth,
      narrowButtonCount: buttons.filter(button => button.width < window.innerWidth * 0.8).length
    };
  });
  assert(homeLayout.panelWidth >= homeLayout.viewportWidth - 36, `Mobile home command panel should be full width: ${JSON.stringify(homeLayout)}`);
  assert(homeLayout.narrowButtonCount === 0, `Mobile home command buttons should not be squeezed into a half-width column: ${JSON.stringify(homeLayout)}`);

  await page.click("#openStartModalBtn");
  await page.waitForSelector("#nicknameInput");
  await page.fill("#nicknameInput", "mobile-user");
  await page.click("#startBtn");
  await page.waitForSelector("#showOptionsBtn");
  assert(await page.locator(".option-btn").count() === 0, "Options should be hidden before the learner starts answering");

  const sidePanelDisplay = await page.locator("#sideArea").evaluate(el => getComputedStyle(el).display);
  assert(sidePanelDisplay === "none", `Mobile side panel should be hidden, got ${sidePanelDisplay}`);
  const initialMobileLayout = await page.evaluate(() => ({
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
    topbarDisplay: getComputedStyle(document.querySelector(".topbar")).display,
    utilityPosition: getComputedStyle(document.querySelector(".utility-bar")).position,
    utilityTop: Math.round(document.querySelector(".utility-bar").getBoundingClientRect().top)
  }));
  assert(initialMobileLayout.topbarDisplay === "none", "Large top header should be hidden while answering on mobile");
  assert(initialMobileLayout.utilityPosition === "fixed", `Utility bar should be fixed, got ${initialMobileLayout.utilityPosition}`);
  assert(initialMobileLayout.utilityTop <= 90, `Utility bar should stay near the top, got top=${initialMobileLayout.utilityTop}`);

  const questions = await page.evaluate(async () => {
    const response = await fetch("./soloQuestions.v0_1_0.json", { cache: "no-store" });
    return response.json();
  });
  const correctAnswers = String(questions[0].correctAnswer || "").split(",").map(item => item.trim()).filter(Boolean);
  await revealOptions();
  for (const answer of correctAnswers) {
    await page.click(`.answer-choice-panel button[data-answer="${answer}"]`);
  }
  await page.click(".answer-choice-panel #submitAnswerBtn");
  await page.waitForSelector(".answer-result-panel");
  const resultModalText = await page.locator(".answer-result-panel").innerText();
  assert(resultModalText.includes("本題得分"), "Answer result modal should show question score");
  await page.click("button[data-close-result-modal]");
  await page.waitForFunction(() => document.querySelector(".utility-modal")?.hasAttribute("hidden"));

  assert(await page.locator(".utility-bar [data-panel]").count() >= 6, "Utility buttons were not rendered");
  assert(await page.locator(".explanation-panel").count() === 0, "Explanation should not be inline on mobile");
  assert(await page.locator("#submitAnswerBtn").count() === 0, "Submit button should be removed after answering");
  const answeredMobileLayout = await page.evaluate(() => ({
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
    scrollY: Math.round(window.scrollY),
    utilityPosition: getComputedStyle(document.querySelector(".utility-bar")).position,
    utilityTop: Math.round(document.querySelector(".utility-bar").getBoundingClientRect().top),
    betweenPosition: getComputedStyle(document.querySelector(".between-actions")).position,
    visibleOptions: document.querySelector(".quiz-card > .options-grid") ? getComputedStyle(document.querySelector(".quiz-card > .options-grid")).display : "none"
  }));
  assert(answeredMobileLayout.scrollY <= 5, `Answering should not leave the mobile page scrolled down, got ${answeredMobileLayout.scrollY}`);
  assert(answeredMobileLayout.utilityPosition === "fixed", `Answered utility bar should be fixed, got ${answeredMobileLayout.utilityPosition}`);
  assert(answeredMobileLayout.utilityTop <= 90, `Answered utility bar should stay near the top, got top=${answeredMobileLayout.utilityTop}`);
  assert(answeredMobileLayout.bodyHeight <= answeredMobileLayout.viewportHeight + 30, `Mobile answer page should fit near one viewport, got ${answeredMobileLayout.bodyHeight}`);
  assert(answeredMobileLayout.betweenPosition === "fixed", `Next action should be fixed, got ${answeredMobileLayout.betweenPosition}`);
  assert(answeredMobileLayout.visibleOptions === "none", "Options should collapse after answering on mobile");

  await openPanelAndExpect("explanation", "解析");
  await openPanelAndExpect("items", "道具");
  await openPanelAndExpect("status", "總分");
  await openPanelAndExpect("leaderboard", "mobile-rank");
  assert(leaderboardPayloadAttempts > 0, "Mobile leaderboard should use payload JSONP");
  assert(leaderboardActionDataAttempts === 0, "Mobile leaderboard should not need action/data fallback when payload succeeds");

  for (let questionIndex = 1; questionIndex < 24; questionIndex += 1) {
    await page.click("#nextQuestionBtn");
    await page.waitForSelector("#showOptionsBtn");
    if (questionIndex === 23) break;
    await answerCurrentQuestion(questions[questionIndex]);
  }
  const longQuestionLayout = await page.evaluate(() => {
    const title = document.querySelector(".question-title");
    const reveal = document.querySelector(".answer-reveal");
    const titleRect = title.getBoundingClientRect();
    const revealRect = reveal.getBoundingClientRect();
    return {
      text: title.innerText,
      titleClipped: title.scrollHeight > title.clientHeight + 2,
      titleBottom: Math.round(titleRect.bottom),
      revealTop: Math.round(revealRect.top)
    };
  });
  assert(longQuestionLayout.text.includes("桃園市帶狀疱疹疫苗補助計畫"), "Question 24 should be available for the long-question layout test");
  assert(longQuestionLayout.titleClipped === false, `Question 24 title should not be clipped inside its own box: ${JSON.stringify(longQuestionLayout)}`);
  assert(longQuestionLayout.titleBottom <= longQuestionLayout.revealTop - 8, `Question 24 title should not be covered by the bottom action bar: ${JSON.stringify(longQuestionLayout)}`);

  for (let questionIndex = 23; questionIndex < 53; questionIndex += 1) {
    await answerCurrentQuestion(questions[questionIndex]);
    await page.click("#nextQuestionBtn");
    await page.waitForSelector("#showOptionsBtn");
  }
  assert((await page.locator(".quiz-header h2").innerText()).includes("第 54 題"), "Expected to reach question 54 for the answered long-question layout test");
  await answerCurrentQuestion(questions[53]);
  const answeredLongQuestionLayout = await page.evaluate(() => {
    const title = document.querySelector(".question-title");
    const marker = document.querySelector("#answerMarkerBlock");
    const card = document.querySelector(".quiz-card");
    const titleRect = title.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    return {
      text: title.innerText,
      titleClipped: title.scrollHeight > title.clientHeight + 2,
      titleBottom: Math.round(titleRect.bottom),
      markerTop: Math.round(markerRect.top),
      markerBottom: Math.round(markerRect.bottom),
      cardTop: Math.round(cardRect.top),
      cardBottom: Math.round(cardRect.bottom),
      viewportHeight: window.innerHeight
    };
  });
  assert(answeredLongQuestionLayout.text.length > 40, "Question 54 should contain enough text for the answered long-question test");
  assert(answeredLongQuestionLayout.titleClipped === true, `Question 54 title should become scrollable after answering: ${JSON.stringify(answeredLongQuestionLayout)}`);
  assert(answeredLongQuestionLayout.markerTop >= answeredLongQuestionLayout.cardTop, `Question 54 answer marker should be visible after closing result modal: ${JSON.stringify(answeredLongQuestionLayout)}`);
  assert(answeredLongQuestionLayout.markerBottom <= answeredLongQuestionLayout.viewportHeight - 80, `Question 54 answer marker should not be covered by the bottom action bar: ${JSON.stringify(answeredLongQuestionLayout)}`);

  console.log("TYC_VaccineTest mobile panel test OK");
} finally {
  await browser.close();
}

async function openPanelAndExpect(panelName, expectedText) {
  await page.click(`.utility-bar [data-panel="${panelName}"]`);
  await page.waitForSelector(".utility-panel");
  await page.waitForFunction(text => document.querySelector(".utility-panel")?.innerText.includes(text), expectedText);
  const modalLayout = await page.evaluate(() => ({
    modalHidden: document.querySelector(".utility-modal").hasAttribute("hidden"),
    panelHeight: Math.round(document.querySelector(".utility-panel").getBoundingClientRect().height),
    viewportHeight: window.innerHeight
  }));
  assert(modalLayout.modalHidden === false, "Utility panel should open as a separate modal window");
  assert(modalLayout.panelHeight >= modalLayout.viewportHeight * 0.85, `Utility panel should cover most of the phone screen, got ${modalLayout.panelHeight}`);
  await page.click(".utility-panel [data-close-panel]");
  await page.waitForFunction(() => document.querySelector(".utility-modal")?.hasAttribute("hidden"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function revealOptions() {
  await page.click("#showOptionsBtn");
  await page.waitForSelector(".answer-choice-panel #submitAnswerBtn");
}

async function answerCurrentQuestion(question) {
  const nextCorrectAnswers = String(question.correctAnswer || "").split(",").map(item => item.trim()).filter(Boolean);
  await revealOptions();
  for (const answer of nextCorrectAnswers) {
    await page.click(`.answer-choice-panel button[data-answer="${answer}"]`);
  }
  await page.click(".answer-choice-panel #submitAnswerBtn");
  await page.waitForSelector(".answer-result-panel");
  await page.click("button[data-close-result-modal]");
  await page.waitForFunction(() => document.querySelector(".utility-modal")?.hasAttribute("hidden"));
}
