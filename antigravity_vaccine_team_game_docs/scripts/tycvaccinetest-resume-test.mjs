import { chromium } from "playwright";

const baseUrl = process.argv[2] || process.env.TYCVACCINETEST_URL || "http://127.0.0.1:5173/TYCVACCINETEST/?localQuestions=1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.localStorage.removeItem("tycVaccineTestSoloDraft");
    window.TYC_VACCINE_TEST_CONFIG.gasWebAppUrl = "";
  });

  await page.fill("#nicknameInput", "resume-user");
  await page.click("#startBtn");
  await page.waitForSelector("#showOptionsBtn");
  await page.click("#showOptionsBtn");
  await page.waitForSelector("#submitAnswerBtn");

  const questions = await page.evaluate(async () => {
    const response = await fetch("./soloQuestions.v0_1_0.json", { cache: "no-store" });
    return response.json();
  });
  const firstCorrectAnswers = String(questions[0].correctAnswer || "").split(",").map(item => item.trim()).filter(Boolean);
  for (const answer of firstCorrectAnswers) {
    await page.click(`button[data-answer="${answer}"]`);
  }
  await page.click("#submitAnswerBtn");
  await page.waitForSelector("#nextQuestionBtn");

  const savedDraft = await page.evaluate(() => JSON.parse(window.localStorage.getItem("tycVaccineTestSoloDraft") || "null"));
  assert(savedDraft, "Draft was not saved in localStorage");
  assert(savedDraft.answers.length === 1, "Draft did not record exactly one completed answer");
  assert(savedDraft.phase === "between", "Draft should resume between questions after an answer");
  assert(!documentHasRemoteScoreScript(await page.content()), "Incomplete run should not create a remote score request");

  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.TYC_VACCINE_TEST_CONFIG.gasWebAppUrl = "";
  });
  await page.waitForSelector("#resumePanel:not([hidden])");
  const resumeSummary = await page.locator("#resumeSummary").innerText();
  assert(resumeSummary.includes("1 / 60"), "Resume panel should show one completed answer");
  await page.click("#resumeBtn");
  await page.waitForSelector("#nextQuestionBtn");

  assert(await page.locator("#submitAnswerBtn").count() === 0, "Answered question should resume before the next-question step");

  await page.click("#nextQuestionBtn");
  await page.waitForSelector("#showOptionsBtn");
  const draftAfterResume = await page.evaluate(() => JSON.parse(window.localStorage.getItem("tycVaccineTestSoloDraft") || "null"));
  assert(draftAfterResume.answers.length === 1, "Moving to next question should keep previous answer in draft");
  assert(draftAfterResume.phase === "question", "Draft should move back to question phase after next question starts");

  console.log("TYC_VaccineTest resume test OK");
} finally {
  await browser.close();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function documentHasRemoteScoreScript(html) {
  return html.includes("callback=tycVaccineTestJsonp_");
}
