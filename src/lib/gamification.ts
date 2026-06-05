import type { Book, GameState } from "../types";

// --- Dates locales (cf. spec §9.3 : tout est basé sur la date locale de l'appareil) ---

/** Renvoie une date au format YYYY-MM-DD dans le fuseau local. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now);
}

/** Nombre de jours calendaires entre deux clés YYYY-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86_400_000);
}

// --- Niveaux (cf. spec §9.2 : noms chaleureux, seuils croissants) ---

export interface Level {
  index: number; // 0-based
  name: string;
  threshold: number; // XP requis pour atteindre ce niveau
}

export const LEVELS: Level[] = [
  { index: 0, name: "Curieux", threshold: 0 },
  { index: 1, name: "Lecteur", threshold: 100 },
  { index: 2, name: "Penseur", threshold: 300 },
  { index: 3, name: "Mentor", threshold: 700 },
  { index: 4, name: "Sage", threshold: 1500 },
];

export interface LevelInfo {
  level: Level;
  next: Level | null;
  /** Progression vers le niveau suivant, 0..1 (1 si niveau max). */
  progress: number;
  xpIntoLevel: number;
  xpForNext: number | null;
}

export function levelInfo(totalXp: number): LevelInfo {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXp >= lvl.threshold) current = lvl;
    else break;
  }
  const next = LEVELS[current.index + 1] ?? null;
  if (!next) {
    return { level: current, next: null, progress: 1, xpIntoLevel: totalXp - current.threshold, xpForNext: null };
  }
  const span = next.threshold - current.threshold;
  const into = totalXp - current.threshold;
  return {
    level: current,
    next,
    progress: Math.max(0, Math.min(1, into / span)),
    xpIntoLevel: into,
    xpForNext: span,
  };
}

// --- Badges (cf. spec §9.4) ---

export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  description: string;
  /** Condition de déblocage, évaluée sur l'état courant. */
  earned: (s: GameState) => boolean;
}

const MORNING_TARGET = 5;
const MARATHON_TARGET = 5;
const BIBLIOPHILE_TARGET = 3;
const REVIEWER_TARGET = 20;
const ONFIRE_TARGET = 10;

export const BADGES: BadgeDef[] = [
  {
    id: "first-step",
    emoji: "🌱",
    name: "Premier pas",
    description: "Première carte lue",
    earned: (s) => totalReadCards(s) >= 1,
  },
  {
    id: "first-book",
    emoji: "📖",
    name: "Premier livre",
    description: "Premier livre terminé",
    earned: (s) => s.completedBooks.length >= 1,
  },
  {
    id: "regular",
    emoji: "🔥",
    name: "Régulier",
    description: "Série de 7 jours",
    earned: (s) => s.streak.count >= 7,
  },
  {
    id: "assiduous",
    emoji: "🌟",
    name: "Assidu",
    description: "Série de 30 jours",
    earned: (s) => s.streak.count >= 30,
  },
  {
    id: "early-bird",
    emoji: "🦉",
    name: "Lève-tôt",
    description: `${MORNING_TARGET} cartes lues le matin`,
    earned: (s) => s.stats.morningReads >= MORNING_TARGET,
  },
  {
    id: "bibliophile",
    emoji: "🏆",
    name: "Bibliophile",
    description: `${BIBLIOPHILE_TARGET} livres terminés`,
    earned: (s) => s.completedBooks.length >= BIBLIOPHILE_TARGET,
  },
  {
    id: "marathon",
    emoji: "⚡",
    name: "Marathon",
    description: `${MARATHON_TARGET} cartes lues dans la journée`,
    earned: (s) => s.stats.bestDayCount >= MARATHON_TARGET,
  },
  {
    id: "flawless",
    emoji: "🎯",
    name: "Sans-faute",
    description: "Un quiz réussi à 100 %",
    earned: (s) => s.quiz.perfectQuizCount >= 1,
  },
  {
    id: "elephant",
    emoji: "🧠",
    name: "Mémoire d'éléphant",
    description: "Une question portée en boîte 5",
    earned: (s) => Object.values(s.quiz.questionStates).some((q) => q.box >= 5),
  },
  {
    id: "reviewer",
    emoji: "🔁",
    name: "Réviseur",
    description: `${REVIEWER_TARGET} révisions réussies`,
    earned: (s) => s.quiz.reviewCorrectTotal >= REVIEWER_TARGET,
  },
  {
    id: "onfire",
    emoji: "💯",
    name: "En feu",
    description: `${ONFIRE_TARGET} bonnes réponses d'affilée`,
    earned: (s) => s.quiz.bestCorrectStreak >= ONFIRE_TARGET,
  },
];

/** Badges débloqués par l'état courant et pas encore enregistrés. */
export function pendingBadges(state: GameState): BadgeDef[] {
  return BADGES.filter((b) => !state.unlockedBadges.includes(b.id) && b.earned(state));
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

export function totalReadCards(s: GameState): number {
  return Object.values(s.progress).reduce((n, p) => n + p.readCards.length, 0);
}

// --- XP ---

export const XP_PER_CARD = 10;
export const XP_BOOK_COMPLETE = 50;
export const XP_CORRECT_ANSWER = 5;
export const XP_PERFECT_QUIZ = 10;
const STREAK_BONUS_PER_DAY = 2;
const STREAK_BONUS_CAP = 20;

// --- Action centrale : valider une carte (cf. spec §7.1, §9) ---

export interface ValidationRewards {
  alreadyRead: boolean;
  xpGained: number;
  newBadges: BadgeDef[];
  leveledUp: boolean;
  newLevel: Level | null;
  bookCompleted: boolean;
}

/**
 * Enregistre la lecture d'une carte (« J'ai lu », après le quiz) de façon
 * immuable : marque la carte lue, attribue l'XP de lecture, le bonus de quiz
 * parfait, met à jour série/jours actifs et évalue les badges. Relire une carte
 * déjà lue ne redonne pas d'XP de lecture.
 */
export function recordCardRead(
  state: GameState,
  book: Book,
  cardId: string,
  perfectQuiz: boolean,
  now: Date = new Date(),
): { state: GameState; rewards: ValidationRewards } {
  const today = todayKey(now);
  const prevProgress = state.progress[book.id] ?? { readCards: [], lastCardId: null };

  // Déjà lue : on met juste à jour la dernière position, aucun gain.
  if (prevProgress.readCards.includes(cardId)) {
    const next: GameState = {
      ...state,
      lastBookId: book.id,
      lastCardId: cardId,
      progress: {
        ...state.progress,
        [book.id]: { ...prevProgress, lastCardId: cardId },
      },
    };
    return {
      state: next,
      rewards: { alreadyRead: true, xpGained: 0, newBadges: [], leveledUp: false, newLevel: null, bookCompleted: false },
    };
  }

  const prevLevel = levelInfo(state.totalXp).level;

  // Progression du livre
  const readCards = [...prevProgress.readCards, cardId];
  const progress = {
    ...state.progress,
    [book.id]: { readCards, lastCardId: cardId },
  };

  // Série & jours actifs
  let streak = state.streak;
  const isNewActiveDay = state.streak.lastReadDate !== today;
  if (isNewActiveDay) {
    if (state.streak.lastReadDate && daysBetween(state.streak.lastReadDate, today) === 1) {
      streak = { count: state.streak.count + 1, lastReadDate: today };
    } else {
      streak = { count: 1, lastReadDate: today };
    }
  }
  const activeDays = state.activeDays.includes(today)
    ? state.activeDays
    : [...state.activeDays, today].sort();

  // Compteurs (matin / meilleur jour)
  const isMorning = now.getHours() < 12;
  const todayCount = state.stats.todayDate === today ? state.stats.todayCount + 1 : 1;
  const stats = {
    morningReads: state.stats.morningReads + (isMorning ? 1 : 0),
    bestDayCount: Math.max(state.stats.bestDayCount, todayCount),
    todayDate: today,
    todayCount,
  };

  // XP : carte + bonus de série (une fois par jour) + complétion de livre
  let xpGained = XP_PER_CARD;
  if (isNewActiveDay) {
    xpGained += Math.min(streak.count * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
  }

  const bookCompleted =
    readCards.length === book.cards.length && !state.completedBooks.includes(book.id);
  const completedBooks = bookCompleted
    ? [...state.completedBooks, book.id]
    : state.completedBooks;
  if (bookCompleted) xpGained += XP_BOOK_COMPLETE;

  // Bonus de quiz parfait (cf. spec §9.1).
  if (perfectQuiz) xpGained += XP_PERFECT_QUIZ;
  const quiz = perfectQuiz
    ? { ...state.quiz, perfectQuizCount: state.quiz.perfectQuizCount + 1 }
    : state.quiz;

  let next: GameState = {
    ...state,
    lastBookId: book.id,
    lastCardId: cardId,
    totalXp: state.totalXp + xpGained,
    streak,
    activeDays,
    progress,
    completedBooks,
    stats,
    quiz,
  };

  // Badges débloqués par ce nouvel état
  const newBadges = pendingBadges(next);
  if (newBadges.length > 0) {
    next = { ...next, unlockedBadges: [...next.unlockedBadges, ...newBadges.map((b) => b.id)] };
  }

  const newLevelInfo = levelInfo(next.totalXp).level;
  const leveledUp = newLevelInfo.index > prevLevel.index;

  return {
    state: next,
    rewards: {
      alreadyRead: false,
      xpGained,
      newBadges,
      leveledUp,
      newLevel: leveledUp ? newLevelInfo : null,
      bookCompleted,
    },
  };
}
