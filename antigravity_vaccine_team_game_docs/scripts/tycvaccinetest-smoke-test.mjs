import { chromium } from "playwright";

const baseUrl = process.argv[2] || process.env.TYCVACCINETEST_URL || "http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.TYC_VACCINE_TEST_CONFIG.gasWebAppUrl = "";
  });

  await expectText("h1", "疫苗教育訓練測驗");
  await expectText("text=進入遊戲", "進入遊戲");
  await expectText("text=查看排行", "查看排行");
  await page.fill("#nicknameInput", "測試玩家");
  await page.click("#startBtn");
  await page.waitForSelector("#submitAnswerBtn");

  const questions = await page.evaluate(async () => {
    const response = await fetch("./soloQuestions.v0_1_0.json", { cache: "no-store" });
    return response.json();
  });

  for (let index = 0; index < questions.length; index += 1) {
    const correctAnswers = String(questions[index].correctAnswer || "").split(",").map(item => item.trim()).filter(Boolean);
    for (const answer of correctAnswers) {
      await page.click(`button[data-answer="${answer}"]`);
    }
    await page.click("#submitAnswerBtn");
    await page.waitForSelector("#nextQuestionBtn");
    await page.click("#nextQuestionBtn");
    if (index + 1 < questions.length) {
      await page.waitForSelector("#submitAnswerBtn");
    }
  }

  await page.waitForSelector("text=成績結算");
  await expectText("text=只看錯題", "只看錯題");
  const summary = await page.locator("body").innerText();
  if (!summary.includes("60 / 60")) {
    throw new Error("Summary did not show 60 / 60 correct answers");
  }
  if (!summary.includes("100")) {
    throw new Error("Summary did not include perfect-score achievement value");
  }

  console.log("TYC_VaccineTest smoke test OK");
} finally {
  await browser.close();
}

async function expectText(selector, expected) {
  await page.waitForSelector(selector);
  const text = await page.locator(selector).first().innerText();
  if (!text.includes(expected)) {
    throw new Error(`Expected ${selector} to include ${expected}, got ${text}`);
  }
}
