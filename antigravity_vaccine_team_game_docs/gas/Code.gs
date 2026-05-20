/**
 * Google Apps Script template.
 * 用途：從 Google Sheets 同步題庫與場次設定到 Firebase，並匯出成績。
 *
 * 注意：
 * 1. 本檔為 Antigravity 開發用模板。
 * 2. 實際 Firebase 驗證方式需依專案設定補齊。
 * 3. 題庫由使用者在 Google Sheets 設計。
 */

const SHEET_QUESTIONS = '題庫';
const SHEET_SETTINGS = '場次設定';
const SHEET_TEAMS = '戰隊設定';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('互動遊戲管理')
    .addItem('同步題庫到 Firebase', 'syncQuestionsToFirebase')
    .addItem('同步場次設定到 Firebase', 'syncGameSettingsToFirebase')
    .addSeparator()
    .addItem('匯出成績報表', 'exportResultsFromFirebase')
    .addToUi();
}

function syncQuestionsToFirebase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_QUESTIONS);
  if (!sheet) throw new Error('找不到題庫工作表');

  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const rows = values
    .map(row => objectFromRow(headers, row))
    .filter(q => String(q.enabled).toUpperCase() === 'TRUE');

  validateQuestions(rows);

  const publicQuestions = {};
  const answerKeys = {};

  rows.forEach(q => {
    publicQuestions[q.questionId] = {
      questionId: q.questionId,
      order: Number(q.order),
      type: q.type,
      section: q.section || '',
      title: q.title,
      options: buildOptions(q),
      timeLimitSec: Number(q.timeLimitSec || 60),
      scoreMode: q.scoreMode || 'timeBucket',
      isBossQuestion: String(q.isBossQuestion).toUpperCase() === 'TRUE',
      isCreativeVote: String(q.isCreativeVote).toUpperCase() === 'TRUE',
      status: 'draft'
    };

    answerKeys[q.questionId] = {
      questionId: q.questionId,
      correctAnswer: parseAnswer(q.correctAnswer),
      explanation: q.explanation || '',
      scoringNote: q.note || ''
    };
  });

  // TODO: replace with actual Firebase REST calls.
  Logger.log(JSON.stringify({ publicQuestions, answerKeys }, null, 2));
}

function syncGameSettingsToFirebase() {
  // TODO: read 場次設定 and 戰隊設定, then write to Firebase.
}

function exportResultsFromFirebase() {
  // TODO: read answers, players, teams, winners from Firebase and write report sheets.
}

function objectFromRow(headers, row) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  return obj;
}

function buildOptions(q) {
  const options = [];
  ['A', 'B', 'C', 'D', 'E'].forEach(letter => {
    const text = q['option' + letter];
    if (text) options.push({ id: letter, text: String(text) });
  });
  return options;
}

function parseAnswer(value) {
  if (!value) return [];
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

function validateQuestions(rows) {
  const ids = new Set();
  const orders = new Set();

  rows.forEach(q => {
    if (!q.questionId) throw new Error('題目缺少 questionId');
    if (ids.has(q.questionId)) throw new Error('questionId 重複：' + q.questionId);
    ids.add(q.questionId);

    if (!q.order) throw new Error('題目缺少 order：' + q.questionId);
    if (orders.has(q.order)) throw new Error('order 重複：' + q.order);
    orders.add(q.order);

    if (!q.type) throw new Error('題目缺少 type：' + q.questionId);
    if (!q.title) throw new Error('題目缺少 title：' + q.questionId);

    if (q.type !== 'creative' && !q.correctAnswer) {
      throw new Error('非 creative 題型需填 correctAnswer：' + q.questionId);
    }
  });
}
