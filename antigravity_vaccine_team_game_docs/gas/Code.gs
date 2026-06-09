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
const SHEET_QUESTION_BANK_GUIDE = '題庫欄位說明';

const DEFAULT_TEAM_COUNT = 5;
const FIRST_CORRECT_BONUS = 0;
const MAX_UNOPENED_TREASURE_BOXES = 3;
const ADDITIONAL_TREASURE_BOX_LIMIT = 10;
const LAGGING_TREASURE_BOX_LIMIT = 5;
const TREASURE_DROP_RATE_ON_CORRECT = 0.3;
const SHEET_TREASURE_REWARD_POOL = 'TreasureRewardPool';
const TREASURE_PREASSIGN_SLOTS = 8;
const TREASURE_ITEM_RATES = [
  { itemType: 'score_1', rate: 0.22, label: '小加分卡：戰隊 +1' },
  { itemType: 'score_3', rate: 0.18, label: '中加分卡：戰隊 +3' },
  { itemType: 'score_5', rate: 0.12, label: '大加分卡：戰隊 +5' },
  { itemType: 'score_10', rate: 0.05, label: '超級加分卡：戰隊 +10' },
  { itemType: 'double', rate: 0.1, label: '加倍卡' },
  { itemType: 'comeback', rate: 0.05, label: '翻身卡' },
  { itemType: 'challenge', rate: 0.2, label: '挑戰卡' },
  { itemType: 'special', rate: 0.03, label: '特殊道具' },
  { itemType: 'empty', rate: 0.05, label: '鼓勵語或空寶箱' }
];
const TEAM_SCORE_ITEM_EFFECTS = {
  score_1: 1,
  score_3: 3,
  score_5: 5,
  score_10: 10
};
const COMEBACK_CARD_LAST_PLACE_SCORE = 30;
const COMEBACK_CARD_NORMAL_SCORE = 5;
const COMEBACK_CARD_SECOND_USE_SCORE = 10;
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
  '\u7a7a\u5bf6\u7bb1\uff1a\u9019\u6b21\u6c92\u6709\u53d6\u5f97\u9053\u5177\uff0c\u4e0d\u6703\u6263\u5206\uff0c\u4e5f\u4e0d\u9700\u8981\u518d\u64cd\u4f5c\u3002',
  '\u7a7a\u5bf6\u7bb1\uff1a\u6c92\u6709\u9053\u5177\uff0c\u4f46\u7b54\u984c\u7d00\u9304\u5df2\u4fdd\u7559\u3002',
  '\u7a7a\u5bf6\u7bb1\uff1a\u672c\u6b21\u6c92\u6709\u734e\u52f5\u9053\u5177\uff0c\u8acb\u7e7c\u7e8c\u4f5c\u7b54\u3002'
];
const CACHE_TTL_SECONDS = 300;
const LONG_CACHE_TTL_SECONDS = 21600;
const CACHE_KEY_SETUP_READY = 'setup_ready_v2';
const PROPERTY_KEY_SETUP_READY_VERSION = 'SETUP_READY_VERSION';
const SHEET_SETUP_VERSION = '0.7.14_v7_fast_setup_1';
const CACHE_KEY_QUESTIONS = 'questions_v2';
const CACHE_KEY_FIREBASE_TOKEN = 'firebase_access_token_v2';
const CACHE_KEY_GAME_STATE_PREFIX = 'game_state_v2_';
const CACHE_KEY_PLAYER_PREFIX = 'player_v2_';
const CACHE_KEY_PLAYERS_SYNC_PREFIX = 'players_sync_v2_';
const CACHE_KEY_PAPER_OPEN_PREFIX = 'paper_open_v2_';
const CACHE_KEY_ANSWER_PREFIX = 'answer_v2_';
const GAS_BACKEND_VERSION = '0.7.14';
const SCORE_BUCKETS = [
  { maxSeconds: 10, score: 30 },
  { maxSeconds: 20, score: 25 },
  { maxSeconds: 30, score: 20 },
  { maxSeconds: 45, score: 15 },
  { maxSeconds: 60, score: 10 },
  { maxSeconds: 999, score: 5 }
];
const V4_ANSWER_TIME_LIMIT_SECONDS = 65;

const QUESTION_BANK_FIELDS = [
  { key: 'questionId', label: '題目代號', required: '必填', example: 'q001', choices: '英數與底線，請勿重複', description: '每一題的唯一代號。建議使用 q001、q002，不要使用姓名或個資。' },
  { key: 'order', label: '題目排序', required: '必填', example: '1', choices: '數字', description: '題目清單顯示順序。講師仍可不照順序出題。' },
  { key: 'type', label: '題型', required: '必填', example: 'single', choices: 'single, multiple, creative', description: 'single 為單選題；multiple 為複選題；creative 為創作題。' },
  { key: 'section', label: '分類', required: '選填', example: '冷鏈', choices: '自訂文字', description: '用於講師辨識題目分類，可留空。' },
  { key: 'title', label: '題目文字', required: '必填', example: '疫苗冷鏈異常時，第一步應如何處理？', choices: '文字', description: '顯示給學員的題目內容。請勿填入個資。' },
  { key: 'optionA', label: '選項 A', required: '選擇題必填', example: '立即隔離並標示', choices: '文字', description: '選擇題的 A 選項；創作題可留空。' },
  { key: 'optionB', label: '選項 B', required: '選擇題必填', example: '繼續使用', choices: '文字', description: '選擇題的 B 選項；創作題可留空。' },
  { key: 'optionC', label: '選項 C', required: '選填', example: '活動後再補紀錄', choices: '文字', description: '選擇題的 C 選項，可留空。' },
  { key: 'optionD', label: '選項 D', required: '選填', example: '只口頭通知', choices: '文字', description: '選擇題的 D 選項，可留空。' },
  { key: 'optionE', label: '選項 E', required: '選填', example: '', choices: '文字', description: '選擇題的 E 選項，可留空。' },
  { key: 'correctAnswer', label: '正確答案', required: '選擇題必填', example: 'A 或 A,C', choices: 'A, B, C, D, E，多選用逗號分隔', description: '單選題填 A；複選題填 A,C。創作題可留空。' },
  { key: 'explanation', label: '答案說明', required: '選填', example: '冷鏈異常需先隔離、標示、記錄並通報。', choices: '文字', description: '關題後公布給講師與投影端的說明。' },
  { key: 'timeLimitSec', label: '作答秒數', required: '必填', example: '60', choices: '數字', description: '選擇題建議 30 至 90 秒；創作題會依系統創作題秒數處理。' },
  { key: 'scoreMode', label: '計分模式', required: '必填', example: 'timeBucket', choices: 'timeBucket, fixed, creative', description: '一般選擇題使用 timeBucket；創作題使用 creative。' },
  { key: 'isBossQuestion', label: '是否魔王題', required: '必填', example: 'FALSE', choices: 'TRUE, FALSE', description: '目前主要作為題目標記。一般題填 FALSE。' },
  { key: 'isCreativeVote', label: '是否創作投票題', required: '必填', example: 'FALSE', choices: 'TRUE, FALSE', description: '創作題若要進入投稿與投票流程可填 TRUE；一般題填 FALSE。' },
  { key: 'enabled', label: '是否啟用', required: '必填', example: 'TRUE', choices: 'TRUE, FALSE', description: '只有 TRUE 的題目會出現在講師端題目清單。' },
  { key: 'note', label: '備註', required: '選填', example: '活動前確認題意', choices: '文字', description: '給講師或維護者看的備註，不會顯示給學員。' }
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('互動遊戲管理')
    .addItem('初始化工作表', 'setupGameSheets')
    .addItem('初始化遊戲資料', 'resetGameDataFromMenu')
    .addItem('同步題庫到內部資料', 'syncQuestionsToFirebase')
    .addItem('更新測試題庫', 'updateTestQuestionBankFromMenu')
    .addItem('更新臺灣生活趣味題庫', 'updateTaiwanQuestionBankFromMenu')
    .addItem('更新疫苗題庫', 'updateVaccineQuestionBankFromMenu')
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
    reopenQuestion,
    closeAndScoreQuestion,
    closeAndScoreQuestionInline,
    scoreClosedQuestion,
    getSettlementBatchStatus,
    warmupGameSheets,
    prepareFirebaseInstructorControl,
    getPlayerSummary,
    getScoreboard,
    getPlayerLeaderboard,
    setTeamChoiceMode,
    recalculateScoreboard,
    resetGameData,
    getPlayerInventory,
    grantTreasureBoxes,
    getPlayerAchievements,
    claimAchievementReward,
    openTreasureBox,
    useItem,
    getTeamBonusLedger,
    recalculateV3Scoreboard,
    finalizeAwards,
    getAwardList,
    recordLuckyBoxOpened,
    recordPerfectAwardCandidate,
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
    startFinalSettlementCountdown,
    finalizeCompetition,
    getFinalResults,
    getQuestionBankInfo,
    refreshQuestionBank
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
    'sessionStartedAt',
    'gameSessionSeed',
    'updatedAt',
    'openedQuestionIds',
    'allowFreeTeamChoice',
    'creativeFinalVoteStartedAt',
    'additionalTreasureBoxLevel',
    'additionalTreasureBoxUpdatedAt',
    'additionalTreasureBoxSlots',
    'laggingTreasureBoxTeams',
    'laggingTreasureBoxUpdatedAt'
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
    'usedAfterQuestionId',
    'usedAfterQuestionSequence',
    'settleAtCloseSequence',
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
  PropertiesService.getScriptProperties().setProperty(PROPERTY_KEY_SETUP_READY_VERSION, SHEET_SETUP_VERSION);
  getRuntimeCache().put(CACHE_KEY_SETUP_READY, '1', CACHE_TTL_SECONDS);
  getRuntimeCache().remove(CACHE_KEY_QUESTIONS);
}

function warmupGameSheets(data, payload) {
  requireAdmin(payload);
  const startedAt = Date.now();
  setupGameSheets();
  const gameId = String(data.gameId || getGameId());
  const instructorControl = publishFirebaseInstructorControlSecret(gameId);
  return {
    ok: true,
    gameId,
    setupReadyVersion: SHEET_SETUP_VERSION,
    elapsedMs: Date.now() - startedAt,
    instructorControl
  };
}

function prepareFirebaseInstructorControl(data, payload) {
  requireAdmin(payload);
  const gameId = String(data.gameId || getGameId());
  return {
    gameId,
    instructorControl: publishFirebaseInstructorControlSecret(gameId),
    preparedAt: new Date().toISOString()
  };
}

function publishFirebaseInstructorControlSecret(gameId) {
  const secret = PropertiesService.getScriptProperties().getProperty('ADMIN_API_SECRET') || '';
  if (!secret) {
    return { skipped: true, reason: 'missing_admin_api_secret' };
  }
  const now = new Date().toISOString();
  return putFirebaseJson('adminSecrets/' + encodeURIComponent(gameId), {
    gameId,
    value: secret,
    updatedAt: now,
    source: 'gas_admin_control',
    version: GAS_BACKEND_VERSION
  });
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
  const gameSessionSeed = createGameSessionSeed(gameId, now);
  const state = {
    gameId,
    status: 'draft',
    currentQuestionId: '',
    questionOpenedAt: '',
    sessionStartedAt: now,
    gameSessionSeed,
    updatedAt: now,
    openedQuestionIds: '',
    allowFreeTeamChoice: false,
    creativeFinalVoteStartedAt: '',
    additionalTreasureBoxLevel: 0,
    additionalTreasureBoxUpdatedAt: '',
    additionalTreasureBoxSlots: '',
    laggingTreasureBoxTeams: '',
    laggingTreasureBoxUpdatedAt: ''
  };
  appendObject(getSheetOrThrow(SHEET_GAME_STATE), state);
  clearRuntimeCaches(gameId);
  cacheGameState(state);

  const firebaseClear = clearFirebaseGameData(gameId);
  const instructorControl = publishFirebaseInstructorControlSecret(gameId);
  const firebaseSync = publishGameStateToFirebase(state);
  return {
    status: 'draft',
    gameId,
    message: '資料已清空。玩家、作答、翻卷、排行榜、寶箱、道具、獎項與創作票選紀錄已清空；題庫、戰隊設定與規則設定保留。',
    questionsSync: {
      skipped: true,
      reason: '清空資料不再同步題庫；啟動場次或重新讀取題目清單時會同步最新題庫。'
    },
    firebaseClear,
    firebaseSync,
    instructorControl
  };
}

function syncQuestionsToFirebase(gameId) {
  ensureGameSheetsReady();
  const targetGameId = String(gameId || getGameId());
  const rows = readQuestionRows();
  validateQuestions(rows);
  const firebaseSync = publishPublicQuestionsToFirebase(targetGameId, rows);
  const result = {
    status: 'OK',
    gameId: targetGameId,
    message: '公開題庫已同步到 Firebase，正確答案仍只保留在 Google Sheets。',
    questionCount: rows.length,
    firebaseSync
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function refreshQuestionBank(data, payload) {
  requireAdmin(payload);
  setupGameSheets();
  getRuntimeCache().remove(CACHE_KEY_QUESTIONS);
  const result = syncQuestionsToFirebase();
  return {
    ...result,
    refreshedAt: new Date().toISOString()
  };
}

function updateTaiwanQuestionBankFromMenu() {
  return updateQuestionBankFromBundledRows(getDefaultQuestionRows(), {
    source: 'Taiwan question bank markdown bundled in GAS',
    message: 'Taiwan question bank upsert completed. demo_q rows were kept but disabled. No rows were deleted.',
    disableDemoRows: true,
    syncFirebase: true
  });
}

function updateTestQuestionBankFromMenu() {
  return updateQuestionBankFromBundledRows(getTestQuestionRows(), {
    source: 'Test question bank bundled in GAS',
    message: 'Test question bank upsert completed. No rows were deleted.',
    disableDemoRows: false,
    syncFirebase: true
  });
}

function updateVaccineQuestionBankFromMenu() {
  return updateQuestionBankFromBundledRows(getVaccineQuestionRows(), {
    source: 'Vaccine education training question bank markdown bundled in GAS',
    message: 'Vaccine question bank replacement completed. Old vac_q rows not in the new source were disabled. No rows were deleted.',
    disableDemoRows: false,
    disableMissingQuestionIdPrefix: 'vac_q',
    syncFirebase: true
  });
}

function updateQuestionBankFromBundledRows(sourceRows, options) {
  const ss = getSpreadsheet();
  const questionsSheet = ensureSheet(ss, SHEET_QUESTIONS, QUESTION_BANK_FIELDS.map(field => field.key));
  const headers = getHeaders(questionsSheet);
  const questionIdColumn = headers.indexOf('questionId');
  const enabledColumn = headers.indexOf('enabled');
  const noteColumn = headers.indexOf('note');
  const values = questionsSheet.getLastRow() > 1
    ? questionsSheet.getRange(2, 1, questionsSheet.getLastRow() - 1, headers.length).getValues()
    : [];
  const existingRowByQuestionId = {};
  values.forEach((row, index) => {
    const questionId = String(row[questionIdColumn] || '').trim();
    if (questionId) existingRowByQuestionId[questionId] = index;
  });

  const sourceHeaders = QUESTION_BANK_FIELDS.map(field => field.key);
  const rows = sourceRows.map(row => {
    const byHeader = {};
    sourceHeaders.forEach((header, index) => {
      byHeader[header] = row[index];
    });
    return byHeader;
  });

  let updatedCount = 0;
  const appendRows = [];
  rows.forEach(row => {
    const questionId = String(row.questionId || '').trim();
    const rowValues = headers.map(header => Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '');
    if (Object.prototype.hasOwnProperty.call(existingRowByQuestionId, questionId)) {
      values[existingRowByQuestionId[questionId]] = rowValues;
      updatedCount += 1;
    } else {
      appendRows.push(row);
    }
  });

  let disabledDemoCount = 0;
  if (options && options.disableDemoRows && questionIdColumn >= 0 && enabledColumn >= 0) {
    values.forEach(row => {
      const questionId = String(row[questionIdColumn] || '').trim();
      if (questionId.indexOf('demo_q') === 0 && String(row[enabledColumn]).toUpperCase() !== 'FALSE') {
        row[enabledColumn] = false;
        if (noteColumn >= 0) row[noteColumn] = 'Replaced by Taiwan question bank; kept but disabled.';
        disabledDemoCount += 1;
      }
    });
  }

  let disabledMissingCount = 0;
  if (options && options.disableMissingQuestionIdPrefix && questionIdColumn >= 0 && enabledColumn >= 0) {
    const replacementIds = rows.reduce((set, row) => {
      const questionId = String(row.questionId || '').trim();
      if (questionId) set[questionId] = true;
      return set;
    }, {});
    values.forEach(row => {
      const questionId = String(row[questionIdColumn] || '').trim();
      const isTargetBank = questionId.indexOf(options.disableMissingQuestionIdPrefix) === 0;
      if (isTargetBank && !replacementIds[questionId] && String(row[enabledColumn]).toUpperCase() !== 'FALSE') {
        row[enabledColumn] = false;
        if (noteColumn >= 0) row[noteColumn] = 'Disabled during question bank replacement; kept for audit trail.';
        disabledMissingCount += 1;
      }
    });
  }

  if (values.length) {
    questionsSheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
  if (appendRows.length) {
    appendObjects(questionsSheet, headers, appendRows);
  }
  getRuntimeCache().remove(CACHE_KEY_QUESTIONS);

  const shouldSyncFirebase = !options || options.syncFirebase !== false;
  const questionsSync = shouldSyncFirebase
    ? syncQuestionsToFirebase()
    : { skipped: true, reason: 'syncFirebase_disabled' };

  return {
    status: 'OK',
    source: options && options.source ? options.source : 'bundled question bank rows',
    message: options && options.message ? options.message : 'Question bank upsert completed. No rows were deleted.',
    updatedCount,
    appendedCount: appendRows.length,
    disabledDemoCount,
    disabledMissingCount,
    questionCount: rows.length,
    questionsSync,
    updatedAt: new Date().toISOString()
  };
}

function syncGameSettingsToFirebase(options) {
  setupGameSheets();
  const gameId = String(options && options.gameId || getGameId());
  const stateSheet = getSheetOrThrow(SHEET_GAME_STATE);
  const states = readObjects(stateSheet);
  const existingIndex = states.findIndex(row => row.gameId === gameId);
  const currentState = existingIndex >= 0 ? normalizeGameState(states[existingIndex], gameId) : null;
  const allowFreeTeamChoice = options && Object.prototype.hasOwnProperty.call(options, 'allowFreeTeamChoice')
    ? Boolean(options.allowFreeTeamChoice)
    : Boolean(currentState && currentState.allowFreeTeamChoice);
  const now = new Date().toISOString();
  const row = {
    gameId,
    status: 'created',
    currentQuestionId: '',
    questionOpenedAt: '',
    sessionStartedAt: now,
    gameSessionSeed: createGameSessionSeed(gameId, now),
    updatedAt: now,
    openedQuestionIds: '',
    allowFreeTeamChoice,
    creativeFinalVoteStartedAt: '',
    additionalTreasureBoxLevel: 0,
    additionalTreasureBoxUpdatedAt: '',
    additionalTreasureBoxSlots: '',
    laggingTreasureBoxTeams: '',
    laggingTreasureBoxUpdatedAt: ''
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

function getQuestionBankInfo(data, payload) {
  requireAdmin(payload);
  const ss = getSpreadsheet();
  const questionsSheet = ensureSheet(ss, SHEET_QUESTIONS, QUESTION_BANK_FIELDS.map(field => field.key));
  ensureQuestionBankGuidance(ss, questionsSheet);
  const guideSheet = ss.getSheetByName(SHEET_QUESTION_BANK_GUIDE);
  const spreadsheetUrl = ss.getUrl();
  return {
    spreadsheetUrl,
    questionBankUrl: spreadsheetUrl + '#gid=' + questionsSheet.getSheetId(),
    guideSheetUrl: spreadsheetUrl + '#gid=' + guideSheet.getSheetId(),
    questionSheetName: SHEET_QUESTIONS,
    guideSheetName: SHEET_QUESTION_BANK_GUIDE,
    message: '已開啟題庫資料庫，題庫主表保留系統欄位，中文說明請看「題庫欄位說明」工作表與欄位備註。'
  };
}

function ensureQuestionBankGuidance(ss, questionsSheet) {
  const guideSheet = ensureSheet(ss, SHEET_QUESTION_BANK_GUIDE, [
    '中文欄位',
    '系統欄位',
    '是否必填',
    '填寫範例',
    '可填內容',
    '填寫說明'
  ]);
  writeQuestionBankGuide(guideSheet);
  applyQuestionHeaderNotes(questionsSheet);
  applyQuestionBankValidation(questionsSheet);
  try {
    questionsSheet.setFrozenRows(1);
    guideSheet.setFrozenRows(1);
    questionsSheet.autoResizeColumns(1, Math.min(questionsSheet.getLastColumn(), QUESTION_BANK_FIELDS.length));
    guideSheet.autoResizeColumns(1, 6);
  } catch (error) {
    // 欄寬與凍結列失敗不影響題庫資料本身。
  }
}

function writeQuestionBankGuide(sheet) {
  const headers = ['中文欄位', '系統欄位', '是否必填', '填寫範例', '可填內容', '填寫說明'];
  const rows = QUESTION_BANK_FIELDS.map(field => [
    field.label,
    field.key,
    field.required,
    field.example,
    field.choices,
    field.description
  ]);
  sheet.clear();
  sheet.getRange(1, 1, rows.length + 1, headers.length).setValues([headers].concat(rows));
  try {
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#115e59')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.getRange(2, 1, rows.length, headers.length).setWrap(true);
  } catch (error) {
    // 格式化失敗不影響說明內容。
  }
}

function applyQuestionHeaderNotes(sheet) {
  const headers = getHeaders(sheet);
  const notes = headers.map(header => {
    const field = QUESTION_BANK_FIELDS.find(item => item.key === header);
    if (!field) return '';
    return [
      field.label,
      '是否必填：' + field.required,
      '填寫範例：' + field.example,
      '可填內容：' + field.choices,
      field.description
    ].join('\n');
  });
  if (notes.length) {
    sheet.getRange(1, 1, 1, notes.length).setNotes([notes]);
  }
}

function applyQuestionBankValidation(sheet) {
  const headers = getHeaders(sheet);
  const maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  setQuestionColumnValidation(sheet, headers, 'type', ['single', 'multiple', 'creative'], maxRows);
  setQuestionColumnValidation(sheet, headers, 'correctAnswer', ['A', 'B', 'C', 'D', 'E', 'A,B', 'A,C', 'A,D', 'B,C', 'B,D', 'C,D'], maxRows, true);
  setQuestionColumnValidation(sheet, headers, 'scoreMode', ['timeBucket', 'fixed', 'creative'], maxRows);
  ['isBossQuestion', 'isCreativeVote', 'enabled'].forEach(header => {
    setQuestionColumnValidation(sheet, headers, header, ['TRUE', 'FALSE'], maxRows);
  });
}

function setQuestionColumnValidation(sheet, headers, headerName, values, maxRows, allowInvalid) {
  const columnIndex = headers.indexOf(headerName) + 1;
  if (columnIndex <= 0) return;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(Boolean(allowInvalid))
    .build();
  sheet.getRange(2, columnIndex, maxRows, 1).setDataValidation(rule);
}

function createGame(data, payload) {
  requireAdmin(payload);
  const gameId = String(data && data.gameId || getGameId());
  const state = syncGameSettingsToFirebase({
    gameId,
    allowFreeTeamChoice: Boolean(data && data.allowFreeTeamChoice)
  });
  state.instructorControl = publishFirebaseInstructorControlSecret(state.gameId || gameId);
  const questions = syncQuestionsToFirebase(state.gameId || gameId);
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
    sessionStartedAt: '',
    gameSessionSeed: '',
    openedQuestionIds: '',
    allowFreeTeamChoice: false,
    additionalTreasureBoxLevel: 0,
    additionalTreasureBoxUpdatedAt: '',
    additionalTreasureBoxSlots: '',
    laggingTreasureBoxTeams: '',
    laggingTreasureBoxUpdatedAt: ''
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
    questionOpenedAt: state.questionOpenedAt || '',
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

function getOpenedQuestionIdsForGame(gameId) {
  const state = getGameState({ gameId });
  return parseOpenedQuestionIds(state.openedQuestionIds || '');
}

function getQuestionCloseSequence(gameId, questionId) {
  const ids = getOpenedQuestionIdsForGame(gameId);
  const index = ids.indexOf(String(questionId || ''));
  return index >= 0 ? index + 1 : 0;
}

function getQuestionCloseSequenceFromState(state, questionId) {
  const ids = parseOpenedQuestionIds(state && state.openedQuestionIds || '');
  const index = ids.indexOf(String(questionId || ''));
  return index >= 0 ? index + 1 : 0;
}

function getQuestionIdByCloseSequence(gameId, sequence) {
  const number = Number(sequence || 0);
  if (!Number.isFinite(number) || number <= 0) return '';
  return getOpenedQuestionIdsForGame(gameId)[number - 1] || '';
}

function getNextOpenedQuestionIdAfter(gameId, questionId) {
  const ids = getOpenedQuestionIdsForGame(gameId);
  const index = ids.indexOf(String(questionId || ''));
  return index >= 0 ? ids[index + 1] || '' : '';
}

function createGameSessionSeed(gameId, timestamp) {
  return [gameId || getGameId(), timestamp || new Date().toISOString(), Utilities.getUuid()].join(':');
}

function openQuestion(data, payload) {
  requireAdmin(payload);
  const timing = createCloseQuestionTimingTracker();
  ensureGameSheetsReady();
  timing.mark('ensureGameSheetsReady');

  const gameId = String(data.gameId || getGameId());
  publishFirebaseInstructorControlSecret(gameId);
  const questionId = requireText(data.questionId, 'questionId', 80);
  const currentState = getGameState({ gameId });
  timing.mark('getGameState');
  const openedQuestionIds = parseOpenedQuestionIds(currentState.openedQuestionIds);
  const questions = readQuestionRows();
  timing.mark('readQuestionRows', { questionCount: questions.length });
  const question = questions.find(item => item.questionId === questionId);

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  if (currentState.currentQuestionId === questionId || openedQuestionIds.indexOf(questionId) >= 0) {
    throw new Error('此題已開放過，請改選其他題目。');
  }

  const openedAt = new Date().toISOString();
  const nextOpenedQuestionIds = formatOpenedQuestionIds(openedQuestionIds.concat(questionId));
  upsertGameState({
    gameId,
    status: 'question_open',
    currentQuestionId: questionId,
    questionOpenedAt: openedAt,
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || openedAt,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || openedAt),
    updatedAt: openedAt,
    openedQuestionIds: nextOpenedQuestionIds,
    allowFreeTeamChoice: currentState.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: ''
  });
  timing.mark('upsertGameState');

  const state = {
    gameId,
    status: 'question_open',
    currentQuestionId: questionId,
    questionOpenedAt: openedAt,
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || openedAt,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || openedAt),
    updatedAt: openedAt,
    openedQuestionIds: nextOpenedQuestionIds,
    allowFreeTeamChoice: currentState.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: '',
    publicQuestion: publicQuestionFromRow(question)
  };
  let firebaseSync = null;
  if (data && data.firebaseFirst === true) {
    const firebaseState = getFirebaseJson('gameState/' + encodeURIComponent(gameId)) || {};
    if (firebaseState.currentQuestionId && firebaseState.currentQuestionId !== questionId) {
      firebaseSync = {
        skipped: true,
        reason: 'background_open_state_changed',
        currentStatus: firebaseState.status || '',
        currentQuestionId: firebaseState.currentQuestionId || ''
      };
    } else if (firebaseState.currentQuestionId === questionId && firebaseState.status && firebaseState.status !== 'question_open') {
      firebaseSync = {
        skipped: true,
        reason: 'background_open_question_already_advanced',
        currentStatus: firebaseState.status || '',
        currentQuestionId: firebaseState.currentQuestionId || ''
      };
    } else {
      firebaseSync = publishGameStateToFirebase(state);
    }
  } else {
    firebaseSync = publishGameStateToFirebase(state);
  }
  timing.mark('publishGameStateToFirebase');
  const timingSummary = timing.finish({
    operation: 'openQuestion',
    gameId,
    questionId
  });
  logOperationTiming('openQuestionTiming', timingSummary);
  return { gameId, questionId, status: 'question_open', questionOpenedAt: openedAt, openedQuestionIds: nextOpenedQuestionIds, firebaseSync, timingSummary };
}

function reopenQuestion(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  const currentState = getGameState({ gameId });
  const openedQuestionIds = parseOpenedQuestionIds(currentState.openedQuestionIds);
  const questions = readQuestionRows();
  const question = questions.find(item => item.questionId === questionId);

  if (!question) {
    throw new Error('?曆??圈??殷?' + questionId);
  }

  const openedAt = new Date().toISOString();
  const nextOpenedQuestionIds = formatOpenedQuestionIds(openedQuestionIds.concat(questionId));
  const state = {
    gameId,
    status: 'question_open',
    currentQuestionId: questionId,
    questionOpenedAt: openedAt,
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || openedAt,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || openedAt),
    updatedAt: openedAt,
    openedQuestionIds: nextOpenedQuestionIds,
    allowFreeTeamChoice: currentState.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: '',
    publicQuestion: publicQuestionFromRow(question)
  };

  upsertGameState({
    gameId: state.gameId,
    status: state.status,
    currentQuestionId: state.currentQuestionId,
    questionOpenedAt: state.questionOpenedAt,
    sessionStartedAt: state.sessionStartedAt,
    gameSessionSeed: state.gameSessionSeed,
    updatedAt: state.updatedAt,
    openedQuestionIds: state.openedQuestionIds,
    allowFreeTeamChoice: state.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: state.creativeFinalVoteStartedAt
  });

  const firebaseSync = publishGameStateToFirebase(state);
  return { gameId, questionId, status: 'question_open', questionOpenedAt: openedAt, openedQuestionIds: nextOpenedQuestionIds, reopened: true, firebaseSync };
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
  const responseSeconds = normalizeV4ResponseSeconds(Math.max(0, Math.round((submittedAt.getTime() - openedAt.getTime()) / 1000)));
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
  const playerSync = syncFirebasePlayersToSheet(gameId, { useRecentSyncCache: true });
  syncFirebaseAnswersForQuestionToSheet(gameId, questionId);
  const currentCloseSequence = getQuestionCloseSequence(gameId, questionId);
  const itemUseSync = syncFirebaseItemUsesForQuestionToSheet(gameId, questionId, currentCloseSequence);
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
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || now),
    updatedAt: now,
    openedQuestionIds
  });
  let firebaseSync = publishGameStateToFirebase({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || now),
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
  const validPlayerIds = new Set();

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
    .sort((a, b) =>
      Number(b.finalScore || b.totalScore || 0) - Number(a.finalScore || a.totalScore || 0) ||
      String(a.teamId || '').localeCompare(String(b.teamId || ''))
    );

  return { gameId, rows };
}

function getPlayerLeaderboard(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const limit = Math.min(Math.max(Number(data.limit || 10), 1), 50);
  const rows = getMergedPlayers(gameId)
    .map(row => ({
      playerId: row.playerIds && row.playerIds.length ? row.playerIds[0] : '',
      nickname: row.nickname,
      teamId: row.teamId,
      score: Number(row.score || 0),
      answerScore: Number(row.answerScore || 0),
      itemScore: Number(row.itemScore || 0),
      correctCount: Number(row.correctCount || 0),
      totalResponseSeconds: Number(row.totalResponseSeconds || 0),
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
  const answerQuestion = getQuestionForAnswer(gameId, questionId, state);
  const question = answerQuestion.question;

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
  const responseSeconds = normalizeV4ResponseSeconds(Math.max(0, Math.round((submittedAt.getTime() - openedAt.getTime()) / 1000)));

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
  const itemUseSync = syncFirebaseItemUsesForFinalSettlement(gameId);
  const question = readQuestionRows().find(row => row.questionId === questionId);

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  const correctAnswer = parseAnswer(question.correctAnswer).sort().join(',');
  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const answerData = readSheetEntries(answerSheet);
  const answers = answerData.entries.map(entry => entry.row);
  const itemSheet = getSheetOrThrow(SHEET_ITEM_RECORDS);
  const itemData = readSheetEntries(itemSheet);
  const firstCorrectPlayerId = getFirstCorrectPlayerId(answers, gameId, questionId, correctAnswer);
  let scoredCount = 0;
  let submittedCount = 0;
  let treasureAwardedCount = 0;
  const playerScoreDeltas = {};
  let answerRowsChanged = false;
  let itemRowsChanged = false;

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
    const doubleCardResult = consumeArmedDoubleCard(itemData, gameId, row.playerId, questionId, isCorrect, preItemScore);
    const itemBonusScore = Number(doubleCardResult.score || 0);
    itemRowsChanged = itemRowsChanged || Boolean(doubleCardResult.changed);
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
    scoredCount += 1;
  });

  if (answerRowsChanged) {
    writeSheetValues(answerSheet, answerData.values);
  }

  const treasureAwardSync = {
    skipped: true,
    reason: 'student_local_treasure_plan_handles_question_boxes'
  };
  const challengeAppliedCount = applyPendingChallengeCards(itemData, gameId, questionId);
  itemRowsChanged = itemRowsChanged || challengeAppliedCount > 0;
  if (itemRowsChanged) {
    writeSheetValues(itemSheet, itemData.values);
  }
  applyPlayerScoreDeltas(gameId, playerScoreDeltas);

  const currentState = getGameState({ gameId });
  const openedQuestionIds = currentState.openedQuestionIds || formatOpenedQuestionIds([questionId]);
  const now = new Date().toISOString();
  upsertGameState({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || now),
    updatedAt: now,
    openedQuestionIds
  });
  const firebaseSync = publishGameStateToFirebase({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || now),
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
  firebaseSync = publishGameStateToFirebase({
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || now),
    updatedAt: now,
    openedQuestionIds,
    comebackControl: buildComebackControl(gameId, questionId, scoreboard)
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
  const mergedPlayer = getMergedPlayers(gameId)
    .find(row => (row.playerIds || []).indexOf(playerId) >= 0) || {};
  const playerAnswers = answerRows.filter(row => row.gameId === gameId && relatedPlayerIds.indexOf(row.playerId) >= 0);
  const playerScore = Number(mergedPlayer.score || 0);
  const playerAnswerScore = Number(mergedPlayer.answerScore || 0);
  const playerItemScore = Number(mergedPlayer.itemScore || 0);
  const answers = questionId
    ? playerAnswers.filter(row => row.questionId === questionId)
    : [];
  const lastAnswer = answers.length ? answers[answers.length - 1] : null;

  return {
    gameId,
    playerId,
    teamId: player.teamId,
    playerScore,
    answerScore: playerAnswerScore,
    itemScore: playerItemScore,
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

function grantTreasureBoxes(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const currentState = getGameState({ gameId });
  const now = new Date().toISOString();
  const grantType = String(data.grantType || 'additional');

  if (grantType === 'lagging') {
    const teamId = requireText(data.teamId, 'teamId', 80);
    if (!isValidTeamId(teamId)) {
      throw new Error('請選擇有效戰隊。');
    }
    const requestedSlot = Number(data.slot || 1);
    if (!Number.isFinite(requestedSlot) || requestedSlot < 1 || requestedSlot > LAGGING_TREASURE_BOX_LIMIT) {
      throw new Error('請選擇落後寶箱第 1 至第 ' + LAGGING_TREASURE_BOX_LIMIT + ' 箱。');
    }
    const grantKey = teamId + ':' + requestedSlot;
    const teamIds = parseCsvList(currentState.laggingTreasureBoxTeams);
    if (!teamIds.includes(grantKey)) {
      teamIds.push(grantKey);
    }
    const nextState = {
      ...currentState,
      gameId,
      laggingTreasureBoxTeams: teamIds.join(','),
      laggingTreasureBoxUpdatedAt: now
    };
    upsertGameState(nextState);
    return {
      gameId,
      grantType,
      teamId,
      slot: requestedSlot,
      laggingTreasureBoxTeams: nextState.laggingTreasureBoxTeams,
      maxLaggingTreasureBoxLevel: LAGGING_TREASURE_BOX_LIMIT,
      firebaseSync: publishGameStateToFirebase(nextState)
    };
  }

  const requestedSlot = Number(data.slot || 0);
  if (!Number.isFinite(requestedSlot) || requestedSlot < 1 || requestedSlot > ADDITIONAL_TREASURE_BOX_LIMIT) {
    throw new Error('請選擇第 1 至第 ' + ADDITIONAL_TREASURE_BOX_LIMIT + ' 箱。');
  }
  const enabledSlots = parseCsvList(currentState.additionalTreasureBoxSlots)
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value >= 1 && value <= ADDITIONAL_TREASURE_BOX_LIMIT);
  if (!enabledSlots.includes(requestedSlot)) {
    enabledSlots.push(requestedSlot);
  }
  enabledSlots.sort((a, b) => a - b);
  const nextLevel = enabledSlots.length ? Math.max(...enabledSlots) : 0;
  const nextState = {
    ...currentState,
    gameId,
    additionalTreasureBoxLevel: nextLevel,
    additionalTreasureBoxUpdatedAt: now,
    additionalTreasureBoxSlots: enabledSlots.join(',')
  };
  upsertGameState(nextState);
  const firebaseSync = publishGameStateToFirebase(nextState);

  return {
    gameId,
    grantType,
    slot: requestedSlot,
    additionalTreasureBoxLevel: nextLevel,
    additionalTreasureBoxSlots: nextState.additionalTreasureBoxSlots,
    maxAdditionalTreasureBoxLevel: ADDITIONAL_TREASURE_BOX_LIMIT,
    firebaseSync
  };
}

function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
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

function getScoreboardQuestionIds(gameId) {
  return getOfficialQuestionIds();
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

function recordLuckyBoxOpened(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const boxId = requireText(data.boxId || data.sourceItemId || 'lucky_box', 'boxId', 120);
  const player = findPlayer(gameId, playerId);
  const openedAt = String(data.openedAt || new Date().toISOString());
  const sheet = getSheetOrThrow(SHEET_AWARDS);
  const existing = readObjects(sheet).find(row =>
    row.gameId === gameId &&
    row.awardType === 'lucky_opened' &&
    row.playerId === playerId &&
    row.sourceItemId === boxId
  );

  if (existing) {
    return { recorded: false, duplicate: true, awardId: existing.awardId };
  }

  const row = buildAwardRow({
    gameId,
    awardType: 'lucky_opened',
    playerId,
    teamId: player.teamId,
    nickname: player.nickname,
    sourceItemId: boxId,
    completedAt: openedAt,
    awardedAt: openedAt,
    note: 'v4 lucky box opened by student client'
  });
  appendObject(sheet, row);
  return { recorded: true, awardId: row.awardId };
}

function recordPerfectAwardCandidate(data) {
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const playerId = requireText(data.playerId, 'playerId', 80);
  const player = findPlayer(gameId, playerId);
  const completedAt = String(data.completedAt || new Date().toISOString());
  const finalQuestionId = String(data.finalQuestionId || '');
  const sheet = getSheetOrThrow(SHEET_AWARDS);
  const existing = readObjects(sheet).find(row =>
    row.gameId === gameId &&
    row.awardType === 'perfect_candidate' &&
    row.playerId === playerId
  );

  if (existing) {
    return { recorded: false, duplicate: true, awardId: existing.awardId };
  }

  const row = buildAwardRow({
    gameId,
    awardType: 'perfect_candidate',
    playerId,
    teamId: player.teamId,
    nickname: player.nickname,
    completedAt,
    awardedAt: completedAt,
    note: finalQuestionId ? 'v4 finalQuestionId=' + finalQuestionId : 'v4 perfect candidate'
  });
  appendObject(sheet, row);
  return { recorded: true, awardId: row.awardId };
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
  const itemUseSync = syncFirebaseItemUsesForFinalSettlement(gameId);
  const creativeBonus = { applied: false, reason: '第 4 版已移除創作題與票選加分。' };
  const scoreboardResult = recalculateScoreboard({ gameId });
  const awards = finalizeAwards({ gameId }, payload);
  const finalizedAt = new Date().toISOString();
  const state = {
    ...getGameState({ gameId }),
    gameId,
    status: 'finalized',
    currentQuestionId: '',
    questionOpenedAt: '',
    sessionStartedAt: getGameState({ gameId }).sessionStartedAt || finalizedAt,
    gameSessionSeed: getGameState({ gameId }).gameSessionSeed || createGameSessionSeed(gameId, finalizedAt),
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
    itemUseSync,
    firebaseSync,
    scoreboardSync
  };
}

function startFinalSettlementCountdown(data, payload) {
  requireAdmin(payload);
  ensureGameSheetsReady();

  const gameId = String(data.gameId || getGameId());
  const currentState = getGameState({ gameId });
  const startedAt = new Date();
  const finalItemUseEndsAt = new Date(startedAt.getTime() + 15000).toISOString();
  const finalSettlementRunsAt = new Date(startedAt.getTime() + 20000).toISOString();
  const state = {
    ...currentState,
    gameId,
    status: 'finalizing_countdown',
    questionOpenedAt: '',
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || startedAt.toISOString(),
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || startedAt.toISOString()),
    updatedAt: startedAt.toISOString(),
    finalizingStartedAt: startedAt.toISOString(),
    finalItemUseEndsAt,
    finalSettlementRunsAt
  };

  upsertGameState(state);
  const firebaseSync = publishGameStateToFirebase(state);
  return {
    gameId,
    status: state.status,
    finalizingStartedAt: state.finalizingStartedAt,
    finalItemUseEndsAt,
    finalSettlementRunsAt,
    firebaseSync
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
  const playerId = requireText(data.playerId, 'playerId', 80);
  syncFirebasePlayersToSheet(gameId);
  const itemUseSync = syncFirebaseItemUsesForFinalSettlement(gameId);
  if (itemUseSync && itemUseSync.synced) {
    recalculateScoreboard({ gameId });
  }
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
  const playerAwardRows = readObjects(getSheetOrThrow(SHEET_AWARDS))
    .filter(row => row.gameId === gameId && row.playerId === playerId);
  const hasFinalPerfectAward = playerAwardRows.some(row => row.awardType === 'perfect');
  const awards = playerAwardRows
    .filter(row => !(hasFinalPerfectAward && row.awardType === 'perfect_candidate'))
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
    teamScore: teamRankIndex >= 0 ? Number(scoreboard[teamRankIndex].finalScore || scoreboard[teamRankIndex].totalScore || 0) : 0,
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
    .filter(row => row.gameId === gameId)
    .filter(row => !isComputerPlayer(row, gameId));
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
        answerScore: 0,
        itemScore: 0,
        correctCount: 0,
        answeredCount: 0,
        totalResponseSeconds: 0,
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
      const fallbackAnswerScore = Number(row.score || 0) - Number(row.itemBonusScore || 0);
      const answerScore = (row.baseScore === '' || row.baseScore === undefined || row.baseScore === null
        ? fallbackAnswerScore
        : Number(row.baseScore || 0)) + Number(row.firstCorrectBonus || 0);
      groups[key].answerScore += answerScore;
      groups[key].score += answerScore;
      groups[key].correctCount += row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true' ? 1 : 0;
      groups[key].answeredCount += 1;
      groups[key].totalResponseSeconds += Number(row.responseSeconds || 0);
    });

  getUniqueUsedScoringItemRows(gameId)
    .forEach(row => {
      const key = playerIdToKey[row.playerId];
      if (!key || !groups[key]) return;
      const effectScore = Number(row.effectScore || 0);
      groups[key].itemScore += effectScore;
      groups[key].score += effectScore;
    });

  return Object.values(groups);
}

function isComputerPlayer(player, gameId) {
  const clientKey = String(player && player.clientKey || '');
  const nickname = String(player && player.nickname || '');
  return clientKey.indexOf('computer_' + gameId + '_') === 0 || nickname.indexOf('電腦學員') === 0;
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

function syncFirebasePlayersToSheet(gameId, options) {
  const cache = getRuntimeCache();
  const syncCacheKey = CACHE_KEY_PLAYERS_SYNC_PREFIX + gameId;
  if (options && options.useRecentSyncCache && cache.get(syncCacheKey)) {
    return {
      skipped: true,
      reason: 'recent_players_sync_cache',
      gameId
    };
  }

  const players = getFirebaseJson('players/' + encodeURIComponent(gameId)) || {};
  const playerIds = Object.keys(players);
  if (!playerIds.length) {
    cache.put(syncCacheKey, '1', CACHE_TTL_SECONDS);
    return { skipped: false, gameId, playerCount: 0, newRowCount: 0 };
  }

  const sheet = getSheetOrThrow(SHEET_PLAYERS);
  const headers = getHeaders(sheet);
  const existingRows = readObjects(sheet);
  const existingIds = new Set(
    existingRows
      .filter(row => row.gameId === gameId)
      .map(row => String(row.playerId || ''))
  );
  const now = new Date().toISOString();
  const newRows = [];

  playerIds.forEach(playerId => {
    const data = players[playerId];
    if (!data || !data.playerId || existingIds.has(playerId)) return;
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
    newRows.push(row);
    existingIds.add(playerId);
    cachePlayer(row);
  });

  appendObjects(sheet, headers, newRows);
  cache.put(syncCacheKey, '1', CACHE_TTL_SECONDS);
  return {
    skipped: false,
    gameId,
    playerCount: playerIds.length,
    newRowCount: newRows.length
  };
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
  const answerHeaders = getHeaders(answerSheet);
  const existingIds = new Set(
    readObjects(answerSheet)
      .filter(row => row.gameId === gameId && row.questionId === questionId)
      .map(row => String(row.answerId || row.gameId + '_' + row.questionId + '_' + row.playerId))
  );
  const state = getGameState({ gameId });
  const fallbackOpenedAt = state.questionOpenedAt || state.updatedAt || new Date().toISOString();
  const paperOpenMap = buildPaperOpenMap(gameId, questionId);
  const newRows = [];

  Object.keys(answers).forEach(playerId => {
    const data = answers[playerId];
    if (!data || data.status !== 'submitted') return;
    const answerId = gameId + '_' + questionId + '_' + playerId;
    if (existingIds.has(answerId)) return;

    const submittedAt = data.submittedAt || new Date().toISOString();
    const paperOpenedAt = paperOpenMap[playerId]
      ? new Date(paperOpenMap[playerId])
      : new Date(data.paperOpenedAt || fallbackOpenedAt);
    const openedAt = isNaN(paperOpenedAt.getTime()) ? new Date(submittedAt) : paperOpenedAt;
    const submittedDate = new Date(submittedAt);
    const clientResponseSeconds = Number(data.responseSeconds || 0);
    const responseSeconds = normalizeV4ResponseSeconds(clientResponseSeconds > 0
      ? clientResponseSeconds
      : Math.max(0, Math.round((submittedDate.getTime() - openedAt.getTime()) / 1000)));
    const selectedAnswer = Array.isArray(data.selectedAnswer)
      ? data.selectedAnswer
      : parseAnswer(data.selectedAnswer || data.answer || '');

    newRows.push({
      answerId,
      gameId,
      questionId,
      playerId,
      teamId: data.teamId || '',
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
  appendObjects(answerSheet, answerHeaders, newRows);
}

function getItemUseSettleAtCloseSequence(data) {
  const sequence = Number(data && data.settleAtCloseSequence);
  return Number.isFinite(sequence) && sequence > 0 ? sequence : 0;
}

function getItemUseUsedAfterQuestionSequence(data) {
  const sequence = Number(data && data.usedAfterQuestionSequence);
  return Number.isFinite(sequence) && sequence > 0 ? sequence : 0;
}

function resolveItemUseTargetQuestionId(gameId, data, fallbackQuestionId) {
  const requestedTargetQuestionId = String(data && data.targetQuestionId || '');
  const settleAtCloseSequence = getItemUseSettleAtCloseSequence(data);

  if (requestedTargetQuestionId.indexOf('next:') === 0) {
    const bySequence = getQuestionIdByCloseSequence(gameId, settleAtCloseSequence);
    if (bySequence) return bySequence;
    const usedAfterQuestionId = String(data.usedAfterQuestionId || requestedTargetQuestionId.slice(5) || '');
    return getNextOpenedQuestionIdAfter(gameId, usedAfterQuestionId) || String(fallbackQuestionId || '');
  }

  return requestedTargetQuestionId || String(fallbackQuestionId || '');
}

function shouldSyncItemUseAtCloseSequence(data, currentCloseSequence) {
  const settleAtCloseSequence = getItemUseSettleAtCloseSequence(data);
  if (!settleAtCloseSequence || !currentCloseSequence) return true;
  return settleAtCloseSequence <= currentCloseSequence;
}

function syncFirebaseItemUsesForQuestionToSheet(gameId, questionId, currentCloseSequence) {
  const uses = getFirebaseJson('itemUses/' + encodeURIComponent(gameId)) || {};
  const itemSheet = getSheetOrThrow(SHEET_ITEM_RECORDS);
  const itemData = readSheetEntries(itemSheet);
  const newRows = [];
  const syncedItemUseIds = [];
  const getSyncedComebackEffectScore = teamId => {
    const usedCount = itemData.entries.filter(candidate =>
      candidate.row.gameId === gameId &&
      candidate.row.teamId === teamId &&
      candidate.row.itemType === 'comeback' &&
      candidate.row.status === 'used'
    ).length + newRows.filter(row =>
      row.gameId === gameId &&
      row.teamId === teamId &&
      row.itemType === 'comeback' &&
      row.status === 'used'
    ).length;
    return usedCount >= 1 ? COMEBACK_CARD_SECOND_USE_SCORE : COMEBACK_CARD_NORMAL_SCORE;
  };
  let changed = false;

  Object.keys(uses).forEach(itemUseId => {
    const data = uses[itemUseId];
    if (!data || data.status !== 'pending') return;
    if (!shouldSyncItemUseAtCloseSequence(data, currentCloseSequence)) return;

    const itemId = String(data.itemId || itemUseId || '');
    const resolvedTargetQuestionId = resolveItemUseTargetQuestionId(gameId, data, questionId);
    const usedAfterQuestionId = String(data.usedAfterQuestionId || '');
    const usedAfterQuestionSequence = getItemUseUsedAfterQuestionSequence(data);
    const settleAtCloseSequence = getItemUseSettleAtCloseSequence(data);
    if (resolvedTargetQuestionId && resolvedTargetQuestionId !== questionId) {
      return;
    }
    const entry = itemData.entries.find(candidate =>
      candidate.row.gameId === gameId &&
      candidate.row.itemId === itemId &&
      candidate.row.playerId === String(data.playerId || '') &&
      candidate.row.status === 'available'
    );
    const alreadySynced = itemData.entries.some(candidate =>
      candidate.row.gameId === gameId &&
      candidate.row.itemId === itemId &&
      candidate.row.playerId === String(data.playerId || '') &&
      candidate.row.status !== 'available'
    );
    if (alreadySynced) return;
    if (!entry) {
      const itemType = String(data.itemType || '');
      const now = data.createdAt || new Date().toISOString();
      const targetTeamId = String(data.targetTeamId || '');
      if (TEAM_SCORE_ITEM_EFFECTS[itemType]) {
        newRows.push({
          itemId,
          gameId,
          playerId: String(data.playerId || ''),
          teamId: String(data.teamId || ''),
          itemType,
          sourceBoxId: '',
          status: 'used',
          createdAt: now,
          usedAt: now,
          targetQuestionId: questionId,
          usedAfterQuestionId,
          usedAfterQuestionSequence,
          settleAtCloseSequence,
          targetTeamId: '',
          effectScore: TEAM_SCORE_ITEM_EFFECTS[itemType],
          note: 'synced from v4 client item use'
        });
        syncedItemUseIds.push(itemUseId);
        return;
      }
      if (itemType === 'challenge') {
        newRows.push({
          itemId,
          gameId,
          playerId: String(data.playerId || ''),
          teamId: String(data.teamId || ''),
          itemType,
          sourceBoxId: '',
          status: 'used',
          createdAt: now,
          usedAt: now,
          targetQuestionId: questionId,
          usedAfterQuestionId,
          usedAfterQuestionSequence,
          settleAtCloseSequence,
          targetTeamId,
          effectScore: Number(data.effectScore || 0),
          note: 'synced from v4 client challenge use'
        });
        syncedItemUseIds.push(itemUseId);
        return;
      }
      if (itemType === 'double') {
        newRows.push({
          itemId,
          gameId,
          playerId: String(data.playerId || ''),
          teamId: String(data.teamId || ''),
          itemType,
          sourceBoxId: '',
          status: 'armed',
          createdAt: now,
          usedAt: now,
          targetQuestionId: questionId,
          usedAfterQuestionId,
          usedAfterQuestionSequence,
          settleAtCloseSequence,
          targetTeamId: '',
          effectScore: '',
          note: 'synced from v4 client item use'
        });
        syncedItemUseIds.push(itemUseId);
        return;
      }
      if (itemType === 'comeback') {
        const clientEffectScore = Number(data.effectScore);
        newRows.push({
          itemId,
          gameId,
          playerId: String(data.playerId || ''),
          teamId: String(data.teamId || ''),
          itemType,
          sourceBoxId: '',
          status: 'used',
          createdAt: now,
          usedAt: now,
          targetQuestionId: questionId,
          usedAfterQuestionId,
          usedAfterQuestionSequence,
          settleAtCloseSequence,
          targetTeamId: '',
          effectScore: Number.isFinite(clientEffectScore) && clientEffectScore > 0
            ? clientEffectScore
            : getSyncedComebackEffectScore(String(data.teamId || '')),
          note: 'synced from v4 client item use'
        });
        syncedItemUseIds.push(itemUseId);
      }
      return;
    }

    const itemType = String(entry.row.itemType || data.itemType || '');
    const now = data.createdAt || new Date().toISOString();
    const targetTeamId = String(data.targetTeamId || '');

    if (TEAM_SCORE_ITEM_EFFECTS[itemType]) {
      setEntryValue(entry, itemData.headers, 'status', 'used');
      setEntryValue(entry, itemData.headers, 'usedAt', now);
      setEntryValue(entry, itemData.headers, 'targetQuestionId', questionId);
      setEntryValue(entry, itemData.headers, 'usedAfterQuestionId', usedAfterQuestionId);
      setEntryValue(entry, itemData.headers, 'usedAfterQuestionSequence', usedAfterQuestionSequence);
      setEntryValue(entry, itemData.headers, 'settleAtCloseSequence', settleAtCloseSequence);
      setEntryValue(entry, itemData.headers, 'targetTeamId', '');
      setEntryValue(entry, itemData.headers, 'effectScore', TEAM_SCORE_ITEM_EFFECTS[itemType]);
      changed = true;
      syncedItemUseIds.push(itemUseId);
      return;
    }

    if (itemType === 'double') {
      setEntryValue(entry, itemData.headers, 'status', 'armed');
      setEntryValue(entry, itemData.headers, 'usedAt', now);
      setEntryValue(entry, itemData.headers, 'targetQuestionId', questionId);
      setEntryValue(entry, itemData.headers, 'usedAfterQuestionId', usedAfterQuestionId);
      setEntryValue(entry, itemData.headers, 'usedAfterQuestionSequence', usedAfterQuestionSequence);
      setEntryValue(entry, itemData.headers, 'settleAtCloseSequence', settleAtCloseSequence);
      setEntryValue(entry, itemData.headers, 'targetTeamId', '');
      setEntryValue(entry, itemData.headers, 'effectScore', '');
      changed = true;
      syncedItemUseIds.push(itemUseId);
      return;
    }

    if (itemType === 'challenge') {
      setEntryValue(entry, itemData.headers, 'status', 'used');
      setEntryValue(entry, itemData.headers, 'usedAt', now);
      setEntryValue(entry, itemData.headers, 'targetQuestionId', questionId);
      setEntryValue(entry, itemData.headers, 'usedAfterQuestionId', usedAfterQuestionId);
      setEntryValue(entry, itemData.headers, 'usedAfterQuestionSequence', usedAfterQuestionSequence);
      setEntryValue(entry, itemData.headers, 'settleAtCloseSequence', settleAtCloseSequence);
      setEntryValue(entry, itemData.headers, 'targetTeamId', targetTeamId);
      setEntryValue(entry, itemData.headers, 'effectScore', Number(data.effectScore || 0));
      changed = true;
      syncedItemUseIds.push(itemUseId);
      return;
    }

    if (itemType === 'comeback') {
      const clientEffectScore = Number(data.effectScore);
      setEntryValue(entry, itemData.headers, 'status', 'used');
      setEntryValue(entry, itemData.headers, 'usedAt', now);
      setEntryValue(entry, itemData.headers, 'targetQuestionId', questionId);
      setEntryValue(entry, itemData.headers, 'usedAfterQuestionId', usedAfterQuestionId);
      setEntryValue(entry, itemData.headers, 'usedAfterQuestionSequence', usedAfterQuestionSequence);
      setEntryValue(entry, itemData.headers, 'settleAtCloseSequence', settleAtCloseSequence);
      setEntryValue(entry, itemData.headers, 'targetTeamId', '');
      setEntryValue(entry, itemData.headers, 'effectScore', Number.isFinite(clientEffectScore) && clientEffectScore > 0
        ? clientEffectScore
        : getSyncedComebackEffectScore(String(entry.row.teamId || data.teamId || '')));
      changed = true;
      syncedItemUseIds.push(itemUseId);
    }
  });

  if (changed) {
    writeSheetValues(itemSheet, itemData.values);
  }
  appendObjects(itemSheet, itemData.headers, newRows);
  syncedItemUseIds.forEach(itemUseId => {
    patchFirebaseJson('itemUses/' + encodeURIComponent(gameId) + '/' + encodeURIComponent(itemUseId), {
      status: 'synced',
      syncedAt: new Date().toISOString(),
      syncedQuestionId: questionId,
      syncedCloseSequence: currentCloseSequence || getQuestionCloseSequence(gameId, questionId)
    });
  });
  return { syncedCount: syncedItemUseIds.length, newRowCount: newRows.length, changed };
}

function syncFirebaseItemUsesForFinalSettlement(gameId) {
  const targetQuestionId = getLastSettlementQuestionId(gameId);
  if (!targetQuestionId) {
    return { synced: false, reason: 'no_target_question' };
  }
  const state = getGameState({ gameId });
  const baseCloseSequence = getQuestionCloseSequence(gameId, targetQuestionId);
  const currentCloseSequence = ['finalizing_countdown', 'finalized'].indexOf(String(state.status || '')) >= 0
    ? baseCloseSequence + 1
    : baseCloseSequence;
  const uses = getFirebaseJson('itemUses/' + encodeURIComponent(gameId)) || {};
  const questionIds = {};
  Object.keys(uses).forEach(itemUseId => {
    const data = uses[itemUseId];
    if (!data || data.status !== 'pending') return;
    if (!shouldSyncItemUseAtCloseSequence(data, currentCloseSequence)) return;
    const resolvedTargetQuestionId = resolveItemUseTargetQuestionId(gameId, data, targetQuestionId);
    questionIds[resolvedTargetQuestionId || targetQuestionId] = true;
  });
  const syncQuestionIds = Object.keys(questionIds);
  if (!syncQuestionIds.length) {
    syncQuestionIds.push(targetQuestionId);
  }
  syncQuestionIds.forEach(questionId => syncFirebaseItemUsesForQuestionToSheet(gameId, questionId, currentCloseSequence));
  return { synced: true, questionId: targetQuestionId, closeSequence: currentCloseSequence, syncedQuestionIds: syncQuestionIds };
}

function getLastSettlementQuestionId(gameId) {
  const state = getGameState({ gameId });
  if (state.currentQuestionId) {
    return String(state.currentQuestionId || '');
  }

  const openedQuestionIds = parseOpenedQuestionIds(state.openedQuestionIds || '');
  if (openedQuestionIds.length) {
    return openedQuestionIds[openedQuestionIds.length - 1];
  }

  const officialQuestionIds = getOfficialQuestionIds();
  return officialQuestionIds.length ? officialQuestionIds[officialQuestionIds.length - 1] : '';
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

function normalizeV4ResponseSeconds(rawSeconds) {
  const seconds = Math.max(0, Math.round(Number(rawSeconds || 0)));
  const remainingSeconds = Math.max(0, V4_ANSWER_TIME_LIMIT_SECONDS - seconds);
  if (remainingSeconds > 60) return 1;
  return Math.max(1, 60 - remainingSeconds);
}

function awardTreasureBoxesForCorrectAnswers(gameId, correctAnswers) {
  if (!correctAnswers || !correctAnswers.length) return [];

  const treasureSheet = getSheetOrThrow(SHEET_TREASURE_BOXES);
  const treasureHeaders = getHeaders(treasureSheet);
  const treasureData = readSheetEntries(treasureSheet);
  const itemRows = readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS));
  const sourceKeys = new Set(
    treasureData.entries
      .map(entry => entry.row)
      .filter(row => row.gameId === gameId)
      .map(row => String(row.sourceKey || ''))
      .filter(Boolean)
  );
  const rewardPoolData = readSheetEntries(getSheetOrThrow(SHEET_TREASURE_REWARD_POOL));
  const now = new Date().toISOString();
  const context = {
    answerRows: readObjects(getSheetOrThrow(SHEET_ANSWERS)),
    treasureRows: treasureData.entries.map(entry => entry.row),
    itemRows,
    sourceKeys,
    dropRate: getNumberRuleSetting('boxDropRateOnCorrect', TREASURE_DROP_RATE_ON_CORRECT)
  };
  const newRows = [];

  correctAnswers.forEach(row => {
    const sourceKey = [gameId, row.questionId, row.playerId, 'correct_drop'].join('_');
    if (sourceKeys.has(sourceKey) || Math.random() >= context.dropRate) return;

    const boxId = Utilities.getUuid();
    const itemType = consumePreassignedTreasureRewardFromEntries(
      gameId,
      row.playerId,
      boxId,
      rewardPoolData,
      now
    ) || resolveTreasureRewardType(gameId, row.playerId, context);
    const boxRow = {
      boxId,
      gameId,
      playerId: row.playerId,
      teamId: row.teamId,
      sourceType: 'correct_drop',
      sourceKey,
      status: 'unopened',
      awardedAt: now,
      openedAt: '',
      expiredAt: '',
      itemType,
      note: 'batch awarded for correct answer'
    };
    newRows.push(boxRow);
    sourceKeys.add(sourceKey);
    context.treasureRows.push(boxRow);
  });

  if (!newRows.length) return [];

  writeSheetValues(getSheetOrThrow(SHEET_TREASURE_REWARD_POOL), rewardPoolData.values);
  markExcessUnopenedTreasureRows(gameId, treasureData, newRows);
  appendObjects(treasureSheet, treasureHeaders, newRows);
  return newRows.filter(row => row.status === 'unopened');
}

function consumePreassignedTreasureRewardFromEntries(gameId, playerId, sourceBoxId, rewardPoolData, now) {
  const entry = rewardPoolData.entries
    .filter(candidate =>
      candidate.row.gameId === gameId &&
      candidate.row.playerId === playerId &&
      candidate.row.status === 'available'
    )
    .sort((a, b) => Number(a.row.slotIndex || 0) - Number(b.row.slotIndex || 0))[0];

  if (!entry) return '';

  setEntryValue(entry, rewardPoolData.headers, 'status', 'used');
  setEntryValue(entry, rewardPoolData.headers, 'sourceBoxId', sourceBoxId);
  setEntryValue(entry, rewardPoolData.headers, 'usedAt', now);
  return String(entry.row.itemType || 'empty');
}

function markExcessUnopenedTreasureRows(gameId, treasureData, newRows) {
  const maxBoxes = getNumberRuleSetting('maxBoxesPerPlayer', MAX_UNOPENED_TREASURE_BOXES);
  const byPlayer = {};

  treasureData.entries
    .filter(entry => entry.row.gameId === gameId && entry.row.status === 'unopened')
    .forEach(entry => {
      const playerId = String(entry.row.playerId || '');
      if (!byPlayer[playerId]) byPlayer[playerId] = [];
      byPlayer[playerId].push({ entry, row: entry.row, isNew: false });
    });

  newRows
    .filter(row => row.gameId === gameId && row.status === 'unopened')
    .forEach(row => {
      const playerId = String(row.playerId || '');
      if (!byPlayer[playerId]) byPlayer[playerId] = [];
      byPlayer[playerId].push({ row, isNew: true });
    });

  const now = new Date().toISOString();
  let changed = false;
  Object.keys(byPlayer).forEach(playerId => {
    const rows = byPlayer[playerId].sort((a, b) =>
      new Date(a.row.awardedAt || 0).getTime() - new Date(b.row.awardedAt || 0).getTime()
    );
    while (rows.length > maxBoxes) {
      const target = rows.shift();
      if (target.isNew) {
        target.row.status = 'discarded';
        target.row.expiredAt = now;
        target.row.note = appendNote(target.row.note, 'discarded by unopened limit');
        continue;
      }
      setEntryValue(target.entry, treasureData.headers, 'status', 'discarded');
      setEntryValue(target.entry, treasureData.headers, 'expiredAt', now);
      setEntryValue(target.entry, treasureData.headers, 'note', appendNote(target.entry.row.note, 'discarded by unopened limit'));
      changed = true;
    }
  });

  if (changed) {
    writeSheetValues(getSheetOrThrow(SHEET_TREASURE_BOXES), treasureData.values);
  }
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
  if (drawnItemType === 'comeback') {
    return hasPlayerEverHadComebackCard(gameId, playerId, context) ? 'score_5' : 'comeback';
  }
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
  let hasComeback = hasPlayerEverHadComebackCard(gameId, playerId) ||
    playerRows.some(row => row.itemType === 'comeback');

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
    if (itemType === 'comeback') {
      if (hasComeback) {
        itemType = 'score_5';
      } else {
        hasComeback = true;
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
  const teamRow = scoreboard.find(row => row.teamId === player.teamId);
  const scores = scoreboard.map(row => Number(row.weightedAverageScore || row.finalScore || row.totalScore || 0));
  const teamScore = teamRow ? Number(teamRow.weightedAverageScore || teamRow.finalScore || teamRow.totalScore || 0) : 0;
  const lowerTeamCount = scores.filter(score => score < teamScore).length;
  const sameScoreCount = scores.filter(score => score === teamScore).length;
  const isOnlyLastPlace = Boolean(teamRow) && scoreboard.length > 1 && lowerTeamCount === 0 && sameScoreCount === 1;
  const effectScore = usedCount >= 1
    ? COMEBACK_CARD_SECOND_USE_SCORE
    : isOnlyLastPlace
      ? COMEBACK_CARD_LAST_PLACE_SCORE
      : COMEBACK_CARD_NORMAL_SCORE;

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
    itemType === 'double' ||
    itemType === 'comeback' ||
    itemType === 'challenge' ||
    itemType === 'creative_bonus';
}

function getScoringItemDedupeKey(row) {
  const itemId = String(row.itemId || '').trim();
  if (itemId) {
    return [row.gameId, row.playerId, itemId].join('|');
  }
  return [
    row.gameId,
    row.playerId,
    row.itemType,
    row.sourceBoxId,
    row.targetQuestionId,
    row.targetTeamId,
    row.effectScore
  ].map(value => String(value || '')).join('|');
}

function getUniqueUsedScoringItemRows(gameId) {
  const seen = {};
  const rows = [];
  readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS))
    .filter(row => row.gameId === gameId && row.status === 'used' && isTeamBonusItem(row.itemType))
    .forEach(row => {
      const key = getScoringItemDedupeKey(row);
      if (seen[key]) return;
      seen[key] = true;
      rows.push(row);
    });
  return rows;
}

function getTeamBonusScores(gameId) {
  const scores = {};
  getUniqueUsedScoringItemRows(gameId)
    .forEach(row => {
      if (!scores[row.teamId]) scores[row.teamId] = 0;
      scores[row.teamId] += Number(row.effectScore || 0);
    });
  return scores;
}

function consumeArmedDoubleCard(itemData, gameId, playerId, questionId, isCorrect, preItemScore) {
  const entry = itemData.entries.find(candidate =>
    candidate.row.gameId === gameId &&
    candidate.row.playerId === playerId &&
    candidate.row.itemType === 'double' &&
    candidate.row.status === 'armed' &&
    candidate.row.targetQuestionId === questionId
  );

  if (!entry) return { score: 0, changed: false };

  const item = entry.row;
  const effectScore = isCorrect ? Number(preItemScore || 0) : 0;
  setEntryValue(entry, itemData.headers, 'status', 'used');
  setEntryValue(entry, itemData.headers, 'effectScore', effectScore);
  setEntryValue(entry, itemData.headers, 'note', appendNote(item.note, effectScore ? 'double card applied' : 'double card used without score'));
  return { score: effectScore, changed: true };
  /*
  updateItemUsage(itemSheet, itemHeaders, index + 2, {
    status: 'used',
    effectScore,
    note: appendNote(item.note, effectScore ? '加倍卡已套用到個人分數。' : '加倍卡已消耗，本題未答對所以未加分。')
  });
  item.status = 'used';
  item.effectScore = effectScore;
  return effectScore;
  */
}

function applyPendingChallengeCards(itemData, gameId, questionId) {
  const rates = getQuestionTeamCorrectRates(gameId, questionId);
  let appliedCount = 0;

  itemData.entries.forEach(entry => {
    const item = entry.row;
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
    setEntryValue(entry, itemData.headers, 'status', 'used');
    setEntryValue(entry, itemData.headers, 'effectScore', effectScore);
    setEntryValue(entry, itemData.headers, 'note', appendNote(item.note, 'challenge card applied'));
    appliedCount += 1;
    return;
    /*
    updateItemUsage(itemSheet, itemHeaders, index + 2, {
      status: 'used',
      effectScore,
      note: appendNote(item.note, '挑戰卡已依本題答對率結算。')
    });
    item.status = 'used';
    item.effectScore = effectScore;
    appliedCount += 1;
    */
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
  const officialQuestionIds = new Set(getScoreboardQuestionIds(gameId));
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
  const officialQuestionIds = new Set(getScoreboardQuestionIds(gameId));
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

function buildPaperOpenMap(gameId, questionId) {
  const map = {};
  readObjects(getSheetOrThrow(SHEET_PAPER_OPENS))
    .filter(row => row.gameId === gameId && row.questionId === questionId)
    .forEach(row => {
      const playerId = String(row.playerId || '');
      if (playerId && row.paperOpenedAt) {
        map[playerId] = row.paperOpenedAt;
      }
    });
  return map;
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

function rebuildPlayerScoresFromRecords(gameId) {
  const totals = {};
  const answerRows = readObjects(getSheetOrThrow(SHEET_ANSWERS))
    .filter(row => row.gameId === gameId && row.score !== '');
  const itemRows = getUniqueUsedScoringItemRows(gameId);

  readObjects(getSheetOrThrow(SHEET_PLAYERS))
    .filter(row => row.gameId === gameId)
    .forEach(row => {
      totals[row.playerId] = { score: 0, correctCount: 0 };
    });

  answerRows.forEach(row => {
    if (!totals[row.playerId]) totals[row.playerId] = { score: 0, correctCount: 0 };
    totals[row.playerId].score += Number(row.score || 0);
    totals[row.playerId].correctCount += row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true' ? 1 : 0;
  });

  itemRows.forEach(row => {
    if (!totals[row.playerId]) totals[row.playerId] = { score: 0, correctCount: 0 };
    totals[row.playerId].score += Number(row.effectScore || 0);
  });

  const sheet = getSheetOrThrow(SHEET_PLAYERS);
  const data = readSheetEntries(sheet);
  const now = new Date().toISOString();
  let changed = false;

  data.entries.forEach(entry => {
    if (entry.row.gameId !== gameId) return;
    const total = totals[entry.row.playerId] || { score: 0, correctCount: 0 };
    setEntryValue(entry, data.headers, 'score', Number(total.score || 0));
    setEntryValue(entry, data.headers, 'correctCount', Number(total.correctCount || 0));
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
  const nextState = index >= 0 ? { ...states[index], ...state } : state;

  if (index >= 0) {
    writeObjectAt(sheet, index + 2, nextState);
  } else {
    appendObject(sheet, nextState);
  }

  cacheGameState(nextState);
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
        sessionStartedAt: state.sessionStartedAt || state.createdAt || state.updatedAt || '',
        gameSessionSeed: state.gameSessionSeed || state.sessionSeed || state.sessionStartedAt || state.updatedAt || '',
        openedQuestionIds: state.openedQuestionIds || '',
        allowFreeTeamChoice: Boolean(state.allowFreeTeamChoice),
        creativeFinalVoteStartedAt: state.creativeFinalVoteStartedAt || '',
        finalizingStartedAt: state.finalizingStartedAt || '',
        finalItemUseEndsAt: state.finalItemUseEndsAt || '',
        finalSettlementRunsAt: state.finalSettlementRunsAt || '',
        additionalTreasureBoxLevel: Math.max(0, Number(state.additionalTreasureBoxLevel || 0)),
        additionalTreasureBoxUpdatedAt: state.additionalTreasureBoxUpdatedAt || '',
        additionalTreasureBoxSlots: state.additionalTreasureBoxSlots || '',
        laggingTreasureBoxTeams: state.laggingTreasureBoxTeams || '',
        laggingTreasureBoxUpdatedAt: state.laggingTreasureBoxUpdatedAt || '',
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

function deleteFirebasePath(path) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';
  if (!databaseUrl) {
    return { skipped: true, reason: '未設定 Firebase Realtime Database URL。' };
  }

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const safePath = String(path || '').replace(/^\/+/, '');
  const url = baseUrl + '/' + safePath + '.json';

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'delete',
      headers: {
        Authorization: 'Bearer ' + getFirebaseAccessToken()
      },
      muteHttpExceptions: true
    });
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      return {
        skipped: true,
        path: safePath,
        reason: 'Firebase delete failed: HTTP ' + statusCode,
        detail: response.getContentText().slice(0, 300)
      };
    }
    return { skipped: false, path: safePath };
  } catch (error) {
    return { skipped: true, path: safePath, reason: String(error && error.message ? error.message : error) };
  }
}

function clearFirebaseGameData(gameId) {
  const encodedGameId = encodeURIComponent(gameId || getGameId());
  const paths = [
    'players/' + encodedGameId,
    'answers/' + encodedGameId,
    'publicPlayers/' + encodedGameId,
    'publicAnswers/' + encodedGameId,
    'itemUses/' + encodedGameId,
    'settlementBatches/' + encodedGameId,
    'treasureBoxOpenRequests/' + encodedGameId,
    'achievementClaimRequests/' + encodedGameId,
    'creativeSubmissions/' + encodedGameId,
    'creativeTeamVotes/' + encodedGameId,
    'creativeFinalVotes/' + encodedGameId,
    'publicScoreboards/' + encodedGameId,
    'adminSecrets/' + encodedGameId,
    'adminProofs/' + encodedGameId
  ];

  return deleteFirebasePaths(paths);
}

function deleteFirebasePaths(paths) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';
  if (!databaseUrl) {
    return paths.map(path => ({ skipped: true, path, reason: '未設定 Firebase Realtime Database URL。' }));
  }

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const accessToken = getFirebaseAccessToken();
  const requests = paths.map(path => {
    const safePath = String(path || '').replace(/^\/+/, '');
    return {
      url: baseUrl + '/' + safePath + '.json',
      method: 'delete',
      headers: {
        Authorization: 'Bearer ' + accessToken
      },
      muteHttpExceptions: true
    };
  });

  try {
    const responses = UrlFetchApp.fetchAll(requests);
    return responses.map((response, index) => {
      const safePath = String(paths[index] || '').replace(/^\/+/, '');
      const statusCode = response.getResponseCode();
      if (statusCode < 200 || statusCode >= 300) {
        return {
          skipped: true,
          path: safePath,
          reason: 'Firebase delete failed: HTTP ' + statusCode,
          detail: response.getContentText().slice(0, 300)
        };
      }
      return { skipped: false, path: safePath };
    });
  } catch (error) {
    return paths.map(path => ({
      skipped: true,
      path: String(path || '').replace(/^\/+/, ''),
      reason: String(error && error.message ? error.message : error)
    }));
  }
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
    })),
    players: options.playerRows || buildPublicPlayerLeaderboardRows(gameId, 20),
    awards: options.awards === undefined ? buildPublicAwardRows(gameId) : options.awards
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
    playerCount: snapshot.players.length,
    updatedAt: now
  };
}

function buildPublicPlayerLeaderboardRows(gameId, limit) {
  return buildPublicPlayerLeaderboardRowsFromMergedPlayers(getMergedPlayers(gameId), limit);
}

function buildPublicPlayerLeaderboardRowsFromMergedPlayers(players, limit) {
  return (players || [])
    .map(row => ({
      playerId: row.playerIds && row.playerIds.length ? row.playerIds[0] : '',
      nickname: row.nickname || '學員',
      teamId: row.teamId || '',
      score: Number(row.score || 0),
      answerScore: Number(row.answerScore || 0),
      itemScore: Number(row.itemScore || 0),
      correctCount: Number(row.correctCount || 0),
      totalResponseSeconds: Number(row.totalResponseSeconds || 0),
      updatedAt: row.updatedAt || ''
    }))
    .sort((a, b) =>
      Number(b.score || 0) - Number(a.score || 0) ||
      String(a.nickname || '').localeCompare(String(b.nickname || ''))
    )
    .slice(0, Math.max(1, Math.min(Number(limit || 20), 50)));
}

function buildPublicAwardRows(gameId) {
  try {
    const rows = readObjects(getSheetOrThrow(SHEET_AWARDS))
      .filter(function(row) {
        return row.gameId === gameId && ['lucky', 'lucky_box', 'perfect', 'perfect_candidate'].indexOf(String(row.awardType || '')) >= 0;
      });
    const hasFinalPerfectAward = rows.some(function(row) {
      return String(row.awardType || '') === 'perfect';
    });
    const seen = {};
    return rows
      .filter(function(row) {
        if (hasFinalPerfectAward && String(row.awardType || '') === 'perfect_candidate') {
          return false;
        }
        const awardType = String(row.awardType || '');
        const dedupeType = awardType === 'perfect_candidate' ? 'perfect' : awardType;
        const dedupePlayer = String(row.playerId || row.nickname || '');
        const key = [dedupeType, dedupePlayer, String(row.teamId || '')].join('|');
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .map(function(row) {
        return {
          awardType: String(row.awardType || ''),
          playerId: String(row.playerId || ''),
          nickname: String(row.nickname || ''),
          teamId: String(row.teamId || ''),
          rank: row.rank || '',
          note: String(row.note || '')
        };
      });
  } catch (error) {
    return [];
  }
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

function getFirebaseJsonBatch(paths) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';

  const safePaths = (paths || [])
    .map(path => String(path || '').replace(/^\/+/, ''))
    .filter(Boolean);

  if (!databaseUrl || !safePaths.length) return {};

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const accessToken = getFirebaseAccessToken();
  const requests = safePaths.map(safePath => ({
    url: baseUrl + '/' + safePath + '.json',
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + accessToken
    },
    muteHttpExceptions: true
  }));
  const results = {};

  try {
    const responses = UrlFetchApp.fetchAll(requests);
    responses.forEach((response, index) => {
      const safePath = safePaths[index];
      const statusCode = response.getResponseCode();
      if (statusCode < 200 || statusCode >= 300) {
        Logger.log('Firebase batch read failed HTTP ' + statusCode + ' path ' + safePath + ': ' + response.getContentText());
        results[safePath] = null;
        return;
      }
      const text = response.getContentText();
      results[safePath] = text ? JSON.parse(text) : null;
    });
  } catch (error) {
    Logger.log('Firebase batch read failed: ' + String(error && error.message ? error.message : error));
    safePaths.forEach(safePath => {
      if (!Object.prototype.hasOwnProperty.call(results, safePath)) {
        results[safePath] = null;
      }
    });
  }

  return results;
}

function patchFirebaseJson(path, payload) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (!databaseUrl) {
    return { skipped: true, reason: 'Firebase Realtime Database URL is missing.' };
  }

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const safePath = String(path || '').replace(/^\/+/, '');
  const url = baseUrl + '/' + safePath + '.json';

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'patch',
      contentType: 'application/json',
      payload: JSON.stringify(payload || {}),
      headers: {
        Authorization: 'Bearer ' + getFirebaseAccessToken()
      },
      muteHttpExceptions: true
    });
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      return {
        skipped: true,
        path: safePath,
        reason: 'Firebase patch failed: HTTP ' + statusCode,
        detail: response.getContentText().slice(0, 300)
      };
    }
    return { skipped: false, path: safePath };
  } catch (error) {
    return { skipped: true, path: safePath, reason: String(error && error.message ? error.message : error) };
  }
}

function putFirebaseJson(path, payload) {
  const databaseUrl = PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL') ||
    'https://tychbniis-32af5-default-rtdb.asia-southeast1.firebasedatabase.app';

  if (!databaseUrl) {
    return { skipped: true, reason: 'Firebase Realtime Database URL is missing.' };
  }

  const baseUrl = databaseUrl.replace(/\/$/, '');
  const safePath = String(path || '').replace(/^\/+/, '');
  const url = baseUrl + '/' + safePath + '.json';

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'put',
      contentType: 'application/json',
      payload: JSON.stringify(payload || {}),
      headers: {
        Authorization: 'Bearer ' + getFirebaseAccessToken()
      },
      muteHttpExceptions: true
    });
    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      return {
        skipped: true,
        path: safePath,
        reason: 'Firebase put failed: HTTP ' + statusCode,
        detail: response.getContentText().slice(0, 300)
      };
    }
    return { skipped: false, path: safePath };
  } catch (error) {
    return { skipped: true, path: safePath, reason: String(error && error.message ? error.message : error) };
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
    isCreativeVote: String(q.isCreativeVote).toUpperCase() === 'TRUE',
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || ''
  };
}

function parseAnswer(value) {
  if (!value) return [];
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

function getQuestionBankCode(questionId) {
  const value = String(questionId || '').trim();
  if (value.indexOf('vac_q') === 0) return 'vaccine';
  if (value.indexOf('demo_q') === 0 || value.indexOf('test_q') === 0) return 'test';
  if (/^q\d+$/i.test(value)) return 'taiwan';
  const prefix = value.split('_')[0];
  return prefix || 'default';
}

function validateQuestions(rows) {
  const ids = new Set();
  const orders = new Set();

  rows.forEach(q => {
    if (!q.questionId) throw new Error('???? questionId');
    if (ids.has(q.questionId)) throw new Error('questionId ???' + q.questionId);
    ids.add(q.questionId);

    if (!q.order) throw new Error('???? order?' + q.questionId);
    const orderKey = getQuestionBankCode(q.questionId) + ':' + q.order;
    if (orders.has(orderKey)) throw new Error('???? order ???' + q.order + '?' + getQuestionBankCode(q.questionId) + '?');
    orders.add(orderKey);

    if (!q.type) throw new Error('???? type?' + q.questionId);
    if (!q.title) throw new Error('???? title?' + q.questionId);

    if (q.type !== 'creative' && !q.correctAnswer) {
      throw new Error('? creative ???? correctAnswer?' + q.questionId);
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
    ['treasureRate.score_1', 0.22, '小加分卡：戰隊 +1 的開箱機率。'],
    ['treasureRate.score_3', 0.18, '中加分卡：戰隊 +3 的開箱機率。'],
    ['treasureRate.score_5', 0.12, '大加分卡：戰隊 +5 的開箱機率。'],
    ['treasureRate.score_10', 0.05, '超級加分卡：戰隊 +10 的開箱機率。'],
    ['treasureRate.double', 0.1, '加倍卡的開箱機率。'],
    ['treasureRate.comeback', 0.05, '翻身卡的開箱機率。'],
    ['treasureRate.challenge', 0.2, '挑戰卡的開箱機率。'],
    ['treasureRate.special', 0.03, '特殊道具的開箱機率。'],
    ['treasureRate.empty', 0.05, '鼓勵語或空寶箱的開箱機率。'],
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

function getTestQuestionRows() {
  return [
    [
      "test_q001",
      1,
      "single",
      "系統測試",
      "這是一題測試題，正確答案是哪一個選項？",
      "A",
      "B",
      "C",
      "D",
      "",
      "A",
      "測試題用於確認開題、作答、關題與計分流程。",
      30,
      "timeBucket",
      false,
      false,
      true,
      "測試題庫"
    ],
    [
      "test_q002",
      2,
      "single",
      "系統測試",
      "測試題庫主要用途為何？",
      "正式評量學員",
      "活動前確認系統流程",
      "取代正式題庫",
      "清空所有資料",
      "",
      "B",
      "測試題庫只用於活動前確認流程。",
      30,
      "timeBucket",
      false,
      false,
      true,
      "測試題庫"
    ],
    [
      "test_q003",
      3,
      "single",
      "系統測試",
      "關題後應確認哪一項結果？",
      "題目是否消失",
      "是否已計分並更新排行榜",
      "是否刪除題庫",
      "是否登出所有學員",
      "",
      "B",
      "測試關題時，重點是確認計分與排行榜更新是否正常。",
      30,
      "timeBucket",
      false,
      false,
      true,
      "測試題庫"
    ]
  ];
}

function getDefaultQuestionRows() {
  return [
  [
    "q001",
    1,
    "single",
    "臺灣美食",
    "臺灣夜市常見的「大腸包小腸」是由什麼包著什麼？",
    "香腸包糯米腸",
    "糯米腸包香腸",
    "熱狗包香腸",
    "麵包包香腸",
    "",
    "B",
    "大腸包小腸是以糯米腸夾入香腸製成。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q002",
    2,
    "single",
    "臺灣交通",
    "臺北捷運中的優先座位通常稱為什麼？",
    "愛心座",
    "博愛座",
    "禮貌座",
    "長青座",
    "",
    "B",
    "博愛座供有需要者優先使用。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q003",
    3,
    "single",
    "臺灣地理",
    "臺灣最高峰是哪一座山？",
    "雪山",
    "玉山",
    "阿里山",
    "合歡山",
    "",
    "B",
    "玉山主峰海拔3952公尺。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q004",
    4,
    "single",
    "臺灣節慶",
    "端午節最具代表性的食物是什麼？",
    "月餅",
    "粽子",
    "湯圓",
    "發糕",
    "",
    "B",
    "端午節有吃粽子的傳統。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q005",
    5,
    "single",
    "臺灣生活",
    "臺灣便利商店最常見的服務之一是？",
    "辦護照",
    "繳費",
    "買房子",
    "辦貸款",
    "",
    "B",
    "超商可代收各類帳單。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q006",
    6,
    "single",
    "臺灣飲料",
    "珍珠奶茶中的珍珠通常是什麼製成？",
    "粉圓",
    "花生",
    "芋頭",
    "米粒",
    "",
    "A",
    "珍珠多為樹薯粉製成的粉圓。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q007",
    7,
    "single",
    "臺灣旅遊",
    "日月潭位於哪個縣市？",
    "宜蘭縣",
    "花蓮縣",
    "南投縣",
    "嘉義縣",
    "",
    "C",
    "日月潭位於南投縣魚池鄉。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q008",
    8,
    "single",
    "臺灣生活",
    "臺灣垃圾車常播放哪類音樂提醒民眾？",
    "古典樂",
    "搖滾樂",
    "爵士樂",
    "電音",
    "",
    "A",
    "最常聽到《給愛麗絲》等古典樂。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q009",
    9,
    "single",
    "臺灣節慶",
    "農曆新年發紅包時使用的袋子通常是什麼顏色？",
    "藍色",
    "白色",
    "紅色",
    "綠色",
    "",
    "C",
    "紅色象徵喜氣與吉祥。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q010",
    10,
    "single",
    "臺灣交通",
    "悠遊卡主要用途是什麼？",
    "買股票",
    "搭乘大眾運輸",
    "看醫生",
    "報稅",
    "",
    "B",
    "可用於捷運、公車及小額消費。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q011",
    11,
    "single",
    "臺灣美食",
    "牛肉麵常被認為是臺灣哪類代表性美食？",
    "傳統小吃",
    "國民美食",
    "宮廷料理",
    "西式餐點",
    "",
    "B",
    "牛肉麵是臺灣最具代表性的美食之一。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q012",
    12,
    "single",
    "臺灣地理",
    "臺灣最南端著名景點是？",
    "野柳",
    "鵝鑾鼻",
    "太魯閣",
    "九份",
    "",
    "B",
    "鵝鑾鼻燈塔位於屏東。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q013",
    13,
    "single",
    "臺灣文化",
    "媽祖遶境活動主要與哪種信仰有關？",
    "佛教",
    "基督教",
    "道教民間信仰",
    "伊斯蘭教",
    "",
    "C",
    "媽祖信仰是臺灣重要民間信仰。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q014",
    14,
    "single",
    "臺灣生活",
    "在臺灣購物時最常見的發票制度是？",
    "電子發票",
    "手寫收據",
    "禮券",
    "提貨券",
    "",
    "A",
    "電子發票已相當普及。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q015",
    15,
    "single",
    "臺灣運動",
    "哪一項運動被稱為臺灣國球？",
    "足球",
    "籃球",
    "棒球",
    "羽球",
    "",
    "C",
    "棒球在臺灣相當盛行。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q016",
    16,
    "single",
    "臺灣旅遊",
    "阿里山最有名的景觀之一是？",
    "火山",
    "日出",
    "沙漠",
    "冰河",
    "",
    "B",
    "阿里山日出聞名國際。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q017",
    17,
    "single",
    "臺灣美食",
    "臺灣臭豆腐的特色是什麼？",
    "很甜",
    "經過發酵",
    "冷凍食用",
    "不需烹調",
    "",
    "B",
    "臭豆腐經特殊發酵處理。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q018",
    18,
    "single",
    "臺灣生活",
    "臺灣民眾看病最常使用哪種證件？",
    "悠遊卡",
    "健保卡",
    "駕照",
    "護照",
    "",
    "B",
    "就醫時通常需攜帶健保卡。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q019",
    19,
    "single",
    "臺灣教育",
    "每年九月開始的新學期稱為？",
    "上學期",
    "下學期",
    "暑假",
    "寒假",
    "",
    "A",
    "臺灣學制多於九月開學。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ],
  [
    "q020",
    20,
    "single",
    "臺灣自然",
    "每年春季大量遊客前往澎湖欣賞什麼活動？",
    "賞雪",
    "花火節",
    "溫泉季",
    "賞楓",
    "",
    "B",
    "澎湖國際海上花火節相當知名。",
    60,
    "timeBucket",
    false,
    false,
    true,
    ""
  ]
  ];
}

function getVaccineQuestionRows() {
  return [
  [
    "vac_q001",
    1,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "關於疫苗冷儲溫度的日常監控，下列敘述何者最符合規範？",
    "疫苗冷儲溫度應維持在 0~8℃ 之間。",
    "出風口最低溫不得低於 2℃。",
    "每日至少於下班前查核記錄一次即可。",
    "若量測發現某層低溫常處於 2~3℃，應將不活化疫苗移至該層。",
    "",
    "B",
    "A： 錯誤。疫苗冷儲黃金溫度必須嚴格維持在 2~8℃ 之間，絕不可低至 0℃。\nC： 錯誤。每日必須「至少兩次」，建議於預注門診開始前、下班前各查核記錄一次。\nD： 錯誤。若低溫常處於 2~3℃，絕對不可擺放不活化疫苗以免發生凍結毀損，該區域應優先放置活性減毒疫苗。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q002",
    2,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "當診所發現 Data Logger 發出異常警報，且監視器材發生變化時，下列處置或判讀的組合何者正確？\n1. 發現溫度大於 8℃，應第一時間手動調低冰箱溫度以避免疫苗持續受熱。\n2. 若溫度監視片 (MonitorMark) 的 D 格變藍，代表疫苗暴露於 34℃ 以上至少 2 小時，疫苗全數毀損。\n3. 若冷凍監視片 (Freeze Watch) 小球破裂、白紙染深色，代表曾低於 0℃，此時不活化疫苗原則上毀損。\n4. 未經通報自行調溫若導致疫苗毀損，因為有積極處置，可列入「無需賠償」條件。",
    "1、2",
    "2、3",
    "2、4",
    "3、4",
    "",
    "B",
    "敘述 1： 錯誤。千萬別先調溫度！應先拍照錄影存證，並將疫苗移至備用設備後立即通報。\n敘述 4： 錯誤。未經通報自行調溫無法列入「無需賠償」條件，必須是自行發現異常且「主動通報並改善」才符合規定。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q003",
    3,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "為確認冰箱各層的溫度分佈，醫療院所每年至少需進行 2 次溫度分佈量測。依據規範，每一個監測點至少需持續放置測量多久時間？",
    "8 小時",
    "12 小時",
    "24 小時",
    "48 小時",
    "",
    "C",
    "A、B、D： 錯誤。為完整記錄冰箱在不同時段的溫度分佈狀況，使用 Data logger 進行量測時，每一處監測點必須放置「至少 24 小時」。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q004",
    4,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "關於電子式高低溫度計與 Data Logger 的日常操作，下列敘述何者正確？\n1. 判讀高低溫度計時，務必注意零下溫度的「-」負值符號，以免誤判。\n2. 電子高低溫度計每次讀取數值並記錄後，必須按壓「Reset」鍵才會重新開始監測。\n3. Data Logger 的監測頻率建議設定在 30 分鐘以內即可。\n4. Data Logger 出現電池圖示代表低電量，但仍可持續撐 6-10 個月再更換。",
    "1、2",
    "2、3",
    "1、4",
    "3、4",
    "",
    "A",
    "敘述 3： 錯誤。Data Logger 監測頻率應設定在「5 分鐘以內」，才能抓到瞬間的溫度波動。\n敘述 4： 錯誤。6-10 個月是電池的「總壽命」，一旦螢幕出現電池圖示，代表隨時可能沒電，須「立即更換電池」。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q005",
    5,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "疫苗冷藏庫的溫度監視器材是判斷疫苗是否毀損的重要依據，下列哪一種情形發生時，代表不活化疫苗原則上已全數毀損？",
    "溫度監視片 (MonitorMark) A 格開始變藍。",
    "冷凍監視片 (Freeze Watch) 拿出搖晃時小球破裂、白紙染成深色。",
    "溫度監視片 (MonitorMark) B 格開始變藍。",
    "Data Logger 出現 HIGH ALARM。",
    "",
    "B",
    "A、C： 錯誤。A 格與 B 格變藍代表溫度曾大於 10℃，需評估暴露時間，但若「D格變藍」才是全數毀損。\nD： 錯誤。HIGH ALARM 僅代表曾大於 8℃，需下載資料評估，不代表立刻全毀。冷凍監視片破裂代表曾低於 0℃，不活化疫苗原則毀損。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q006",
    6,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "發現疫苗冷藏庫發出溫度異常警報（如 >8℃）時，第一線人員的第一步驟應為何？",
    "立即調低冰箱溫度，並觀察半小時。",
    "直接將疫苗丟棄並通報衛生局。",
    "拍照錄影存證、下載紀錄，並將疫苗移至備用正常設備。",
    "暫停門診，等待維修人員前來處理。",
    "",
    "C",
    "A： 錯誤。千萬別先調溫度，未經通報自行調溫若導致毀損將無法列入「無需賠償」。\nB： 錯誤。需移置保留實體，由衛生局判定是否可用。\nD： 錯誤。首要任務是先保全疫苗移置並通報。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q007",
    7,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "冷鏈設備若發生故障並進行修復後，重新放入疫苗前的溫度監測規範，下列組合何者正確？\n1. 更換新冰箱或新壓縮機：需重新監測至少 2 週。\n2. 調控溫度或進行除霜：需重新監測至少 1 週。\n3. 短暫斷電復電未調溫：需重新監測至少 1~3 天。\n4. 只要冰箱顯示介面回到 5℃，即可立刻放入疫苗。",
    "1、2、3",
    "1、2、4",
    "2、3、4",
    "1、3、4",
    "",
    "A",
    "敘述 4： 錯誤。溫度回到 5℃ 不代表穩定，必須依照修復情境，完成規定的監測天數（如 1~3 天或 1~2 週），確認穩定維持 2~8℃ 後始能放入疫苗。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q008",
    8,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "依據溫度分布量測結果，若冰箱內某一層的低溫經常處於 2~3℃ 之間，該層應如何擺放疫苗？",
    "僅能擺放不活化疫苗。",
    "絕對不可擺放不活化疫苗。",
    "活性與不活化疫苗皆可擺放。",
    "用來擺放過期疫苗。",
    "",
    "B",
    "A、C： 錯誤。不活化疫苗若放置於 2~3℃ 區域，極易因些微溫差而結凍毀損，因此絕對不可擺放不活化疫苗，該最低溫區應優先置放活性減毒疫苗。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q009",
    9,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "關於 Data logger (溫度資料收集器) 的警報閾值設定，下列何者正確？",
    "高溫設 >10℃，低溫設 <0℃。",
    "高溫設 >8℃，低溫設 <2℃。",
    "高溫設 >6℃，低溫設 <4℃。",
    "高溫設 >15℃，低溫設 <2℃。",
    "",
    "B",
    "A、C、D： 錯誤。因疫苗黃金保存溫度為 2~8℃，故高溫警報需設為 >8℃，低溫設為 <2℃，才能在超出範圍時第一時間發出警示。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q010",
    10,
    "single",
    "冷鏈大作戰（冷鏈設備操作與溫度管理）",
    "為了確保溫度紀錄有被妥善保存，醫療院所應多久下載一次 Data Logger 的資料備查？",
    "每天下載 1 次。",
    "每半年下載 1 次。",
    "每年下載 1 次。",
    "建議每 2 週至 1 個月下載 1 次。",
    "",
    "D",
    "A： 錯誤。實務上無需每日下載。\nB、C： 錯誤。間隔太久若儀器故障會遺失大量資料，規範建議為每 2 週至 1 個月下載 1 次並存檔備查。\n--",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q011",
    11,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "關於各項疫苗的最小接種年齡、間隔時間與寬限期，以下情境的組合何者正確？\n1. 兩種不同的活性減毒疫苗（如水痘與 MMR）若未同時接種，最少須間隔 28 天。\n2. 幼童因家長出國行程，所有常規疫苗皆可適用「提前 4 天」的寬限期。\n3. B 型肝炎疫苗第 3 劑與第 1 劑必須嚴格間隔至少 16 週。\n4. 接受一般肌肉注射免疫球蛋白後，須間隔 11 個月才能接種水痘疫苗。",
    "1、3",
    "1、4",
    "2、3",
    "2、4",
    "",
    "A",
    "敘述 2： 錯誤。水痘、MMR 及日本腦炎 (JE) 等「活性減毒疫苗」不適用提早 4 天寬限期，若提前 5 天(含)以上施打則視同無效須重打。\n敘述 4： 錯誤。一般肌肉注射免疫球蛋白只需間隔 3 個月；接受靜脈注射「高劑量」免疫球蛋白（如川崎氏症治療）才須間隔 11 個月。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q012",
    12,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "一名 5 歲的國小新生準備入學，經查核發現其四合一 (DTaP-IPV) 前一劑是在 4 歲又 2 個月時接種。關於其入學前四合一疫苗的補種規範，下列何者正確？",
    "必須再補種 1 劑四合一疫苗。",
    "滿 5 歲的四合一疫苗免再施打。",
    "需補種 2 劑四合一疫苗以補足時程。",
    "因間隔過久視同未接種，需重新施打。",
    "",
    "B",
    "A、C： 錯誤。依規定，若前一劑四合一是在 4歲以後（含）才打，滿 5 歲的 DTaP-IPV 即可免再施打。\nD： 錯誤。疫苗漏打或延遲都不用從頭接種，接續完成未完成的劑次即可。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q013",
    13,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "關於各項疫苗的最小接種間隔，下列敘述何者完全正確？\n1. 口服輪狀病毒與口服小兒麻痺疫苗皆為口服，須至少間隔 2 週。\n2. B型肝炎疫苗第 3 劑與第 1 劑必須間隔至少 16 週。\n3. 若第 1 劑 PCV13 於滿 7 個月後才施打，與第 2 劑間隔可從 8 週縮短至 4 週。\n4. 不活化疫苗之間，必須間隔至少 14 天才能施打。",
    "1、2、3",
    "2、3、4",
    "1、3、4",
    "1、2、4",
    "",
    "A",
    "敘述 4： 錯誤。不活化疫苗之間（或與其他疫苗）可同時分開不同部位或間隔「任何時間」接種，無間隔限制。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q014",
    14,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "王小弟因病接受了一般肌肉注射免疫球蛋白 (含 HBIG)，請問他最少需要間隔多久，才能接種水痘或 MMR 等活性減毒疫苗？",
    "2 週",
    "4 週",
    "3 個月",
    "11 個月",
    "",
    "C",
    "A： 錯誤。是打完活性疫苗後才輸血需間隔 2 週。\nD： 錯誤。11 個月是針對靜脈注射「高劑量」免疫球蛋白（如川崎氏症）的規定；一般肌肉注射僅需 3 個月。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q015",
    15,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "林小妹現年 3 歲，因之前出國導致五合一疫苗漏打了第 3 劑，現回國欲補打，醫療人員應如何處置？",
    "要求從第 1 劑五合一重新開始施打。",
    "因延遲過久，五合一疫苗已失效，改打四合一。",
    "不用從頭接種，接續補足未完成的第 3、4 劑五合一即可。",
    "直接跳過五合一，等 5 歲再打入學前的疫苗。",
    "",
    "C",
    "A、B： 錯誤。漏打或延遲的常規疫苗「不用從頭接種」，接續完成即可。\nD： 錯誤。五合一提供基礎保護力，不可隨意跳過。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q016",
    16,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "針對國小新生入學前的預防接種補種規範，下列情境與處置的組合何者正確？\n1. 新生入學前完全無 MMR 紀錄，視同 0 劑，需補滿 2 劑。\n2. 新生無卡介苗紀錄，需安排補種完成 1 劑。\n3. 新生過去打過 3 劑「不活化」日本腦炎疫苗，滿 5 歲後不需再補打活性減毒疫苗。\n4. 新生前一劑 DTaP-IPV 是在 4 歲又 3 個月時施打，則滿 5 歲入學前免再施打 DTaP-IPV。",
    "1、2、3",
    "1、2、4",
    "2、3、4",
    "1、3、4",
    "",
    "B",
    "敘述 3： 錯誤。過去若打「不活化」日本腦炎滿 3 劑，滿 5 歲至入學前需再補「1 劑活性減毒」日本腦炎（與前劑間隔滿12個月）；只有過去打活性減毒滿 2 劑者才不需再補。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q017",
    17,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "因公務需緊急出國的民眾，欲同時施打黃熱病疫苗與 MMR 疫苗，下列敘述何者符合現行規範？",
    "可同時施打，且不會影響抗體生成。",
    "黃熱病與 MMR 不宜同時接種，最少應間隔 28 天。若緊急同時接種，須再補接種一劑 MMR 疫苗。",
    "黃熱病與 MMR 必須間隔半年才能施打。",
    "若緊急出國，可將兩支疫苗混合於同一針筒內施打。",
    "",
    "B",
    "A： 錯誤。最新規範指出不宜同時接種以免影響效力。\nC： 錯誤。最少間隔為 28 天。\nD： 錯誤。疫苗絕對不可混合於同一針筒施打。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q018",
    18,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "外籍移工父母帶著 1 歲幼兒來到衛生所，三方皆無全民健保，但母親持有台灣合法居留證。請問該幼兒是否符合公費常規疫苗的接種資格？",
    "不符合，必須要有健保才能施打。",
    "不符合，必須父母雙方都有居留證才能施打。",
    "符合，只要父母或幼兒三方之一有居留證，即可給予公費接種。",
    "符合，但只能施打半劑。",
    "",
    "C",
    "A、B： 錯誤。針對雙親皆外國人的幼兒，只要三方之中有任一方有加入健保，或「三方之一有居留證」，政府依然給予公費接種。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q019",
    19,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "關於同種類疫苗各劑次間的「提前 4 天」寬限期，下列哪些疫苗「不適用」此寬限期，一天都不能提早？\n1. B 型肝炎疫苗\n2. 水痘疫苗\n3. MMR 疫苗\n4. 13價肺炎鏈球菌疫苗",
    "1、4",
    "2、3",
    "1、2",
    "3、4",
    "",
    "B",
    "1、4： 屬於不活化疫苗，適用提前 4 天寬限期。\n2、3： 屬於「活性減毒疫苗」，不適用提早 4 天寬限期，若提前 5 天(含)以上打視同無效。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q020",
    20,
    "single",
    "時間管理大師（接種時程、間隔與補種規範）",
    "兩種不同的活性減毒疫苗（如水痘與 MMR），若家長無法讓幼童同一天施打，請問最少必須間隔幾天才能打第二種？",
    "7 天",
    "14 天",
    "21 天",
    "28 天",
    "",
    "D",
    "A、B、C： 錯誤。活性減毒疫苗未同時接種，最少須間隔 28 天。\n--",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q021",
    21,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "關於專案疫苗與桃園市地方補助計畫的資格與收費規範，下列敘述的組合何者正確？\n1. 單純施打公費新冠、流感或肺炎鏈球菌疫苗時，院所可向民眾收取掛號費與接種診察費。\n2. 桃園市帶狀疱疹補助計畫要求滿 50 歲市民除了完成流感與新冠疫苗，還必須已簽署「預立醫療決定書 (AD)」。\n3. 桃園市嬰幼兒腸病毒 71 型疫苗補助對象，為設籍該市且滿 2 個月至未滿 6 歲的低收/中低收入戶。\n4. 幫弱勢家庭施打輪狀病毒疫苗時，若超過補助上限 6,000 元，院所可向民眾收取差額。",
    "1、2",
    "2、3",
    "3、4",
    "1、4",
    "",
    "B",
    "敘述 1： 錯誤。政府已有給付處置費，單純打上述公費疫苗時，絕對「不得」再向民眾收取接種診察費（但可收掛號費）。\n敘述 4： 錯誤。地方弱勢補助有「零差額」規定，在補助計畫上限金額內，合約院所不得向民眾收取任何費用，包含差額。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q022",
    22,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "根據 114 年度流感疫苗專案計畫，下列哪個族群屬於「第二階段 (11/1起)」的公費接種對象？",
    "醫事與衛生防疫人員",
    "滿 6 個月至學齡前幼兒",
    "50-64 歲無高風險成人",
    "孕婦及 6 個月內嬰兒之雙親",
    "",
    "C",
    "A、B、D： 錯誤。醫事人員、孕婦、嬰幼兒及其雙親，皆屬於第一階段 (10/1起) 的優先接種對象。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q023",
    23,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "根據 114-115 年 COVID-19 疫苗計畫，65 歲以上等高風險對象欲施打「追加劑」，必須與前一劑間隔滿多少天？",
    "3 個月 (90天)",
    "4 個月 (120天)",
    "5 個月 (150天)",
    "6 個月 (180天)",
    "",
    "D",
    "A、B、C： 錯誤。高風險追加劑（115/4/7起）必須與前一劑間隔滿 6 個月 (180天) 才可再追加 1 劑。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q024",
    24,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "針對桃園市帶狀疱疹疫苗補助計畫，下列資格條件與收費原則的敘述，何者完全正確？\n1. 補助對象需設籍桃園滿 50 歲，且 114 年已完成流感與新冠疫苗。\n2. 市民必須已簽署「預立醫療決定書 (AD)」才符合資格。\n3. 從未接種者，第 1 劑可由衛生所免費提供，第 2 劑才需自費。\n4. 曾打過 1 劑者，間隔滿 2 個月，可免費接種 1 劑。",
    "1、2、3",
    "1、3、4",
    "1、2、4",
    "2、3、4",
    "",
    "C",
    "敘述 3： 錯誤。從未接種者是「先自費 8,000 元打第 1 劑」，間隔 2-6 個月再由衛生所「免費提供第 2 劑」。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q025",
    25,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "桃園市嬰幼兒腸病毒 71 型疫苗補助計畫中，每劑最高補助上限為多少元？每位幼童最多補助幾劑？",
    "上限 2,000 元，最多 2 劑",
    "上限 4,000 元，最多 3 劑",
    "上限 6,000 元，最多 3 劑",
    "上限 8,000 元，最多 2 劑",
    "",
    "B",
    "A、C、D： 錯誤。腸病毒 71 型實支實付，每劑最高上限 4,000 元，最多補助 3 劑。上限 6,000 元是口服輪狀病毒的「總額」上限。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q026",
    26,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "桃園市嬰幼兒口服輪狀病毒疫苗補助計畫，主要是針對哪個族群提供福利？",
    "設籍桃園市的所有幼兒",
    "設籍桃園市且滿 6 歲的國小學童",
    "設籍桃園市出生滿 6 至 32 週內之「低收或中低收入戶」幼兒",
    "設籍外縣市但在桃園就讀托嬰中心的幼童",
    "",
    "C",
    "A、B、D： 錯誤。必須設籍桃園市且具低收/中低收入戶資格，對象為出生滿 6 至 32 週內的嬰幼兒。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q027",
    27,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "關於各項專案疫苗及地方補助計畫的「收費鐵則」，下列敘述何者正確？\n1. 單純施打流感、新冠等公費疫苗時，絕對不得再向民眾收取「接種診察費」。\n2. 幫弱勢家庭施打腸病毒補助疫苗時，若超過補助上限 4,000 元，應向家屬收取差額。\n3. 單純打公費疫苗時，院所仍可向民眾收取掛號費。\n4. 在輪狀病毒補助計畫中，院所可在 6,000 元補助上限內，額外向低收入戶收取掛號費。",
    "1、2",
    "1、3",
    "2、4",
    "3、4",
    "",
    "B",
    "敘述 2、4： 錯誤。依據「零差額」規定，幫弱勢家庭施打補助計畫疫苗，在補助上限金額內，合約院所「不得向民眾收取任何費用（包含掛號費與差額）」。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q028",
    28,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "一位 70 歲長者前來診所，欲同時施打 COVID-19 疫苗、流感疫苗以及肺炎鏈球菌疫苗。醫療人員應如何處置？",
    "必須分開三天施打，以免副作用過強。",
    "可以同時接種，但需分開不同部位施打。",
    "只能同時施打兩種，第三種需間隔 7 天。",
    "可將三種疫苗混合於同一針筒內一次打完。",
    "",
    "B",
    "A、C： 錯誤。流感、新冠、肺炎鏈球菌可同時施打，無間隔限制。\nD： 錯誤。疫苗絕對不可混合施打。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q029",
    29,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "針對成人肺炎鏈球菌疫苗 (PPV/PCV) 擴大專案與轉換政策，下列敘述何者正確？\n1. 適用對象包含 65 歲以上長者及 55-64 歲原住民。\n2. 適用對象包含 19-64 歲 IPD 高風險對象。\n3. 自 115/1/15 起，提供公費對象 PCV20 或 PPV23 疫苗。\n4. 所有 19 歲以上的一般健康民眾皆可免費施打 PCV20。",
    "1、2、4",
    "1、3、4",
    "1、2、3",
    "2、3、4",
    "",
    "C",
    "敘述 4： 錯誤。19-64 歲對象僅限於「IPD 高風險對象」，並非全面開放給一般健康民眾。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q030",
    30,
    "single",
    "好康大放送（專案與地方補助計畫）",
    "根據 114 年度流感疫苗專案計畫，50-64 歲且「無」高風險慢性病的成人，應於哪個階段開始接種？",
    "第一階段 (10/1起)",
    "第二階段 (11/1起)",
    "第三階段 (12/1起)",
    "需全額自費，無公費補助。",
    "",
    "B",
    "A： 錯誤。10/1 起是針對 65 歲以上、醫事人員、孕婦等高風險優先族群。50-64 歲無高風險成人屬於第二階段 (11/1起)。\n--",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q031",
    31,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "針對特定對象（如 B 型肝炎高危險群及育齡婦女）的防護與追蹤計畫，下列處置的組合何者正確？\n1. 母親為 B 肝 s抗原陽性之新生兒，應於出生 24 小時內儘速接種 1 劑 HBIG 及 B肝疫苗。\n2. 高危險群幼兒滿 12 個月抽血發現 B 肝抗體陰性且非帶原，政府將先免費追加 1 劑，1 個月後重驗。\n3. 非高危險群幼兒若抽血發現抗體陰性，目前政府會全面公費追加 3 劑 B 肝疫苗。\n4. 15-49 歲育齡婦女接種公費 MMR 疫苗後，2 週內應避免懷孕即可。",
    "1、2",
    "1、3",
    "2、4",
    "3、4",
    "",
    "A",
    "敘述 3： 錯誤。非高危險群目前無全面公費追加。若擔憂可「自費」追加 1 劑，若陰性再採「0-1-6 個月」時程自費完成。\n敘述 4： 錯誤。育齡婦女接種 MMR 疫苗後的避孕禁忌期為「4 週內」應避免懷孕，並非 2 週。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q032",
    32,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "針對 B 型肝炎高危險群幼兒滿 12 個月大時的追蹤檢驗，下列敘述何者正確？",
    "家長須全額自費進行抽血檢驗。",
    "若檢驗為帶原者 (HBsAg陽性) 且肝功能正常，則需 6-12 個月追蹤。",
    "若抗體呈陰性，必須立刻自費從頭施打三劑疫苗。",
    "檢測項目僅包含 B 肝表面抗原 (HBsAg)，不需檢測抗體。",
    "",
    "B",
    "A： 錯誤。該項追蹤抽血檢測的檢驗費是由健保給付的。\nC： 錯誤。若抗體陰性且非帶原，政府會「免費追加 1 劑」，1 個月後重驗；若仍陰性，再接續公費完成第 2、3 劑。\nD： 錯誤。公費檢測項目包含 B 肝表面抗原 (HBsAg) 以及表面抗體 (anti-HBs)。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q033",
    33,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "若產婦經抽血檢驗為 B 型肝炎表面抗原 (s抗原) 陽性，新生兒應於何時施打 B 肝免疫球蛋白 (HBIG)？",
    "出生 24 小時內儘速施打。",
    "滿 1 個月時與 B 肝第 2 劑同時施打。",
    "滿 6 個月時施打。",
    "滿 12 個月大時抽血後再決定是否施打。",
    "",
    "A",
    "B、C、D： 錯誤。高危險群幼兒防護網規定，應於「出生 24 小時內儘速」接種 1 劑 HBIG 及 B 肝疫苗第 1 劑，以阻斷母子垂直感染。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q034",
    34,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "B肝高危險群幼兒滿 12 個月大時的追蹤檢驗，下列處置 SOP 何者正確？\n1. 抽血檢測項目須包含 B 肝表面抗原 (HBsAg) 及抗體 (anti-HBs)。\n2. 若有抗體代表已有保護力，無需再追加。\n3. 若為帶原者 (HBsAg陽性)，一律立刻進行抗病毒藥物治療。\n4. 此項抽血檢驗費由健保給付，家屬不需自費檢驗費。",
    "1、2、3",
    "1、2、4",
    "2、3、4",
    "1、3、4",
    "",
    "B",
    "敘述 3： 錯誤。若為帶原者且肝功能正常，則進行 6-12 個月追蹤即可，並非一律立刻投藥。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q035",
    35,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "非高危險群的幼兒，若家長自費帶去抽血發現 B 肝抗體陰性，政府的建議與補助政策為何？",
    "政府全面公費追加 3 劑疫苗。",
    "目前無須全面公費追加，若擔憂可自費追加 1 劑。",
    "立刻通報疾管署進行隔離。",
    "免費提供 B 肝免疫球蛋白 (HBIG)。",
    "",
    "B",
    "A： 錯誤。非高危險群目前無全面公費追加。\nC： 錯誤。抗體陰性僅無保護力，不具傳染性。\nD： 錯誤。HBIG 僅限出生 24 小時內之高危險群。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q036",
    36,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "公費 MMR 提供育齡婦女計畫中，針對 15-49 歲本國籍婦女的補助條件與禁忌，何者正確？\n1. 須檢具近 3 個月內德國麻疹抗體陰性報告。\n2. 產後婦女可持該胎產檢日起 2 年內的陰性報告補種。\n3. 若確定已經懷孕，為保護胎兒，應立即施打公費 MMR。\n4. 女性接種 MMR 疫苗後 4 週內應避免懷孕。",
    "1、2、3",
    "1、3、4",
    "1、2、4",
    "2、3、4",
    "",
    "C",
    "敘述 3： 錯誤。MMR 為活性減毒疫苗，孕婦「絕對禁用」，不可在孕期施打。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q037",
    37,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "育齡婦女在接種公費 MMR 疫苗後，醫療人員務必衛教其在多長的時間內應避免懷孕？",
    "1 週內",
    "2 週內",
    "4 週內",
    "半年內",
    "",
    "C",
    "A、B、D： 錯誤。依據禁忌規範，女性接種 MMR 疫苗後應避孕的時間為 4 週內。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q038",
    38,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "B 肝高危險群幼兒滿 1 歲時進行的公費抽血檢測，其「檢驗費」是由哪個單位負責給付？",
    "家長全額自付",
    "疾病管制署",
    "全民健保",
    "國民健康署",
    "",
    "C",
    "A、B、D： 錯誤。依據計畫，滿 12 個月大的 B 肝追蹤抽血，是由「健保給付檢驗費」。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q039",
    39,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "B 肝高危險群幼兒滿 12 個月抽血後，若發現抗體陰性且「非帶原」，後續補種機制為何？\n1. 要求家長立刻自費從頭打三劑。\n2. 先免費追加 1 劑 B肝疫苗。\n3. 追加 1 劑後，間隔 1 個月再重驗抗體。\n4. 若重驗抗體仍為陰性，政府將接續公費完成第 2、3 劑。",
    "1、2、3",
    "2、3、4",
    "1、3、4",
    "1、2、4",
    "",
    "B",
    "敘述 1： 錯誤。切勿直接要求自費，依計畫政府會先「免費追加 1 劑」，驗證無效後才會公費完成後續劑次。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q040",
    40,
    "single",
    "重點保護名單（特定對象防護網與追蹤）",
    "外籍配偶欲申請公費 MMR 疫苗，若無法提出德國麻疹抗體陰性報告，能否憑其他證明文件施打 1 劑？",
    "不可以，一定要有抽血報告。",
    "憑婚姻關係證明與居留/定居證明，即可直接提供 1 劑。",
    "需滿 50 歲以上才可免報告施打。",
    "憑原國籍的出生證明即可。",
    "",
    "B",
    "A、C、D： 錯誤。外籍配偶若無接種證明或報告，憑婚姻及居留證明可直接提供 1 劑。\n--",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q041",
    41,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "有關公費疫苗的毀損賠償與異常通報，下列情境與處置的組合何者正確？\n1. 發現疫苗顏色異常或包裝破損，應遵守「不使用、要拍照、速通報」原則，並保留實體清查同批號。\n2. 因冷鏈異常導致疫苗毀損，只要事後被衛生單位查獲時有積極配合改善，即可列為「無需賠償」。\n3. 若蓄意將公費疫苗挪作自費使用，將面臨原價外加 9 倍違約金（共 10 倍賠償）並得終止合約。\n4. 將公費疫苗打錯對象（非計畫對象）或重複接種，這類疫苗浪費應面臨 3 倍賠償。",
    "1、2",
    "1、3",
    "2、4",
    "3、4",
    "",
    "B",
    "敘述 2： 錯誤。必須是自行發現冷鏈異常且「主動通報並改善」，才能列入無需賠償；若被查獲才改善，須負擔原價賠償。\n敘述 4： 錯誤。打錯對象（非計畫對象）或重複接種屬於「原價賠償」等級；冷鏈異常被通知未改善才是 3 倍賠償。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q042",
    42,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "115 年 3 月起實施的疫苗接種處置費新制，有關申報與上傳的行政流程規定，下列何者正確？",
    "合約院所須一併向健保署及疾管署進行雙軌申報。",
    "疫苗施打後，最遲可於 1 個月內批次上傳資料至 NIIS 系統。",
    "合約院所必須於當日或隔日中午前將資料上傳至 NIIS 系統。",
    "若出現異常登錄資料，只要在 1 年內修正完成皆可核付費用。",
    "",
    "C",
    "A： 錯誤。新制起「免向健保署申報」，改由疾管署依 NIIS 系統資料直接核算撥付。\nB： 錯誤。資料上傳期限非常嚴格，務必於當日或隔日中午前上傳，不可拖延累積。\nD： 錯誤。若出現資格不符等異常登錄，超過 4 個月未修正完成，該筆費用直接不予核付，並非 1 年。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q043",
    43,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "下列哪一項屬於活性減毒疫苗（如 MMR、水痘、日本腦炎）的「絕對禁忌症」，一律不可施打？",
    "輕微流鼻水",
    "孕婦",
    "對雞蛋有輕微過敏史",
    "剛吃完退燒藥",
    "",
    "B",
    "A、C、D： 皆非絕對禁忌。孕婦、嚴重免疫缺失者絕對禁用活性減毒疫苗。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q044",
    44,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "關於特殊疾病或用藥病患的疫苗接種禁忌，下列敘述何者正確？\n1. 接種含百日咳疫苗後 7 天內曾發生腦病變者，禁用含百日咳疫苗。\n2. 早產兒只要出生滿一個月，不論體重即可施打卡介苗。\n3. 出生未滿 6 個月的嬰兒不可接種流感疫苗。\n4. 使用高劑量全身性皮質類固醇 (≧14天) 者，須停藥滿 28 天後方可接種日本腦炎等活性減毒疫苗。",
    "1、2、3",
    "1、3、4",
    "2、3、4",
    "1、2、4",
    "",
    "B",
    "敘述 2： 錯誤。卡介苗禁忌中明定，早產兒體重「未達 2,500公克」不可接種。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q045",
    45,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "醫療人員在抽取疫苗準備施打前，若發現疫苗外觀包裝破損或內容物有結塊雜質，應遵守哪項處理原則？",
    "搖晃均勻後繼續使用。",
    "遵守「不使用、要拍照、速通報」的三不原則。",
    "直接丟入醫療廢棄物桶。",
    "請民眾自行帶回處理。",
    "",
    "B",
    "A： 錯誤。異常品絕對不可打入人體。\nC、D： 錯誤。需「保留實體單獨冷藏」並清查同批號，由衛生局送交退換貨，不可隨意丟棄。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q046",
    46,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "有關公費疫苗毀損賠償等級，下列哪些情況屬於「無需賠償」？\n1. 病患扭動導致疫苗流失。\n2. 天災不可抗力導致冰箱斷電毀損。\n3. 自行發現冷鏈異常，並積極「主動通報」且改善者。\n4. 冷鏈異常被衛生單位查獲後，有馬上配合改善者。",
    "1、2、4",
    "1、3、4",
    "1、2、3",
    "2、3、4",
    "",
    "C",
    "敘述 4： 錯誤。被衛生單位查獲才配合改善者，需以「原價賠償」；必須是自行發現且「主動通報」才能免賠。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q047",
    47,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "若合約院所因冷鏈設備異常遭衛生單位通知，且經複查仍「未改善」，將面臨何種等級的賠償？",
    "無需賠償",
    "原價賠償",
    "3 倍賠償 (原價+2倍違約金)",
    "10 倍賠償",
    "",
    "C",
    "C： 正確。通知未改善者，罰則加重為 3 倍賠償。10倍是挪作自費。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q048",
    48,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "若合約院所「蓄意將公費疫苗挪作自費使用」向民眾收費，最高將面臨幾倍的違約賠償，並可能被終止合約？",
    "2 倍",
    "3 倍",
    "5 倍",
    "10 倍",
    "",
    "D",
    "A、B、C： 錯誤。蓄意挪作自費使用是極嚴重的違約，將面臨原價外加 9 倍違約金（共 10 倍賠償）並得終止合約。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q049",
    49,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "115 年 3 月起實施的疫苗接種處置費新制，下列金額調整與上傳規定何者正確？\n1. 6 歲以下幼兒每劑補助提高至 200 元。\n2. 一般民眾 (7歲以上) 每劑補助 150 元。\n3. 處置費免向健保署申報，改由疾管署依 NIIS 系統資料核付。\n4. NIIS 系統上傳資料最晚可拖延至次月底前完成即可。",
    "1、2、3",
    "1、2、4",
    "2、3、4",
    "1、3、4",
    "",
    "A",
    "敘述 4： 錯誤。防雷 TIP 明確指出，必須於「當日或隔日中午前」將資料上傳至 NIIS，超過期限或錯誤未於 4 個月內修正，將不予核付。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
  ],
  [
    "vac_q050",
    50,
    "single",
    "行政防雷指南（臨床禁忌、毀損賠償與處置費）",
    "處置費新制中，若合約院所被判定不予核付，欲提出申復並檢附病歷佐證，其「申復期限」為多久之內？",
    "1 個月內",
    "3 個月內",
    "6 個月內 (接種月之次月起 5個月內)",
    "1 年內",
    "",
    "C",
    "A、B、D： 錯誤。規範明定申復機制必須於 6 個月內提出，函送衛生局初審，轉區管中心複審。",
    60,
    "timeBucket",
    false,
    false,
    true,
    "疫苗教育訓練題庫"
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
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(PROPERTY_KEY_SETUP_READY_VERSION) === SHEET_SETUP_VERSION) {
    cache.put(CACHE_KEY_SETUP_READY, '1', CACHE_TTL_SECONDS);
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
    sessionStartedAt: state?.sessionStartedAt || state?.createdAt || state?.updatedAt || '',
    gameSessionSeed: state?.gameSessionSeed || state?.sessionSeed || state?.sessionStartedAt || state?.updatedAt || '',
    openedQuestionIds: state?.openedQuestionIds || '',
    additionalTreasureBoxLevel: Math.max(0, Number(state?.additionalTreasureBoxLevel || 0)),
    additionalTreasureBoxUpdatedAt: state?.additionalTreasureBoxUpdatedAt || '',
    additionalTreasureBoxSlots: state?.additionalTreasureBoxSlots || '',
    laggingTreasureBoxTeams: state?.laggingTreasureBoxTeams || '',
    laggingTreasureBoxUpdatedAt: state?.laggingTreasureBoxUpdatedAt || '',
    creativeFinalVoteStartedAt: state?.creativeFinalVoteStartedAt || '',
    allowFreeTeamChoice: state?.allowFreeTeamChoice === true || state?.allowFreeTeamChoice === 'true'
  };

  const normalized = {
    ...state,
    ...result
  };
  delete normalized.trialMode;
  delete normalized.trialSourceQuestionId;
  delete normalized.trialQuestionIds;
  delete normalized.trialClearedAt;
  delete normalized.clearedTrialQuestionIds;
  delete normalized.treasureGrantId;
  delete normalized.treasureGrantedAt;
  return normalized;
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
  cache.remove(CACHE_KEY_PLAYERS_SYNC_PREFIX + gameId);
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
    .filter(row => row.gameId === gameId)
    .filter(row => !isComputerPlayer(row, gameId));
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
  const officialQuestionIds = new Set(getScoreboardQuestionIds(gameId));
  const teamBonusScores = getTeamBonusScores(gameId);
  const state = getGameState({ gameId });
  const currentQuestionRates = state.status === 'question_closed' && state.currentQuestionId
    ? getQuestionTeamCorrectRates(gameId, state.currentQuestionId)
    : {};
  const validPlayerIds = new Set();

  getActiveTeamIds().forEach(teamId => {
    playerCountByTeam[teamId] = 0;
    answeredPlayerCountByTeam[teamId] = 0;
    rawTotalScoreByTeam[teamId] = 0;
    questionStatsByTeam[teamId] = {};
  });

  players.forEach(player => {
    (player.playerIds || []).forEach(playerId => validPlayerIds.add(String(playerId || '')));
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
    .filter(row => validPlayerIds.has(String(row.playerId || '')))
    .forEach(row => {
      const teamId = row.teamId || '';
      const questionId = row.questionId || '';
      if (!questionStatsByTeam[teamId]) questionStatsByTeam[teamId] = {};
      if (!questionStatsByTeam[teamId][questionId]) {
        questionStatsByTeam[teamId][questionId] = { totalScore: 0, answerCount: 0, correctCount: 0 };
      }
      const fallbackAnswerScore = Number(row.score || 0) - Number(row.itemBonusScore || 0);
      const answerScore = (row.baseScore === '' || row.baseScore === undefined || row.baseScore === null
        ? fallbackAnswerScore
        : Number(row.baseScore || 0)) + Number(row.firstCorrectBonus || 0);
      questionStatsByTeam[teamId][questionId].totalScore += answerScore;
      questionStatsByTeam[teamId][questionId].answerCount += 1;
      rawTotalScoreByTeam[teamId] = Number(rawTotalScoreByTeam[teamId] || 0) + answerScore;
      if (row.isCorrect === true || String(row.isCorrect).toLowerCase() === 'true') {
        questionStatsByTeam[teamId][questionId].correctCount += 1;
      }
    });

  const scoreboardSheet = getSheetOrThrow(SHEET_SCOREBOARD);
  clearDataRows(scoreboardSheet);
  const scoreboardHeaders = getHeaders(scoreboardSheet);
  const now = new Date().toISOString();
  const scoreboardRows = [];

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

    scoreboardRows.push({
      gameId,
      teamId,
      playerCount: Number(playerCountByTeam[teamId] || 0),
      effectivePlayerCount: Number(answeredPlayerCountByTeam[teamId] || 0),
      closedQuestionCount: questionIds.length,
      correctAnswerCount,
      correctRate,
      currentQuestionCorrectRate: Number(currentQuestionRates[teamId] || 0),
      totalScore: averageScore,
      averageScore,
      teamBonusScore,
      finalScore: averageScore + teamBonusScore,
      weightedAverageScore: averageScore + teamBonusScore,
      updatedAt: now
    });
  });

  scoreboardRows.sort((a, b) =>
    Number(b.finalScore || 0) - Number(a.finalScore || 0) ||
    Number(b.averageScore || 0) - Number(a.averageScore || 0) ||
    String(a.teamId || '').localeCompare(String(b.teamId || ''))
  );
  appendObjects(scoreboardSheet, scoreboardHeaders, scoreboardRows);

  const result = { gameId, teamCount: Object.keys(playerCountByTeam).length, updatedAt: now };
  if (data && data.includeMergedPlayers) {
    result.mergedPlayers = players;
  }
  return result;
}

function buildComebackControl(gameId, questionId, scoreboardRows) {
  const teamEffects = {};
  (scoreboardRows || []).forEach((row, index) => {
    const rank = index + 1;
    const isOpen = rank >= 5;
    teamEffects[row.teamId] = {
      rank,
      isOpen,
      effectScore: isOpen ? COMEBACK_CARD_LAST_PLACE_SCORE : COMEBACK_CARD_NORMAL_SCORE
    };
  });
  return {
    gameId,
    questionId,
    teamEffects,
    updatedAt: new Date().toISOString()
  };
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

function hasPlayerEverHadComebackCard(gameId, playerId, context) {
  const itemRows = context && context.itemRows
    ? context.itemRows
    : readObjects(getSheetOrThrow(SHEET_ITEM_RECORDS));
  const treasureRows = context && context.treasureRows
    ? context.treasureRows
    : readObjects(getSheetOrThrow(SHEET_TREASURE_BOXES));
  return itemRows.some(row => row.gameId === gameId && row.playerId === playerId && row.itemType === 'comeback') ||
    treasureRows.some(row => row.gameId === gameId && row.playerId === playerId && row.itemType === 'comeback');
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
  const validPlayerIds = new Set();

  getActiveTeamIds().forEach(teamId => {
    stats[teamId] = { total: 0, correct: 0 };
  });

  getMergedPlayers(gameId).forEach(player => {
    (player.playerIds || []).forEach(playerId => validPlayerIds.add(String(playerId || '')));
    if (!stats[player.teamId]) {
      stats[player.teamId] = { total: 0, correct: 0 };
    }
    stats[player.teamId].total += 1;
  });

  readObjects(getSheetOrThrow(SHEET_ANSWERS))
    .filter(row => row.gameId === gameId && row.questionId === questionId && row.score !== '')
    .filter(row => validPlayerIds.has(String(row.playerId || '')))
    .forEach(row => {
      const teamId = row.teamId || '';
      if (!stats[teamId]) {
        stats[teamId] = { total: 0, correct: 0 };
      }
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
  return closeQuestionAndRevealAnswer(data);
}

function closeAndScoreQuestionInline(data, payload) {
  requireAdmin(payload);
  const closeStartedAt = Date.now();
  const closeResult = closeQuestionAndRevealAnswer(data);
  const closeElapsedMs = Date.now() - closeStartedAt;

  try {
    const scoreStartedAt = Date.now();
    const scoreResult = scoreClosedQuestionNow(Object.assign({}, data, {
      knownCloseSequence: closeResult && closeResult.settlementBatch
        ? Number(closeResult.settlementBatch.closeSequence || 0)
        : 0
    }));
    return Object.assign({}, closeResult, scoreResult, {
      scoringQueued: false,
      closeResult,
      inlineScoring: {
        skipped: false,
        closeElapsedMs,
        scoreElapsedMs: Date.now() - scoreStartedAt,
        totalElapsedMs: Date.now() - closeStartedAt
      }
    });
  } catch (error) {
    return Object.assign({}, closeResult, {
      scoringQueued: true,
      inlineScoring: {
        skipped: true,
        closeElapsedMs,
        errorMessage: summarizeErrorForBatch(error)
      }
    });
  }
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

function closeQuestionAndRevealAnswer(data) {
  const timing = createCloseQuestionTimingTracker();
  ensureGameSheetsReady();
  timing.mark('ensureGameSheetsReady');

  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  const questionRows = readQuestionRows();
  timing.mark('readQuestionRows', { questionCount: questionRows.length });
  const question = questionRows.find(row => row.questionId === questionId);

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  const currentState = getGameState({ gameId });
  timing.mark('getGameState');
  const openedQuestionIds = currentState.openedQuestionIds || formatOpenedQuestionIds([questionId]);
  const now = new Date().toISOString();
  const answerReveal = buildClosedQuestionAnswerReveal(question);
  timing.mark('buildClosedQuestionAnswerReveal');
  const settlementBatch = ensureSettlementBatchPending(gameId, questionId, currentState);
  timing.mark('ensureSettlementBatchPending');
  const nextState = {
    gameId,
    status: 'question_closed',
    currentQuestionId: questionId,
    questionOpenedAt: '',
    sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
    gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || now),
    updatedAt: now,
    openedQuestionIds,
    allowFreeTeamChoice: currentState.allowFreeTeamChoice,
    creativeFinalVoteStartedAt: currentState.creativeFinalVoteStartedAt || '',
    answerReveal
  };
  upsertGameState(nextState);
  timing.mark('upsertGameState');
  const firebaseSync = publishGameStateToFirebase(nextState);
  timing.mark('publishGameStateToFirebase');
  const timingSummary = timing.finish({
    operation: 'closeQuestionAndRevealAnswer',
    gameId,
    questionId,
    settlementStatus: settlementBatch && settlementBatch.status || ''
  });
  logOperationTiming('closeQuestionRevealTiming', timingSummary);

  return {
    gameId,
    questionId,
    submittedCount: 0,
    scoredCount: 0,
    scoringQueued: true,
    correctAnswer: question.correctAnswer,
    correctAnswerText: answerReveal.correctAnswerText,
    explanation: answerReveal.explanation,
    scoreboard: [],
    firebaseSync,
    settlementBatch,
    timingSummary
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

function getSettlementBatchPath(gameId, closeSequence) {
  return 'settlementBatches/' + encodeURIComponent(gameId) + '/' + encodeURIComponent(String(closeSequence || ''));
}

function getSettlementBatchesForGame(gameId) {
  return getFirebaseJson('settlementBatches/' + encodeURIComponent(gameId)) || {};
}

function findSettlementBatchForQuestion(gameId, questionId) {
  const batches = getSettlementBatchesForGame(gameId);
  const targetQuestionId = String(questionId || '');
  const keys = Object.keys(batches || {});

  for (let index = 0; index < keys.length; index += 1) {
    const closeSequence = keys[index];
    const batch = batches[closeSequence];
    if (batch && String(batch.questionId || '') === targetQuestionId) {
      return Object.assign({ closeSequence: Number(closeSequence) || Number(batch.closeSequence || 0) }, batch);
    }
  }

  return null;
}

function summarizeSettlementBatch(closeSequence, batch) {
  const row = batch || {};
  const sequence = Number(row.closeSequence || closeSequence || 0);
  return {
    gameId: row.gameId || '',
    questionId: row.questionId || '',
    closeSequence: sequence || String(closeSequence || ''),
    status: row.status || '',
    lockedAt: row.lockedAt || '',
    processingStartedAt: row.processingStartedAt || '',
    doneAt: row.doneAt || '',
    failedAt: row.failedAt || '',
    updatedAt: row.updatedAt || '',
    timingTotalMs: Number(row.timingTotalMs || 0),
    submittedCount: Number(row.submittedCount || 0),
    scoredCount: Number(row.scoredCount || 0),
    challengeAppliedCount: Number(row.challengeAppliedCount || 0),
    scoreboardRows: Number(row.scoreboardRows || 0),
    mode: row.mode || '',
    fastPathFallbackReason: row.fastPathFallbackReason || '',
    errorMessage: row.errorMessage ? summarizeErrorForBatch(row.errorMessage) : '',
    version: row.version || ''
  };
}

function getSettlementBatchStatus(data, payload) {
  requireAdmin(payload);

  const gameId = String(data.gameId || getGameId());
  const questionId = String(data.questionId || '').trim();
  const closeSequenceFilter = String(data.closeSequence || '').trim();
  const batches = getSettlementBatchesForGame(gameId);
  const rows = Object.keys(batches || {})
    .map(closeSequence => summarizeSettlementBatch(closeSequence, batches[closeSequence]))
    .filter(row => !questionId || row.questionId === questionId)
    .filter(row => !closeSequenceFilter || String(row.closeSequence) === closeSequenceFilter)
    .sort((a, b) => Number(a.closeSequence || 0) - Number(b.closeSequence || 0));

  return {
    gameId,
    questionId,
    closeSequence: closeSequenceFilter,
    count: rows.length,
    latest: rows.length ? rows[rows.length - 1] : null,
    batches: rows,
    checkedAt: new Date().toISOString()
  };
}

function patchSettlementBatch(gameId, closeSequence, payload) {
  if (!closeSequence) {
    return { skipped: true, reason: 'missing_close_sequence' };
  }

  return patchFirebaseJson(getSettlementBatchPath(gameId, closeSequence), payload);
}

function ensureSettlementBatchPending(gameId, questionId, state) {
  const existing = findSettlementBatchForQuestion(gameId, questionId);
  const closeSequence = existing && existing.closeSequence
    ? Number(existing.closeSequence)
    : getQuestionCloseSequenceFromState(state, questionId);
  const now = new Date().toISOString();

  if (!closeSequence) {
    return { skipped: true, reason: 'missing_close_sequence' };
  }

  const payload = {
    gameId,
    questionId,
    closeSequence,
    status: existing && existing.status ? String(existing.status) : 'pending',
    lockedAt: existing && existing.lockedAt ? String(existing.lockedAt) : now,
    updatedAt: now,
    source: existing && existing.source ? String(existing.source) : 'close_question',
    version: GAS_BACKEND_VERSION
  };
  const firebaseSync = patchSettlementBatch(gameId, closeSequence, payload);
  return Object.assign({
    skipped: false,
    gameId,
    questionId,
    closeSequence,
    status: payload.status,
    reused: Boolean(existing)
  }, { firebaseSync });
}

function updateSettlementBatchStatus(gameId, questionId, status, extra) {
  const existing = findSettlementBatchForQuestion(gameId, questionId);
  const closeSequence = existing && existing.closeSequence
    ? Number(existing.closeSequence)
    : getQuestionCloseSequence(gameId, questionId);
  const now = new Date().toISOString();

  if (!closeSequence) {
    return { skipped: true, reason: 'missing_close_sequence' };
  }

  const payload = Object.assign({
    gameId,
    questionId,
    closeSequence,
    status,
    lockedAt: existing && existing.lockedAt ? String(existing.lockedAt) : now,
    updatedAt: now,
    source: existing && existing.source ? String(existing.source) : 'score_closed_question',
    version: GAS_BACKEND_VERSION
  }, extra || {});
  const firebaseSync = patchSettlementBatch(gameId, closeSequence, payload);
  return Object.assign({
    skipped: false,
    gameId,
    questionId,
    closeSequence,
    status,
    reused: Boolean(existing)
  }, { firebaseSync });
}

function updateSettlementBatchStatusBySequence(gameId, questionId, closeSequence, status, extra) {
  const sequence = Number(closeSequence || 0);
  if (!sequence) {
    return updateSettlementBatchStatus(gameId, questionId, status, extra);
  }

  const now = new Date().toISOString();
  const options = extra || {};
  const payload = Object.assign({
    gameId,
    questionId,
    closeSequence: sequence,
    status,
    lockedAt: options.lockedAt ? String(options.lockedAt) : now,
    updatedAt: now,
    source: options.source ? String(options.source) : 'score_closed_question',
    version: GAS_BACKEND_VERSION
  }, options);
  const firebaseSync = patchSettlementBatch(gameId, sequence, payload);
  return Object.assign({
    skipped: false,
    gameId,
    questionId,
    closeSequence: sequence,
    status,
    lockedAt: payload.lockedAt,
    reused: false,
    knownSequence: true
  }, { firebaseSync });
}

function scoreClosedQuestionFromFirebaseFast(data, timing) {
  let fastSettlementBatch = null;

  try {
  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  const forceLegacy = data.forceLegacy === true || String(data.forceLegacy || '').toLowerCase() === 'true';

  if (forceLegacy) {
    return null;
  }

  const encodedGameId = encodeURIComponent(gameId);
  const fastReadPaths = [
    'publicQuestions/' + encodedGameId,
    'players/' + encodedGameId,
    'answers/' + encodedGameId,
    'itemUses/' + encodedGameId
  ];
  const fastReadData = getFirebaseJsonBatch(fastReadPaths);
  timing.mark('fastBatchReadFirebase', { pathCount: fastReadPaths.length });

  const publicQuestions = normalizeFirebaseCollection(fastReadData[fastReadPaths[0]]);
  timing.mark('fastReadPublicQuestions', { questionCount: publicQuestions.length });
  let questionMap = buildFastQuestionMap(publicQuestions);
  let question = questionMap[questionId];

  if (!question) {
    const sheetQuestions = readQuestionRows();
    timing.mark('fastReadSheetQuestionsFallback', { questionCount: sheetQuestions.length });
    questionMap = buildFastQuestionMap(sheetQuestions);
    question = questionMap[questionId];
  }

  if (!question || String(question.type || '') === 'creative' || !question.correctAnswer) {
    timing.mark('fastPathSkipped', { reason: question ? 'unsupported_question_type' : 'missing_public_question' });
    return null;
  }

  const players = normalizeFirebaseCollection(fastReadData[fastReadPaths[1]])
    .filter(row => row && row.playerId && row.status === 'checked_in');
  timing.mark('fastReadFirebasePlayers', { playerCount: players.length });

  const answersByQuestion = fastReadData[fastReadPaths[2]] || {};
  const currentAnswers = normalizeFirebaseCollection(answersByQuestion[questionId])
    .filter(row => row && row.status === 'submitted');
  timing.mark('fastReadFirebaseAnswers', { submittedCount: currentAnswers.length });

  if (!players.length && currentAnswers.length > 0) {
    timing.mark('fastPathSkipped', { reason: 'missing_firebase_players' });
    return null;
  }

  const itemUses = normalizeFirebaseCollection(fastReadData[fastReadPaths[3]])
    .filter(row => row && ['pending', 'synced', 'used', 'armed'].indexOf(String(row.status || '')) >= 0);
  timing.mark('fastReadFirebaseItemUses', { itemUseCount: itemUses.length });
  if (itemUses.length) {
    timing.mark('fastPathSkipped', { reason: 'item_uses_require_legacy_sheet_path' });
    return null;
  }

  let knownCloseSequence = Number(data.knownCloseSequence || 0);
  if (knownCloseSequence) {
    timing.mark('fastUseKnownCloseSequenceForBatch');
  } else {
    const firebaseStateBeforeScoring = getFirebaseJson('gameState/' + encodedGameId) || {};
    timing.mark('fastReadFirebaseGameStateForBatch');
    knownCloseSequence = getQuestionCloseSequenceFromState(firebaseStateBeforeScoring, questionId);
  }
  const batchLockedAt = new Date().toISOString();
  fastSettlementBatch = updateSettlementBatchStatusBySequence(gameId, questionId, knownCloseSequence, 'processing', {
    lockedAt: batchLockedAt,
    processingStartedAt: batchLockedAt,
    mode: 'firebase_fast'
  });
  timing.mark('fastUpdateSettlementBatchProcessing');

  const scoreResult = buildFirebaseFastScoreResult({
    gameId,
    questionId,
    question,
    questionMap,
    players,
    answersByQuestion
  });
  timing.mark('fastBuildScoreResult', {
    submittedCount: scoreResult.submittedCount,
    scoredCount: scoreResult.scoredCount,
    scoreboardRows: scoreResult.scoreboard.length
  });

  const answerReveal = buildClosedQuestionAnswerReveal(question);
  const scoreboardSync = publishScoreboardSnapshotToFirebase({
    gameId,
    rows: scoreResult.scoreboard,
    playerRows: scoreResult.playerRows,
    awards: [],
    questionId,
    source: 'firebase_fast_instructor_close_question'
  });
  timing.mark('fastPublishScoreboardSnapshotToFirebase');

  const firebaseState = getFirebaseJson('gameState/' + encodedGameId) || {};
  timing.mark('fastReadFirebaseGameState');
  let firebaseSync = {
    skipped: true,
    reason: 'firebase_fast_state_not_current',
    currentStatus: firebaseState.status || '',
    currentQuestionId: firebaseState.currentQuestionId || ''
  };

  if (firebaseState.status === 'question_closed' && firebaseState.currentQuestionId === questionId) {
    firebaseSync = publishGameStateToFirebase({
      gameId,
      status: 'question_closed',
      currentQuestionId: questionId,
      questionOpenedAt: '',
      sessionStartedAt: firebaseState.sessionStartedAt || firebaseState.updatedAt || new Date().toISOString(),
      gameSessionSeed: firebaseState.gameSessionSeed || createGameSessionSeed(gameId, firebaseState.sessionStartedAt || firebaseState.updatedAt || new Date().toISOString()),
      updatedAt: new Date().toISOString(),
      openedQuestionIds: firebaseState.openedQuestionIds || '',
      allowFreeTeamChoice: firebaseState.allowFreeTeamChoice,
      creativeFinalVoteStartedAt: firebaseState.creativeFinalVoteStartedAt || '',
      answerReveal,
      comebackControl: buildComebackControl(gameId, questionId, scoreResult.scoreboard)
    });
    timing.mark('fastPublishGameStateToFirebase');
  }

  const timingSummary = timing.finish({
    mode: 'firebase_fast',
    gameId,
    questionId,
    submittedCount: scoreResult.submittedCount,
    scoredCount: scoreResult.scoredCount,
    challengeAppliedCount: 0,
    scoreboardRows: scoreResult.scoreboard.length
  });
  const doneBatch = updateSettlementBatchStatusBySequence(gameId, questionId, knownCloseSequence, 'done', {
    lockedAt: fastSettlementBatch && fastSettlementBatch.lockedAt || batchLockedAt,
    doneAt: new Date().toISOString(),
    timingTotalMs: timingSummary.totalMs,
    submittedCount: scoreResult.submittedCount,
    scoredCount: scoreResult.scoredCount,
    challengeAppliedCount: 0,
    scoreboardRows: scoreResult.scoreboard.length,
    mode: 'firebase_fast'
  });
  timing.mark('fastUpdateSettlementBatchDone');
  logCloseQuestionTiming(timingSummary);

  return {
    gameId,
    questionId,
    submittedCount: scoreResult.submittedCount,
    scoredCount: scoreResult.scoredCount,
    treasureAwardedCount: 0,
    challengeAppliedCount: 0,
    correctAnswer: question.correctAnswer,
    correctAnswerText: answerReveal.correctAnswerText,
    explanation: answerReveal.explanation,
    scoreboard: scoreResult.scoreboard,
    firebaseSync,
    playerSync: { skipped: true, reason: 'firebase_fast_no_sheet_sync' },
    itemUseSync: { skipped: true, reason: 'firebase_fast_no_item_uses' },
    treasureAwardSync: { skipped: true, reason: 'firebase_fast_no_question_box_award' },
    scoreboardSync,
    settlementBatch: doneBatch,
    timingSummary,
    mode: 'firebase_fast'
  };
  } catch (error) {
    if (fastSettlementBatch && !fastSettlementBatch.skipped) {
      updateSettlementBatchStatusBySequence(fastSettlementBatch.gameId, fastSettlementBatch.questionId, fastSettlementBatch.closeSequence, 'failed', {
        lockedAt: fastSettlementBatch.lockedAt || '',
        failedAt: new Date().toISOString(),
        errorMessage: summarizeErrorForBatch(error),
        mode: 'firebase_fast'
      });
    }
    throw error;
  }
}

function normalizeFirebaseCollection(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return Object.keys(value)
    .map(key => {
      const row = value[key];
      return row && typeof row === 'object' ? Object.assign({ firebaseKey: key }, row) : null;
    })
    .filter(Boolean);
}

function buildFastQuestionMap(publicQuestions) {
  const map = {};
  (publicQuestions || []).forEach(row => {
    if (row && row.questionId) {
      map[String(row.questionId)] = row;
    }
  });
  return map;
}

function buildFirebaseFastScoreResult(options) {
  const gameId = options.gameId;
  const questionId = options.questionId;
  const questionMap = options.questionMap || {};
  const playerMap = {};
  const playerStats = {};
  const teamStats = {};
  const questionStatsByTeam = {};
  const currentQuestionStatsByTeam = {};
  const officialQuestionIds = Object.keys(questionMap)
    .filter(id => questionMap[id] && String(questionMap[id].type || '') !== 'creative' && questionMap[id].correctAnswer);
  const now = new Date().toISOString();

  (options.players || []).forEach(player => {
    const playerId = String(player.playerId || '');
    const teamId = String(player.teamId || 'team_1');
    if (!playerId) return;
    playerMap[playerId] = player;
    playerStats[playerId] = {
      playerId,
      nickname: String(player.nickname || 'player'),
      teamId,
      score: 0,
      answerScore: 0,
      itemScore: 0,
      correctCount: 0,
      answeredCount: 0,
      totalResponseSeconds: 0,
      updatedAt: player.updatedAt || now
    };
    if (!teamStats[teamId]) {
      teamStats[teamId] = { playerCount: 0, effectivePlayerCount: 0 };
    }
    teamStats[teamId].playerCount += 1;
  });

  getDefaultFastTeamIds(options.players).forEach(teamId => {
    if (!teamStats[teamId]) {
      teamStats[teamId] = { playerCount: 0, effectivePlayerCount: 0 };
    }
  });

  officialQuestionIds.forEach(currentQuestionId => {
    const question = questionMap[currentQuestionId];
    const answers = normalizeFirebaseCollection((options.answersByQuestion || {})[currentQuestionId])
      .filter(row => row && row.status === 'submitted' && playerMap[String(row.playerId || '')]);
    const firstCorrectPlayerId = getFastFirstCorrectPlayerId(answers, question);

    answers.forEach(answer => {
      const playerId = String(answer.playerId || '');
      const player = playerMap[playerId];
      const teamId = String(answer.teamId || player.teamId || 'team_1');
      const responseSeconds = normalizeV4ResponseSeconds(Number(answer.responseSeconds || 0));
      const selectedAnswer = Array.isArray(answer.selectedAnswer)
        ? answer.selectedAnswer
        : parseAnswer(answer.selectedAnswer || answer.answer || '');
      const isCorrect = selectedAnswer.map(String).sort().join(',') === parseAnswer(question.correctAnswer).sort().join(',');
      const baseScore = calculateBaseScore(isCorrect, responseSeconds);
      const firstCorrectBonus = isCorrect && playerId === firstCorrectPlayerId ? FIRST_CORRECT_BONUS : 0;
      const answerScore = baseScore + firstCorrectBonus;
      const stats = playerStats[playerId];

      if (!stats) return;
      stats.score += answerScore;
      stats.answerScore += answerScore;
      stats.correctCount += isCorrect ? 1 : 0;
      stats.answeredCount += 1;
      stats.totalResponseSeconds += responseSeconds;
      stats.updatedAt = answer.submittedAt || stats.updatedAt;

      if (!questionStatsByTeam[teamId]) questionStatsByTeam[teamId] = {};
      if (!questionStatsByTeam[teamId][currentQuestionId]) {
        questionStatsByTeam[teamId][currentQuestionId] = { totalScore: 0, answerCount: 0, correctCount: 0 };
      }
      questionStatsByTeam[teamId][currentQuestionId].totalScore += answerScore;
      questionStatsByTeam[teamId][currentQuestionId].answerCount += 1;
      questionStatsByTeam[teamId][currentQuestionId].correctCount += isCorrect ? 1 : 0;

      if (currentQuestionId === questionId) {
        if (!currentQuestionStatsByTeam[teamId]) {
          currentQuestionStatsByTeam[teamId] = { answerCount: 0, correctCount: 0 };
        }
        currentQuestionStatsByTeam[teamId].answerCount += 1;
        currentQuestionStatsByTeam[teamId].correctCount += isCorrect ? 1 : 0;
      }
    });
  });

  Object.keys(playerStats).forEach(playerId => {
    const stats = playerStats[playerId];
    if (stats.answeredCount > 0 && teamStats[stats.teamId]) {
      teamStats[stats.teamId].effectivePlayerCount += 1;
    }
  });

  const scoreboard = Object.keys(teamStats).sort().map(teamId => {
    const questionStats = questionStatsByTeam[teamId] || {};
    const closedQuestionIds = Object.keys(questionStats);
    const averageScore = closedQuestionIds.reduce((total, id) => {
      const stat = questionStats[id];
      return total + (stat.answerCount ? stat.totalScore / stat.answerCount : 0);
    }, 0);
    const correctAnswerCount = closedQuestionIds.reduce((total, id) => total + Number(questionStats[id].correctCount || 0), 0);
    const answerDenominator = closedQuestionIds.reduce((total, id) => total + Number(questionStats[id].answerCount || 0), 0);
    const current = currentQuestionStatsByTeam[teamId] || { answerCount: 0, correctCount: 0 };

    return {
      gameId,
      teamId,
      playerCount: Number(teamStats[teamId].playerCount || 0),
      effectivePlayerCount: Number(teamStats[teamId].effectivePlayerCount || 0),
      closedQuestionCount: closedQuestionIds.length,
      correctAnswerCount,
      correctRate: answerDenominator ? correctAnswerCount / answerDenominator : 0,
      currentQuestionCorrectRate: current.answerCount ? current.correctCount / current.answerCount : 0,
      totalScore: averageScore,
      averageScore,
      teamBonusScore: 0,
      finalScore: averageScore,
      weightedAverageScore: averageScore,
      updatedAt: now
    };
  }).sort((a, b) =>
    Number(b.finalScore || 0) - Number(a.finalScore || 0) ||
    Number(b.averageScore || 0) - Number(a.averageScore || 0) ||
    String(a.teamId || '').localeCompare(String(b.teamId || ''))
  );

  const playerRows = Object.values(playerStats)
    .sort((a, b) =>
      Number(b.score || 0) - Number(a.score || 0) ||
      String(a.nickname || '').localeCompare(String(b.nickname || ''))
    )
    .slice(0, 20);

  return {
    submittedCount: normalizeFirebaseCollection((options.answersByQuestion || {})[questionId])
      .filter(row => row && row.status === 'submitted').length,
    scoredCount: normalizeFirebaseCollection((options.answersByQuestion || {})[questionId])
      .filter(row => row && row.status === 'submitted' && playerMap[String(row.playerId || '')]).length,
    scoreboard,
    playerRows
  };
}

function getDefaultFastTeamIds(players) {
  const ids = {};
  for (let index = 1; index <= DEFAULT_TEAM_COUNT; index += 1) {
    ids['team_' + index] = true;
  }
  (players || []).forEach(player => {
    if (player && player.teamId) ids[String(player.teamId)] = true;
  });
  return Object.keys(ids).sort();
}

function getFastFirstCorrectPlayerId(answers, question) {
  const correctAnswer = parseAnswer(question.correctAnswer).sort().join(',');
  return (answers || [])
    .filter(row => {
      const selectedAnswer = Array.isArray(row.selectedAnswer)
        ? row.selectedAnswer
        : parseAnswer(row.selectedAnswer || row.answer || '');
      return selectedAnswer.map(String).sort().join(',') === correctAnswer;
    })
    .sort((a, b) => new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime())
    .map(row => String(row.playerId || ''))[0] || '';
}

function summarizeErrorForBatch(error) {
  return String(error && error.message ? error.message : error).slice(0, 200);
}

function getFastPathFallbackReason(timing) {
  if (!timing || typeof timing.getStages !== 'function') {
    return '';
  }
  const stages = timing.getStages() || [];
  for (let index = stages.length - 1; index >= 0; index -= 1) {
    const stage = stages[index];
    if (stage && stage.stage === 'fastPathSkipped') {
      return String(stage.reason || 'unknown_fast_path_skip').slice(0, 120);
    }
  }
  return '';
}

function createCloseQuestionTimingTracker() {
  const startedAt = Date.now();
  let previousAt = startedAt;
  const stages = [];

  return {
    mark(stage, extra) {
      const now = Date.now();
      const entry = {
        stage: String(stage || ''),
        ms: now - previousAt,
        elapsedMs: now - startedAt
      };

      Object.keys(extra || {}).forEach(key => {
        const value = extra[key];
        if (value === null || ['string', 'number', 'boolean'].indexOf(typeof value) >= 0) {
          entry[key] = value;
        }
      });

      stages.push(entry);
      previousAt = now;
      return entry;
    },
    getStages() {
      return stages.slice();
    },
    finish(extra) {
      const finishedAt = Date.now();
      const summary = {
        version: GAS_BACKEND_VERSION,
        totalMs: finishedAt - startedAt,
        stages
      };

      Object.keys(extra || {}).forEach(key => {
        const value = extra[key];
        if (value === null || ['string', 'number', 'boolean'].indexOf(typeof value) >= 0) {
          summary[key] = value;
        }
      });

      return summary;
    }
  };
}

function logCloseQuestionTiming(summary) {
  logOperationTiming('closeQuestionTiming', summary);
}

function logOperationTiming(label, summary) {
  try {
    Logger.log(label + ' ' + JSON.stringify(summary));
  } catch (error) {
    Logger.log(label + ' failed: ' + String(error && error.message ? error.message : error));
  }
}

function scoreClosedQuestion(data, payload) {
  requireAdmin(payload);
  return scoreClosedQuestionNow(data);
}

function scoreClosedQuestionNow(data) {
  const timing = createCloseQuestionTimingTracker();
  let settlementBatch = null;

  try {
  const fastResult = scoreClosedQuestionFromFirebaseFast(data, timing);
  if (fastResult) {
    return fastResult;
  }

  ensureGameSheetsReady();
  timing.mark('ensureGameSheetsReady');

  const gameId = String(data.gameId || getGameId());
  const questionId = requireText(data.questionId, 'questionId', 80);
  const fastPathFallbackReason = getFastPathFallbackReason(timing);
  settlementBatch = updateSettlementBatchStatus(gameId, questionId, 'processing', {
    processingStartedAt: new Date().toISOString(),
    mode: 'legacy_sheet',
    fastPathFallbackReason
  });
  timing.mark('updateSettlementBatchProcessing');
  const playerSync = syncFirebasePlayersToSheet(gameId);
  timing.mark('syncFirebasePlayersToSheet');
  syncFirebaseAnswersForQuestionToSheet(gameId, questionId);
  timing.mark('syncFirebaseAnswersForQuestionToSheet');
  const itemUseSync = syncFirebaseItemUsesForFinalSettlement(gameId);
  timing.mark('syncFirebaseItemUsesForFinalSettlement');
  const questionRows = readQuestionRows();
  timing.mark('readQuestionRows', { questionCount: questionRows.length });
  const question = questionRows.find(row => row.questionId === questionId);

  if (!question) {
    throw new Error('找不到題目：' + questionId);
  }

  const correctAnswer = parseAnswer(question.correctAnswer).sort().join(',');
  const answerSheet = getSheetOrThrow(SHEET_ANSWERS);
  const answerData = readSheetEntries(answerSheet);
  timing.mark('readAnswerSheet', { answerRowCount: answerData.entries.length });
  const answers = answerData.entries.map(entry => entry.row);
  const itemSheet = getSheetOrThrow(SHEET_ITEM_RECORDS);
  const itemData = readSheetEntries(itemSheet);
  timing.mark('readItemSheet', { itemRowCount: itemData.entries.length });
  const firstCorrectPlayerId = getFirstCorrectPlayerId(answers, gameId, questionId, correctAnswer);
  let scoredCount = 0;
  let submittedCount = 0;
  let treasureAwardedCount = 0;
  const playerScoreDeltas = {};
  let answerRowsChanged = false;
  let itemRowsChanged = false;

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
    const doubleCardResult = consumeArmedDoubleCard(itemData, gameId, row.playerId, questionId, isCorrect, preItemScore);
    const itemBonusScore = Number(doubleCardResult.score || 0);
    itemRowsChanged = itemRowsChanged || Boolean(doubleCardResult.changed);
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
    scoredCount += 1;
  });
  timing.mark('calculateAnswerScores', { submittedCount, scoredCount });

  if (answerRowsChanged) {
    writeSheetValues(answerSheet, answerData.values);
  }
  timing.mark('writeAnswerSheet', { changed: answerRowsChanged });

  const treasureAwardSync = {
    skipped: true,
    reason: 'student_local_treasure_plan_handles_question_boxes'
  };
  const challengeAppliedCount = applyPendingChallengeCards(itemData, gameId, questionId);
  itemRowsChanged = itemRowsChanged || challengeAppliedCount > 0;
  timing.mark('applyPendingChallengeCards', { challengeAppliedCount });
  if (itemRowsChanged) {
    writeSheetValues(itemSheet, itemData.values);
  }
  timing.mark('writeItemSheet', { changed: itemRowsChanged });
  applyPlayerScoreDeltas(gameId, playerScoreDeltas);
  timing.mark('applyPlayerScoreDeltas');

  const currentState = getGameState({ gameId });
  timing.mark('getGameState');
  const openedQuestionIds = currentState.openedQuestionIds || formatOpenedQuestionIds([questionId]);
  const now = new Date().toISOString();
  const answerReveal = buildClosedQuestionAnswerReveal(question);
  let firebaseSync = {
    skipped: true,
    reason: 'score_closed_question_state_not_current',
    currentStatus: currentState.status || '',
    currentQuestionId: currentState.currentQuestionId || ''
  };
  if (currentState.status === 'question_closed' && currentState.currentQuestionId === questionId) {
    const nextState = {
      gameId,
      status: 'question_closed',
      currentQuestionId: questionId,
      questionOpenedAt: '',
      sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
      gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || now),
      updatedAt: now,
      openedQuestionIds,
      allowFreeTeamChoice: currentState.allowFreeTeamChoice,
      creativeFinalVoteStartedAt: currentState.creativeFinalVoteStartedAt || '',
      answerReveal
    };
    upsertGameState(nextState);
    timing.mark('upsertClosedQuestionState');
    firebaseSync = {
      skipped: true,
      reason: 'score_closed_question_waiting_for_scoreboard_payload'
    };
  }

  const scoreboardResult = recalculateScoreboard({ gameId, includeMergedPlayers: true });
  timing.mark('recalculateScoreboard');
  const scoreboard = getScoreboard({ gameId }).rows;
  timing.mark('getScoreboard', { scoreboardRows: scoreboard.length });
  const scoreboardSync = publishScoreboardSnapshotToFirebase({
    gameId,
    rows: scoreboard,
    playerRows: buildPublicPlayerLeaderboardRowsFromMergedPlayers(scoreboardResult.mergedPlayers || [], 20),
    questionId,
    source: 'instructor_close_question'
  });
  timing.mark('publishScoreboardSnapshotToFirebase');
  const comebackControl = buildComebackControl(gameId, questionId, scoreboard);
  timing.mark('buildComebackControl');
  if (currentState.status === 'question_closed' && currentState.currentQuestionId === questionId) {
    firebaseSync = publishGameStateToFirebase({
      gameId,
      status: 'question_closed',
      currentQuestionId: questionId,
      questionOpenedAt: '',
      sessionStartedAt: currentState.sessionStartedAt || currentState.updatedAt || now,
      gameSessionSeed: currentState.gameSessionSeed || createGameSessionSeed(gameId, currentState.sessionStartedAt || now),
      updatedAt: now,
      openedQuestionIds,
      allowFreeTeamChoice: currentState.allowFreeTeamChoice,
      creativeFinalVoteStartedAt: currentState.creativeFinalVoteStartedAt || '',
      answerReveal,
      comebackControl
    });
    timing.mark('publishGameStateToFirebase');
  }
  const timingSummary = timing.finish({
    gameId,
    questionId,
    submittedCount,
    scoredCount,
    challengeAppliedCount,
    scoreboardRows: scoreboard.length
  });
  settlementBatch = updateSettlementBatchStatus(gameId, questionId, 'done', {
    doneAt: new Date().toISOString(),
    timingTotalMs: timingSummary.totalMs,
    submittedCount,
    scoredCount,
    challengeAppliedCount,
    scoreboardRows: scoreboard.length,
    mode: 'legacy_sheet',
    fastPathFallbackReason
  });
  timing.mark('updateSettlementBatchDone');
  logCloseQuestionTiming(timingSummary);

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
    playerSync,
    itemUseSync,
    treasureAwardSync,
    scoreboardSync,
    settlementBatch,
    timingSummary
  };
  } catch (error) {
    if (settlementBatch && !settlementBatch.skipped) {
      updateSettlementBatchStatus(settlementBatch.gameId, settlementBatch.questionId, 'failed', {
        failedAt: new Date().toISOString(),
        errorMessage: summarizeErrorForBatch(error)
      });
    }
    throw error;
  }
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
        sessionStartedAt: state.sessionStartedAt || state.createdAt || state.updatedAt || '',
        gameSessionSeed: state.gameSessionSeed || state.sessionSeed || state.sessionStartedAt || state.updatedAt || '',
        openedQuestionIds: state.openedQuestionIds || '',
        allowFreeTeamChoice: Boolean(state.allowFreeTeamChoice),
        creativeFinalVoteStartedAt: state.creativeFinalVoteStartedAt || '',
        finalizingStartedAt: state.finalizingStartedAt || '',
        finalItemUseEndsAt: state.finalItemUseEndsAt || '',
        finalSettlementRunsAt: state.finalSettlementRunsAt || '',
        additionalTreasureBoxLevel: Math.max(0, Number(state.additionalTreasureBoxLevel || 0)),
        additionalTreasureBoxUpdatedAt: state.additionalTreasureBoxUpdatedAt || '',
        additionalTreasureBoxSlots: state.additionalTreasureBoxSlots || '',
        laggingTreasureBoxTeams: state.laggingTreasureBoxTeams || '',
        laggingTreasureBoxUpdatedAt: state.laggingTreasureBoxUpdatedAt || '',
        comebackControl: state.comebackControl || null,
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
