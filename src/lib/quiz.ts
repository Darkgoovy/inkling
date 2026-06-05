import type { Book, Card, GameState, Question, QuestionState } from "../types";
import {
  dateKey,
  todayKey,
  pendingBadges,
  XP_CORRECT_ANSWER,
  type BadgeDef,
} from "./gamification";

// Système de Leitner (cf. spec §7.6) : intervalles en jours par boîte (1→5).
export const BOX_INTERVALS = [1, 2, 4, 7, 15];
export const MAX_BOX = 5;

const CURRENT_SLOTS = 3; // 2–3 questions de la carte courante
const TOTAL_SLOTS = 5; // 4–5 questions au total

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dateKey(dt);
}

/** Applique une réponse à l'état d'une question selon les règles de Leitner. */
export function applyAnswer(
  prev: QuestionState | undefined,
  correct: boolean,
  today: string,
): QuestionState {
  let box: number;
  if (!prev) {
    // Entrée dans le système à la première réponse.
    box = correct ? 2 : 1;
  } else if (correct) {
    box = Math.min(prev.box + 1, MAX_BOX);
  } else {
    box = 1;
  }
  const dueDate = addDays(today, BOX_INTERVALS[box - 1]);
  return {
    box,
    dueDate,
    lastAnsweredDate: today,
    lastCorrect: correct,
    timesSeen: (prev?.timesSeen ?? 0) + 1,
    timesCorrect: (prev?.timesCorrect ?? 0) + (correct ? 1 : 0),
    history: [...(prev?.history ?? []), { date: today, correct }],
  };
}

// --- Construction d'un quiz ---

export interface QuizItem {
  question: Question;
  cardId: string;
  isReview: boolean;
  /** Choix dans l'ordre mélangé affiché. */
  displayChoices: string[];
  /** Index de la bonne réponse dans displayChoices. */
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toItem(question: Question, cardId: string, isReview: boolean): QuizItem {
  const correctText = question.choices[question.answerIndex];
  const displayChoices = shuffle(question.choices);
  return {
    question,
    cardId,
    isReview,
    displayChoices,
    correctIndex: displayChoices.indexOf(correctText),
  };
}

/** Index id→{question, cardId} de toutes les questions du livre. */
function questionIndex(book: Book): Map<string, { q: Question; cardId: string }> {
  const map = new Map<string, { q: Question; cardId: string }>();
  for (const card of book.cards) {
    for (const q of card.questions ?? []) map.set(q.id, { q, cardId: card.id });
  }
  return map;
}

/**
 * Sélectionne les questions de révision (cf. spec §7.6) : parmi les questions
 * déjà vues (en système) des cartes déjà lues, garde les « dues » (échéance ≤
 * aujourd'hui), triées par boîte croissante puis échéance la plus ancienne.
 */
export function selectReviewQuestions(
  book: Book,
  state: GameState,
  excludeCardId: string,
  count: number,
  today: string,
): QuizItem[] {
  const readCards = new Set(state.progress[book.id]?.readCards ?? []);
  const idx = questionIndex(book);
  const due: { id: string; box: number; dueDate: string }[] = [];

  for (const [qid, st] of Object.entries(state.quiz.questionStates)) {
    const entry = idx.get(qid);
    if (!entry) continue; // question d'un autre livre / inconnue
    if (entry.cardId === excludeCardId) continue;
    if (!readCards.has(entry.cardId)) continue;
    if (st.dueDate > today) continue; // pas encore due
    due.push({ id: qid, box: st.box, dueDate: st.dueDate });
  }

  due.sort((a, b) => (a.box !== b.box ? a.box - b.box : a.dueDate.localeCompare(b.dueDate)));

  return due
    .slice(0, count)
    .map((d) => toItem(idx.get(d.id)!.q, idx.get(d.id)!.cardId, true));
}

/**
 * Construit le quiz d'une carte : 2–3 questions de la carte courante +
 * 2–3 questions de révision (cf. spec §7.5). Total ≤ 5.
 */
export function buildQuiz(book: Book, card: Card, state: GameState, now: Date = new Date()): QuizItem[] {
  const today = todayKey(now);

  const cardQs = card.questions ?? [];
  const currentCount = Math.min(CURRENT_SLOTS, cardQs.length);
  const current = shuffle(cardQs)
    .slice(0, currentCount)
    .map((q) => toItem(q, card.id, false));

  const reviewCount = TOTAL_SLOTS - current.length;
  const review = selectReviewQuestions(book, state, card.id, reviewCount, today);

  // Les questions de la carte courante d'abord, puis les révisions.
  return [...current, ...review];
}

// --- Action : enregistrer une réponse ---

export interface AnswerRewards {
  correct: boolean;
  xpGained: number;
  newBadges: BadgeDef[];
  box: number;
}

/**
 * Enregistre une réponse au quiz (immuable) : met à jour la boîte de Leitner de
 * la question, l'XP (+5 si correcte), les séries de bonnes réponses, le compteur
 * de révisions réussies et les badges (cf. spec §7.6, §9.1).
 */
export function recordQuizAnswer(
  state: GameState,
  item: QuizItem,
  correct: boolean,
  now: Date = new Date(),
): { state: GameState; rewards: AnswerRewards } {
  const today = todayKey(now);
  const qid = item.question.id;
  const newQS = applyAnswer(state.quiz.questionStates[qid], correct, today);

  const currentCorrectStreak = correct ? state.quiz.currentCorrectStreak + 1 : 0;
  const bestCorrectStreak = Math.max(state.quiz.bestCorrectStreak, currentCorrectStreak);
  const reviewCorrectTotal =
    state.quiz.reviewCorrectTotal + (item.isReview && correct ? 1 : 0);
  const xpGained = correct ? XP_CORRECT_ANSWER : 0;

  let next: GameState = {
    ...state,
    totalXp: state.totalXp + xpGained,
    quiz: {
      ...state.quiz,
      questionStates: { ...state.quiz.questionStates, [qid]: newQS },
      currentCorrectStreak,
      bestCorrectStreak,
      reviewCorrectTotal,
    },
  };

  const newBadges = pendingBadges(next);
  if (newBadges.length > 0) {
    next = { ...next, unlockedBadges: [...next.unlockedBadges, ...newBadges.map((b) => b.id)] };
  }

  return { state: next, rewards: { correct, xpGained, newBadges, box: newQS.box } };
}
