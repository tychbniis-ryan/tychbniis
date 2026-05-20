/**
 * 疫苗守護戰隊挑戰賽 GAS 後端。
 *
 * 免費方案原則：
 * 1. 不使用 Cloud Functions。
 * 2. GAS Web App 負責可信任判斷：報到、開題、作答、關題、基本計分。
 * 3. Google Sheets 作為第 1 版主要資料庫。
 * 4. Firebase Hosting 只負責前端靜態頁面。
 *
 * 必要 Script Properties：
 * - GAME_ID：預設場次 ID。
 * - ADMIN_API_SECRET：講師端管理操作用密鑰，不可寫在程式中。
 */

const SHEET_QUESTIONS = '題庫';
const SHEET_SETTINGS = '場次設定';
const SHEET_TEAMS = '戰隊設定';
const SHEET_PLAYERS = '玩家';
const SHEET_ANSWERS = '作答紀錄';
const SHEET_GAME_STATE = '場次狀態';
const SHEET_SCOREBOARD = '排行榜';

const DEFAULT_TEAM_COUNT = 5;
const SCORE_BUCKETS = [
  { maxSeconds: 10, score: 30 },
  { maxSeconds: 20, score: 25 },
  { maxSeconds: 30, score: 20 },
  { maxSeconds: 45, score: 15 },
  { maxSeconds: 60, score: 10 },
  { maxSeconds: 999, score: 5 }
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('互動遊戲管理')
    .addItem('初始化工作表', 'setupGameSheets')
    .addItem('同步題庫到內部資料', 'syncQuestionsToFirebase')
    .addItem('同步場次設定', 'syncGameSettingsToFirebase')
    .addSeparator()
    .addItem('重新計算排行榜', 'recalculateScoreboard')
    .addItem('匯出成績報表', 'exportResultsFromFirebase')
    .addToUi();
}

function doPost(event) {
  try {
    const payload = parsePostPayload(event);
    const action = String(payload.action || '');
    const data = payload.data || {};

    const handlers = {
      joinGame,
      getGameState,
      submitAnswer,
      createGame,
      openQuestion,
      closeAndScoreQuestion,
      recalculateScoreboard
    };

    if (!handlers[action]) {
      throw new Error('未知 action：' + action);
    }

    const result = handlers[action](data, payload);
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: {
        message: String(error && error.message ? error.message : error)
      }
    });
  }
}

function setupGameSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, SHEET_PLAYERS, [
    'playerId',
    'gameId',
    'nickname',
    'teamId',
    'score',
    'correctCount',
    'joinedAt',
    'updatedAt'
  ]);
  ensureSheet(ss, SHEET_ANSWERS, [
    'answerId',
    'gameId',
    'questionId',
    'playerId',
    'teamId',
    'answer',
    'submittedAt',
    'responseSeconds',
    'isCorrect',
    'score'
  ]);
  ensureSheet(ss, SHEET_GAME_STATE, [
    'gameId',
    'status',
    'currentQuestionId',
    'questionOpenedAt',
    'updatedAt'
  ]);
  ensureSheet(ss, SHEET_SCOREBOARD, [
    'gameId',
    'teamId',
    'playerCount',
    'totalScore',
    'averageScore',
    'updatedAt'
  ]);
}

function syncQuestionsToFirebase() {
  const rows = readQuestionRows();
  validateQuestions(rows);
  Logger.log(JSON.stringify({
    status: 'OK',
    message: '第 1 版免費方案中，題庫保留在 Google Sheets，由 GAS 後端讀取判斷。',
    questionCount: rows.length
  }, null, 2));
}

function syncGameSettingsToFirebase() {
  setupGameSheets();
  const gameId = getGameId();
  const stateSheet = getSheetOrThrow(SHEET_GAME_STATE);
  const states = readObjects(stateSheet);
  const existingIndex = states.findIndex(row => row.gameId === gameId);
  const row = {
    gameId,
    status: 'draft',
    currentQuestionId: '',
    questionOpenedAt: '',
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    writeObjectAt(stateSheet, existingIndex + 2, row);
  } else {
    appendObject(stateSheet, row);
  }

  return row;
}

function exportResultsFromFirebase() {
  recalculateScoreboard();
  return {
    status: 'OK',
    message: '第 1 版報表資料已保留於作答紀錄與排行榜工作表。'
  };
}

function createGame(data, payload) {
  requireAdmin(payload);
  setupGameSheets();
  return syncGameSettingsToFirebase();
}

function joinGame(data) {
  setupGameSheets();

  const gameId = String(data.gameId || getGameId());
  const nickname = sanitizeNickname(requireText(data.nickname, 'nickname', 20));
  const teamId = data.teamId ? String(data.teamId) : pickLeastLoadedTeam(gameId);
  const playerId = Utilities.getUuid();
  const now = new Date().toISOString();

  appendObject(getSheetOrThrow(SHEET_PLAYERS), {
    playerId,
    gameId,
    nickname,
    teamId,
    score: 0,
    correctCount: 0,
    joinedAt: now,
    updatedAt: now
  });

  return { playerId, gameId, nickname, teamId };
}

function getGameState(data) {
  const gameId = String(data.gameId || getGameId());
  const states = readObjects(getSheetOrThrow(SHEET_GAME_STATE));
  const state = states.find(row => row.gameId === gameId);
  return state || {
    gameId,
    status: 'draft',
    currentQuestionId: '',
    questionOpenedAt: ''
  };
}

function openQuestion(data, payload) {
  requireAdmin(payload);
  setupGameSheets();

  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  const questions = readQuestionRows();

  if (!questions.some(question => question.questionId === questionId)) {
    throw new Error('找不到題目：' + questionId);
  }

  const openedAt = new Date().toISOString();
  upsertGameState({
    gameId,
    status: 'question_open',
    currentQuestionId: questionId,
    questionOpenedAt: openedAt,
    updatedAt: openedAt
  });

  return { gameId, questionId, status: 'question_open', questionOpenedAt: openedAt };
}

function submitAnswer(data) {
  setupGameSheets();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const questionId = requireText(data.questionId, 'questionId', 80);
  const answer = normalizeAnswer(data.answer);
  const state = getGameState({ gameId });

  if (state.status !== 'question_open' || state.currentQuestionId !== questionId) {
    throw new Error('題目尚未開放或已關閉。');
  }

  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const existingAnswers = readObjects(answerSheet);
  const duplicate = existingAnswers.some(row =>
    row.gameId === gameId &&
    row.questionId === questionId &&
    row.playerId === playerId
  );

  if (duplicate) {
    throw new Error('每人每題只能作答一次。');
  }

  const player = findPlayer(gameId, playerId);
  const submittedAt = new Date();
  const openedAt = state.questionOpenedAt ? new Date(state.questionOpenedAt) : submittedAt;
  const responseSeconds = Math.max(0, Math.round((submittedAt.getTime() - openedAt.getTime()) / 1000));

  appendObject(answerSheet, {
    answerId: gameId + '_' + questionId + '_' + playerId,
    gameId,
    questionId,
    playerId,
    teamId: player.teamId,
    answer: answer.join(','),
    submittedAt: submittedAt.toISOString(),
    responseSeconds,
    isCorrect: '',
    score: ''
  });

  return {
    submitted: true,
    gameId,
    questionId,
    responseSeconds
  };
}

function closeAndScoreQuestion(data, payload) {
  requireAdmin(payload);

  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  const question = readQuestionRows().find(row => row.questionId === questionId);

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  const correctAnswer = parseAnswer(question.correctAnswer).sort().join(',');
  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const answers = readObjects(answerSheet);
  const headers = getHeaders(answerSheet);
  let scoredCount = 0;

  answers.forEach((row, index) => {
    if (row.gameId !== gameId || row.questionId !== questionId) return;

    const userAnswer = parseAnswer(row.answer).sort().join(',');
    const isCorrect = userAnswer === correctAnswer;
    const score = calculateBaseScore(isCorrect, Number(row.responseSeconds || 999));
    const rowNumber = index + 2;

    setCellByHeader(answerSheet, rowNumber, headers, 'isCorrect', isCorrect);
    setCellByHeader(answerSheet, rowNumber, headers, 'score', score);
    updatePlayerScore(gameId, row.playerId, score, isCorrect);
    scoredCount += 1;
  });

  const now = new Date().toISOString();
  upsertGameState({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now
  });

  recalculateScoreboard();

  return { gameId, questionId, status: 'question_closed', scoredCount };
}

function recalculateScoreboard() {
  setupGameSheets();

  const gameId = getGameId();
  const players = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId);
  const groups = {};

  players.forEach(player => {
    if (!groups[player.teamId]) {
      groups[player.teamId] = { playerCount: 0, totalScore: 0 };
    }
    groups[player.teamId].playerCount += 1;
    groups[player.teamId].totalScore += Number(player.score || 0);
  });

  const scoreboardSheet = getSheetOrThrow(SHEET_SCOREBOARD);
  clearDataRows(scoreboardSheet);
  const now = new Date().toISOString();

  Object.keys(groups).sort().forEach(teamId => {
    const group = groups[teamId];
    appendObject(scoreboardSheet, {
      gameId,
      teamId,
      playerCount: group.playerCount,
      totalScore: group.totalScore,
      averageScore: group.playerCount ? group.totalScore / group.playerCount : 0,
      updatedAt: now
    });
  });

  return { gameId, teamCount: Object.keys(groups).length, updatedAt: now };
}

function parsePostPayload(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }
  return JSON.parse(event.postData.contents);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function requireAdmin(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_API_SECRET');
  if (!expected) {
    throw new Error('尚未設定 ADMIN_API_SECRET。');
  }
  if (!payload || payload.adminSecret !== expected) {
    throw new Error('管理操作授權失敗。');
  }
}

function requireText(value, fieldName, maxLength) {
  const text = String(value || '').trim();
  if (!text || text.length > maxLength) {
    throw new Error(fieldName + ' 不可空白，且長度不可超過 ' + maxLength + ' 字。');
  }
  return text;
}

function sanitizeNickname(nickname) {
  if (/[A-Z][12]\d{8}/i.test(nickname)) {
    throw new Error('暱稱不可包含身分證字號格式。');
  }
  return nickname.replace(/[<>]/g, '');
}

function normalizeAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.map(String).map(text => text.trim()).filter(Boolean);
  }
  return parseAnswer(answer);
}

function getGameId() {
  return PropertiesService.getScriptProperties().getProperty('GAME_ID') || 'game_YYYYMMDD_vaccine_training';
}

function pickLeastLoadedTeam(gameId) {
  const players = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId);
  const counts = {};

  for (let index = 1; index <= DEFAULT_TEAM_COUNT; index += 1) {
    counts['team_' + index] = 0;
  }

  players.forEach(player => {
    if (counts[player.teamId] !== undefined) {
      counts[player.teamId] += 1;
    }
  });

  return Object.keys(counts).sort((a, b) => counts[a] - counts[b] || a.localeCompare(b))[0];
}

function findPlayer(gameId, playerId) {
  const player = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .find(row => row.gameId === gameId && row.playerId === playerId);
  if (!player) {
    throw new Error('找不到玩家，請先報到。');
  }
  return player;
}

function calculateBaseScore(isCorrect, responseSeconds) {
  if (!isCorrect) return 0;
  const bucket = SCORE_BUCKETS.find(row => responseSeconds <= row.maxSeconds);
  return bucket ? bucket.score : 0;
}

function updatePlayerScore(gameId, playerId, addScore, isCorrect) {
  const sheet = getSheetOrThrow(SHEET_PLAYERS);
  const rows = readObjects(sheet);
  const headers = getHeaders(sheet);
  const index = rows.findIndex(row => row.gameId === gameId && row.playerId === playerId);

  if (index < 0) return;

  const rowNumber = index + 2;
  const currentScore = Number(rows[index].score || 0);
  const currentCorrect = Number(rows[index].correctCount || 0);

  setCellByHeader(sheet, rowNumber, headers, 'score', currentScore + addScore);
  setCellByHeader(sheet, rowNumber, headers, 'correctCount', currentCorrect + (isCorrect ? 1 : 0));
  setCellByHeader(sheet, rowNumber, headers, 'updatedAt', new Date().toISOString());
}

function upsertGameState(state) {
  const sheet = getSheetOrThrow(SHEET_GAME_STATE);
  const states = readObjects(sheet);
  const index = states.findIndex(row => row.gameId === state.gameId);

  if (index >= 0) {
    writeObjectAt(sheet, index + 2, state);
  } else {
    appendObject(sheet, state);
  }
}

function readQuestionRows() {
  const sheet = getSheetOrThrow(SHEET_QUESTIONS);
  return readObjects(sheet)
    .filter(q => String(q.enabled).toUpperCase() === 'TRUE');
}

function objectFromRow(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index];
  });
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

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetOrThrow(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('找不到工作表：' + name);
  return sheet;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function readObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  return values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => objectFromRow(headers, row));
}

function appendObject(sheet, obj) {
  const headers = getHeaders(sheet);
  sheet.appendRow(headers.map(header => obj[header] === undefined ? '' : obj[header]));
}

function writeObjectAt(sheet, rowNumber, obj) {
  const headers = getHeaders(sheet);
  const values = headers.map(header => obj[header] === undefined ? '' : obj[header]);
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
}

function setCellByHeader(sheet, rowNumber, headers, headerName, value) {
  const columnIndex = headers.indexOf(headerName) + 1;
  if (columnIndex <= 0) {
    throw new Error('找不到欄位：' + headerName);
  }
  sheet.getRange(rowNumber, columnIndex).setValue(value);
}

function clearDataRows(sheet) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
}
