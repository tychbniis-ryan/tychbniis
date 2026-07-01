import { chromium } from "playwright";

const baseUrl = process.argv[2] || process.env.TYCVACCINETEST_URL || "http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });

try {
  await page.route("https://example.test/tyc-gas**", async route => {
    const requestUrl = new URL(route.request().url());
    const callback = requestUrl.searchParams.get("callback") || "callback";
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

  await page.fill("#nicknameInput", "mobile-user");
  await page.click("#startBtn");
  await page.waitForSelector("#submitAnswerBtn");

  const sidePanelDisplay = await page.locator("#sideArea").evaluate(el => getComputedStyle(el).display);
  assert(sidePanelDisplay === "none", `Mobile side panel should be hidden, got ${sidePanelDisplay}`);

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

  assert(await page.locator(".utility-bar [data-panel]").count() >= 6, "Utility buttons were not rendered");
  assert(await page.locator(".explanation-panel").count() === 0, "Explanation should not be inline on mobile");
  assert(await page.locator("#submitAnswerBtn").count() === 0, "Submit button should be removed after answering");

  await openPanelAndExpect("explanation", "作答結果");
  await openPanelAndExpect("items", "道具");
  await openPanelAndExpect("status", "總分");
  await openPanelAndExpect("leaderboard", "mobile-rank");

  console.log("TYC_VaccineTest mobile panel test OK");
} finally {
  await browser.close();
}

async function openPanelAndExpect(panelName, expectedText) {
  await page.click(`.utility-bar [data-panel="${panelName}"]`);
  await page.waitForSelector(".utility-panel");
  await page.waitForFunction(text => document.querySelector(".utility-panel")?.innerText.includes(text), expectedText);
  await page.click(".utility-panel [data-close-panel]");
  await page.waitForFunction(() => document.querySelector(".utility-modal")?.hasAttribute("hidden"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
