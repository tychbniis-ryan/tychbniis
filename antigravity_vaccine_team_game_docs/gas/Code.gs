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
 * - SPREADSHEET_ID：選填；獨立 Apps Script 專案必填，用於指定資料試算表。
 * - FIREBASE_DATABASE_URL：選填，用於同步公開 gameState。
 * - FIREBASE_SERVICE_ACCOUNT_EMAIL：選填，用於 GAS 寫入 Realtime Database。
 * - FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY：選填，用於 GAS 寫入 Realtime Database。
 */

const SHEET_QUESTIONS = '題庫';
const SHEET_SETTINGS = '場次設定';
const SHEET_TEAMS = '戰隊設定';
const SHEET_PLAYERS = '玩家';
const SHEET_ANSWERS = '作答紀錄';
const SHEET_PAPER_OPENS = '試卷開啟紀錄';
const SHEET_GAME_STATE = '場次狀態';
const SHEET_SCOREBOARD = '排行榜';

const DEFAULT_TEAM_COUNT = 5;
const FIRST_CORRECT_BONUS = 5;
const CACHE_TTL_SECONDS = 300;
const LONG_CACHE_TTL_SECONDS = 21600;
const CACHE_KEY_SETUP_READY = 'setup_ready_v2';
const CACHE_KEY_QUESTIONS = 'questions_v2';
const CACHE_KEY_FIREBASE_TOKEN = 'firebase_access_token_v2';
const CACHE_KEY_GAME_STATE_PREFIX = 'game_state_v2_';
const CACHE_KEY_PLAYER_PREFIX = 'player_v2_';
const CACHE_KEY_PAPER_OPEN_PREFIX = 'paper_open_v2_';
const CACHE_KEY_ANSWER_PREFIX = 'answer_v2_';
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
    .addItem('初始化遊戲資料', 'resetGameDataFromMenu')
    .addItem('同步題庫到內部資料', 'syncQuestionsToFirebase')
    .addItem('同步場次設定', 'syncGameSettingsToFirebase')
    .addSeparator()
    .addItem('重新計算排行榜', 'recalculateScoreboard')
    .addItem('匯出成績報表', 'exportResultsFromFirebase')
    .addToUi();
}

function doPost(event) {
  try {
    const result = handleApiPayload(parsePostPayload(event));
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

function doGet(event) {
  const callback = getJsonpCallback(event);

  try {
    const payload = parseGetPayload(event);
    const result = handleApiPayload(payload);
    return javascriptResponse(callback, { ok: true, result });
  } catch (error) {
    return javascriptResponse(callback, {
      ok: false,
      error: {
        message: String(error && error.message ? error.message : error)
      }
    });
  }
}

function handleApiPayload(payload) {
  const action = String(payload.action || '');
  const data = payload.data || {};

  const handlers = {
    joinGame,
    getGameState,
    getCurrentQuestion,
    openPaper,
    submitAnswer,
    createGame,
    openQuestion,
    closeAndScoreQuestion,
    getPlayerSummary,
    getScoreboard,
    recalculateScoreboard,
    resetGameData
  };

  if (!handlers[action]) {
    throw new Error('未知 action：' + action);
  }

  return handlers[action](data, payload);
}

function setupGameSheets() {
  const ss = getSpreadsheet();
  const questionsSheet = ensureSheet(ss, SHEET_QUESTIONS, [
    'questionId',
    'order',
    'type',
    'section',
    'title',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'optionE',
    'correctAnswer',
    'explanation',
    'timeLimitSec',
    'scoreMode',
    'isBossQuestion',
    'isCreativeVote',
    'enabled',
    'note'
  ]);
  seedQuestionsIfEmpty(questionsSheet);
  ensureDefaultQuestions(questionsSheet);
  ensureSheet(ss, SHEET_SETTINGS, [
    'key',
    'value',
    'note'
  ]);
  const teamsSheet = ensureSheet(ss, SHEET_TEAMS, [
    'teamId',
    'teamName',
    'color',
    'slogan',
    'enabled'
  ]);
  seedTeamsIfEmpty(teamsSheet);
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
    'paperOpenedAt',
    'submittedAt',
    'responseSeconds',
    'isCorrect',
    'baseScore',
    'firstCorrectBonus',
    'score'
  ]);
  ensureSheet(ss, SHEET_PAPER_OPENS, [
    'gameId',
    'questionId',
    'playerId',
    'paperOpenedAt'
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
  getRuntimeCache().put(CACHE_KEY_SETUP_READY, '1', CACHE_TTL_SECONDS);
  getRuntimeCache().remove(CACHE_KEY_QUESTIONS);
}

function resetGameDataFromMenu() {
  return resetGameData({}, { adminSecret: PropertiesService.getScriptProperties().getProperty('ADMIN_API_SECRET') || '' });
}

function resetGameData(data, payload) {
  requireAdmin(payload);
  setupGameSheets();

  [
    SHEET_PLAYERS,
    SHEET_ANSWERS,
    SHEET_PAPER_OPENS,
    SHEET_SCOREBOARD,
    SHEET_GAME_STATE
  ].forEach(name => clearDataRows(getSheetOrThrow(name)));

  const gameId = String(data.gameId || getGameId());
  const now = new Date().toISOString();
  const state = {
    gameId,
    status: 'draft',
    currentQuestionId: '',
    questionOpenedAt: '',
    updatedAt: now
  };
  appendObject(getSheetOrThrow(SHEET_GAME_STATE), state);
  clearRuntimeCaches(gameId);
  cacheGameState(state);

  const questionsSync = syncQuestionsToFirebase();
  const firebaseSync = publishGameStateToFirebase(state);
  return {
    status: 'draft',
    gameId,
    message: '遊戲資料已初始化。玩家、作答、翻卷與排行榜資料已清空；題庫與戰隊設定保留。',
    questionsSync,
    firebaseSync
  };
}

function syncQuestionsToFirebase() {
  ensureGameSheetsReady();
  const rows = readQuestionRows();
  validateQuestions(rows);
  const firebaseSync = publishPublicQuestionsToFirebase(getGameId(), rows);
  const result = {
    status: 'OK',
    message: '公開題庫已同步到 Firebase，正確答案仍只保留在 Google Sheets。',
    questionCount: rows.length,
    firebaseSync
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
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

  cacheGameState(row);
  row.firebaseSync = publishGameStateToFirebase(row);
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
  const state = syncGameSettingsToFirebase();
  const questions = syncQuestionsToFirebase();
  state.questionsSync = questions.firebaseSync;
  return state;
}

function joinGame(data) {
  ensureGameSheetsReady();

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

  cachePlayer({
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
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const cachedState = getCachedGameState(gameId);
  if (cachedState) {
    return cachedState;
  }

  const states = readObjects(getSheetOrThrow(SHEET_GAME_STATE));
  const state = states.find(row => row.gameId === gameId);
  const result = state || {
    gameId,
    status: 'draft',
    currentQuestionId: '',
    questionOpenedAt: ''
  };
  cacheGameState(result);
  return result;
}

function getCurrentQuestion(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = data.playerId ? String(data.playerId) : '';
  const state = getGameState({ gameId });

  if (state.status !== 'question_open' || !state.currentQuestionId) {
    return {
      gameId,
      status: state.status || 'draft',
      question: null
    };
  }

  const question = readQuestionRows()
    .find(row => row.questionId === state.currentQuestionId);

  if (!question) {
    throw new Error('找不到目前開放題目：' + state.currentQuestionId);
  }

  return {
    gameId,
    status: state.status,
    question: publicQuestionFromRow(question),
    paperOpenedAt: playerId ? recordPaperOpen(gameId, state.currentQuestionId, playerId) : ''
  };
}

function openPaper(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const state = getGameState({ gameId });

  if (state.status !== 'question_open' || !state.currentQuestionId) {
    return {
      gameId,
      status: state.status || 'draft',
      currentQuestionId: state.currentQuestionId || '',
      paperOpenedAt: ''
    };
  }

  return {
    gameId,
    status: state.status,
    currentQuestionId: state.currentQuestionId,
    paperOpenedAt: recordPaperOpen(gameId, state.currentQuestionId, playerId)
  };
}

function openQuestion(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  const questions = readQuestionRows();
  const question = questions.find(item => item.questionId === questionId);

  if (!question) {
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

  const state = {
    gameId,
    questionId,
    status: 'question_open',
    currentQuestionId: questionId,
    questionOpenedAt: openedAt,
    updatedAt: openedAt,
    publicQuestion: publicQuestionFromRow(question)
  };
  const firebaseSync = publishGameStateToFirebase(state);
  return { gameId, questionId, status: 'question_open', questionOpenedAt: openedAt, firebaseSync };
}

function submitAnswer(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const questionId = requireText(data.questionId, 'questionId', 80);
  const answer = normalizeAnswer(data.answer);
  const state = getGameState({ gameId });
  const answerCacheKey = getAnswerCacheKey(gameId, questionId, playerId);
  const question = readQuestionRows().find(row => row.questionId === questionId);

  if (state.status !== 'question_open' || state.currentQuestionId !== questionId) {
    throw new Error('題目尚未開放或已關閉。');
  }

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  if (getRuntimeCache().get(answerCacheKey) || hasExistingAnswer(gameId, questionId, playerId)) {
    throw new Error('每人每題只能作答一次。');
  }

  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const player = findPlayer(gameId, playerId);
  const submittedAt = new Date();
  const openedAt = getPaperOpenedAt(gameId, questionId, playerId) || submittedAt;
  const responseSeconds = Math.max(0, Math.round((submittedAt.getTime() - openedAt.getTime()) / 1000));
  const correctAnswer = parseAnswer(question.correctAnswer).sort().join(',');
  const userAnswer = answer.slice().sort().join(',');
  const isCorrect = userAnswer === correctAnswer;
  const existingAnswers = readObjects(answerSheet);
  const hasPriorCorrect = existingAnswers
    .filter(row => row.gameId === gameId && row.questionId === questionId)
    .some(row => parseAnswer(row.answer).sort().join(',') === correctAnswer);
  const baseScore = calculateBaseScore(isCorrect, responseSeconds);
  const firstCorrectBonus = isCorrect && !hasPriorCorrect ? FIRST_CORRECT_BONUS : 0;
  const score = baseScore + firstCorrectBonus;
  const timeLimitSec = Number(question.timeLimitSec || 60);
  const remainingSeconds = Math.max(0, timeLimitSec - responseSeconds);

  appendObject(answerSheet, {
    answerId: gameId + '_' + questionId + '_' + playerId,
    gameId,
    questionId,
    playerId,
    teamId: player.teamId,
    answer: answer.join(','),
    paperOpenedAt: openedAt.toISOString(),
    submittedAt: submittedAt.toISOString(),
    responseSeconds,
    isCorrect,
    baseScore,
    firstCorrectBonus,
    score
  });
  updatePlayerScore(gameId, playerId, score, isCorrect);
  getRuntimeCache().put(answerCacheKey, '1', LONG_CACHE_TTL_SECONDS);

  return {
    submitted: true,
    gameId,
    questionId,
    paperOpenedAt: openedAt.toISOString(),
    responseSeconds,
    remainingSeconds,
    isCorrect,
    baseScore,
    firstCorrectBonus,
    score
  };
}

function closeAndScoreQuestion(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

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
  const firstCorrectPlayerId = getFirstCorrectPlayerId(answers, gameId, questionId, correctAnswer);
  let scoredCount = 0;
  let submittedCount = 0;

  answers.forEach((row, index) => {
    if (row.gameId !== gameId || row.questionId !== questionId) return;
    submittedCount += 1;
    if (row.score !== '') return;

    const userAnswer = parseAnswer(row.answer).sort().join(',');
    const isCorrect = userAnswer === correctAnswer;
    const baseScore = calculateBaseScore(isCorrect, Number(row.responseSeconds || 999));
    const firstCorrectBonus = isCorrect && row.playerId === firstCorrectPlayerId ? FIRST_CORRECT_BONUS : 0;
    const score = baseScore + firstCorrectBonus;
    const rowNumber = index + 2;

    setCellByHeader(answerSheet, rowNumber, headers, 'isCorrect', isCorrect);
    setCellByHeader(answerSheet, rowNumber, headers, 'baseScore', baseScore);
    setCellByHeader(answerSheet, rowNumber, headers, 'firstCorrectBonus', firstCorrectBonus);
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
  const firebaseSync = publishGameStateToFirebase({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now
  });

  recalculateScoreboard();

  return { gameId, questionId, status: 'question_closed', scoredCount, submittedCount, firebaseSync };
}

function recalculateScoreboard() {
  ensureGameSheetsReady();

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

function getScoreboard(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const rows = readObjects(getSheetOrThrow(SHEET_SCOREBOARD))
    .filter(row => row.gameId === gameId)
    .sort((a, b) => Number(b.totalScore || 0) - Number(a.totalScore || 0));

  return { gameId, rows };
}

// 0.2.7 override: record answers only. Scores are revealed after instructor closes the question.
function submitAnswer(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const questionId = requireText(data.questionId, 'questionId', 80);
  const answer = normalizeAnswer(data.answer);
  const state = getGameState({ gameId });
  const answerCacheKey = getAnswerCacheKey(gameId, questionId, playerId);

  if (state.status !== 'question_open' || state.currentQuestionId !== questionId) {
    throw new Error('題目尚未開放或已關閉。');
  }

  if (getRuntimeCache().get(answerCacheKey) || hasExistingAnswer(gameId, questionId, playerId)) {
    throw new Error('同一題只能送出一次。');
  }

  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const player = findPlayer(gameId, playerId);
  const submittedAt = new Date();
  const openedAt = getPaperOpenedAt(gameId, questionId, playerId) || submittedAt;
  const responseSeconds = Math.max(0, Math.round((submittedAt.getTime() - openedAt.getTime()) / 1000));

  appendObject(answerSheet, {
    answerId: gameId + '_' + questionId + '_' + playerId,
    gameId,
    questionId,
    playerId,
    teamId: player.teamId,
    answer: answer.join(','),
    paperOpenedAt: openedAt.toISOString(),
    submittedAt: submittedAt.toISOString(),
    responseSeconds,
    isCorrect: '',
    baseScore: '',
    firstCorrectBonus: '',
    score: ''
  });
  getRuntimeCache().put(answerCacheKey, '1', LONG_CACHE_TTL_SECONDS);

  return {
    submitted: true,
    gameId,
    questionId,
    paperOpenedAt: openedAt.toISOString(),
    responseSeconds
  };
}

// 0.2.7 override: return answer reveal and scoreboard for projection.
function closeAndScoreQuestion(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

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
  const firstCorrectPlayerId = getFirstCorrectPlayerId(answers, gameId, questionId, correctAnswer);
  let scoredCount = 0;
  let submittedCount = 0;

  answers.forEach((row, index) => {
    if (row.gameId !== gameId || row.questionId !== questionId) return;
    submittedCount += 1;
    if (row.score !== '') return;

    const userAnswer = parseAnswer(row.answer).sort().join(',');
    const isCorrect = userAnswer === correctAnswer;
    const baseScore = calculateBaseScore(isCorrect, Number(row.responseSeconds || 999));
    const firstCorrectBonus = isCorrect && row.playerId === firstCorrectPlayerId ? FIRST_CORRECT_BONUS : 0;
    const score = baseScore + firstCorrectBonus;
    const rowNumber = index + 2;

    setCellByHeader(answerSheet, rowNumber, headers, 'isCorrect', isCorrect);
    setCellByHeader(answerSheet, rowNumber, headers, 'baseScore', baseScore);
    setCellByHeader(answerSheet, rowNumber, headers, 'firstCorrectBonus', firstCorrectBonus);
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
  const firebaseSync = publishGameStateToFirebase({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now
  });

  recalculateScoreboard();
  const scoreboard = getScoreboard({ gameId }).rows;

  return {
    gameId,
    questionId,
    status: 'question_closed',
    scoredCount,
    submittedCount,
    correctAnswer,
    correctAnswerText: formatCorrectAnswer(question, correctAnswer),
    explanation: question.explanation || '',
    scoreboard,
    firebaseSync
  };
}

function getPlayerSummary(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const questionId = String(data.questionId || '');
  const player = findPlayer(gameId, playerId);
  const scoreboard = getScoreboard({ gameId }).rows;
  const team = scoreboard.find(row => row.teamId === player.teamId) || {};
  const answers = questionId
    ? readObjects(getSheetOrThrow(SHEET_ANSWERS))
      .filter(row => row.gameId === gameId && row.playerId === playerId && row.questionId === questionId)
    : [];
  const lastAnswer = answers.length ? answers[answers.length - 1] : null;

  return {
    gameId,
    playerId,
    teamId: player.teamId,
    playerScore: Number(player.score || 0),
    teamScore: Number(team.totalScore || 0),
    updatedAt: player.updatedAt || new Date().toISOString(),
    lastAnswer: lastAnswer
      ? {
        questionId: lastAnswer.questionId,
        isCorrect: lastAnswer.isCorrect,
        baseScore: lastAnswer.baseScore,
        firstCorrectBonus: lastAnswer.firstCorrectBonus,
        score: lastAnswer.score
      }
      : null
  };
}

function formatCorrectAnswer(question, correctAnswer) {
  const correctIds = parseAnswer(correctAnswer);
  const optionsById = {};
  buildOptions(question).forEach(option => {
    optionsById[option.id] = option.text;
  });

  return correctIds
    .map(id => optionsById[id] ? id + '. ' + optionsById[id] : id)
    .join('、');
}

function parsePostPayload(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }
  return JSON.parse(event.postData.contents);
}

function parseGetPayload(event) {
  const params = event && event.parameter ? event.parameter : {};

  if (params.payload) {
    return JSON.parse(params.payload);
  }

  return {
    action: params.action || '',
    adminSecret: params.adminSecret || '',
    data: params.data ? JSON.parse(params.data) : {}
  };
}

function getJsonpCallback(event) {
  const params = event && event.parameter ? event.parameter : {};
  const callback = String(params.callback || 'callback');

  if (!/^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)) {
    throw new Error('callback 格式錯誤。');
  }

  return callback;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function javascriptResponse(callback, data) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(data) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
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
  const cached = getCachedPlayer(gameId, playerId);
  if (cached) {
    return cached;
  }

  const player = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .find(row => row.gameId === gameId && row.playerId === playerId);
  if (!player) {
    throw new Error('找不到玩家，請先報到。');
  }
  cachePlayer(player);
  return player;
}

function calculateBaseScore(isCorrect, responseSeconds) {
  if (!isCorrect) return 0;
  const bucket = SCORE_BUCKETS.find(row => responseSeconds <= row.maxSeconds);
  return bucket ? bucket.score : 0;
}

function recordPaperOpen(gameId, questionId, playerId) {
  const cacheKey = getPaperOpenCacheKey(gameId, questionId, playerId);
  const cached = getRuntimeCache().get(cacheKey);
  if (cached) {
    return cached;
  }

  const sheet = getSheetOrThrow(SHEET_PAPER_OPENS);
  const existing = findPaperOpenRow(gameId, questionId, playerId);

  if (existing && existing.paperOpenedAt) {
    getRuntimeCache().put(cacheKey, existing.paperOpenedAt, LONG_CACHE_TTL_SECONDS);
    return existing.paperOpenedAt;
  }

  const paperOpenedAt = new Date().toISOString();
  appendObject(sheet, {
    gameId,
    questionId,
    playerId,
    paperOpenedAt
  });
  getRuntimeCache().put(cacheKey, paperOpenedAt, LONG_CACHE_TTL_SECONDS);
  return paperOpenedAt;
}

function getPaperOpenedAt(gameId, questionId, playerId) {
  const cacheKey = getPaperOpenCacheKey(gameId, questionId, playerId);
  const cached = getRuntimeCache().get(cacheKey);
  if (cached) {
    return new Date(cached);
  }

  const row = findPaperOpenRow(gameId, questionId, playerId);
  if (row && row.paperOpenedAt) {
    getRuntimeCache().put(cacheKey, row.paperOpenedAt, LONG_CACHE_TTL_SECONDS);
    return new Date(row.paperOpenedAt);
  }
  return null;
}

function getFirstCorrectPlayerId(answers, gameId, questionId, correctAnswer) {
  return answers
    .filter(row => row.gameId === gameId && row.questionId === questionId)
    .filter(row => parseAnswer(row.answer).sort().join(',') === correctAnswer)
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .map(row => row.playerId)[0] || '';
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

  cacheGameState(state);
}

function publishGameStateToFirebase(state) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (!databaseUrl) {
    return {
      skipped: true,
      reason: '未設定 Firebase Realtime Database URL。'
    };
  }

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const gameId = encodeURIComponent(state.gameId || getGameId());
  const url = baseUrl + '/gameState/' + gameId + '.json';
  const accessToken = getFirebaseAccessToken();

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'put',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + accessToken
      },
      muteHttpExceptions: true,
      payload: JSON.stringify({
        gameId: state.gameId || getGameId(),
        status: state.status || '',
        currentQuestionId: state.currentQuestionId || state.questionId || '',
        questionOpenedAt: state.questionOpenedAt || '',
        updatedAt: state.updatedAt || new Date().toISOString(),
        publicQuestion: state.publicQuestion || null
      })
    });
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      Logger.log('Firebase gameState 同步失敗，HTTP ' + statusCode + '：' + response.getContentText());
      return {
        skipped: true,
        reason: 'Firebase gameState 同步失敗，HTTP ' + statusCode,
        detail: response.getContentText().slice(0, 300)
      };
    }
  } catch (error) {
    Logger.log('Firebase gameState 同步失敗：' + String(error && error.message ? error.message : error));
    return { skipped: true, reason: 'Firebase gameState 同步失敗。' };
  }

  return { skipped: false };
}

function publishPublicQuestionsToFirebase(gameId, rows) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (!databaseUrl) {
    return {
      skipped: true,
      reason: '未設定 Firebase Realtime Database URL。'
    };
  }

  const publicQuestions = {};
  rows.forEach(row => {
    const questionId = String(row.questionId || '');
    if (/[.#$/\[\]]/.test(questionId)) {
      throw new Error('questionId 含 Firebase 不支援字元：' + questionId);
    }
    publicQuestions[questionId] = publicQuestionFromRow(row);
  });

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const url = baseUrl + '/publicQuestions/' + encodeURIComponent(gameId || getGameId()) + '.json';
  const accessToken = getFirebaseAccessToken();

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'put',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + accessToken
      },
      muteHttpExceptions: true,
      payload: JSON.stringify(publicQuestions)
    });
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      Logger.log('Firebase publicQuestions 同步失敗，HTTP ' + statusCode + '：' + response.getContentText());
      return {
        skipped: true,
        reason: 'Firebase publicQuestions 同步失敗，HTTP ' + statusCode,
        detail: response.getContentText().slice(0, 300)
      };
    }
  } catch (error) {
    Logger.log('Firebase publicQuestions 同步失敗：' + String(error && error.message ? error.message : error));
    return { skipped: true, reason: 'Firebase publicQuestions 同步失敗。' };
  }

  return {
    skipped: false,
    questionCount: rows.length
  };
}

function getFirebaseAccessToken() {
  const cached = getRuntimeCache().get(CACHE_KEY_FIREBASE_TOKEN);
  if (cached) {
    const token = JSON.parse(cached);
    if (token.accessToken && Number(token.expiresAt || 0) > Date.now() + 60000) {
      return token.accessToken;
    }
  }

  const properties = PropertiesService.getScriptProperties();
  const serviceAccountEmail = properties.getProperty('FIREBASE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = properties.getProperty('FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY');

  if (!serviceAccountEmail || !privateKey) {
    return ScriptApp.getOAuthToken();
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  const claim = {
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const unsignedJwt = base64UrlEncode(JSON.stringify(header)) + '.' + base64UrlEncode(JSON.stringify(claim));
  const normalizedKey = privateKey.replace(/\\n/g, '\n');
  const signature = Utilities.computeRsaSha256Signature(unsignedJwt, normalizedKey);
  const assertion = unsignedJwt + '.' + base64UrlEncode(signature);

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    muteHttpExceptions: true,
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }
  });

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('Firebase service account token 取得失敗：' + response.getContentText().slice(0, 300));
  }

  const result = JSON.parse(response.getContentText());
  const accessToken = result.access_token;
  const expiresIn = Number(result.expires_in || 3600);
  getRuntimeCache().put(
    CACHE_KEY_FIREBASE_TOKEN,
    JSON.stringify({
      accessToken,
      expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000
    }),
    Math.min(LONG_CACHE_TTL_SECONDS, Math.max(60, expiresIn - 60))
  );
  return accessToken;
}

function base64UrlEncode(value) {
  const bytes = typeof value === 'string' ? Utilities.newBlob(value).getBytes() : value;
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function readQuestionRows() {
  const cached = getRuntimeCache().get(CACHE_KEY_QUESTIONS);
  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = getSheetOrThrow(SHEET_QUESTIONS);
  const rows = readObjects(sheet)
    .filter(q => String(q.enabled).toUpperCase() === 'TRUE');
  getRuntimeCache().put(CACHE_KEY_QUESTIONS, JSON.stringify(rows), CACHE_TTL_SECONDS);
  return rows;
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

function publicQuestionFromRow(q) {
  return {
    questionId: q.questionId,
    order: Number(q.order || 0),
    type: q.type,
    section: q.section || '',
    title: q.title,
    options: buildOptions(q),
    timeLimitSec: Number(q.timeLimitSec || 60),
    scoreMode: q.scoreMode || 'timeBucket',
    isBossQuestion: String(q.isBossQuestion).toUpperCase() === 'TRUE',
    isCreativeVote: String(q.isCreativeVote).toUpperCase() === 'TRUE'
  };
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
  } else {
    ensureSheetColumns(sheet, headers);
  }
  return sheet;
}

function ensureSheetColumns(sheet, requiredHeaders) {
  const headers = getHeaders(sheet);
  const missingHeaders = requiredHeaders.filter(header => headers.indexOf(header) < 0);
  if (!missingHeaders.length) return;

  sheet
    .getRange(1, headers.length + 1, 1, missingHeaders.length)
    .setValues([missingHeaders]);
}

function seedTeamsIfEmpty(sheet) {
  if (sheet.getLastRow() > 1) return;

  [
    ['team_1', '冷鏈守護隊', '', '', true],
    ['team_2', '安全接種隊', '', '', true],
    ['team_3', '疫苗尖兵隊', '', '', true],
    ['team_4', '衛教溝通隊', '', '', true],
    ['team_5', '接種品質隊', '', '', true]
  ].forEach(row => sheet.appendRow(row));
}

function seedQuestionsIfEmpty(sheet) {
  if (sheet.getLastRow() > 1) return;

  getDefaultQuestionRows().forEach(row => sheet.appendRow(row));
}

function ensureDefaultQuestions(sheet) {
  const existingIds = new Set(readObjects(sheet).map(row => String(row.questionId || '')));
  getDefaultQuestionRows().forEach(row => {
    if (!existingIds.has(row[0])) {
      sheet.appendRow(row);
    }
  });
}

function getDefaultQuestionRows() {
  return [
  [
    'demo_q001',
    1,
    'single',
    'demo',
    '下列何者是預防接種作業中最重要的基本原則？',
    '依規定核對對象、疫苗與接種紀錄',
    '只要現場速度夠快即可',
    '先接種再補資料',
    '只需口頭確認姓名',
    '',
    'A',
    '接種作業應落實對象、疫苗、紀錄與流程確認。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 2 版預設測試題 1，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q002',
    2,
    'single',
    'demo',
    '疫苗冷鏈溫度異常時，第一步應如何處理？',
    '先隔離受影響疫苗並記錄異常狀況',
    '直接丟棄所有疫苗',
    '繼續接種，活動後再補紀錄',
    '只口頭告知同仁即可',
    '',
    'A',
    '冷鏈異常需先隔離、標示、記錄，並依規定通報與判定。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 2 版預設測試題 2，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q003',
    3,
    'single',
    'demo',
    '接種前進行身分與接種資料核對，主要目的為何？',
    '降低接種錯誤並確保紀錄正確',
    '縮短所有行政流程',
    '避免民眾提出問題',
    '讓報表欄位看起來完整',
    '',
    'A',
    '接種前核對可降低對象、疫苗與紀錄錯誤，是接種安全的基本要求。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 2 版預設測試題 3，可由題庫工作表修改或刪除。'
  ]
  ];
}

function getSheetOrThrow(name) {
  const sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('找不到工作表：' + name);
  return sheet;
}

function getSpreadsheet() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet) {
    return spreadsheet;
  }

  const created = SpreadsheetApp.create('疫苗守護戰隊挑戰賽資料庫');
  properties.setProperty('SPREADSHEET_ID', created.getId());
  return created;
}

function ensureGameSheetsReady() {
  const cache = getRuntimeCache();
  if (cache.get(CACHE_KEY_SETUP_READY)) {
    return;
  }
  setupGameSheets();
}

function getRuntimeCache() {
  return CacheService.getScriptCache();
}

function getGameStateCacheKey(gameId) {
  return CACHE_KEY_GAME_STATE_PREFIX + gameId;
}

function getPlayerCacheKey(gameId, playerId) {
  return CACHE_KEY_PLAYER_PREFIX + gameId + '_' + playerId;
}

function getPaperOpenCacheKey(gameId, questionId, playerId) {
  return CACHE_KEY_PAPER_OPEN_PREFIX + gameId + '_' + questionId + '_' + playerId;
}

function getAnswerCacheKey(gameId, questionId, playerId) {
  return CACHE_KEY_ANSWER_PREFIX + gameId + '_' + questionId + '_' + playerId;
}

function getCachedGameState(gameId) {
  const cached = getRuntimeCache().get(getGameStateCacheKey(gameId));
  return cached ? JSON.parse(cached) : null;
}

function cacheGameState(state) {
  if (!state || !state.gameId) return;
  getRuntimeCache().put(
    getGameStateCacheKey(state.gameId),
    JSON.stringify(state),
    CACHE_TTL_SECONDS
  );
}

function getCachedPlayer(gameId, playerId) {
  const cached = getRuntimeCache().get(getPlayerCacheKey(gameId, playerId));
  return cached ? JSON.parse(cached) : null;
}

function cachePlayer(player) {
  if (!player || !player.gameId || !player.playerId) return;
  getRuntimeCache().put(
    getPlayerCacheKey(player.gameId, player.playerId),
    JSON.stringify(player),
    LONG_CACHE_TTL_SECONDS
  );
}

function hasExistingAnswer(gameId, questionId, playerId) {
  const answerId = gameId + '_' + questionId + '_' + playerId;
  const finder = getSheetOrThrow(SHEET_ANSWERS)
    .createTextFinder(answerId)
    .matchEntireCell(true)
    .findNext();
  return Boolean(finder);
}

function findPaperOpenRow(gameId, questionId, playerId) {
  const sheet = getSheetOrThrow(SHEET_PAPER_OPENS);
  const finder = sheet
    .createTextFinder(playerId)
    .matchEntireCell(true)
    .findAll();
  const headers = getHeaders(sheet);
  const gameIdColumn = headers.indexOf('gameId') + 1;
  const questionIdColumn = headers.indexOf('questionId') + 1;
  const playerIdColumn = headers.indexOf('playerId') + 1;
  const paperOpenedAtColumn = headers.indexOf('paperOpenedAt') + 1;

  for (let index = 0; index < finder.length; index += 1) {
    const rowNumber = finder[index].getRow();
    if (rowNumber <= 1 || finder[index].getColumn() !== playerIdColumn) continue;

    const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
    if (
      values[gameIdColumn - 1] === gameId &&
      values[questionIdColumn - 1] === questionId &&
      values[playerIdColumn - 1] === playerId
    ) {
      return {
        gameId: values[gameIdColumn - 1],
        questionId: values[questionIdColumn - 1],
        playerId: values[playerIdColumn - 1],
        paperOpenedAt: values[paperOpenedAtColumn - 1]
      };
    }
  }

  return null;
}

function clearRuntimeCaches(gameId) {
  const cache = getRuntimeCache();
  cache.remove(CACHE_KEY_SETUP_READY);
  cache.remove(CACHE_KEY_QUESTIONS);
  cache.remove(CACHE_KEY_FIREBASE_TOKEN);
  cache.remove(getGameStateCacheKey(gameId));
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
