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
const SHEET_TREASURE_BOXES = '寶箱紀錄';
const SHEET_ITEM_RECORDS = '道具紀錄';
const SHEET_AWARDS = '獎項紀錄';
const SHEET_CREATIVE_SUBMISSIONS = '創作投稿';
const SHEET_CREATIVE_VOTES = '創作投票';
const SHEET_RULE_SETTINGS = '規則設定';

const DEFAULT_TEAM_COUNT = 5;
const FIRST_CORRECT_BONUS = 5;
const MAX_UNOPENED_TREASURE_BOXES = 3;
const TREASURE_DROP_RATE_ON_CORRECT = 0.3;
const SHEET_TREASURE_REWARD_POOL = 'TreasureRewardPool';
const TREASURE_PREASSIGN_SLOTS = 8;
const TREASURE_ITEM_RATES = [
  { itemType: 'score_1', rate: 0.25, label: '小加分卡：戰隊 +1' },
  { itemType: 'score_3', rate: 0.2, label: '中加分卡：戰隊 +3' },
  { itemType: 'score_5', rate: 0.12, label: '大加分卡：戰隊 +5' },
  { itemType: 'score_10', rate: 0.05, label: '超級加分卡：戰隊 +10' },
  { itemType: 'double', rate: 0.1, label: '加倍卡' },
  { itemType: 'comeback', rate: 0.08, label: '翻身卡' },
  { itemType: 'challenge', rate: 0.1, label: '挑戰卡' },
  { itemType: 'special', rate: 0.03, label: '特殊道具' },
  { itemType: 'empty', rate: 0.07, label: '鼓勵語或空寶箱' }
];
const TEAM_SCORE_ITEM_EFFECTS = {
  score_1: 1,
  score_3: 3,
  score_5: 5,
  score_10: 10
};
const COMEBACK_CARD_LAST_PLACE_SCORE = 30;
const COMEBACK_CARD_NORMAL_SCORE = 5;
const COMEBACK_CARD_TEAM_LIMIT = 2;
const CHALLENGE_CARD_WIN_SCORE = 10;
const CHALLENGE_CARD_FALLBACK_SCORE = 3;
const CREATIVE_FINAL_WIN_SCORE = 20;
const SPECIAL_ITEM_BASE_RATE = 0.03;
const SPECIAL_ITEM_BOOSTED_RATE = 0.1;
const SPECIAL_ITEM_BOOST_PROGRESS = 0.7;
const CREATIVE_ANSWER_SECONDS = 180;
const CREATIVE_TEAM_VOTE_SECONDS = 30;
const CREATIVE_FINAL_VOTE_SECONDS = 30;
const EMPTY_TREASURE_MESSAGES = [
  '寶物被偷走了',
  '發現空寶箱',
  '再接再厲',
  '差點就中了',
  '寶箱睡著了',
  '這次先暖身',
  '下次會更好'
];
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
    scoreClosedQuestion,
    getPlayerSummary,
    getScoreboard,
    getPlayerLeaderboard,
    setTeamChoiceMode,
    recalculateScoreboard,
    resetGameData,
    getPlayerInventory,
    getPlayerAchievements,
    claimAchievementReward,
    openTreasureBox,
    useItem,
    getTeamBonusLedger,
    recalculateV3Scoreboard,
    finalizeAwards,
    getAwardList,
    submitCreativeAnswer,
    getTeamCreativePool,
    voteTeamCreative,
    getTeamCreativeCandidates,
    selectCreativeFinalists,
    getCreativeFinalists,
    voteCreativeFinal,
    getCreativeVoteResult,
    exportGameReport,
    addComputerPlayers,
    submitComputerAnswers,
    finalizeCompetition,
    getFinalResults
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
    'clientKey',
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
    'itemBonusScore',
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
    'updatedAt',
    'openedQuestionIds',
    'allowFreeTeamChoice',
    'creativeFinalVoteStartedAt'
  ]);
  ensureSheet(ss, SHEET_SCOREBOARD, [
    'gameId',
    'teamId',
    'playerCount',
    'effectivePlayerCount',
    'closedQuestionCount',
    'correctAnswerCount',
    'correctRate',
    'currentQuestionCorrectRate',
    'totalScore',
    'averageScore',
    'teamBonusScore',
    'finalScore',
    'weightedAverageScore',
    'updatedAt'
  ]);
  ensureSheet(ss, SHEET_TREASURE_BOXES, [
    'boxId',
    'gameId',
    'playerId',
    'teamId',
    'sourceType',
    'sourceKey',
    'status',
    'awardedAt',
    'openedAt',
    'expiredAt',
    'itemType',
    'note'
  ]);
  ensureSheet(ss, SHEET_TREASURE_REWARD_POOL, [
    'poolId',
    'gameId',
    'playerId',
    'slotIndex',
    'itemType',
    'status',
    'sourceBoxId',
    'createdAt',
    'usedAt',
    'note'
  ]);
  ensureSheet(ss, SHEET_ITEM_RECORDS, [
    'itemId',
    'gameId',
    'playerId',
    'teamId',
    'itemType',
    'sourceBoxId',
    'status',
    'createdAt',
    'usedAt',
    'targetQuestionId',
    'targetTeamId',
    'effectScore',
    'note'
  ]);
  ensureSheet(ss, SHEET_AWARDS, [
    'awardId',
    'gameId',
    'awardType',
    'playerId',
    'teamId',
    'nickname',
    'rank',
    'score',
    'completedAt',
    'sourceItemId',
    'awardedAt',
    'note'
  ]);
  ensureSheet(ss, SHEET_CREATIVE_SUBMISSIONS, [
    'submissionId',
    'gameId',
    'questionId',
    'playerId',
    'teamId',
    'content',
    'submittedAt',
    'status',
    'selectedByInstructor',
    'finalAlias',
    'note'
  ]);
  ensureSheet(ss, SHEET_CREATIVE_VOTES, [
    'voteId',
    'gameId',
    'questionId',
    'voterPlayerId',
    'voterTeamId',
    'phase',
    'submissionId',
    'votedAt',
    'note'
  ]);
  const ruleSettingsSheet = ensureSheet(ss, SHEET_RULE_SETTINGS, [
    'key',
    'value',
    'note'
  ]);
  seedRuleSettingsIfEmpty(ruleSettingsSheet);
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
    SHEET_GAME_STATE,
    SHEET_TREASURE_BOXES,
    SHEET_TREASURE_REWARD_POOL,
    SHEET_ITEM_RECORDS,
    SHEET_AWARDS,
    SHEET_CREATIVE_SUBMISSIONS,
    SHEET_CREATIVE_VOTES
  ].forEach(name => clearDataRows(getSheetOrThrow(name)));

  const gameId = String(data.gameId || getGameId());
  const now = new Date().toISOString();
  const state = {
    gameId,
    status: 'draft',
    currentQuestionId: '',
    questionOpenedAt: '',
    updatedAt: now,
    openedQuestionIds: '',
    allowFreeTeamChoice: false,
    creativeFinalVoteStartedAt: ''
  };
  appendObject(getSheetOrThrow(SHEET_GAME_STATE), state);
  clearRuntimeCaches(gameId);
  cacheGameState(state);

  const questionsSync = syncQuestionsToFirebase();
  const firebaseSync = publishGameStateToFirebase(state);
  return {
    status: 'draft',
    gameId,
    message: '遊戲資料已初始化。玩家、作答、翻卷、排行榜、寶箱、道具、獎項與創作票選紀錄已清空；題庫、戰隊設定與規則設定保留。',
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

function syncGameSettingsToFirebase(options) {
  setupGameSheets();
  const gameId = getGameId();
  const stateSheet = getSheetOrThrow(SHEET_GAME_STATE);
  const states = readObjects(stateSheet);
  const existingIndex = states.findIndex(row => row.gameId === gameId);
  const currentState = existingIndex >= 0 ? normalizeGameState(states[existingIndex], gameId) : null;
  const allowFreeTeamChoice = options && Object.prototype.hasOwnProperty.call(options, 'allowFreeTeamChoice')
    ? Boolean(options.allowFreeTeamChoice)
    : Boolean(currentState && currentState.allowFreeTeamChoice);
  const row = {
    gameId,
    status: 'created',
    currentQuestionId: '',
    questionOpenedAt: '',
    updatedAt: new Date().toISOString(),
    openedQuestionIds: '',
    allowFreeTeamChoice,
    creativeFinalVoteStartedAt: ''
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
  return exportGameReport({}, {
    adminSecret: PropertiesService.getScriptProperties().getProperty('ADMIN_API_SECRET') || ''
  });
}

function createGame(data, payload) {
  requireAdmin(payload);
  setupGameSheets();
  const state = syncGameSettingsToFirebase({
    allowFreeTeamChoice: Boolean(data && data.allowFreeTeamChoice)
  });
  const questions = syncQuestionsToFirebase();
  state.questionsSync = questions.firebaseSync;
  return state;
}

function joinGame(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const state = getGameState({ gameId });
  if (state.status === 'draft') {
    throw new Error('講師尚未啟動場次，請等待講師開啟後再報到。');
  }

  const nickname = sanitizeNickname(requireText(data.nickname, 'nickname', 20));
  const clientKey = sanitizeClientKey(data.clientKey || '');
  const existingPlayer = findExistingPlayerForJoin(gameId, clientKey, nickname);
  if (existingPlayer) {
    cachePlayer(existingPlayer);
    ensurePlayerTreasureRewardPool(gameId, existingPlayer.playerId);
    return {
      playerId: existingPlayer.playerId,
      gameId,
      nickname: existingPlayer.nickname || nickname,
      teamId: existingPlayer.teamId,
      existing: true
    };
  }

  const allowFreeTeamChoice = isFreeTeamChoiceEnabled(gameId);
  const requestedTeamId = data.teamId ? String(data.teamId) : '';
  const teamId = allowFreeTeamChoice && isValidTeamId(requestedTeamId)
    ? requestedTeamId
    : pickLeastLoadedTeam(gameId);
  const playerId = Utilities.getUuid();
  const now = new Date().toISOString();

  appendObject(getSheetOrThrow(SHEET_PLAYERS), {
    playerId,
    clientKey,
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
    clientKey,
    gameId,
    nickname,
    teamId,
    score: 0,
    correctCount: 0,
    joinedAt: now,
    updatedAt: now
  });
  ensurePlayerTreasureRewardPool(gameId, playerId);

  return { playerId, gameId, nickname, teamId };
}

function addComputerPlayers(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playersPerTeam = Math.max(1, Math.min(10, Number(data.playersPerTeam || 2)));
  const sheet = getSheetOrThrow(SHEET_PLAYERS);
  const existingRows = readObjects(sheet).filter(row => row.gameId === gameId);
  const existingKeys = new Set(existingRows.map(row => row.clientKey));
  const now = new Date().toISOString();
  let createdCount = 0;

  getActiveTeamIds().forEach(teamId => {
    for (let index = 1; index <= playersPerTeam; index += 1) {
      const clientKey = ['computer', gameId, teamId, index].join('_');
      if (existingKeys.has(clientKey)) continue;
      appendObject(sheet, {
        playerId: clientKey,
        clientKey,
        gameId,
        nickname: '電腦學員 ' + teamId.replace('team_', '') + '-' + index,
        teamId,
        score: 0,
        correctCount: 0,
        joinedAt: now,
        updatedAt: now
      });
      existingKeys.add(clientKey);
      createdCount += 1;
    }
  });

  const totalBotPlayers = readObjects(sheet)
    .filter(row => row.gameId === gameId && String(row.clientKey || '').indexOf('computer_' + gameId + '_') === 0)
    .length;
  recalculateScoreboard({ gameId });
  return { gameId, createdCount, totalBotPlayers };
}

function submitComputerAnswers(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const state = getGameState({ gameId });
  if (state.status !== 'question_open' || !state.currentQuestionId) {
    throw new Error('目前沒有開放中的題目，無法讓電腦作答。');
  }

  const question = readQuestionRows().find(row => row.questionId === state.currentQuestionId);
  if (!question) {
    throw new Error('找不到目前開放題目。');
  }

  const botPlayers = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId && String(row.clientKey || '').indexOf('computer_' + gameId + '_') === 0);
  if (!botPlayers.length) {
    throw new Error('尚未加入電腦學員。');
  }

  if (String(question.type || '') === 'creative') {
    return submitComputerCreativeAnswers(gameId, botPlayers);
  }

  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const existingAnswers = readObjects(answerSheet);
  const correctAnswer = parseAnswer(question.correctAnswer).sort().join(',');
  let submittedCount = 0;

  botPlayers.forEach((player, index) => {
    if (existingAnswers.some(row => row.gameId === gameId && row.questionId === state.currentQuestionId && row.playerId === player.playerId)) {
      return;
    }
    const isCorrect = Math.random() < 0.65;
    const answer = isCorrect ? correctAnswer : pickWrongAnswer(question, correctAnswer);
    const responseSeconds = 5 + ((index * 7) % 50);
    const openedAt = new Date(new Date(state.questionOpenedAt || new Date()).getTime() + 1000).toISOString();
    const submittedAt = new Date(new Date(state.questionOpenedAt || new Date()).getTime() + responseSeconds * 1000).toISOString();
    const hasPriorCorrect = existingAnswers
      .concat(readObjects(answerSheet))
      .filter(row => row.gameId === gameId && row.questionId === state.currentQuestionId)
      .some(row => parseAnswer(row.answer).sort().join(',') === correctAnswer);
    const baseScore = calculateBaseScore(isCorrect, responseSeconds);
    const firstCorrectBonus = isCorrect && !hasPriorCorrect ? FIRST_CORRECT_BONUS : 0;
    const score = baseScore + firstCorrectBonus;
    const row = {
      answerId: gameId + '_' + state.currentQuestionId + '_' + player.playerId,
      gameId,
      questionId: state.currentQuestionId,
      playerId: player.playerId,
      teamId: player.teamId,
      answer,
      paperOpenedAt: openedAt,
      submittedAt,
      responseSeconds,
      isCorrect,
      baseScore,
      firstCorrectBonus,
      score
    };
    appendObject(answerSheet, row);
    existingAnswers.push(row);
    updatePlayerScore(gameId, player.playerId, score, isCorrect);
    submittedCount += 1;
  });

  return { gameId, questionId: state.currentQuestionId, submittedCount };
}

function pickWrongAnswer(question, correctAnswer) {
  const options = buildOptions(question).map(option => option.id);
  const wrong = options.find(option => option !== correctAnswer);
  return wrong || correctAnswer;
}

function submitComputerCreativeAnswers(gameId, botPlayers) {
  const phase = getCreativeTeamPhase(gameId);
  if (phase.phase !== 'answering') {
    throw new Error('創作題作答時間已結束，電腦學員不能再投稿。');
  }
  const sheet = getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS);
  const existing = readObjects(sheet);
  const samples = [
    '守護冷鏈，接種安心。',
    '核對再接種，安全不漏接。',
    '疫苗品質靠大家守護。',
    '完整紀錄，安心服務。',
    '衛教清楚，民眾放心。'
  ];
  let submittedCount = 0;
  botPlayers.forEach((player, index) => {
    if (existing.some(row => row.gameId === gameId && row.playerId === player.playerId && row.status !== 'deleted')) {
      return;
    }
    const row = {
      submissionId: Utilities.getUuid(),
      gameId,
      playerId: player.playerId,
      teamId: player.teamId,
      content: samples[index % samples.length],
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      selectedByInstructor: false,
      finalAlias: '',
      note: '電腦學員創作投稿。'
    };
    appendObject(sheet, row);
    existing.push(row);
    submittedCount += 1;
  });
  return { gameId, questionId: getGameState({ gameId }).currentQuestionId, submittedCount };
}

function getGameState(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const cachedState = getCachedGameState(gameId);
  if (cachedState) {
    return normalizeGameState(cachedState, gameId);
  }

  const states = readObjects(getSheetOrThrow(SHEET_GAME_STATE));
  const state = states.find(row => row.gameId === gameId);
  const result = normalizeGameState(state || {
    gameId,
    status: 'draft',
    currentQuestionId: '',
    questionOpenedAt: '',
    openedQuestionIds: '',
    allowFreeTeamChoice: false
  }, gameId);
  cacheGameState(result);
  return result;
}

function setTeamChoiceMode(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const currentState = getGameState({ gameId });
  if (currentState.status !== 'draft') {
    throw new Error('場次啟動後不可再變更是否開放自由選隊。');
  }
  const now = new Date().toISOString();
  const state = {
    ...currentState,
    gameId,
    allowFreeTeamChoice: Boolean(data.allowFreeTeamChoice),
    updatedAt: now
  };
  upsertGameState(state);
  const firebaseSync = publishGameStateToFirebase(state);
  return {
    gameId,
    allowFreeTeamChoice: state.allowFreeTeamChoice,
    firebaseSync
  };
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

function parseOpenedQuestionIds(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function formatOpenedQuestionIds(ids) {
  return Array.from(new Set(ids.filter(Boolean))).join(',');
}

function openQuestion(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  const currentState = getGameState({ gameId });
  const openedQuestionIds = parseOpenedQuestionIds(currentState.openedQuestionIds);
  const questions = readQuestionRows();
  const question = questions.find(item => item.questionId === questionId);

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  if (currentState.currentQuestionId === questionId || openedQuestionIds.indexOf(questionId) >= 0) {
    throw new Error('此題已開放過，請改選其他題目。');
  }

  if (!openedQuestionIds.length) {
    syncFirebasePlayersToSheet(gameId);
    preassignTreasureRewardsForPlayers(gameId);
  }

  const openedAt = new Date().toISOString();
  const nextOpenedQuestionIds = formatOpenedQuestionIds(openedQuestionIds.concat(questionId));
  upsertGameState({
    gameId,
    status: 'question_open',
    currentQuestionId: questionId,
    questionOpenedAt: openedAt,
    updatedAt: openedAt,
    openedQuestionIds: nextOpenedQuestionIds,
    allowFreeTeamChoice: currentState.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: ''
  });

  const state = {
    gameId,
    questionId,
    status: 'question_open',
    currentQuestionId: questionId,
    questionOpenedAt: openedAt,
    updatedAt: openedAt,
    openedQuestionIds: nextOpenedQuestionIds,
    allowFreeTeamChoice: currentState.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: '',
    publicQuestion: publicQuestionFromRow(question)
  };
  const firebaseSync = publishGameStateToFirebase(state);
  return { gameId, questionId, status: 'question_open', questionOpenedAt: openedAt, openedQuestionIds: nextOpenedQuestionIds, firebaseSync };
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
  syncFirebasePlayersToSheet(gameId);
  syncFirebaseAnswersForQuestionToSheet(gameId, questionId);
  syncFirebaseItemUsesForQuestionToSheet(gameId, questionId);
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

  const currentState = getGameState({ gameId });
  const openedQuestionIds = currentState.openedQuestionIds || formatOpenedQuestionIds([questionId]);
  const now = new Date().toISOString();
  upsertGameState({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now,
    openedQuestionIds
  });
  const firebaseSync = publishGameStateToFirebase({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now,
    openedQuestionIds
  });

  recalculateScoreboard();

  return { gameId, questionId, status: 'question_closed', scoredCount, submittedCount, firebaseSync };
}

function recalculateScoreboard(data) {
  ensureGameSheetsReady();

  const gameId = data && data.gameId ? String(data.gameId) : getGameId();
  const players = getMergedPlayers(gameId);
  const groups = {};
  const teamBonusScores = getTeamBonusScores(gameId);
  const closedQuestionCount = getClosedOfficialQuestionCount(gameId);
  const correctAnswerCounts = getTeamCorrectAnswerCounts(gameId);
  const state = getGameState({ gameId });
  const currentQuestionRates = state.status === 'question_closed' && state.currentQuestionId
    ? getQuestionTeamCorrectRates(gameId, state.currentQuestionId)
    : {};

  getActiveTeamIds().forEach(teamId => {
    groups[teamId] = { playerCount: 0, effectivePlayerCount: 0, totalScore: 0 };
  });

  players.forEach(player => {
    if (!groups[player.teamId]) {
      groups[player.teamId] = { playerCount: 0, effectivePlayerCount: 0, totalScore: 0 };
    }
    groups[player.teamId].playerCount += 1;
    if (Number(player.answeredCount || 0) > 0) {
      groups[player.teamId].effectivePlayerCount += 1;
    }
    groups[player.teamId].totalScore += Number(player.score || 0);
  });

  const scoreboardSheet = getSheetOrThrow(SHEET_SCOREBOARD);
  clearDataRows(scoreboardSheet);
  const now = new Date().toISOString();

  Object.keys(groups).sort().forEach(teamId => {
      const group = groups[teamId];
      const averageScore = group.playerCount ? group.totalScore / group.playerCount : 0;
      const teamBonusScore = Number(teamBonusScores[teamId] || 0);
      const correctAnswerCount = Number(correctAnswerCounts[teamId] || 0);
      const answerDenominator = group.playerCount * closedQuestionCount;
      const correctRate = answerDenominator ? correctAnswerCount / answerDenominator : 0;
      const currentQuestionCorrectRate = Number(currentQuestionRates[teamId] || 0);
    appendObject(scoreboardSheet, {
      gameId,
      teamId,
      playerCount: group.playerCount,
      effectivePlayerCount: group.effectivePlayerCount,
      closedQuestionCount,
      correctAnswerCount,
      correctRate,
      currentQuestionCorrectRate,
      totalScore: group.totalScore,
      averageScore,
      teamBonusScore,
      finalScore: group.totalScore + teamBonusScore,
      weightedAverageScore: averageScore + teamBonusScore,
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
    .sort((a, b) => Number(b.weightedAverageScore || b.totalScore || 0) - Number(a.weightedAverageScore || a.totalScore || 0));

  return { gameId, rows };
}

function getPlayerLeaderboard(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const limit = Math.min(Math.max(Number(data.limit || 10), 1), 50);
  const rows = getMergedPlayers(gameId)
    .map(row => ({
      nickname: row.nickname,
      teamId: row.teamId,
      score: Number(row.score || 0),
      correctCount: Number(row.correctCount || 0),
      updatedAt: row.updatedAt || ''
    }))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, limit);

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
  const question = readQuestionRows().find(row => row.questionId === questionId);

  if (state.status !== 'question_open' || state.currentQuestionId !== questionId) {
    throw new Error('題目尚未開放或已關閉。');
  }
  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }
  if (String(question.type || '') === 'creative') {
    throw new Error('此題為創作題，請使用創作題回答區提交。');
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
    itemBonusScore: '',
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
  syncFirebasePlayersToSheet(gameId);
  syncFirebaseAnswersForQuestionToSheet(gameId, questionId);
  syncFirebaseItemUsesForQuestionToSheet(gameId, questionId);
  const question = readQuestionRows().find(row => row.questionId === questionId);

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  ensureMissingAnswersForQuestion(gameId, questionId);
  const correctAnswer = parseAnswer(question.correctAnswer).sort().join(',');
  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const answerData = readSheetEntries(answerSheet);
  const answers = answerData.entries.map(entry => entry.row);
  const itemSheet = getSheetOrThrow(SHEET_ITEM_RECORDS);
  const itemRows = readObjects(itemSheet);
  const itemHeaders = getHeaders(itemSheet);
  const firstCorrectPlayerId = getFirstCorrectPlayerId(answers, gameId, questionId, correctAnswer);
  let scoredCount = 0;
  let submittedCount = 0;
  let treasureAwardedCount = 0;
  const newlyCorrectAnswers = [];
  const playerScoreDeltas = {};
  let answerRowsChanged = false;

  answerData.entries.forEach(entry => {
    const row = entry.row;
    if (row.gameId !== gameId || row.questionId !== questionId) return;
    submittedCount += 1;
    if (row.score !== '') return;

    const userAnswer = parseAnswer(row.answer).sort().join(',');
    const isCorrect = userAnswer === correctAnswer;
    const baseScore = calculateBaseScore(isCorrect, Number(row.responseSeconds || 999));
    const firstCorrectBonus = isCorrect && row.playerId === firstCorrectPlayerId ? FIRST_CORRECT_BONUS : 0;
    const preItemScore = baseScore + firstCorrectBonus;
    const itemBonusScore = consumeArmedDoubleCard(itemSheet, itemHeaders, itemRows, gameId, row.playerId, questionId, isCorrect, preItemScore);
    const score = preItemScore + itemBonusScore;

    setEntryValue(entry, answerData.headers, 'isCorrect', isCorrect);
    setEntryValue(entry, answerData.headers, 'baseScore', baseScore);
    setEntryValue(entry, answerData.headers, 'firstCorrectBonus', firstCorrectBonus);
    setEntryValue(entry, answerData.headers, 'itemBonusScore', itemBonusScore);
    setEntryValue(entry, answerData.headers, 'score', score);
    answerRowsChanged = true;
    if (!playerScoreDeltas[row.playerId]) {
      playerScoreDeltas[row.playerId] = { score: 0, correct: 0 };
    }
    playerScoreDeltas[row.playerId].score += Number(score || 0);
    playerScoreDeltas[row.playerId].correct += isCorrect ? 1 : 0;
    if (isCorrect) {
      newlyCorrectAnswers.push({
        questionId,
        playerId: row.playerId,
        teamId: row.teamId
      });
    }
    scoredCount += 1;
  });

  if (answerRowsChanged) {
    writeSheetValues(answerSheet, answerData.values);
  }
  applyPlayerScoreDeltas(gameId, playerScoreDeltas);

  if (newlyCorrectAnswers.length) {
    treasureAwardedCount = awardTreasureBoxesForCorrectAnswers(gameId, newlyCorrectAnswers).length;
  }
  const challengeAppliedCount = applyPendingChallengeCards(itemSheet, itemHeaders, itemRows, gameId, questionId);

  const currentState = getGameState({ gameId });
  const openedQuestionIds = currentState.openedQuestionIds || formatOpenedQuestionIds([questionId]);
  const now = new Date().toISOString();
  upsertGameState({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now,
    openedQuestionIds
  });
  const firebaseSync = publishGameStateToFirebase({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now,
    openedQuestionIds
  });

  recalculateScoreboard();
  const scoreboard = getScoreboard({ gameId }).rows;
  const scoreboardSync = publishScoreboardSnapshotToFirebase({
    gameId,
    rows: scoreboard,
    questionId,
    isTemporary: true,
    source: 'instructor_close_question'
  });

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
    treasureAwardedCount,
    challengeAppliedCount,
    firebaseSync,
    scoreboardSync
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
  const relatedPlayerIds = getRelatedPlayerIds(gameId, player);
  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const answerRows = readObjects(answerSheet);
  const treasureSheet = getSheetOrThrow(SHEET_TREASURE_BOXES);
  const treasureRows = readObjects(treasureSheet);

  const context = {
    answerSheet,
    answerRows,
    treasureSheet,
    treasureRows
  };

  const noticeSummary = getPlayerNoticeSummary(gameId, playerId, context);
  const playerAnswers = answerRows.filter(row => row.gameId === gameId && relatedPlayerIds.indexOf(row.playerId) >= 0);
  const playerScore = playerAnswers.reduce((total, row) => total + Number(row.score || 0), 0);
  const answers = questionId
    ? playerAnswers.filter(row => row.questionId === questionId)
    : [];
  const lastAnswer = answers.length ? answers[answers.length - 1] : null;

  return {
    gameId,
    playerId,
    teamId: player.teamId,
    playerScore,
    teamScore: Number(team.weightedAverageScore || team.finalScore || team.totalScore || 0),
    hasInventoryNotice: noticeSummary.hasInventoryNotice,
    hasAchievementNotice: noticeSummary.hasAchievementNotice,
    unopenedBoxCount: noticeSummary.unopenedBoxCount,
    claimableAchievementCount: noticeSummary.claimableAchievementCount,
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

function getPlayerNoticeSummary(gameId, playerId, context) {
  const treasureSheet = context && context.treasureSheet ? context.treasureSheet : getSheetOrThrow(SHEET_TREASURE_BOXES);
  const treasureRows = (context && context.treasureRows ? context.treasureRows : readObjects(treasureSheet))
    .filter(row => row.gameId === gameId && row.playerId === playerId);
  const unopenedBoxCount = treasureRows.filter(row => row.status === 'unopened').length;
  let claimableAchievementCount = 0;

  try {
    const achievements = getPlayerAchievements({ gameId, playerId }, context).achievements || [];
    claimableAchievementCount = achievements.filter(row => row.claimable).length;
  } catch (error) {
    claimableAchievementCount = 0;
  }

  return {
    unopenedBoxCount,
    claimableAchievementCount,
    hasInventoryNotice: unopenedBoxCount > 0,
    hasAchievementNotice: claimableAchievementCount > 0
  };
}

function getPlayerInventory(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const player = findPlayer(gameId, playerId);
  const boxes = readObjects(getSheetOrThrow(SHEET_TREASURE_BOXES))
    .filter(row => row.gameId === gameId && row.playerId === playerId)
    .sort((a, b) => new Date(a.awardedAt || 0).getTime() - new Date(b.awardedAt || 0).getTime())
    .map(row => ({
      boxId: row.boxId,
      sourceType: row.sourceType,
      status: row.status,
      awardedAt: row.awardedAt,
      openedAt: row.openedAt || '',
      expiredAt: row.expiredAt || '',
      itemType: row.itemType || '',
      itemLabel: row.itemType ? getItemLabel(row.itemType) : ''
    }));
  const unopenedBoxes = boxes.filter(row => row.status === 'unopened');
  const items = readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .filter(row => row.gameId === gameId && row.playerId === playerId)
    .map(row => ({
      itemId: row.itemId,
      itemType: row.itemType,
      itemLabel: getItemLabel(row.itemType),
      sourceBoxId: row.sourceBoxId || '',
      status: row.status,
      usedAt: row.usedAt || '',
      targetQuestionId: row.targetQuestionId || '',
      targetTeamId: row.targetTeamId || '',
      effectScore: row.effectScore || ''
    }));

  return {
    gameId,
    playerId,
    teamId: player.teamId,
    unopenedBoxCount: unopenedBoxes.length,
    maxUnopenedBoxCount: getNumberRuleSetting('maxBoxesPerPlayer', MAX_UNOPENED_TREASURE_BOXES),
    boxes,
    items
  };
}

function getPlayerAchievements(data, context) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const player = findPlayer(gameId, playerId);

  const answerSheet = context && context.answerSheet ? context.answerSheet : getSheetOrThrow(SHEET_ANSWERS);
  const allAnswerRows = (context && context.answerRows ? context.answerRows : readObjects(answerSheet))
    .filter(row => row.gameId === gameId && row.playerId === playerId);

  const answerRows = allAnswerRows
    .filter(row => String(row.isCorrect).toLowerCase() === 'true');

  const treasureSheet = context && context.treasureSheet ? context.treasureSheet : getSheetOrThrow(SHEET_TREASURE_BOXES);
  const treasureRows = (context && context.treasureRows ? context.treasureRows : readObjects(treasureSheet))
    .filter(row => row.gameId === gameId && row.playerId === playerId);

  const itemSheet = context && context.itemSheet ? context.itemSheet : getSheetOrThrow(SHEET_ITEM_RECORDS);
  const itemRows = (context && context.itemRows ? context.itemRows : readObjects(itemSheet))
    .filter(row => row.gameId === gameId && row.playerId === playerId && row.status === 'used');

  const correctQuestionIds = Array.from(new Set(answerRows.map(row => row.questionId).filter(Boolean)));
  const streak = getCurrentCorrectStreak(allAnswerRows);
  const itemUseCount = itemRows.length;
  const unopenedBoxCount = treasureRows.filter(row => row.status === 'unopened').length;
  const achievements = buildPlayerAchievements({
    correctCount: correctQuestionIds.length,
    streak,
    itemUseCount,
    treasureRows
  });

  return {
    gameId,
    playerId,
    teamId: player.teamId,
    correctCount: correctQuestionIds.length,
    correctStreak: streak,
    itemUseCount,
    unopenedBoxCount,
    hasNotice: achievements.some(row => row.claimable),
    achievements
  };
}

function claimAchievementReward(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const achievementId = requireText(data.achievementId, 'achievementId', 80);
  const player = findPlayer(gameId, playerId);
  const summary = getPlayerAchievements({ gameId, playerId });
  const achievement = (summary.achievements || []).find(row => row.achievementId === achievementId);

  if (!achievement) {
    throw new Error('找不到成就。');
  }
  if (!achievement.completed) {
    throw new Error('成就尚未完成，不能領取寶箱。');
  }
  if (achievement.rewarded) {
    throw new Error('此成就寶箱已領取。');
  }

  const context = {
    sourceKeys: new Set(
      readObjects(getSheetOrThrow(SHEET_TREASURE_BOXES))
        .filter(row => row.gameId === gameId)
        .map(row => String(row.sourceKey || ''))
        .filter(Boolean)
    )
  };
  const boxes = [];
  for (let index = 1; index <= Number(achievement.rewardBoxCount || 1); index += 1) {
    boxes.push(createTreasureBoxIfAbsent({
      gameId,
      playerId,
      teamId: player.teamId,
      sourceType: achievement.sourceType,
      sourceKey: [gameId, playerId, achievement.sourceType, index].join('_'),
      note: '領取成就「' + achievement.title + '」取得寶箱。'
    }, context));
  }

  enforceUnopenedTreasureLimit(gameId, playerId);
  return {
    gameId,
    playerId,
    achievementId,
    awardedCount: boxes.filter(Boolean).length,
    boxes: boxes.filter(Boolean)
  };
}

function buildPlayerAchievements(summary) {
  const treasureRows = summary.treasureRows || [];
  return [
    buildAchievement('correct_3', '累積答對 3 題', '達成後可領取 1 個寶箱。', summary.correctCount, 3, 'correct_count_3', 1, treasureRows),
    buildAchievement('correct_5', '累積答對 5 題', '達成後可領取 1 個寶箱。', summary.correctCount, 5, 'correct_count_5', 1, treasureRows),
    buildAchievement('correct_10', '累積答對 10 題', '達成後可領取 2 個寶箱。', summary.correctCount, 10, 'correct_count_10', 2, treasureRows),
    buildAchievement('streak_3', '連續答對 3 題', '達成後可領取 1 個寶箱。', summary.streak, 3, 'correct_streak_3', 1, treasureRows),
    buildAchievement('streak_5', '連續答對 5 題', '達成後可領取 2 個寶箱。', summary.streak, 5, 'correct_streak_5', 2, treasureRows),
    buildAchievement('item_use_3', '累積使用 3 張道具卡', '達成後可領取 1 個寶箱。', summary.itemUseCount, 3, 'item_use_3', 1, treasureRows),
    buildAchievement('item_use_5', '累積使用 5 張道具卡', '達成後可領取 1 個寶箱。', summary.itemUseCount, 5, 'item_use_5', 1, treasureRows)
  ];
}

function buildAchievement(achievementId, title, description, current, target, sourceType, rewardBoxCount, treasureRows) {
  const rewardedCount = countTreasureSourceType(treasureRows, sourceType);
  const completed = Number(current || 0) >= target;
  const rewarded = rewardedCount >= rewardBoxCount;
  return {
    achievementId,
    title,
    description,
    current: Number(current || 0),
    target,
    sourceType,
    rewardBoxCount,
    rewardedCount,
    completed,
    rewarded,
    claimable: completed && !rewarded
  };
}

function hasTreasureSourceType(treasureRows, sourceType) {
  return treasureRows.some(row => row.sourceType === sourceType);
}

function countTreasureSourceType(treasureRows, sourceType) {
  return treasureRows.filter(row => row.sourceType === sourceType).length;
}

function getCurrentCorrectStreak(answerRows) {
  return answerRows
    .slice()
    .sort((a, b) => new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime())
    .reduce((total, row) => String(row.isCorrect).toLowerCase() === 'true' ? total + 1 : 0, 0);
}

function openTreasureBox(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const boxId = requireText(data.boxId, 'boxId', 120);
  const player = findPlayer(gameId, playerId);
  const boxSheet = getSheetOrThrow(SHEET_TREASURE_BOXES);
  const rows = readObjects(boxSheet);
  const headers = getHeaders(boxSheet);
  const index = rows.findIndex(row =>
    row.gameId === gameId &&
    row.playerId === playerId &&
    row.boxId === boxId
  );

  if (index < 0) {
    throw new Error('找不到可開啟的寶箱。');
  }

  const box = rows[index];
  if (box.status !== 'unopened') {
    throw new Error('此寶箱目前不是未開啟狀態。');
  }

  const itemType = box.itemType || resolveTreasureRewardType(gameId, playerId);
  const now = new Date().toISOString();
  const rowNumber = index + 2;

  setCellByHeader(boxSheet, rowNumber, headers, 'status', 'opened');
  setCellByHeader(boxSheet, rowNumber, headers, 'openedAt', now);
  setCellByHeader(boxSheet, rowNumber, headers, 'itemType', itemType);
  setCellByHeader(boxSheet, rowNumber, headers, 'note', appendNote(
    box.note,
    drawnItemType === 'double' && itemType === 'score_5'
      ? '已開啟寶箱。重複抽到加倍卡，改為大加分卡。'
      : '已開啟寶箱。'
  ));

  const item = itemType === 'empty'
    ? null
    : createItemRecord({
      gameId,
      playerId,
      teamId: player.teamId,
      itemType,
      sourceBoxId: boxId,
      note: drawnItemType === 'double' && itemType === 'score_5'
        ? '重複抽到加倍卡，依規則改為大加分卡。'
        : '由寶箱開出，尚未套用道具效果。'
    });

  return {
    gameId,
    playerId,
    boxId,
    openedAt: now,
    itemType,
    itemLabel: getItemLabel(itemType),
    message: itemType === 'empty' ? pickEmptyTreasureMessage(boxId) : '',
    item
  };
}

function pickEmptyTreasureMessage(seed) {
  const key = String(seed || Utilities.getUuid());
  let total = 0;
  for (let index = 0; index < key.length; index += 1) {
    total += key.charCodeAt(index);
  }
  return EMPTY_TREASURE_MESSAGES[total % EMPTY_TREASURE_MESSAGES.length];
}

function hasPlayerEverHadDoubleCard(gameId, playerId) {
  return readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .some(row => row.gameId === gameId && row.playerId === playerId && row.itemType === 'double');
}

function useItem(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const itemId = requireText(data.itemId, 'itemId', 120);
  const player = findPlayer(gameId, playerId);
  const itemSheet = getSheetOrThrow(SHEET_ITEM_RECORDS);
  const itemRows = readObjects(itemSheet);
  const itemHeaders = getHeaders(itemSheet);
  const itemEntry = findOwnedItemEntry(itemRows, gameId, playerId, itemId);

  if (!itemEntry) {
    throw new Error('找不到可使用的道具。');
  }
  if (itemEntry.row.status !== 'available') {
    throw new Error('此道具目前不是可使用狀態。');
  }

  const itemType = String(itemEntry.row.itemType || '');
  if (TEAM_SCORE_ITEM_EFFECTS[itemType]) {
    return useTeamScoreItem(itemSheet, itemHeaders, itemRows, itemEntry, player, data);
  }
  if (itemType === 'double') {
    return armQuestionItem(itemSheet, itemHeaders, itemEntry, player, data, 'double');
  }
  if (itemType === 'comeback') {
    return useComebackItem(itemSheet, itemHeaders, itemRows, itemEntry, player, data);
  }
  if (itemType === 'challenge') {
    return armChallengeItem(itemSheet, itemHeaders, itemEntry, player, data);
  }

  throw new Error('此道具效果尚未在目前版本啟用：' + itemType);
}

function getTeamBonusLedger(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const rows = readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .filter(row => row.gameId === gameId && row.status === 'used')
    .filter(row => isTeamBonusItem(row.itemType))
    .map(row => ({
      itemId: row.itemId,
      playerId: row.playerId,
      teamId: row.teamId,
      itemType: row.itemType,
      itemLabel: getItemLabel(row.itemType),
      effectScore: Number(row.effectScore || 0),
      targetQuestionId: row.targetQuestionId || '',
      targetTeamId: row.targetTeamId || '',
      usedAt: row.usedAt || ''
    }));
  const totals = {};

  rows.forEach(row => {
    if (!totals[row.teamId]) totals[row.teamId] = 0;
    totals[row.teamId] += Number(row.effectScore || 0);
  });

  return { gameId, rows, totals };
}

function recalculateV3Scoreboard(data) {
  return recalculateScoreboard(data);
}

function finalizeAwards(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const now = new Date().toISOString();
  const luckyAward = buildLuckyAward(gameId, now);
  const perfectAwards = buildPerfectAwards(gameId, now);
  const newAwardRows = [];

  if (luckyAward) {
    newAwardRows.push(luckyAward);
  }
  perfectAwards.forEach(row => newAwardRows.push(row));
  replaceAwardsForTypes(gameId, ['lucky', 'perfect'], newAwardRows);

  return {
    gameId,
    luckyAward,
    perfectAwards
  };
}

function getAwardList(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const rows = readObjects(getSheetOrThrow(SHEET_AWARDS))
    .filter(row => row.gameId === gameId)
    .sort((a, b) => {
      const typeOrder = getAwardTypeOrder(a.awardType) - getAwardTypeOrder(b.awardType);
      if (typeOrder !== 0) return typeOrder;
      return Number(a.rank || 999) - Number(b.rank || 999);
    })
    .map(row => ({
      awardId: row.awardId,
      gameId: row.gameId,
      awardType: row.awardType,
      playerId: row.playerId,
      teamId: row.teamId,
      nickname: row.nickname || '',
      rank: row.rank || '',
      score: row.score || '',
      completedAt: row.completedAt || '',
      sourceItemId: row.sourceItemId || '',
      awardedAt: row.awardedAt || '',
      note: row.note || ''
    }));

  return { gameId, rows };
}

function buildLuckyAward(gameId, awardedAt) {
  const treasureRows = readObjects(getSheetOrThrow(SHEET_TREASURE_BOXES));
  const specialItem = readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .filter(row => row.gameId === gameId && row.itemType === 'special')
    .map(row => ({
      row,
      createdAt: getItemCreatedAt(row, treasureRows)
    }))
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())[0];

  if (!specialItem) {
    return null;
  }

  const player = findPlayer(gameId, specialItem.row.playerId);
  return buildAwardRow({
    gameId,
    awardType: 'lucky',
    playerId: specialItem.row.playerId,
    teamId: specialItem.row.teamId,
    nickname: player.nickname || '',
    rank: 1,
    score: '',
    completedAt: specialItem.createdAt || '',
    sourceItemId: specialItem.row.itemId || '',
    awardedAt,
    note: '第一位抽中特殊道具者取得幸運獎。'
  });
}

function buildPerfectAwards(gameId, awardedAt) {
  const officialQuestionIds = getOfficialQuestionIds();
  if (!officialQuestionIds.length) {
    return [];
  }

  const limit = getNumberRuleSetting('perfectPrizeLimit', 3);
  const answerRows = readObjects(getSheetOrThrow(SHEET_ANSWERS))
    .filter(row => row.gameId === gameId && row.score !== '');
  const groups = getMergedPlayers(gameId);

  return groups
    .map(group => buildPerfectCandidate(group, officialQuestionIds, answerRows))
    .filter(Boolean)
    .sort((a, b) => {
      const timeDiff = new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
      if (timeDiff !== 0) return timeDiff;
      return Number(b.score || 0) - Number(a.score || 0);
    })
    .slice(0, limit)
    .map((candidate, index) => buildAwardRow({
      gameId,
      awardType: 'perfect',
      playerId: candidate.playerId,
      teamId: candidate.teamId,
      nickname: candidate.nickname,
      rank: index + 1,
      score: candidate.score,
      completedAt: candidate.completedAt,
      sourceItemId: '',
      awardedAt,
      note: '全部正式題目皆答對，依完成最後一題時間排序。'
    }));
}

function buildPerfectCandidate(group, officialQuestionIds, answerRows) {
  const playerIds = group.playerIds || [];
  const correctRowsByQuestionId = {};

  answerRows
    .filter(row => playerIds.indexOf(row.playerId) >= 0)
    .filter(row => row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true')
    .forEach(row => {
      if (officialQuestionIds.indexOf(row.questionId) < 0) return;
      if (!correctRowsByQuestionId[row.questionId]) {
        correctRowsByQuestionId[row.questionId] = [];
      }
      correctRowsByQuestionId[row.questionId].push(row);
    });

  const completedTimes = [];
  for (let index = 0; index < officialQuestionIds.length; index += 1) {
    const questionId = officialQuestionIds[index];
    const correctRows = correctRowsByQuestionId[questionId] || [];
    if (!correctRows.length) {
      return null;
    }
    const questionTimes = correctRows
      .map(row => new Date(row.submittedAt || 0).getTime())
      .filter(time => Number.isFinite(time));
    if (!questionTimes.length) {
      return null;
    }
    completedTimes.push(Math.min(...questionTimes));
  }

  const completedAt = new Date(Math.max(...completedTimes)).toISOString();
  return {
    playerId: playerIds[0] || '',
    teamId: group.teamId || '',
    nickname: group.nickname || '',
    score: Number(group.score || 0),
    completedAt
  };
}

function getOfficialQuestionIds() {
  return readQuestionRows()
    .filter(row => String(row.type || '') !== 'creative')
    .filter(row => !(row.isCreativeVote === true || String(row.isCreativeVote).toLowerCase() === 'true'))
    .map(row => String(row.questionId || ''))
    .filter(Boolean);
}

function buildAwardRow(data) {
  return {
    awardId: Utilities.getUuid(),
    gameId: data.gameId,
    awardType: data.awardType,
    playerId: data.playerId,
    teamId: data.teamId,
    nickname: data.nickname || '',
    rank: data.rank || '',
    score: data.score === undefined ? '' : data.score,
    completedAt: data.completedAt || '',
    sourceItemId: data.sourceItemId || '',
    awardedAt: data.awardedAt,
    note: data.note || ''
  };
}

function replaceAwardsForTypes(gameId, awardTypes, newRows) {
  const sheet = getSheetOrThrow(SHEET_AWARDS);
  const keepRows = readObjects(sheet)
    .filter(row => !(row.gameId === gameId && awardTypes.indexOf(row.awardType) >= 0));

  clearDataRows(sheet);
  keepRows.concat(newRows).forEach(row => appendObject(sheet, row));
}

function getAwardTypeOrder(awardType) {
  if (awardType === 'lucky') return 1;
  if (awardType === 'perfect') return 2;
  return 99;
}

function submitCreativeAnswer(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  assertCreativeQuestionOpen(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const playerId = requireText(data.playerId, 'playerId', 80);
  const abandon = data.abandon === true || String(data.abandon).toLowerCase() === 'true';
  const content = abandon
    ? ''
    : sanitizeCreativeContent(requireText(data.content, 'content', 500));
  const player = findPlayer(gameId, playerId);
  const phase = getCreativeTeamPhase(gameId);
  if (phase.phase !== 'answering') {
    throw new Error('創作題作答時間已結束，未送出視同放棄回答。');
  }
  const sheet = getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS);
  const existing = readObjects(sheet).find(row =>
    row.gameId === gameId &&
    row.questionId === questionId &&
    row.playerId === playerId &&
    row.status !== 'deleted' &&
    isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs)
  );

  if (existing) {
    throw new Error('每位學員每場只能提交 1 則創作答案。');
  }

  const row = {
    submissionId: Utilities.getUuid(),
    gameId,
    questionId,
    playerId,
    teamId: player.teamId,
    content,
    submittedAt: new Date().toISOString(),
    status: abandon ? 'abandoned' : 'submitted',
    selectedByInstructor: false,
    finalAlias: '',
    note: abandon ? '學員放棄創作題回答。' : '隊內初選候選。'
  };
  appendObject(sheet, row);

  return {
    gameId,
    submissionId: row.submissionId,
    teamId: row.teamId,
    submittedAt: row.submittedAt,
    status: row.status
  };
}

function getTeamCreativePool(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  syncFirebaseCreativeDataToSheet(gameId, questionId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  assertCreativeQuestionOpen(gameId);
  const playerId = requireText(data.playerId, 'playerId', 80);
  const player = findPlayer(gameId, playerId);
  const phase = getCreativeTeamPhase(gameId);
  const submissions = readObjects(getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.teamId === player.teamId && row.status === 'submitted')
    .filter(row => isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs));
  const votes = readObjects(getSheetOrThrow(SHEET_CREATIVE_VOTES))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.phase === 'team_primary')
    .filter(row => isCurrentCreativeRoundRow(row, 'votedAt', roundStartedAtMs));
  const voteCounts = {};
  votes.forEach(row => {
    voteCounts[row.submissionId] = Number(voteCounts[row.submissionId] || 0) + 1;
  });
  const ownVote = votes.find(row => row.voterPlayerId === playerId && row.voterTeamId === player.teamId) || null;
  const ownSubmission = submissions.find(row => row.playerId === playerId) || null;
  const rows = submissions
    .map(row => ({
      submissionId: row.submissionId,
      content: row.content,
      submittedAt: row.submittedAt || '',
      voteCount: Number(voteCounts[row.submissionId] || 0),
      isOwn: row.playerId === playerId
    }))
    .sort((a, b) => Number(b.voteCount || 0) - Number(a.voteCount || 0) ||
      new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime());

  return {
    gameId,
    teamId: player.teamId,
    rows,
    ownSubmissionId: ownSubmission ? ownSubmission.submissionId : '',
    votedSubmissionId: ownVote ? ownVote.submissionId : '',
    phase: phase.phase,
    remainingSeconds: phase.remainingSeconds,
    answerSeconds: phase.answerSeconds,
    teamVoteSeconds: phase.voteSeconds
  };
}

function voteTeamCreative(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  syncFirebaseCreativeDataToSheet(gameId, questionId);
  assertCreativeQuestionOpen(gameId);
  const phase = getCreativeTeamPhase(gameId);
  if (phase.phase !== 'team_vote') {
    throw new Error('隊內投票尚未開放或已結束。');
  }
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const playerId = requireText(data.playerId, 'playerId', 80);
  const submissionId = requireText(data.submissionId, 'submissionId', 120);
  const player = findPlayer(gameId, playerId);
  const submissions = readObjects(getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS));
  const submission = submissions.find(row =>
    row.gameId === gameId &&
    row.questionId === questionId &&
    row.submissionId === submissionId &&
    row.status === 'submitted' &&
    isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs)
  );

  if (!submission) {
    throw new Error('找不到可投票的創作投稿。');
  }
  if (submission.teamId !== player.teamId) {
    throw new Error('隊內初選只能投自己戰隊的投稿。');
  }

  const voteSheet = getSheetOrThrow(SHEET_CREATIVE_VOTES);
  const existingVote = readObjects(voteSheet).find(row =>
    row.gameId === gameId &&
    row.questionId === questionId &&
    row.voterPlayerId === playerId &&
    row.phase === 'team_primary' &&
    isCurrentCreativeRoundRow(row, 'votedAt', roundStartedAtMs)
  );
  if (existingVote) {
    throw new Error('隊內初選每位學員只能投 1 票。');
  }

  const row = {
    voteId: Utilities.getUuid(),
    gameId,
    questionId,
    voterPlayerId: playerId,
    voterTeamId: player.teamId,
    phase: 'team_primary',
    submissionId,
    votedAt: new Date().toISOString(),
    note: '隊內初選投票。'
  };
  appendObject(voteSheet, row);

  return {
    gameId,
    teamId: player.teamId,
    submissionId,
    votedAt: row.votedAt
  };
}

function getCreativeTeamPhase(gameId) {
  syncFirebasePlayersToSheet(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  syncFirebaseCreativeDataToSheet(gameId, questionId);
  const state = getGameState({ gameId });
  const answerSeconds = CREATIVE_ANSWER_SECONDS;
  const voteSeconds = CREATIVE_TEAM_VOTE_SECONDS;
  const openedAtMs = new Date(state.questionOpenedAt || new Date().toISOString()).getTime();
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const answerDeadlineMs = openedAtMs + answerSeconds * 1000;
  const nowMs = Date.now();
  const players = readObjects(getSheetOrThrow(SHEET_PLAYERS)).filter(row => row.gameId === gameId);
  const submissions = readObjects(getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.status !== 'deleted')
    .filter(row => isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs));
  const submittedPlayerIds = new Set(submissions.map(row => row.playerId));
  const allDone = players.length > 0 && players.every(row => submittedPlayerIds.has(row.playerId));
  const latestSubmittedMs = submissions.reduce((latest, row) => {
    const time = new Date(row.submittedAt || 0).getTime();
    return Number.isFinite(time) ? Math.max(latest, time) : latest;
  }, openedAtMs);
  const voteStartMs = allDone ? Math.min(latestSubmittedMs, answerDeadlineMs) : answerDeadlineMs;
  const voteEndMs = voteStartMs + voteSeconds * 1000;

  if (nowMs < voteStartMs) {
    return {
      phase: 'answering',
      answerSeconds,
      voteSeconds,
      remainingSeconds: Math.max(0, Math.ceil((voteStartMs - nowMs) / 1000)),
      voteStartAt: new Date(voteStartMs).toISOString()
    };
  }
  if (nowMs < voteEndMs) {
    return {
      phase: 'team_vote',
      answerSeconds,
      voteSeconds,
      remainingSeconds: Math.max(0, Math.ceil((voteEndMs - nowMs) / 1000)),
      voteStartAt: new Date(voteStartMs).toISOString()
    };
  }
  return {
    phase: 'team_vote_closed',
    answerSeconds,
    voteSeconds,
    remainingSeconds: 0,
    voteStartAt: new Date(voteStartMs).toISOString()
  };
}

function assertCreativeQuestionOpen(gameId) {
  const state = getGameState({ gameId });
  const question = state.currentQuestionId
    ? readQuestionRows().find(row => row.questionId === state.currentQuestionId)
    : null;

  if (state.status !== 'question_open' || !question || String(question.type || '') !== 'creative') {
    throw new Error('創作題尚未開始，請等待講師開放創作題。');
  }
}

function getCurrentCreativeQuestionId(gameId) {
  const state = getGameState({ gameId });
  const questions = readQuestionRows();
  const current = state.currentQuestionId
    ? questions.find(row => row.questionId === state.currentQuestionId)
    : null;
  if (current && String(current.type || '') === 'creative') {
    return current.questionId;
  }

  const openedIds = parseOpenedQuestionIds(state.openedQuestionIds || '').reverse();
  const latest = openedIds
    .map(questionId => questions.find(row => row.questionId === questionId))
    .find(row => row && String(row.type || '') === 'creative');
  return latest ? latest.questionId : '';
}

function getCreativeRoundStartedAtMs(gameId, questionId) {
  if (!questionId) return 0;
  const state = getGameState({ gameId });
  if (state.currentQuestionId !== questionId) return 0;
  const time = new Date(state.questionOpenedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isCurrentCreativeRoundRow(row, timeField, roundStartedAtMs) {
  if (!roundStartedAtMs) return false;
  const time = new Date(row[timeField] || 0).getTime();
  // 增加 2 秒容錯量，克服 GAS 與 Firebase 或 Sheet 間的時間差
  return Number.isFinite(time) && time >= (roundStartedAtMs - 2000);
}

function getTeamCreativeCandidates(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  syncFirebaseCreativeDataToSheet(gameId, questionId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const submissions = readObjects(getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.status === 'submitted')
    .filter(row => isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs));
  const votes = readObjects(getSheetOrThrow(SHEET_CREATIVE_VOTES))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.phase === 'team_primary')
    .filter(row => isCurrentCreativeRoundRow(row, 'votedAt', roundStartedAtMs));
  const voteCounts = {};
  votes.forEach(row => {
    voteCounts[row.submissionId] = Number(voteCounts[row.submissionId] || 0) + 1;
  });

  const teams = {};
  getActiveTeamIds().forEach(teamId => {
    teams[teamId] = [];
  });
  submissions.forEach(row => {
    if (!teams[row.teamId]) teams[row.teamId] = [];
    teams[row.teamId].push({
      submissionId: row.submissionId,
      teamId: row.teamId,
      content: row.content,
      submittedAt: row.submittedAt || '',
      voteCount: Number(voteCounts[row.submissionId] || 0),
      selectedByInstructor: row.selectedByInstructor === true || String(row.selectedByInstructor).toLowerCase() === 'true',
      finalAlias: row.finalAlias || ''
    });
  });
  Object.keys(teams).forEach(teamId => {
    teams[teamId].sort((a, b) => Number(b.voteCount || 0) - Number(a.voteCount || 0) ||
      new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime());
  });

  return { gameId, teams };
}

function selectCreativeFinalists(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  syncFirebaseCreativeDataToSheet(gameId, questionId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const finalists = Array.isArray(data.finalists) ? data.finalists : [];
  if (!finalists.length) {
    throw new Error('請至少選擇 1 則代表作品。');
  }

  const sheet = getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS);
  const rows = readObjects(sheet);
  const headers = getHeaders(sheet);
  const selectedTeamIds = new Set();
  const aliases = 'ABCDE'.split('');
  const selectedRows = [];

  rows.forEach((row, index) => {
    if (row.gameId !== gameId || row.questionId !== questionId || !isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs)) return;
    setCellByHeader(sheet, index + 2, headers, 'selectedByInstructor', false);
    setCellByHeader(sheet, index + 2, headers, 'finalAlias', '');
  });

  finalists.forEach((item, index) => {
    const teamId = requireText(item.teamId, 'teamId', 80);
    const submissionId = requireText(item.submissionId, 'submissionId', 120);
    if (selectedTeamIds.has(teamId)) {
      throw new Error('每隊只能選 1 則代表作品：' + teamId);
    }
    selectedTeamIds.add(teamId);

    const rowIndex = rows.findIndex(row =>
      row.gameId === gameId &&
      row.questionId === questionId &&
      row.teamId === teamId &&
      row.submissionId === submissionId &&
      row.status === 'submitted' &&
      isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs)
    );
    if (rowIndex < 0) {
      throw new Error('找不到代表作品：' + submissionId);
    }

    const alias = aliases[index] || String(index + 1);
    setCellByHeader(sheet, rowIndex + 2, headers, 'selectedByInstructor', true);
    setCellByHeader(sheet, rowIndex + 2, headers, 'finalAlias', alias);
    setCellByHeader(sheet, rowIndex + 2, headers, 'note', appendNote(rows[rowIndex].note, '講師選為匿名決選作品 ' + alias + '。'));
    selectedRows.push({
      submissionId,
      teamId,
      finalAlias: alias,
      content: rows[rowIndex].content
    });
  });

  const now = new Date().toISOString();
  const state = getGameState({ gameId });
  upsertGameState({
    ...state,
    gameId,
    updatedAt: now,
    creativeFinalVoteStartedAt: now
  });
  publishGameStateToFirebase({
    ...state,
    gameId,
    updatedAt: now,
    creativeFinalVoteStartedAt: now
  });

  return { gameId, rows: selectedRows, finalVoteStartedAt: now };
}

function getCreativeFinalists(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  syncFirebaseCreativeDataToSheet(gameId, questionId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const playerId = data.playerId ? String(data.playerId) : '';
  const player = playerId ? findPlayer(gameId, playerId) : null;
  const phase = getCreativeFinalPhase(gameId);
  const finalVotes = readObjects(getSheetOrThrow(SHEET_CREATIVE_VOTES))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.phase === 'final')
    .filter(row => isCurrentCreativeRoundRow(row, 'votedAt', roundStartedAtMs));
  const voted = playerId
    ? finalVotes.find(row => row.voterPlayerId === playerId) || null
    : null;
  const rows = readObjects(getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS))
    .filter(row => row.gameId === gameId)
    .filter(row => row.questionId === questionId)
    .filter(row => isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs))
    .filter(row => row.selectedByInstructor === true || String(row.selectedByInstructor).toLowerCase() === 'true')
    .map(row => ({
      submissionId: row.submissionId,
      finalAlias: row.finalAlias || '',
      content: row.content,
      isOwnTeam: player ? row.teamId === player.teamId : false
    }))
    .sort((a, b) => String(a.finalAlias || '').localeCompare(String(b.finalAlias || '')));

  return {
    gameId,
    rows,
    votedSubmissionId: voted ? voted.submissionId : '',
    phase: phase.phase,
    remainingSeconds: phase.remainingSeconds,
    finalVoteSeconds: phase.voteSeconds
  };
}

function voteCreativeFinal(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  syncFirebaseCreativeDataToSheet(gameId, questionId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const phase = getCreativeFinalPhase(gameId);
  if (phase.phase !== 'final_vote') {
    throw new Error('匿名全體投票尚未開放或已結束。');
  }
  const playerId = requireText(data.playerId, 'playerId', 80);
  const submissionId = requireText(data.submissionId, 'submissionId', 120);
  const player = findPlayer(gameId, playerId);
  const submission = readObjects(getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS)).find(row =>
    row.gameId === gameId &&
    row.questionId === questionId &&
    row.submissionId === submissionId &&
    isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs) &&
    (row.selectedByInstructor === true || String(row.selectedByInstructor).toLowerCase() === 'true')
  );

  if (!submission) {
    throw new Error('找不到可投票的匿名決選作品。');
  }
  if (submission.teamId === player.teamId) {
    throw new Error('匿名全體投票不可投自己戰隊的作品。');
  }

  const voteSheet = getSheetOrThrow(SHEET_CREATIVE_VOTES);
  const existingVote = readObjects(voteSheet).find(row =>
    row.gameId === gameId &&
    row.questionId === questionId &&
    row.voterPlayerId === playerId &&
    row.phase === 'final' &&
    isCurrentCreativeRoundRow(row, 'votedAt', roundStartedAtMs)
  );
  if (existingVote) {
    throw new Error('匿名全體投票每位學員只能投 1 票。');
  }

  const row = {
    voteId: Utilities.getUuid(),
    gameId,
    questionId,
    voterPlayerId: playerId,
    voterTeamId: player.teamId,
    phase: 'final',
    submissionId,
    votedAt: new Date().toISOString(),
    note: '匿名全體投票。'
  };
  appendObject(voteSheet, row);

  return {
    gameId,
    submissionId,
    finalAlias: submission.finalAlias || '',
    votedAt: row.votedAt
  };
}

function getCreativeFinalPhase(gameId) {
  const questionId = getCurrentCreativeQuestionId(gameId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const rows = readObjects(getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS))
    .filter(row => row.gameId === gameId)
    .filter(row => row.questionId === questionId)
    .filter(row => isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs))
    .filter(row => row.selectedByInstructor === true || String(row.selectedByInstructor).toLowerCase() === 'true');
  if (!rows.length) {
    return { phase: 'final_pending', voteSeconds: CREATIVE_FINAL_VOTE_SECONDS, remainingSeconds: 0 };
  }

  const state = getGameState({ gameId });
  const voteSeconds = CREATIVE_FINAL_VOTE_SECONDS;
  const startedAt = state.creativeFinalVoteStartedAt || rows.reduce((earliest, row) => {
    const time = new Date(row.submittedAt || 0).getTime();
    return Number.isFinite(time) ? Math.min(earliest, time) : earliest;
  }, Date.now());
  const startedAtMs = new Date(startedAt).getTime();
  const endAtMs = startedAtMs + voteSeconds * 1000;
  const nowMs = Date.now();
  if (nowMs < endAtMs) {
    return {
      phase: 'final_vote',
      voteSeconds,
      remainingSeconds: Math.max(0, Math.ceil((endAtMs - nowMs) / 1000)),
      voteStartAt: new Date(startedAtMs).toISOString()
    };
  }
  return {
    phase: 'final_vote_closed',
    voteSeconds,
    remainingSeconds: 0,
    voteStartAt: new Date(startedAtMs).toISOString()
  };
}

function getCreativeVoteResult(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  const questionId = getCurrentCreativeQuestionId(gameId);
  syncFirebaseCreativeDataToSheet(gameId, questionId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const votes = readObjects(getSheetOrThrow(SHEET_CREATIVE_VOTES))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.phase === 'final')
    .filter(row => isCurrentCreativeRoundRow(row, 'votedAt', roundStartedAtMs));
  const voteCounts = {};
  votes.forEach(row => {
    voteCounts[row.submissionId] = Number(voteCounts[row.submissionId] || 0) + 1;
  });
  const rows = readObjects(getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS))
    .filter(row => row.gameId === gameId)
    .filter(row => row.questionId === questionId)
    .filter(row => isCurrentCreativeRoundRow(row, 'submittedAt', roundStartedAtMs))
    .filter(row => row.selectedByInstructor === true || String(row.selectedByInstructor).toLowerCase() === 'true')
    .map(row => ({
      submissionId: row.submissionId,
      teamId: row.teamId,
      finalAlias: row.finalAlias || '',
      content: row.content,
      voteCount: Number(voteCounts[row.submissionId] || 0)
    }))
    .sort((a, b) => Number(b.voteCount || 0) - Number(a.voteCount || 0) ||
      String(a.finalAlias || '').localeCompare(String(b.finalAlias || '')));

  return { gameId, rows, totalVotes: votes.length };
}

function finalizeCompetition(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  syncFirebaseCreativeDataToSheet(gameId, getCurrentCreativeQuestionId(gameId));
  const creativeBonus = applyCreativeFinalWinnerBonus(gameId, payload);
  const scoreboardResult = recalculateScoreboard({ gameId });
  const awards = finalizeAwards({ gameId }, payload);
  const finalizedAt = new Date().toISOString();
  const state = {
    ...getGameState({ gameId }),
    gameId,
    status: 'finalized',
    currentQuestionId: '',
    questionOpenedAt: '',
    updatedAt: finalizedAt
  };
  upsertGameState(state);
  const firebaseSync = publishGameStateToFirebase(state);
  const scoreboard = getScoreboard({ gameId }).rows;
  const scoreboardSync = publishScoreboardSnapshotToFirebase({
    gameId,
    rows: scoreboard,
    questionId: '',
    isTemporary: false,
    source: 'gas_final'
  });

  return {
    gameId,
    finalizedAt,
    creativeBonus,
    scoreboard,
    awards,
    scoreboardResult,
    firebaseSync,
    scoreboardSync
  };
}

function applyCreativeFinalWinnerBonus(gameId, payload) {
  const result = getCreativeVoteResult({ gameId }, payload);
  const winner = (result.rows || []).find(row => Number(row.voteCount || 0) > 0);
  if (!winner) {
    return { applied: false, reason: '尚無創作決選得票。' };
  }

  const existing = readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .find(row => row.gameId === gameId && row.itemType === 'creative_bonus' && row.status === 'used');
  if (existing) {
    return { applied: false, reason: '創作決選加分已套用。', teamId: existing.teamId, effectScore: Number(existing.effectScore || 0) };
  }

  appendObject(getSheetOrThrow(SHEET_ITEM_RECORDS), {
    itemId: Utilities.getUuid(),
    gameId,
    playerId: '',
    teamId: winner.teamId,
    itemType: 'creative_bonus',
    sourceBoxId: '',
    status: 'used',
    createdAt: new Date().toISOString(),
    usedAt: new Date().toISOString(),
    targetQuestionId: '',
    targetTeamId: '',
    effectScore: CREATIVE_FINAL_WIN_SCORE,
    note: '創作題匿名全體投票第一名，戰隊加分。'
  });

  return {
    applied: true,
    teamId: winner.teamId,
    finalAlias: winner.finalAlias || '',
    voteCount: Number(winner.voteCount || 0),
    effectScore: CREATIVE_FINAL_WIN_SCORE
  };
}

function getFinalResults(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  syncFirebasePlayersToSheet(gameId);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const playerId = requireText(data.playerId, 'playerId', 80);
  const player = findPlayer(gameId, playerId);
  const playerRows = getMergedPlayers(gameId)
    .map(row => ({
      playerId: (row.playerIds || [])[0] || '',
      playerIds: row.playerIds || [],
      nickname: row.nickname,
      teamId: row.teamId,
      score: Number(row.score || 0),
      correctCount: Number(row.correctCount || 0)
    }))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String(a.nickname || '').localeCompare(String(b.nickname || '')));
  const playerRankIndex = playerRows.findIndex(row => row.playerId === playerId || (row.playerIds || []).indexOf(playerId) >= 0);
  const scoreboard = getScoreboard({ gameId }).rows;
  const teamRankIndex = scoreboard.findIndex(row => row.teamId === player.teamId);
  const awards = readObjects(getSheetOrThrow(SHEET_AWARDS))
    .filter(row => row.gameId === gameId && row.playerId === playerId)
    .map(row => ({
      awardType: row.awardType,
      rank: row.rank || '',
      nickname: row.nickname || '',
      note: row.note || ''
    }));

  return {
    gameId,
    playerId,
    nickname: player.nickname || '',
    teamId: player.teamId,
    playerScore: playerRankIndex >= 0 ? playerRows[playerRankIndex].score : 0,
    playerRank: playerRankIndex >= 0 ? playerRankIndex + 1 : '',
    playerCount: playerRows.length,
    teamRank: teamRankIndex >= 0 ? teamRankIndex + 1 : '',
    teamScore: teamRankIndex >= 0 ? Number(scoreboard[teamRankIndex].weightedAverageScore || scoreboard[teamRankIndex].finalScore || 0) : 0,
    awards,
    hasAward: awards.length > 0
  };
}

function exportGameReport(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  recalculateScoreboard({ gameId });
  const awards = finalizeAwards({ gameId }, payload);
  const exportedAt = new Date().toISOString();
  const report = SpreadsheetApp.create('疫苗守護戰隊挑戰賽賽後報表_' + gameId + '_' + formatDateForFileName(exportedAt));
  const reportSheets = [
    {
      name: '報表摘要',
      rows: [{
        gameId,
        exportedAt,
        reportVersion: '0.3.9',
        scoreboardRows: readObjects(getSheetOrThrow(SHEET_SCOREBOARD)).filter(row => row.gameId === gameId).length,
        answerRows: readObjects(getSheetOrThrow(SHEET_ANSWERS)).filter(row => row.gameId === gameId).length,
        awardRows: readObjects(getSheetOrThrow(SHEET_AWARDS)).filter(row => row.gameId === gameId).length,
        creativeFinalVotes: getCreativeVoteResult({ gameId }, payload).totalVotes || 0
      }]
    },
    { name: '戰隊排行榜', rows: getScoreboard({ gameId }).rows },
    { name: '個人排行榜', rows: getPlayerReportRows(gameId) },
    { name: '作答紀錄', rows: readReportRows(SHEET_ANSWERS, gameId) },
    { name: '寶箱紀錄', rows: readReportRows(SHEET_TREASURE_BOXES, gameId) },
    { name: '道具紀錄', rows: readReportRows(SHEET_ITEM_RECORDS, gameId) },
    { name: '獎項紀錄', rows: readReportRows(SHEET_AWARDS, gameId) },
    { name: '創作投稿', rows: readCreativeSubmissionReportRows(gameId) },
    { name: '創作投票', rows: readCreativeVoteReportRows(gameId) },
    { name: '創作決選結果', rows: getCreativeVoteResult({ gameId }, payload).rows }
  ];

  reportSheets.forEach((entry, index) => {
    const sheet = index === 0 ? report.getSheets()[0] : report.insertSheet(entry.name);
    sheet.setName(entry.name);
    writeReportRows(sheet, entry.rows);
  });

  return {
    gameId,
    exportedAt,
    spreadsheetId: report.getId(),
    spreadsheetUrl: report.getUrl(),
    sheetCount: reportSheets.length,
    awards
  };
}

function readReportRows(sheetName, gameId) {
  return readObjects(getSheetOrThrow(sheetName))
    .filter(row => row.gameId === gameId);
}

function getPlayerReportRows(gameId) {
  return getMergedPlayers(gameId)
    .map(row => ({
      nickname: row.nickname,
      teamId: row.teamId,
      score: Number(row.score || 0),
      correctCount: Number(row.correctCount || 0),
      answeredCount: Number(row.answeredCount || 0),
      updatedAt: row.updatedAt || ''
    }))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

function readCreativeSubmissionReportRows(gameId) {
  return readReportRows(SHEET_CREATIVE_SUBMISSIONS, gameId)
    .map(row => ({
      submissionId: row.submissionId,
      gameId: row.gameId,
      teamId: row.teamId,
      content: row.content,
      submittedAt: row.submittedAt,
      status: row.status,
      selectedByInstructor: row.selectedByInstructor,
      finalAlias: row.finalAlias,
      note: row.note
    }));
}

function readCreativeVoteReportRows(gameId) {
  return readReportRows(SHEET_CREATIVE_VOTES, gameId)
    .map(row => ({
      voteId: row.voteId,
      gameId: row.gameId,
      voterTeamId: row.voterTeamId,
      phase: row.phase,
      submissionId: row.submissionId,
      votedAt: row.votedAt,
      note: row.note
    }));
}

function writeReportRows(sheet, rows) {
  const safeRows = rows && rows.length ? rows : [{ message: '無資料' }];
  const headers = Array.from(safeRows.reduce((set, row) => {
    Object.keys(row || {}).forEach(key => set.add(key));
    return set;
  }, new Set()));
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const values = safeRows.map(row => headers.map(header => row && row[header] !== undefined ? row[header] : ''));
  if (values.length) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function formatDateForFileName(value) {
  return String(value || new Date().toISOString()).replace(/[-:T.Z]/g, '').slice(0, 14);
}

function sanitizeCreativeContent(content) {
  if (/[A-Z][12]\d{8}/i.test(content)) {
    throw new Error('創作答案不可包含身分證字號格式。');
  }
  return content.replace(/[<>]/g, '');
}

function formatCorrectAnswer(question, correctAnswer) {
  if (!correctAnswer) return '（本題無標準答案）';
  const correctIds = parseAnswer(correctAnswer);
  if (!correctIds.length) return '（本題無標準答案）';

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

function sanitizeClientKey(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80);
}

function normalizePlayerName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getPlayerIdentityKey(player) {
  const normalizedName = normalizePlayerName(player.nickname || '');
  if (normalizedName) return 'name:' + normalizedName;
  return 'client:' + sanitizeClientKey(player.clientKey || '');
}

function findExistingPlayerForJoin(gameId, clientKey, nickname) {
  const normalizedClientKey = sanitizeClientKey(clientKey);
  const normalizedNickname = normalizePlayerName(nickname);
  const players = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId);

  return players.find(row => normalizedClientKey && sanitizeClientKey(row.clientKey || '') === normalizedClientKey) ||
    players.find(row => normalizePlayerName(row.nickname || '') === normalizedNickname) ||
    null;
}

function getMergedPlayers(gameId) {
  const players = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId);
  const groups = {};
  const playerIdToKey = {};

  players.forEach(player => {
    const key = getPlayerIdentityKey(player);
    if (!groups[key]) {
      groups[key] = {
        playerIds: [],
        nickname: player.nickname,
        teamId: player.teamId,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        updatedAt: player.updatedAt || '',
        joinedAt: player.joinedAt || ''
      };
    }
    groups[key].playerIds.push(player.playerId);
    playerIdToKey[player.playerId] = key;
    if (new Date(player.updatedAt || 0).getTime() >= new Date(groups[key].updatedAt || 0).getTime()) {
      groups[key].nickname = player.nickname || groups[key].nickname;
      groups[key].teamId = player.teamId || groups[key].teamId;
      groups[key].updatedAt = player.updatedAt || groups[key].updatedAt;
    }
  });

  readObjects(getSheetOrThrow(SHEET_ANSWERS))
    .filter(row => row.gameId === gameId && row.score !== '')
    .forEach(row => {
      const key = playerIdToKey[row.playerId];
      if (!key || !groups[key]) return;
      groups[key].score += Number(row.score || 0);
      groups[key].correctCount += row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true' ? 1 : 0;
      groups[key].answeredCount += 1;
    });

  return Object.values(groups);
}

function getRelatedPlayerIds(gameId, player) {
  const key = getPlayerIdentityKey(player);
  return getMergedPlayers(gameId)
    .filter(group => {
      const groupKey = group.playerIds.indexOf(player.playerId) >= 0
        ? key
        : '';
      return groupKey === key;
    })
    .flatMap(group => group.playerIds);
}

function isValidTeamId(teamId) {
  const value = String(teamId || '');
  return getActiveTeamIds().indexOf(value) >= 0;
}

function isFreeTeamChoiceEnabled(gameId) {
  const state = getGameState({ gameId });
  return Boolean(state.allowFreeTeamChoice);
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
  const players = getMergedPlayers(gameId);
  const counts = {};
  const teamIds = getActiveTeamIds();

  teamIds.forEach(teamId => {
    counts[teamId] = 0;
  });

  players.forEach(player => {
    if (counts[player.teamId] !== undefined) {
      counts[player.teamId] += 1;
    }
  });

  return teamIds.sort((a, b) => counts[a] - counts[b] || a.localeCompare(b))[0] || 'team_1';
}

function getActiveTeamIds() {
  try {
    const teams = readObjects(getSheetOrThrow(SHEET_TEAMS))
      .filter(row => row.enabled === true || String(row.enabled).toLowerCase() === 'true')
      .map(row => String(row.teamId || ''))
      .filter(Boolean);
    if (teams.length) {
      return teams.sort();
    }
  } catch (error) {
    // Fall back to the default team set when the team sheet is not ready yet.
  }

  const teamIds = [];
  for (let index = 1; index <= DEFAULT_TEAM_COUNT; index += 1) {
    teamIds.push('team_' + index);
  }
  return teamIds;
}

function findPlayer(gameId, playerId) {
  const cached = getCachedPlayer(gameId, playerId);
  if (cached) {
    return cached;
  }

  let player = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .find(row => row.gameId === gameId && row.playerId === playerId);
  if (!player) {
    importFirebasePlayerToSheet(gameId, playerId);
    player = readObjects(getSheetOrThrow(SHEET_PLAYERS))
      .find(row => row.gameId === gameId && row.playerId === playerId);
  }
  if (!player) {
    throw new Error('找不到玩家，請先報到。');
  }
  cachePlayer(player);
  return player;
}

function syncFirebasePlayersToSheet(gameId) {
  const players = getFirebaseJson('players/' + encodeURIComponent(gameId)) || {};
  Object.keys(players).forEach(playerId => {
    importFirebasePlayerToSheet(gameId, playerId, players[playerId]);
  });
}

function importFirebasePlayerToSheet(gameId, playerId, playerData) {
  const data = playerData || getFirebaseJson('players/' + encodeURIComponent(gameId) + '/' + encodeURIComponent(playerId));
  if (!data || !data.playerId) return null;

  const sheet = getSheetOrThrow(SHEET_PLAYERS);
  const existing = readObjects(sheet)
    .find(row => row.gameId === gameId && row.playerId === playerId);
  if (existing) {
    cachePlayer(existing);
    return existing;
  }

  const now = new Date().toISOString();
  const row = {
    playerId,
    clientKey: data.clientKeyHash || data.clientKey || '',
    gameId,
    nickname: data.nickname || '學員',
    teamId: data.teamId || pickLeastLoadedTeam(gameId),
    score: 0,
    correctCount: 0,
    joinedAt: data.checkedInAt || data.joinedAt || now,
    updatedAt: data.updatedAt || now
  };
  appendObject(sheet, row);
  cachePlayer(row);
  ensurePlayerTreasureRewardPool(gameId, playerId);
  return row;
}

function syncFirebaseAllAnswersToSheet(gameId) {
  const byQuestion = getFirebaseJson('answers/' + encodeURIComponent(gameId)) || {};
  Object.keys(byQuestion).forEach(questionId => {
    syncFirebaseAnswersForQuestionToSheet(gameId, questionId, byQuestion[questionId]);
  });
}

function syncFirebaseAnswersForQuestionToSheet(gameId, questionId, answerData) {
  const answers = answerData || getFirebaseJson('answers/' + encodeURIComponent(gameId) + '/' + encodeURIComponent(questionId)) || {};
  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const existingIds = new Set(
    readObjects(answerSheet)
      .filter(row => row.gameId === gameId && row.questionId === questionId)
      .map(row => String(row.answerId || row.gameId + '_' + row.questionId + '_' + row.playerId))
  );
  const state = getGameState({ gameId });
  const fallbackOpenedAt = state.questionOpenedAt || state.updatedAt || new Date().toISOString();

  Object.keys(answers).forEach(playerId => {
    const data = answers[playerId];
    if (!data || data.status !== 'submitted') return;
    const answerId = gameId + '_' + questionId + '_' + playerId;
    if (existingIds.has(answerId)) return;

    const player = importFirebasePlayerToSheet(gameId, playerId) || {
      teamId: data.teamId || ''
    };
    const submittedAt = data.submittedAt || new Date().toISOString();
    const paperOpenedAt = getPaperOpenedAt(gameId, questionId, playerId) ||
      new Date(data.paperOpenedAt || fallbackOpenedAt);
    const openedAt = isNaN(paperOpenedAt.getTime()) ? new Date(submittedAt) : paperOpenedAt;
    const submittedDate = new Date(submittedAt);
    const responseSeconds = Math.max(0, Math.round((submittedDate.getTime() - openedAt.getTime()) / 1000));
    const selectedAnswer = Array.isArray(data.selectedAnswer)
      ? data.selectedAnswer
      : parseAnswer(data.selectedAnswer || data.answer || '');

    appendObject(answerSheet, {
      answerId,
      gameId,
      questionId,
      playerId,
      teamId: data.teamId || player.teamId || '',
      answer: selectedAnswer.join(','),
      paperOpenedAt: openedAt.toISOString(),
      submittedAt: submittedDate.toISOString(),
      responseSeconds,
      isCorrect: '',
      baseScore: '',
      firstCorrectBonus: '',
      itemBonusScore: '',
      score: ''
    });
    existingIds.add(answerId);
  });
}

function syncFirebaseItemUsesForQuestionToSheet(gameId, questionId) {
  const uses = getFirebaseJson('itemUses/' + encodeURIComponent(gameId)) || {};
  const itemSheet = getSheetOrThrow(SHEET_ITEM_RECORDS);
  const itemData = readSheetEntries(itemSheet);
  let changed = false;

  Object.keys(uses).forEach(itemUseId => {
    const data = uses[itemUseId];
    if (!data || data.status !== 'pending') return;

    const itemId = String(data.itemId || itemUseId || '');
    const entry = itemData.entries.find(candidate =>
      candidate.row.gameId === gameId &&
      candidate.row.itemId === itemId &&
      candidate.row.playerId === String(data.playerId || '') &&
      candidate.row.status === 'available'
    );
    if (!entry) return;

    const itemType = String(entry.row.itemType || data.itemType || '');
    const now = data.createdAt || new Date().toISOString();
    const targetTeamId = String(data.targetTeamId || '');

    if (TEAM_SCORE_ITEM_EFFECTS[itemType]) {
      setEntryValue(entry, itemData.headers, 'status', 'used');
      setEntryValue(entry, itemData.headers, 'usedAt', now);
      setEntryValue(entry, itemData.headers, 'targetQuestionId', questionId);
      setEntryValue(entry, itemData.headers, 'targetTeamId', '');
      setEntryValue(entry, itemData.headers, 'effectScore', TEAM_SCORE_ITEM_EFFECTS[itemType]);
      changed = true;
      return;
    }

    if (itemType === 'double') {
      setEntryValue(entry, itemData.headers, 'status', 'armed');
      setEntryValue(entry, itemData.headers, 'usedAt', now);
      setEntryValue(entry, itemData.headers, 'targetQuestionId', questionId);
      setEntryValue(entry, itemData.headers, 'targetTeamId', '');
      setEntryValue(entry, itemData.headers, 'effectScore', '');
      changed = true;
      return;
    }

    if (itemType === 'challenge' && targetTeamId && targetTeamId !== entry.row.teamId && isValidTeamId(targetTeamId)) {
      setEntryValue(entry, itemData.headers, 'status', 'armed');
      setEntryValue(entry, itemData.headers, 'usedAt', now);
      setEntryValue(entry, itemData.headers, 'targetQuestionId', questionId);
      setEntryValue(entry, itemData.headers, 'targetTeamId', targetTeamId);
      setEntryValue(entry, itemData.headers, 'effectScore', '');
      changed = true;
      return;
    }

    if (itemType === 'comeback') {
      setEntryValue(entry, itemData.headers, 'status', 'used');
      setEntryValue(entry, itemData.headers, 'usedAt', now);
      setEntryValue(entry, itemData.headers, 'targetQuestionId', questionId);
      setEntryValue(entry, itemData.headers, 'targetTeamId', '');
      setEntryValue(entry, itemData.headers, 'effectScore', COMEBACK_CARD_NORMAL_SCORE);
      changed = true;
    }
  });

  if (changed) {
    writeSheetValues(itemSheet, itemData.values);
  }
}

function syncFirebaseCreativeDataToSheet(gameId, questionId) {
  const safeQuestionId = String(questionId || '');

  if (safeQuestionId) {
    syncFirebaseCreativeSubmissionsForQuestion(
      gameId,
      safeQuestionId,
      getFirebaseJson('creativeSubmissions/' + encodeURIComponent(gameId) + '/' + encodeURIComponent(safeQuestionId)) || {}
    );
    syncFirebaseCreativeVotesForQuestion(
      gameId,
      safeQuestionId,
      getFirebaseJson('creativeTeamVotes/' + encodeURIComponent(gameId) + '/' + encodeURIComponent(safeQuestionId)) || {},
      'team_primary'
    );
    syncFirebaseCreativeVotesForQuestion(
      gameId,
      safeQuestionId,
      getFirebaseJson('creativeFinalVotes/' + encodeURIComponent(gameId) + '/' + encodeURIComponent(safeQuestionId)) || {},
      'final'
    );
    return;
  }

  const submissionsByQuestion = getFirebaseJson('creativeSubmissions/' + encodeURIComponent(gameId)) || {};
  Object.keys(submissionsByQuestion).forEach(key => {
    syncFirebaseCreativeSubmissionsForQuestion(gameId, key, submissionsByQuestion[key]);
  });

  const teamVotesByQuestion = getFirebaseJson('creativeTeamVotes/' + encodeURIComponent(gameId)) || {};
  Object.keys(teamVotesByQuestion).forEach(key => {
    syncFirebaseCreativeVotesForQuestion(gameId, key, teamVotesByQuestion[key], 'team_primary');
  });

  const finalVotesByQuestion = getFirebaseJson('creativeFinalVotes/' + encodeURIComponent(gameId)) || {};
  Object.keys(finalVotesByQuestion).forEach(key => {
    syncFirebaseCreativeVotesForQuestion(gameId, key, finalVotesByQuestion[key], 'final');
  });
}

function syncFirebaseCreativeSubmissionsForQuestion(gameId, questionId, submissions) {
  const sheet = getSheetOrThrow(SHEET_CREATIVE_SUBMISSIONS);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const existing = readObjects(sheet);
  const existingKeys = new Set(
    existing
      .filter(row => row.gameId === gameId)
      .filter(row => row.questionId === questionId)
      .map(row => String(row.submissionId || '') + '|' + String(row.playerId || ''))
  );

  Object.keys(submissions || {}).forEach(playerId => {
    const data = submissions[playerId];
    if (!data || data.status !== 'submitted') return;
    const submittedAt = data.submittedAt || new Date().toISOString();
    if (!isCurrentCreativeRoundRow({ submittedAt }, 'submittedAt', roundStartedAtMs)) return;
    const submissionId = data.submissionId || questionId + '_' + playerId;
    const key = submissionId + '|' + playerId;
    if (existingKeys.has(key)) return;
    const player = importFirebasePlayerToSheet(gameId, playerId) || {
      teamId: data.teamId || ''
    };
    appendObject(sheet, {
      submissionId,
      gameId,
      questionId,
      playerId,
      teamId: data.teamId || player.teamId || '',
      content: data.isAbandoned ? '' : String(data.content || '').slice(0, 500),
      submittedAt,
      status: data.isAbandoned ? 'abandoned' : 'submitted',
      selectedByInstructor: false,
      finalAlias: '',
      note: data.isAbandoned ? 'Firebase 快速寫入：放棄回答。' : 'Firebase 快速寫入：創作投稿。'
    });
    existingKeys.add(key);
  });
}

function syncFirebaseCreativeVotesForQuestion(gameId, questionId, votes, phase) {
  const sheet = getSheetOrThrow(SHEET_CREATIVE_VOTES);
  const roundStartedAtMs = getCreativeRoundStartedAtMs(gameId, questionId);
  const existingKeys = new Set(
    readObjects(sheet)
      .filter(row => row.gameId === gameId && row.phase === phase)
      .filter(row => row.questionId === questionId)
      .map(row => String(row.voterPlayerId || '') + '|' + String(row.submissionId || ''))
  );

  Object.keys(votes || {}).forEach(playerId => {
    const data = votes[playerId];
    if (!data || data.status !== 'submitted' || !data.submissionId) return;
    const votedAt = data.votedAt || new Date().toISOString();
    if (!isCurrentCreativeRoundRow({ votedAt }, 'votedAt', roundStartedAtMs)) return;
    const key = playerId + '|' + data.submissionId;
    if (existingKeys.has(key)) return;
    const player = importFirebasePlayerToSheet(gameId, playerId) || {
      teamId: data.teamId || ''
    };
    appendObject(sheet, {
      voteId: Utilities.getUuid(),
      gameId,
      questionId,
      voterPlayerId: playerId,
      voterTeamId: data.teamId || player.teamId || '',
      phase,
      submissionId: data.submissionId,
      votedAt,
      note: phase === 'final' ? 'Firebase 快速寫入：全體投票。' : 'Firebase 快速寫入：隊內投票。'
    });
    existingKeys.add(key);
  });
}

function calculateBaseScore(isCorrect, responseSeconds) {
  if (!isCorrect) return 0;
  const bucket = SCORE_BUCKETS.find(row => responseSeconds <= row.maxSeconds);
  return bucket ? bucket.score : 0;
}

function awardTreasureBoxesForCorrectAnswers(gameId, correctAnswers) {
  const answerRows = readObjects(getSheetOrThrow(SHEET_ANSWERS));
  const treasureRows = readObjects(getSheetOrThrow(SHEET_TREASURE_BOXES));
  const itemRows = readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS));
  const sourceKeys = new Set(
    treasureRows
      .filter(row => row.gameId === gameId)
      .map(row => String(row.sourceKey || ''))
      .filter(Boolean)
  );
  const context = {
    answerRows,
    treasureRows,
    itemRows,
    sourceKeys,
    dropRate: getNumberRuleSetting('boxDropRateOnCorrect', TREASURE_DROP_RATE_ON_CORRECT)
  };

  return correctAnswers
    .flatMap(row => awardTreasureBoxesForCorrectAnswer(gameId, row.questionId, row.playerId, row.teamId, context))
    .filter(Boolean);
}

function awardTreasureBoxesForCorrectAnswer(gameId, questionId, playerId, teamId, context) {
  const awardedBoxes = [];
  const dropRate = context && context.dropRate !== undefined
    ? context.dropRate
    : getNumberRuleSetting('boxDropRateOnCorrect', TREASURE_DROP_RATE_ON_CORRECT);
  const randomSourceKey = [gameId, questionId, playerId, 'correct_drop'].join('_');

  if (!hasTreasureSource(gameId, randomSourceKey, context) && Math.random() < dropRate) {
    awardedBoxes.push(createTreasureBoxIfAbsent({
      gameId,
      playerId,
      teamId,
      sourceType: 'correct_drop',
      sourceKey: randomSourceKey,
      note: '每題答對機率取得寶箱。'
    }, context));
  }

  enforceUnopenedTreasureLimit(gameId, playerId);
  return awardedBoxes.filter(Boolean);
}

function createTreasureBoxIfAbsent(data, context) {
  if (hasTreasureSource(data.gameId, data.sourceKey, context)) {
    return null;
  }

  const now = new Date().toISOString();
  const boxId = Utilities.getUuid();
  const itemType = consumePreassignedTreasureReward(data.gameId, data.playerId, boxId) ||
    resolveTreasureRewardType(data.gameId, data.playerId, context);
  const row = {
    boxId,
    gameId: data.gameId,
    playerId: data.playerId,
    teamId: data.teamId,
    sourceType: data.sourceType,
    sourceKey: data.sourceKey,
    status: 'unopened',
    awardedAt: now,
    openedAt: '',
    expiredAt: '',
    itemType,
    note: data.note || ''
  };
  appendObject(getSheetOrThrow(SHEET_TREASURE_BOXES), row);
  if (context && context.sourceKeys) {
    context.sourceKeys.add(data.sourceKey);
  }
  if (context && context.treasureRows) {
    context.treasureRows.push(row);
  }
  return row;
}

function resolveTreasureRewardType(gameId, playerId, context) {
  const drawnItemType = drawTreasureItemType(gameId);
  if (drawnItemType !== 'double') {
    return drawnItemType;
  }
  return hasPlayerEverHadDoubleCard(gameId, playerId, context) ? 'score_5' : 'double';
}

function createItemRecord(data) {
  const itemId = Utilities.getUuid();
  const row = {
    itemId,
    gameId: data.gameId,
    playerId: data.playerId,
    teamId: data.teamId,
    itemType: data.itemType,
    sourceBoxId: data.sourceBoxId,
    status: 'available',
    createdAt: new Date().toISOString(),
    usedAt: '',
    targetQuestionId: '',
    targetTeamId: '',
    effectScore: '',
    note: data.note || ''
  };
  appendObject(getSheetOrThrow(SHEET_ITEM_RECORDS), row);
  return {
    itemId,
    itemType: row.itemType,
    itemLabel: getItemLabel(row.itemType),
    status: row.status,
    sourceBoxId: row.sourceBoxId
  };
}

function preassignTreasureRewardsForPlayers(gameId, players) {
  const targetPlayers = players || readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId);
  targetPlayers.forEach(player => {
    ensurePlayerTreasureRewardPool(gameId, player.playerId);
  });
}

function ensurePlayerTreasureRewardPool(gameId, playerId) {
  if (!gameId || !playerId) return;

  const sheet = getSheetOrThrow(SHEET_TREASURE_REWARD_POOL);
  const headers = getHeaders(sheet);
  const existingRows = readObjects(sheet).filter(row => row.gameId === gameId);
  const playerRows = existingRows.filter(row => row.playerId === playerId);
  const existingSlots = new Set(playerRows.map(row => Number(row.slotIndex || 0)));
  const rowsToAppend = [];
  const now = new Date().toISOString();
  let hasSpecial = existingRows.some(row => row.itemType === 'special');
  let hasDouble = hasPlayerEverHadDoubleCard(gameId, playerId) ||
    playerRows.some(row => row.itemType === 'double');

  for (let slotIndex = 1; slotIndex <= TREASURE_PREASSIGN_SLOTS; slotIndex += 1) {
    if (existingSlots.has(slotIndex)) continue;

    let itemType = drawTreasureItemType(gameId);
    if (itemType === 'special') {
      if (hasSpecial) {
        itemType = 'empty';
      } else {
        hasSpecial = true;
      }
    }
    if (itemType === 'double') {
      if (hasDouble) {
        itemType = 'score_5';
      } else {
        hasDouble = true;
      }
    }

    rowsToAppend.push({
      poolId: [gameId, playerId, slotIndex].join('_'),
      gameId,
      playerId,
      slotIndex,
      itemType,
      status: 'available',
      sourceBoxId: '',
      createdAt: now,
      usedAt: '',
      note: 'preassigned'
    });
  }

  appendObjects(sheet, headers, rowsToAppend);
}

function consumePreassignedTreasureReward(gameId, playerId, sourceBoxId, retried) {
  const sheet = getSheetOrThrow(SHEET_TREASURE_REWARD_POOL);
  const data = readSheetEntries(sheet);
  const entry = data.entries
    .filter(candidate =>
      candidate.row.gameId === gameId &&
      candidate.row.playerId === playerId &&
      candidate.row.status === 'available'
    )
    .sort((a, b) => Number(a.row.slotIndex || 0) - Number(b.row.slotIndex || 0))[0];

  if (!entry) {
    if (retried) {
      return '';
    }
    ensurePlayerTreasureRewardPool(gameId, playerId);
    return consumePreassignedTreasureReward(gameId, playerId, sourceBoxId, true);
  }

  const now = new Date().toISOString();
  setEntryValue(entry, data.headers, 'status', 'used');
  setEntryValue(entry, data.headers, 'sourceBoxId', sourceBoxId);
  setEntryValue(entry, data.headers, 'usedAt', now);
  writeSheetValues(sheet, data.values);
  return String(entry.row.itemType || 'empty');
}

function drawTreasureItemType(gameId) {
  const randomValue = Math.random();
  let cumulativeRate = 0;
  const itemRates = getTreasureItemRates(gameId);

  for (let index = 0; index < itemRates.length; index += 1) {
    const item = itemRates[index];
    cumulativeRate += item.rate;
    if (randomValue <= cumulativeRate) {
      return item.itemType;
    }
  }

  return 'empty';
}

function getTreasureItemRates(gameId) {
  const itemRates = TREASURE_ITEM_RATES.map(item => ({
    ...item,
    rate: getNumberRuleSetting('treasureRate.' + item.itemType, item.rate)
  }));
  if (!gameId) {
    return itemRates;
  }

  const specialItem = itemRates.find(item => item.itemType === 'special');
  const emptyItem = itemRates.find(item => item.itemType === 'empty');
  if (!specialItem || !emptyItem) {
    return itemRates;
  }

  if (isSpecialPrizeClosed(gameId)) {
    emptyItem.rate += Number(specialItem.rate || 0);
    specialItem.rate = 0;
    return itemRates;
  }

  if (getGameProgressRatio(gameId) >= SPECIAL_ITEM_BOOST_PROGRESS) {
    const targetRate = Math.max(SPECIAL_ITEM_BOOSTED_RATE, Number(specialItem.rate || SPECIAL_ITEM_BASE_RATE));
    const delta = targetRate - Number(specialItem.rate || 0);
    specialItem.rate = targetRate;
    emptyItem.rate = Math.max(0, Number(emptyItem.rate || 0) - delta);
  }

  return itemRates;
}

function getItemLabel(itemType) {
  const item = TREASURE_ITEM_RATES.find(row => row.itemType === itemType);
  return item ? item.label : String(itemType || '');
}

function isSpecialPrizeClosed(gameId) {
  const hasLuckyAward = readObjects(getSheetOrThrow(SHEET_AWARDS))
    .some(row => row.gameId === gameId && row.awardType === 'lucky');
  if (hasLuckyAward) {
    return true;
  }

  return readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .some(row => row.gameId === gameId && row.itemType === 'special');
}

function getGameProgressRatio(gameId) {
  const officialQuestionIds = getOfficialQuestionIds();
  if (!officialQuestionIds.length) {
    return 0;
  }

  const state = getGameState({ gameId });
  const openedQuestionIds = parseOpenedQuestionIds(state.openedQuestionIds)
    .filter(questionId => officialQuestionIds.indexOf(questionId) >= 0);
  return openedQuestionIds.length / officialQuestionIds.length;
}

function getItemCreatedAt(itemRow, treasureRows) {
  if (itemRow.createdAt) {
    return itemRow.createdAt;
  }

  const sourceBox = treasureRows.find(row =>
    row.gameId === itemRow.gameId &&
    row.boxId === itemRow.sourceBoxId
  );
  return sourceBox ? sourceBox.openedAt || sourceBox.awardedAt || '' : '';
}

function findOwnedItemEntry(itemRows, gameId, playerId, itemId) {
  const index = itemRows.findIndex(row =>
    row.gameId === gameId &&
    row.playerId === playerId &&
    row.itemId === itemId
  );
  return index >= 0 ? { row: itemRows[index], rowNumber: index + 2 } : null;
}

function useTeamScoreItem(itemSheet, itemHeaders, itemRows, itemEntry, player, data) {
  const itemType = String(itemEntry.row.itemType || '');
  const effectScore = TEAM_SCORE_ITEM_EFFECTS[itemType];
  updateItemUsage(itemSheet, itemHeaders, itemEntry.rowNumber, {
    status: 'used',
    usedAt: new Date().toISOString(),
    targetQuestionId: '',
    targetTeamId: '',
    effectScore,
    note: appendNote(itemEntry.row.note, '加分卡已立即套用為戰隊加成。')
  });
  recalculateScoreboard();
  return buildUseItemResult(player.gameId, player.playerId, player.teamId, itemEntry.row.itemId, itemType, 'used', effectScore);
}

function armQuestionItem(itemSheet, itemHeaders, itemEntry, player, data, itemType) {
  const targetQuestionId = getNextPlayableQuestionId(player.gameId);
  if (!targetQuestionId) {
    throw new Error('已經沒有下一題，無法使用加倍卡。');
  }
  const now = new Date().toISOString();

  updateItemUsage(itemSheet, itemHeaders, itemEntry.rowNumber, {
    status: 'armed',
    usedAt: now,
    targetQuestionId,
    targetTeamId: '',
    effectScore: '',
    note: appendNote(itemEntry.row.note, '已自動指定下一題，等待關題計分時套用。')
  });

  return buildUseItemResult(player.gameId, player.playerId, player.teamId, itemEntry.row.itemId, itemType, 'armed', 0, targetQuestionId);
}

function useComebackItem(itemSheet, itemHeaders, itemRows, itemEntry, player, data) {
  const usedCount = itemRows.filter(row =>
    row.gameId === player.gameId &&
    row.teamId === player.teamId &&
    row.itemType === 'comeback' &&
    row.status === 'used'
  ).length;

  if (usedCount >= COMEBACK_CARD_TEAM_LIMIT) {
    throw new Error('本隊翻身卡已達使用上限。');
  }

  const targetQuestionId = data.targetQuestionId ? String(data.targetQuestionId) : '';
  recalculateScoreboard();
  const scoreboard = getScoreboard({ gameId: player.gameId }).rows;
  const lowestScore = Math.min(...scoreboard.map(row => Number(row.weightedAverageScore || row.totalScore || 0)));
  const teamRow = scoreboard.find(row => row.teamId === player.teamId);
  const teamScore = teamRow ? Number(teamRow.weightedAverageScore || teamRow.totalScore || 0) : 0;
  const effectScore = teamScore === lowestScore ? COMEBACK_CARD_LAST_PLACE_SCORE : COMEBACK_CARD_NORMAL_SCORE;

  updateItemUsage(itemSheet, itemHeaders, itemEntry.rowNumber, {
    status: 'used',
    usedAt: new Date().toISOString(),
    targetQuestionId,
    targetTeamId: '',
    effectScore,
    note: appendNote(itemEntry.row.note, '翻身卡已套用為戰隊加成。')
  });
  recalculateScoreboard();
  return buildUseItemResult(player.gameId, player.playerId, player.teamId, itemEntry.row.itemId, 'comeback', 'used', effectScore, targetQuestionId);
}

function armChallengeItem(itemSheet, itemHeaders, itemEntry, player, data) {
  const targetQuestionId = getNextPlayableQuestionId(player.gameId);
  const targetTeamId = requireText(data.targetTeamId, 'targetTeamId', 80);

  if (!targetQuestionId) {
    throw new Error('已經沒有下一題，無法使用挑戰卡。');
  }
  if (targetTeamId === player.teamId) {
    throw new Error('挑戰卡不可指定自己的戰隊。');
  }
  if (!isValidTeamId(targetTeamId)) {
    throw new Error('指定的挑戰戰隊不存在或未啟用。');
  }

  updateItemUsage(itemSheet, itemHeaders, itemEntry.rowNumber, {
    status: 'armed',
    usedAt: new Date().toISOString(),
    targetQuestionId,
    targetTeamId,
    effectScore: '',
    note: appendNote(itemEntry.row.note, '挑戰卡已指定戰隊並自動套用下一題，等待關題時計算。')
  });

  return buildUseItemResult(player.gameId, player.playerId, player.teamId, itemEntry.row.itemId, 'challenge', 'armed', 0, targetQuestionId, targetTeamId);
}

function getNextPlayableQuestionId(gameId) {
  const officialQuestionIds = getOfficialQuestionIds();
  if (!officialQuestionIds.length) return '';

  const state = getGameState({ gameId });
  const openedQuestionIds = new Set(parseOpenedQuestionIds(state.openedQuestionIds));
  if (state.status === 'question_open' && state.currentQuestionId) {
    openedQuestionIds.add(state.currentQuestionId);
  }

  return officialQuestionIds.find(questionId => !openedQuestionIds.has(questionId)) || '';
}

function buildUseItemResult(gameId, playerId, teamId, itemId, itemType, status, effectScore, targetQuestionId, targetTeamId) {
  return {
    gameId,
    playerId,
    teamId,
    itemId,
    itemType,
    itemLabel: getItemLabel(itemType),
    status,
    effectScore: Number(effectScore || 0),
    targetQuestionId: targetQuestionId || '',
    targetTeamId: targetTeamId || ''
  };
}

function updateItemUsage(sheet, headers, rowNumber, values) {
  Object.keys(values).forEach(key => {
    setCellByHeader(sheet, rowNumber, headers, key, values[key]);
  });
}

function isTeamBonusItem(itemType) {
  return Boolean(TEAM_SCORE_ITEM_EFFECTS[itemType]) ||
    itemType === 'comeback' ||
    itemType === 'challenge' ||
    itemType === 'creative_bonus';
}

function getTeamBonusScores(gameId) {
  const scores = {};
  readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .filter(row => row.gameId === gameId && row.status === 'used' && isTeamBonusItem(row.itemType))
    .forEach(row => {
      if (!scores[row.teamId]) scores[row.teamId] = 0;
      scores[row.teamId] += Number(row.effectScore || 0);
    });
  return scores;
}

function consumeArmedDoubleCard(itemSheet, itemHeaders, itemRows, gameId, playerId, questionId, isCorrect, preItemScore) {
  const index = itemRows.findIndex(row =>
    row.gameId === gameId &&
    row.playerId === playerId &&
    row.itemType === 'double' &&
    row.status === 'armed' &&
    row.targetQuestionId === questionId
  );

  if (index < 0) return 0;

  const item = itemRows[index];
  const effectScore = isCorrect ? Number(preItemScore || 0) : 0;
  updateItemUsage(itemSheet, itemHeaders, index + 2, {
    status: 'used',
    effectScore,
    note: appendNote(item.note, effectScore ? '加倍卡已套用到個人分數。' : '加倍卡已消耗，本題未答對所以未加分。')
  });
  item.status = 'used';
  item.effectScore = effectScore;
  return effectScore;
}

function applyPendingChallengeCards(itemSheet, itemHeaders, itemRows, gameId, questionId) {
  const rates = getQuestionTeamCorrectRates(gameId, questionId);
  let appliedCount = 0;

  itemRows.forEach((item, index) => {
    if (
      item.gameId !== gameId ||
      item.itemType !== 'challenge' ||
      item.status !== 'armed' ||
      item.targetQuestionId !== questionId
    ) {
      return;
    }

    const ownRate = rates[item.teamId] || 0;
    const targetRate = rates[item.targetTeamId] || 0;
    const effectScore = ownRate > targetRate ? CHALLENGE_CARD_WIN_SCORE : CHALLENGE_CARD_FALLBACK_SCORE;
    updateItemUsage(itemSheet, itemHeaders, index + 2, {
      status: 'used',
      effectScore,
      note: appendNote(item.note, '挑戰卡已依本題答對率結算。')
    });
    item.status = 'used';
    item.effectScore = effectScore;
    appliedCount += 1;
  });

  return appliedCount;
}

function getQuestionTeamCorrectRates(gameId, questionId) {
  const stats = {};

  getActiveTeamIds().forEach(teamId => {
    stats[teamId] = { total: 0, correct: 0 };
  });
  getMergedPlayers(gameId).forEach(player => {
    if (!stats[player.teamId]) {
      stats[player.teamId] = { total: 0, correct: 0 };
    }
    stats[player.teamId].total += 1;
  });
  readObjects(getSheetOrThrow(SHEET_ANSWERS))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.score !== '')
    .forEach(row => {
      if (!stats[row.teamId]) {
        stats[row.teamId] = { total: 0, correct: 0 };
      }
      if (row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true') {
        stats[row.teamId].correct += 1;
      }
    });

  const rates = {};
  Object.keys(stats).forEach(teamId => {
    rates[teamId] = stats[teamId].total ? stats[teamId].correct / stats[teamId].total : 0;
  });
  return rates;
}

function getClosedOfficialQuestionCount(gameId) {
  const officialQuestionIds = new Set(getOfficialQuestionIds());
  if (!officialQuestionIds.size) return 0;

  const state = getGameState({ gameId });
  const openedQuestionIds = parseOpenedQuestionIds(state.openedQuestionIds)
    .filter(questionId => officialQuestionIds.has(questionId));
  if (state.status === 'question_open' && state.currentQuestionId) {
    return openedQuestionIds.filter(questionId => questionId !== state.currentQuestionId).length;
  }
  return openedQuestionIds.length;
}

function getTeamCorrectAnswerCounts(gameId) {
  const officialQuestionIds = new Set(getOfficialQuestionIds());
  const counts = {};
  readObjects(getSheetOrThrow(SHEET_ANSWERS))
    .filter(row => row.gameId === gameId)
    .filter(row => officialQuestionIds.has(row.questionId))
    .filter(row => row.score !== '')
    .filter(row => row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true')
    .forEach(row => {
      if (!counts[row.teamId]) counts[row.teamId] = 0;
      counts[row.teamId] += 1;
    });
  return counts;
}

function getCurrentQuestionCorrectRate(gameId, teamId) {
  const state = getGameState({ gameId });
  const questionId = state.currentQuestionId || '';
  if (!questionId || state.status !== 'question_closed') {
    return 0;
  }
  const rates = getQuestionTeamCorrectRates(gameId, questionId);
  return Number(rates[teamId] || 0);
}

function hasTreasureSource(gameId, sourceKey, context) {
  if (context && context.sourceKeys) {
    return context.sourceKeys.has(sourceKey);
  }

  return readObjects(getSheetOrThrow(SHEET_TREASURE_BOXES))
    .some(row => row.gameId === gameId && row.sourceKey === sourceKey);
}

function enforceUnopenedTreasureLimit(gameId, playerId) {
  const maxBoxes = getNumberRuleSetting('maxBoxesPerPlayer', MAX_UNOPENED_TREASURE_BOXES);
  const sheet = getSheetOrThrow(SHEET_TREASURE_BOXES);
  const rows = readObjects(sheet);
  const headers = getHeaders(sheet);
  const unopenedRows = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(entry => entry.row.gameId === gameId && entry.row.playerId === playerId && entry.row.status === 'unopened')
    .sort((a, b) => new Date(a.row.awardedAt || 0).getTime() - new Date(b.row.awardedAt || 0).getTime());
  const now = new Date().toISOString();

  while (unopenedRows.length > maxBoxes) {
    const entry = unopenedRows.shift();
    setCellByHeader(sheet, entry.rowNumber, headers, 'status', 'discarded');
    setCellByHeader(sheet, entry.rowNumber, headers, 'expiredAt', now);
    setCellByHeader(sheet, entry.rowNumber, headers, 'note', appendNote(entry.row.note, '超過未開啟寶箱上限，自動丟棄。'));
  }
}

function countPlayerCorrectAnswers(gameId, playerId, context) {
  const rows = context && context.answerRows
    ? context.answerRows
    : readObjects(getSheetOrThrow(SHEET_ANSWERS));
  return rows
    .filter(row => row.gameId === gameId && row.playerId === playerId)
    .filter(row => row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true')
    .length;
}

function countConsecutiveCorrectAnswers(gameId, playerId, context) {
  const rows = context && context.answerRows
    ? context.answerRows
    : readObjects(getSheetOrThrow(SHEET_ANSWERS));
  const answers = rows
    .filter(row => row.gameId === gameId && row.playerId === playerId && row.score !== '')
    .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
  let count = 0;

  for (let index = 0; index < answers.length; index += 1) {
    const row = answers[index];
    if (!(row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true')) {
      break;
    }
    count += 1;
  }

  return count;
}

function getNumberRuleSetting(key, fallbackValue) {
  try {
    const row = readObjects(getSheetOrThrow(SHEET_RULE_SETTINGS))
      .find(item => item.key === key);
    const value = Number(row && row.value);
    return Number.isFinite(value) ? value : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function appendNote(currentNote, nextNote) {
  return [currentNote, nextNote].filter(Boolean).join('；');
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

function applyPlayerScoreDeltas(gameId, deltas) {
  const playerIds = Object.keys(deltas || {});
  if (!playerIds.length) return;

  const sheet = getSheetOrThrow(SHEET_PLAYERS);
  const data = readSheetEntries(sheet);
  const playerIdSet = new Set(playerIds);
  const now = new Date().toISOString();
  let changed = false;

  data.entries.forEach(entry => {
    const playerId = String(entry.row.playerId || '');
    if (entry.row.gameId !== gameId || !playerIdSet.has(playerId)) return;

    const delta = deltas[playerId] || {};
    const currentScore = Number(entry.row.score || 0);
    const currentCorrect = Number(entry.row.correctCount || 0);
    setEntryValue(entry, data.headers, 'score', currentScore + Number(delta.score || 0));
    setEntryValue(entry, data.headers, 'correctCount', currentCorrect + Number(delta.correct || 0));
    setEntryValue(entry, data.headers, 'updatedAt', now);
    changed = true;
  });

  if (changed) {
    writeSheetValues(sheet, data.values);
  }
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
        openedQuestionIds: state.openedQuestionIds || '',
        allowFreeTeamChoice: Boolean(state.allowFreeTeamChoice),
        creativeFinalVoteStartedAt: state.creativeFinalVoteStartedAt || '',
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

function publishScoreboardSnapshotToFirebase(options) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (!databaseUrl) {
    return {
      skipped: true,
      reason: '未設定 Firebase Realtime Database URL。'
    };
  }

  const gameId = String(options.gameId || getGameId());
  const now = new Date().toISOString();
  const snapshot = {
    gameId,
    updatedAt: now,
    questionId: String(options.questionId || ''),
    isTemporary: options.isTemporary !== false,
    source: String(options.source || 'gas_scoreboard_snapshot'),
    teams: (options.rows || []).map(row => ({
      gameId,
      teamId: String(row.teamId || ''),
      playerCount: Number(row.playerCount || 0),
      totalScore: Number(row.totalScore || 0),
      averageScore: Number(row.averageScore || 0),
      teamBonusScore: Number(row.teamBonusScore || 0),
      finalScore: Number(row.finalScore || 0),
      weightedAverageScore: Number(row.weightedAverageScore || row.finalScore || row.totalScore || 0),
      correctRate: Number(row.correctRate || 0),
      currentQuestionCorrectRate: Number(row.currentQuestionCorrectRate || 0),
      updatedAt: row.updatedAt || now
    }))
  };

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const url = baseUrl + '/publicScoreboards/' + encodeURIComponent(gameId) + '.json';
  const accessToken = getFirebaseAccessToken();

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'put',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + accessToken
      },
      muteHttpExceptions: true,
      payload: JSON.stringify(snapshot)
    });
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      Logger.log('Firebase publicScoreboards 同步失敗，HTTP ' + statusCode + '：' + response.getContentText());
      return {
        skipped: true,
        reason: 'Firebase publicScoreboards 同步失敗，HTTP ' + statusCode,
        detail: response.getContentText().slice(0, 300)
      };
    }
  } catch (error) {
    Logger.log('Firebase publicScoreboards 同步失敗：' + String(error && error.message ? error.message : error));
    return { skipped: true, reason: 'Firebase publicScoreboards 同步失敗。' };
  }

  return {
    skipped: false,
    teamCount: snapshot.teams.length,
    updatedAt: now
  };
}

function getFirebaseJson(path) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (!databaseUrl) return null;

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const safePath = String(path || '').replace(/^\/+/, '');
  const url = baseUrl + '/' + safePath + '.json';

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + getFirebaseAccessToken()
      },
      muteHttpExceptions: true
    });
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      Logger.log('Firebase 讀取失敗，HTTP ' + statusCode + '：' + response.getContentText());
      return null;
    }
    const text = response.getContentText();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    Logger.log('Firebase 讀取失敗：' + String(error && error.message ? error.message : error));
    return null;
  }
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
    timeLimitSec: String(q.type || '') === 'creative'
      ? CREATIVE_ANSWER_SECONDS
      : Number(q.timeLimitSec || 60),
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

function seedRuleSettingsIfEmpty(sheet) {
  if (sheet.getLastRow() > 1) return;

  [
    ['maxBoxesPerPlayer', MAX_UNOPENED_TREASURE_BOXES, '每位學員最多保留的未開啟寶箱數。'],
    ['boxDropRateOnCorrect', TREASURE_DROP_RATE_ON_CORRECT, '每題答對後取得寶箱的機率，0.3 代表 30%。'],
    ['treasureRate.score_1', 0.25, '小加分卡：戰隊 +1 的開箱機率。'],
    ['treasureRate.score_3', 0.2, '中加分卡：戰隊 +3 的開箱機率。'],
    ['treasureRate.score_5', 0.12, '大加分卡：戰隊 +5 的開箱機率。'],
    ['treasureRate.score_10', 0.05, '超級加分卡：戰隊 +10 的開箱機率。'],
    ['treasureRate.double', 0.1, '加倍卡的開箱機率。'],
    ['treasureRate.comeback', 0.08, '翻身卡的開箱機率。'],
    ['treasureRate.challenge', 0.1, '挑戰卡的開箱機率。'],
    ['treasureRate.special', 0.03, '特殊道具的開箱機率。'],
    ['treasureRate.empty', 0.07, '鼓勵語或空寶箱的開箱機率。'],
    ['creativeAnswerSeconds', CREATIVE_ANSWER_SECONDS, '創作題作答秒數。'],
    ['teamVoteSeconds', CREATIVE_TEAM_VOTE_SECONDS, '創作題隊內初選秒數。'],
    ['finalVoteSeconds', CREATIVE_FINAL_VOTE_SECONDS, '創作題匿名全體投票秒數。'],
    ['luckyPrizeLimit', 1, '幸運獎名額，供第 3 版後續功能使用。'],
    ['perfectPrizeLimit', 3, '全對獎名額，供第 3 版後續功能使用。']
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
    '第 3 版預設題 1，可由題庫工作表修改或刪除。'
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
    '第 3 版預設題 2，可由題庫工作表修改或刪除。'
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
    '第 3 版預設題 3，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q004',
    4,
    'single',
    'demo',
    '開封多劑量疫苗後，最重要的管理原則為何？',
    '依規定標示開封時間並在效期內使用',
    '只要外觀看起來正常即可繼續使用',
    '剩餘疫苗可跨日任意保存',
    '不用紀錄開封時間',
    '',
    'A',
    '多劑量疫苗開封後應依規定標示、保存與使用，避免效期與污染風險。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 3 版預設題 4，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q005',
    5,
    'single',
    'demo',
    '民眾接種前表示曾有嚴重過敏反應時，現場應優先怎麼做？',
    '暫停接種並依規定評估禁忌與注意事項',
    '先接種再觀察',
    '請民眾自行判斷是否接種',
    '只要排隊人多就先完成接種',
    '',
    'A',
    '接種前需確認禁忌與注意事項，必要時暫停並由專業人員評估。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 3 版預設題 5，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q006',
    6,
    'single',
    'demo',
    '疫苗接種紀錄應於何時完成？',
    '接種後即時或依規定儘速完成登錄',
    '活動結束一週後再統一補登',
    '只要紙本有寫就不需登錄',
    '民眾有要求才登錄',
    '',
    'A',
    '接種紀錄需即時且正確，作為後續查核、追蹤與安全管理依據。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 3 版預設題 6，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q007',
    7,
    'single',
    'demo',
    '接種後發生疑似不良事件時，下列何者正確？',
    '依規定通報並保存必要紀錄',
    '只要症狀輕微就完全不用紀錄',
    '由民眾自行上網查詢即可',
    '只需口頭告知主管',
    '',
    'A',
    '疑似不良事件需依規定通報與紀錄，確保後續評估與追蹤。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 3 版預設題 7，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q008',
    8,
    'single',
    'demo',
    '辦理校園或社區接種前，最需要先確認哪一項？',
    '對象名冊、疫苗數量、人力與冷鏈安排',
    '只確認場地是否漂亮',
    '先公告再決定疫苗數量',
    '不需安排動線',
    '',
    'A',
    '接種活動前應確認名冊、疫苗、人力、冷鏈與動線，降低現場風險。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 3 版預設題 8，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q009',
    9,
    'single',
    'demo',
    '疫苗批號紀錄的主要用途為何？',
    '利於追蹤、查核與異常事件處理',
    '只是讓表格看起來完整',
    '可省略不填',
    '只在庫存不足時才需要',
    '',
    'A',
    '批號是疫苗追蹤與品質管理的重要欄位，應確實紀錄。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 3 版預設題 9，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q010',
    10,
    'single',
    'demo',
    '接種現場留觀的主要目的為何？',
    '即時發現並處理急性不適或過敏反應',
    '讓民眾休息聊天',
    '方便發宣導品',
    '延長活動時間',
    '',
    'A',
    '留觀可協助即時發現急性不適並啟動處置流程。',
    60,
    'timeBucket',
    false,
    false,
    true,
    '第 3 版預設題 10，可由題庫工作表修改或刪除。'
  ],
  [
    'demo_q011',
    11,
    'creative',
    'demo',
    '請用 80 字內寫出一則給接種現場同仁的安全提醒標語。',
    '',
    '',
    '',
    '',
    '',
    '',
    '創作題由學員提交文字，經隊內初選與講師審核後進行匿名全體投票。',
    180,
    'creative',
    false,
    true,
    true,
    '第 3 版預設創作題，可由題庫工作表修改或刪除。'
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
  const normalizedState = normalizeGameState(state, state.gameId);
  getRuntimeCache().put(
    getGameStateCacheKey(normalizedState.gameId),
    JSON.stringify(normalizedState),
    CACHE_TTL_SECONDS
  );
}

function normalizeGameState(state, fallbackGameId) {
  const result = {
    gameId: String(state?.gameId || fallbackGameId || getGameId()),
    status: state?.status || 'draft',
    currentQuestionId: state?.currentQuestionId || '',
    questionOpenedAt: state?.questionOpenedAt || '',
    openedQuestionIds: state?.openedQuestionIds || '',
    creativeFinalVoteStartedAt: state?.creativeFinalVoteStartedAt || '',
    allowFreeTeamChoice: state?.allowFreeTeamChoice === true || state?.allowFreeTeamChoice === 'true'
  };

  return {
    ...state,
    ...result
  };
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

function readSheetEntries(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const entries = values
    .slice(1)
    .map((valuesRow, index) => ({
      row: objectFromRow(headers, valuesRow),
      values: valuesRow,
      rowNumber: index + 2
    }))
    .filter(entry => entry.values.some(cell => cell !== ''));
  return { headers, values, entries };
}

function setEntryValue(entry, headers, headerName, value) {
  const columnIndex = headers.indexOf(headerName);
  if (columnIndex < 0) {
    throw new Error('?曆??唳?雿?' + headerName);
  }
  entry.values[columnIndex] = value;
  entry.row[headerName] = value;
}

function writeSheetValues(sheet, values) {
  if (!values.length || !values[0].length) return;
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
}

function appendObject(sheet, obj) {
  const headers = getHeaders(sheet);
  sheet.appendRow(headers.map(header => obj[header] === undefined ? '' : obj[header]));
}

function appendObjects(sheet, headers, rows) {
  if (!rows || !rows.length) return;
  const values = rows.map(row => headers.map(header => row[header] === undefined ? '' : row[header]));
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
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

function ensureMissingAnswersForQuestion(gameId, questionId) {
  const question = readQuestionRows().find(row => row.questionId === questionId);
  if (question && String(question.type || '') === 'creative') return;

  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const headers = getHeaders(answerSheet);
  const existingKeys = new Set(
    readObjects(answerSheet)
      .filter(row => row.gameId === gameId && row.questionId === questionId)
      .map(row => String(row.playerId || ''))
  );
  const players = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId);
  const state = getGameState({ gameId });
  const now = new Date().toISOString();
  const openedAt = state.questionOpenedAt || now;
  const rows = [];

  players.forEach(player => {
    if (!player.playerId || existingKeys.has(player.playerId)) return;
    rows.push({
      answerId: [gameId, questionId, player.playerId].join('_'),
      gameId,
      questionId,
      playerId: player.playerId,
      teamId: player.teamId,
      answer: '',
      paperOpenedAt: openedAt,
      submittedAt: now,
      responseSeconds: 999,
      isCorrect: '',
      baseScore: '',
      firstCorrectBonus: '',
      itemBonusScore: '',
      score: ''
    });
  });

  appendObjects(answerSheet, headers, rows);
}

function recalculateScoreboard(data) {
  ensureGameSheetsReady();

  const gameId = data && data.gameId ? String(data.gameId) : getGameId();
  const players = getMergedPlayers(gameId);
  const playerCountByTeam = {};
  const answeredPlayerCountByTeam = {};
  const rawTotalScoreByTeam = {};
  const questionStatsByTeam = {};
  const officialQuestionIds = new Set(getOfficialQuestionIds());
  const teamBonusScores = getTeamBonusScores(gameId);
  const state = getGameState({ gameId });
  const currentQuestionRates = state.status === 'question_closed' && state.currentQuestionId
    ? getQuestionTeamCorrectRates(gameId, state.currentQuestionId)
    : {};

  getActiveTeamIds().forEach(teamId => {
    playerCountByTeam[teamId] = 0;
    answeredPlayerCountByTeam[teamId] = 0;
    rawTotalScoreByTeam[teamId] = 0;
    questionStatsByTeam[teamId] = {};
  });

  players.forEach(player => {
    if (!playerCountByTeam[player.teamId]) playerCountByTeam[player.teamId] = 0;
    if (!answeredPlayerCountByTeam[player.teamId]) answeredPlayerCountByTeam[player.teamId] = 0;
    playerCountByTeam[player.teamId] += 1;
    if (Number(player.answeredCount || 0) > 0) {
      answeredPlayerCountByTeam[player.teamId] += 1;
    }
  });

  readObjects(getSheetOrThrow(SHEET_ANSWERS))
    .filter(row => row.gameId === gameId && row.score !== '')
    .filter(row => officialQuestionIds.has(row.questionId))
    .forEach(row => {
      const teamId = row.teamId || '';
      const questionId = row.questionId || '';
      if (!questionStatsByTeam[teamId]) questionStatsByTeam[teamId] = {};
      if (!questionStatsByTeam[teamId][questionId]) {
        questionStatsByTeam[teamId][questionId] = { totalScore: 0, answerCount: 0, correctCount: 0 };
      }
      questionStatsByTeam[teamId][questionId].totalScore += Number(row.score || 0);
      questionStatsByTeam[teamId][questionId].answerCount += 1;
      rawTotalScoreByTeam[teamId] = Number(rawTotalScoreByTeam[teamId] || 0) + Number(row.score || 0);
      if (row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true') {
        questionStatsByTeam[teamId][questionId].correctCount += 1;
      }
    });

  const scoreboardSheet = getSheetOrThrow(SHEET_SCOREBOARD);
  clearDataRows(scoreboardSheet);
  const now = new Date().toISOString();

  Object.keys(playerCountByTeam).sort().forEach(teamId => {
    const questionStats = questionStatsByTeam[teamId] || {};
    const questionIds = Object.keys(questionStats);
    const averageScore = questionIds.reduce((total, questionId) => {
      const stat = questionStats[questionId];
      return total + (stat.answerCount ? stat.totalScore / stat.answerCount : 0);
    }, 0);
    const correctAnswerCount = questionIds.reduce((total, questionId) => total + Number(questionStats[questionId].correctCount || 0), 0);
    const answerDenominator = questionIds.reduce((total, questionId) => total + Number(questionStats[questionId].answerCount || 0), 0);
    const correctRate = answerDenominator ? correctAnswerCount / answerDenominator : 0;
    const teamBonusScore = Number(teamBonusScores[teamId] || 0);

    appendObject(scoreboardSheet, {
      gameId,
      teamId,
      playerCount: Number(playerCountByTeam[teamId] || 0),
      effectivePlayerCount: Number(answeredPlayerCountByTeam[teamId] || 0),
      closedQuestionCount: questionIds.length,
      correctAnswerCount,
      correctRate,
      currentQuestionCorrectRate: Number(currentQuestionRates[teamId] || 0),
      totalScore: Number(rawTotalScoreByTeam[teamId] || 0),
      averageScore,
      teamBonusScore,
      finalScore: averageScore + teamBonusScore,
      weightedAverageScore: averageScore + teamBonusScore,
      updatedAt: now
    });
  });

  return { gameId, teamCount: Object.keys(playerCountByTeam).length, updatedAt: now };
}

function openTreasureBox(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const boxId = requireText(data.boxId, 'boxId', 120);
  const player = findPlayer(gameId, playerId);
  const boxSheet = getSheetOrThrow(SHEET_TREASURE_BOXES);
  const rows = readObjects(boxSheet);
  const headers = getHeaders(boxSheet);
  const index = rows.findIndex(row => row.gameId === gameId && row.playerId === playerId && row.boxId === boxId);

  if (index < 0) {
    throw new Error('找不到這個寶箱。');
  }

  const box = rows[index];
  if (box.status !== 'unopened') {
    throw new Error('這個寶箱已經開啟或不可使用。');
  }

  const itemType = box.itemType || resolveTreasureRewardType(gameId, playerId);
  const now = new Date().toISOString();
  const rowNumber = index + 2;

  setCellByHeader(boxSheet, rowNumber, headers, 'status', 'opened');
  setCellByHeader(boxSheet, rowNumber, headers, 'openedAt', now);
  setCellByHeader(boxSheet, rowNumber, headers, 'itemType', itemType);
  setCellByHeader(boxSheet, rowNumber, headers, 'note', appendNote(box.note, 'opened preselected treasure'));

  const item = itemType === 'empty'
    ? null
    : createItemRecord({
      gameId,
      playerId,
      teamId: player.teamId,
      itemType,
      sourceBoxId: boxId,
      note: 'created from opened treasure'
    });

  return {
    gameId,
    playerId,
    boxId,
    openedAt: now,
    itemType,
    itemLabel: getItemLabel(itemType),
    message: itemType === 'empty' ? pickEmptyTreasureMessage(boxId) : '',
    item
  };
}

function hasPlayerEverHadDoubleCard(gameId, playerId, context) {
  const itemRows = context && context.itemRows
    ? context.itemRows
    : readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS));
  const treasureRows = context && context.treasureRows
    ? context.treasureRows
    : readObjects(getSheetOrThrow(SHEET_TREASURE_BOXES));
  return itemRows.some(row => row.gameId === gameId && row.playerId === playerId && row.itemType === 'double') ||
    treasureRows.some(row => row.gameId === gameId && row.playerId === playerId && row.itemType === 'double');
}

function buildLuckyAward(gameId, awardedAt) {
  const treasureRows = readObjects(getSheetOrThrow(SHEET_TREASURE_BOXES));
  const specialItem = readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .filter(row => row.gameId === gameId && row.itemType === 'special')
    .map(row => ({
      row,
      createdAt: getItemCreatedAt(row, treasureRows)
    }))
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())[0];

  if (specialItem) {
    const player = findPlayer(gameId, specialItem.row.playerId);
    return buildAwardRow({
      gameId,
      awardType: 'lucky',
      playerId: specialItem.row.playerId,
      teamId: specialItem.row.teamId,
      nickname: player.nickname || '',
      rank: 1,
      score: '',
      completedAt: specialItem.createdAt || awardedAt,
      sourceItemId: specialItem.row.itemId || '',
      awardedAt,
      note: 'special item opened before finalization'
    });
  }

  const players = readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId);
  if (!players.length) return null;

  const selected = players[Math.floor(Math.random() * players.length)];
  return buildAwardRow({
    gameId,
    awardType: 'lucky',
    playerId: selected.playerId,
    teamId: selected.teamId,
    nickname: selected.nickname || '',
    rank: 1,
    score: '',
    completedAt: awardedAt,
    sourceItemId: '',
    awardedAt,
    note: 'final random lucky award'
  });
}

function getQuestionTeamCorrectRates(gameId, questionId) {
  const stats = {};

  getActiveTeamIds().forEach(teamId => {
    stats[teamId] = { total: 0, correct: 0 };
  });

  readObjects(getSheetOrThrow(SHEET_ANSWERS))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.score !== '')
    .forEach(row => {
      const teamId = row.teamId || '';
      if (!stats[teamId]) {
        stats[teamId] = { total: 0, correct: 0 };
      }
      stats[teamId].total += 1;
      if (row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true') {
        stats[teamId].correct += 1;
      }
    });

  const rates = {};
  Object.keys(stats).forEach(teamId => {
    rates[teamId] = stats[teamId].total ? stats[teamId].correct / stats[teamId].total : 0;
  });
  return rates;
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

  const currentState = getGameState({ gameId });
  const openedQuestionIds = currentState.openedQuestionIds || formatOpenedQuestionIds([questionId]);
  const now = new Date().toISOString();
  const answerReveal = buildClosedQuestionAnswerReveal(question);
  const nextState = {
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now,
    openedQuestionIds,
    allowFreeTeamChoice: currentState.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: currentState.creativeFinalVoteStartedAt || '',
    answerReveal
  };

  upsertGameState(nextState);
  const firebaseSync = publishGameStateToFirebase(nextState);
  const scoringJob = queueCloseScoreJob(gameId, questionId);

  return {
    gameId,
    questionId,
    status: 'question_closed',
    scoringQueued: !scoringJob.skipped,
    scoringJob,
    submittedCount: 0,
    scoredCount: 0,
    correctAnswer: question.correctAnswer || '',
    correctAnswerText: answerReveal.correctAnswerText,
    explanation: answerReveal.explanation,
    scoreboard: [],
    firebaseSync
  };
}

function buildClosedQuestionAnswerReveal(question) {
  const correctAnswers = parseAnswer(question.correctAnswer);
  return {
    questionId: question.questionId || '',
    correctAnswers,
    correctAnswerText: formatCorrectAnswer(question, question.correctAnswer || ''),
    explanation: question.explanation || '',
    revealedAt: new Date().toISOString()
  };
}

function queueCloseScoreJob(gameId, questionId) {
  return {
    skipped: false,
    mode: 'instructor_follow_up',
    gameId,
    questionId
  };
}

function scoreClosedQuestion(data, payload) {
  requireAdmin(payload);
  return scoreClosedQuestionNow(data);
}

function scoreClosedQuestionNow(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  syncFirebasePlayersToSheet(gameId);
  syncFirebaseAnswersForQuestionToSheet(gameId, questionId);
  syncFirebaseItemUsesForQuestionToSheet(gameId, questionId);
  const question = readQuestionRows().find(row => row.questionId === questionId);

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  ensureMissingAnswersForQuestion(gameId, questionId);
  const correctAnswer = parseAnswer(question.correctAnswer).sort().join(',');
  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const answerData = readSheetEntries(answerSheet);
  const answers = answerData.entries.map(entry => entry.row);
  const itemSheet = getSheetOrThrow(SHEET_ITEM_RECORDS);
  const itemRows = readObjects(itemSheet);
  const itemHeaders = getHeaders(itemSheet);
  const firstCorrectPlayerId = getFirstCorrectPlayerId(answers, gameId, questionId, correctAnswer);
  let scoredCount = 0;
  let submittedCount = 0;
  let treasureAwardedCount = 0;
  const newlyCorrectAnswers = [];
  const playerScoreDeltas = {};
  let answerRowsChanged = false;

  answerData.entries.forEach(entry => {
    const row = entry.row;
    if (row.gameId !== gameId || row.questionId !== questionId) return;
    submittedCount += 1;
    if (row.score !== '') return;

    const userAnswer = parseAnswer(row.answer).sort().join(',');
    const isCorrect = userAnswer === correctAnswer;
    const baseScore = calculateBaseScore(isCorrect, Number(row.responseSeconds || 999));
    const firstCorrectBonus = isCorrect && row.playerId === firstCorrectPlayerId ? FIRST_CORRECT_BONUS : 0;
    const preItemScore = baseScore + firstCorrectBonus;
    const itemBonusScore = consumeArmedDoubleCard(itemSheet, itemHeaders, itemRows, gameId, row.playerId, questionId, isCorrect, preItemScore);
    const score = preItemScore + itemBonusScore;

    setEntryValue(entry, answerData.headers, 'isCorrect', isCorrect);
    setEntryValue(entry, answerData.headers, 'baseScore', baseScore);
    setEntryValue(entry, answerData.headers, 'firstCorrectBonus', firstCorrectBonus);
    setEntryValue(entry, answerData.headers, 'itemBonusScore', itemBonusScore);
    setEntryValue(entry, answerData.headers, 'score', score);
    answerRowsChanged = true;
    if (!playerScoreDeltas[row.playerId]) {
      playerScoreDeltas[row.playerId] = { score: 0, correct: 0 };
    }
    playerScoreDeltas[row.playerId].score += Number(score || 0);
    playerScoreDeltas[row.playerId].correct += isCorrect ? 1 : 0;
    if (isCorrect) {
      newlyCorrectAnswers.push({
        questionId,
        playerId: row.playerId,
        teamId: row.teamId
      });
    }
    scoredCount += 1;
  });

  if (answerRowsChanged) {
    writeSheetValues(answerSheet, answerData.values);
  }
  applyPlayerScoreDeltas(gameId, playerScoreDeltas);

  if (newlyCorrectAnswers.length) {
    treasureAwardedCount = awardTreasureBoxesForCorrectAnswers(gameId, newlyCorrectAnswers).length;
  }
  const challengeAppliedCount = applyPendingChallengeCards(itemSheet, itemHeaders, itemRows, gameId, questionId);

  const currentState = getGameState({ gameId });
  const openedQuestionIds = currentState.openedQuestionIds || formatOpenedQuestionIds([questionId]);
  const now = new Date().toISOString();
  const answerReveal = buildClosedQuestionAnswerReveal(question);
  const nextState = {
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    updatedAt: now,
    openedQuestionIds,
    allowFreeTeamChoice: currentState.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: currentState.creativeFinalVoteStartedAt || '',
    answerReveal
  };
  upsertGameState(nextState);
  const firebaseSync = publishGameStateToFirebase(nextState);

  recalculateScoreboard();
  const scoreboard = getScoreboard({ gameId }).rows;
  const scoreboardSync = publishScoreboardSnapshotToFirebase({
    gameId,
    rows: scoreboard,
    questionId,
    source: 'instructor_close_question'
  });

  return {
    gameId,
    questionId,
    submittedCount,
    scoredCount,
    treasureAwardedCount,
    challengeAppliedCount,
    correctAnswer: question.correctAnswer,
    correctAnswerText: answerReveal.correctAnswerText,
    explanation: answerReveal.explanation,
    scoreboard,
    firebaseSync,
    scoreboardSync
  };
}

function publishGameStateToFirebase(state) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (!databaseUrl) {
    return {
      skipped: true,
      reason: 'Firebase Realtime Database URL is missing.'
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
        openedQuestionIds: state.openedQuestionIds || '',
        allowFreeTeamChoice: Boolean(state.allowFreeTeamChoice),
        creativeFinalVoteStartedAt: state.creativeFinalVoteStartedAt || '',
        updatedAt: state.updatedAt || new Date().toISOString(),
        publicQuestion: state.publicQuestion || null,
        answerReveal: state.answerReveal || null
      })
    });
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      return {
        skipped: true,
        reason: 'Firebase gameState sync failed: HTTP ' + statusCode,
        detail: response.getContentText().slice(0, 300)
      };
    }
  } catch (error) {
    return { skipped: true, reason: String(error && error.message ? error.message : error) };
  }

  return { skipped: false };
}
