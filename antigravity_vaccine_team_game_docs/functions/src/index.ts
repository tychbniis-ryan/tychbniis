import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const firestore = getFirestore();
const realtimeDb = getDatabase();

type JoinGameInput = {
  gameId?: string;
  nickname?: string;
  teamId?: string;
};

type CreateGameInput = {
  title?: string;
  courseTitle?: string;
  teamCount?: number;
};

type QuestionInput = {
  gameId?: string;
  questionId?: string;
};

type SubmitAnswerInput = QuestionInput & {
  answer?: unknown;
};

const DEFAULT_TEAM_COUNT = 5;

function requireSignedIn(uid?: string): string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "請先登入。");
  }
  return uid;
}

function requireText(value: unknown, fieldName: string, maxLength = 80): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${fieldName} 格式錯誤。`);
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new HttpsError("invalid-argument", `${fieldName} 不可空白，且長度不可超過 ${maxLength} 字。`);
  }

  return trimmed;
}

function sanitizeNickname(nickname: string): string {
  const idPattern = /[A-Z][12]\d{8}/i;
  if (idPattern.test(nickname)) {
    throw new HttpsError("invalid-argument", "暱稱不可包含身分證字號格式。");
  }
  return nickname.replace(/[<>]/g, "");
}

async function assertAdmin(uid: string): Promise<void> {
  const adminDoc = await firestore.collection("admins").doc(uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "此操作需要管理員權限。");
  }
}

async function pickLeastLoadedTeam(gameId: string, teamCount: number): Promise<string> {
  const snapshot = await firestore.collection("players")
    .where("gameId", "==", gameId)
    .get();

  const counts = new Map<string, number>();
  for (let index = 1; index <= teamCount; index += 1) {
    counts.set(`team_${index}`, 0);
  }

  snapshot.docs.forEach(doc => {
    const teamId = doc.get("teamId");
    if (typeof teamId === "string" && counts.has(teamId)) {
      counts.set(teamId, (counts.get(teamId) || 0) + 1);
    }
  });

  return [...counts.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0][0];
}

export const createGame = onCall<CreateGameInput>(async request => {
  const uid = requireSignedIn(request.auth?.uid);
  await assertAdmin(uid);

  const title = requireText(request.data.title, "title", 60);
  const courseTitle = requireText(request.data.courseTitle, "courseTitle", 80);
  const teamCount = Number(request.data.teamCount || DEFAULT_TEAM_COUNT);

  if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > 10) {
    throw new HttpsError("invalid-argument", "teamCount 必須介於 2 到 10。");
  }

  const gameRef = firestore.collection("games").doc();
  await gameRef.set({
    title,
    courseTitle,
    teamCount,
    status: "draft",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid
  });

  return { gameId: gameRef.id };
});

export const joinGame = onCall<JoinGameInput>(async request => {
  const uid = requireSignedIn(request.auth?.uid);
  const gameId = requireText(request.data.gameId, "gameId", 80);
  const nickname = sanitizeNickname(requireText(request.data.nickname, "nickname", 20));

  const gameDoc = await firestore.collection("games").doc(gameId).get();
  if (!gameDoc.exists) {
    throw new HttpsError("not-found", "找不到指定場次。");
  }

  const teamCount = Number(gameDoc.get("teamCount") || DEFAULT_TEAM_COUNT);
  const requestedTeamId = typeof request.data.teamId === "string" ? request.data.teamId.trim() : "";
  const teamId = requestedTeamId || await pickLeastLoadedTeam(gameId, teamCount);

  await firestore.collection("players").doc(uid).set({
    gameId,
    nickname,
    teamId,
    score: 0,
    joinedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { playerId: uid, teamId };
});

export const openQuestion = onCall<QuestionInput>(async request => {
  const uid = requireSignedIn(request.auth?.uid);
  await assertAdmin(uid);

  const gameId = requireText(request.data.gameId, "gameId", 80);
  const questionId = requireText(request.data.questionId, "questionId", 80);

  await firestore.collection("questions").doc(questionId).set({
    gameId,
    status: "open",
    openedAt: FieldValue.serverTimestamp(),
    openedBy: uid
  }, { merge: true });

  await realtimeDb.ref(`gameState/${gameId}`).update({
    currentQuestionId: questionId,
    status: "question_open",
    updatedAt: Date.now()
  });

  return { questionId, status: "open" };
});

export const submitAnswer = onCall<SubmitAnswerInput>(async request => {
  const uid = requireSignedIn(request.auth?.uid);
  const gameId = requireText(request.data.gameId, "gameId", 80);
  const questionId = requireText(request.data.questionId, "questionId", 80);

  if (typeof request.data.answer === "undefined") {
    throw new HttpsError("invalid-argument", "answer 不可空白。");
  }

  const questionDoc = await firestore.collection("questions").doc(questionId).get();
  if (!questionDoc.exists || questionDoc.get("status") !== "open") {
    throw new HttpsError("failed-precondition", "題目尚未開放或已關閉。");
  }

  const answerId = `${gameId}_${questionId}_${uid}`;
  const answerRef = firestore.collection("answers").doc(answerId);

  await firestore.runTransaction(async transaction => {
    const existing = await transaction.get(answerRef);
    if (existing.exists) {
      throw new HttpsError("already-exists", "每人每題只能作答一次。");
    }

    transaction.set(answerRef, {
      gameId,
      questionId,
      playerId: uid,
      answer: request.data.answer,
      submittedAt: FieldValue.serverTimestamp()
    });
  });

  return { answerId, submitted: true };
});

export const closeAndScoreQuestion = onCall<QuestionInput>(async request => {
  const uid = requireSignedIn(request.auth?.uid);
  await assertAdmin(uid);

  const gameId = requireText(request.data.gameId, "gameId", 80);
  const questionId = requireText(request.data.questionId, "questionId", 80);

  await firestore.collection("questions").doc(questionId).set({
    gameId,
    status: "closed",
    closedAt: FieldValue.serverTimestamp(),
    closedBy: uid
  }, { merge: true });

  await realtimeDb.ref(`gameState/${gameId}`).update({
    currentQuestionId: questionId,
    status: "question_closed",
    updatedAt: Date.now()
  });

  return {
    questionId,
    status: "closed",
    note: "第 1 版已建立關題流程；正式計分邏輯將依驗收條件分階段補齊。"
  };
});

