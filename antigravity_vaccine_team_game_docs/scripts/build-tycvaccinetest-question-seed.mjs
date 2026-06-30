import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const codePath = resolve(repoRoot, "gas", "Code.gs");
const firebaseOut = resolve(repoRoot, "firebase", "tycvaccinetest.soloQuestions.v0_1_0.json");
const localOut = resolve(repoRoot, "frontend", "student", "dist", "TYCVACCINETEST", "soloQuestions.v0_1_0.json");
const checkOnly = process.argv.includes("--check");

const source = readFileSync(codePath, "utf8");
const rows = [
  ...extractRows("getVaccineQuestionRows", "疫苗教育訓練題庫"),
  ...extractRows("getChildProtectionQuestionRows", "兒少虐待與疏忽測驗題")
];

const questions = rows.map(({ row, sourceBank }, index) => ({
  questionId: String(row[0] || ""),
  order: Number(row[1] || index + 1),
  sourceBank,
  type: String(row[2] || "single"),
  title: String(row[4] || ""),
  options: {
    A: String(row[5] || ""),
    B: String(row[6] || ""),
    C: String(row[7] || ""),
    D: String(row[8] || ""),
    E: String(row[9] || "")
  },
  correctAnswer: String(row[10] || ""),
  explanation: String(row[11] || ""),
  timeLimitSec: 60,
  enabled: row[16] !== false && row[16] !== "FALSE"
})).filter(question => question.questionId && question.title);

const output = JSON.stringify(questions, null, 2) + "\n";

if (checkOnly) {
  checkFile(firebaseOut, output);
  checkFile(localOut, output);
  console.log(`TYC_VaccineTest question seed OK: ${questions.length} questions`);
} else {
  writeFileSync(firebaseOut, output, "utf8");
  writeFileSync(localOut, output, "utf8");
  console.log(`Wrote ${questions.length} questions`);
  console.log(firebaseOut);
  console.log(localOut);
}

function extractRows(functionName, sourceBank) {
  const marker = `function ${functionName}`;
  const functionIndex = source.indexOf(marker);
  if (functionIndex < 0) {
    throw new Error(`Cannot find ${functionName}`);
  }
  const returnIndex = source.indexOf("return", functionIndex);
  const arrayStart = source.indexOf("[", returnIndex);
  const arrayEnd = findMatchingBracket(source, arrayStart);
  const arrayLiteral = source.slice(arrayStart, arrayEnd + 1);
  const parsed = vm.runInNewContext(arrayLiteral);
  if (!Array.isArray(parsed)) {
    throw new Error(`${functionName} did not return an array`);
  }
  return parsed.map(row => ({ row, sourceBank }));
}

function findMatchingBracket(text, startIndex) {
  let depth = 0;
  let quote = "";
  let escaping = false;
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Array literal is not closed after index ${startIndex}`);
}

function checkFile(path, expected) {
  if (!existsSync(path)) {
    throw new Error(`Missing generated seed: ${path}`);
  }
  const actual = readFileSync(path, "utf8");
  if (actual !== expected) {
    throw new Error(`Generated seed is out of date: ${path}`);
  }
}
