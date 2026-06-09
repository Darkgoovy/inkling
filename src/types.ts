// Modèle de données du contenu (lecture seule, cf. spec §4).

/** Question de quiz QCM intégrée à une carte (cf. spec §4.4). */
export interface Question {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation?: string;
}

export interface Card {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  tags: string[];
  summary: string;
  keyIdea: string;
  action: string;
  estimatedMinutes: number;
  questions: Question[];
}

export interface Book {
  version: number;
  id: string;
  title: string;
  author: string;
  cover: string;
  accentColor: string;
  cards: Card[];
}

/** Entrée de l'index `books.json` (métadonnées légères, cf. spec §4.1). */
export interface BookSummary {
  id: string;
  title: string;
  author: string;
  cover: string;
  accentColor: string;
  cardCount: number;
  file: string;
}

export interface BooksIndex {
  version: number;
  books: BookSummary[];
}

// --- Données de progression / gamification persistées localement (cf. spec §9.6) ---

export type ThemePref = "system" | "light" | "dark";

export interface BookProgress {
  readCards: string[];
  lastCardId: string | null;
}

/** État de révision espacée (Leitner) d'une question (cf. spec §7.6, §9.6). */
export interface QuestionState {
  box: number; // 1..5
  dueDate: string; // YYYY-MM-DD
  lastAnsweredDate: string | null;
  lastCorrect: boolean;
  timesSeen: number;
  timesCorrect: number;
  history: { date: string; correct: boolean }[];
}

export interface QuizState {
  questionStates: Record<string, QuestionState>;
  bestCorrectStreak: number;
  currentCorrectStreak: number;
  reviewCorrectTotal: number;
  perfectQuizCount: number;
}

export interface GameState {
  version: number;
  lastBookId: string | null;
  lastCardId: string | null;
  totalXp: number;
  streak: { count: number; lastReadDate: string | null };
  /** Jours (YYYY-MM-DD) avec ≥1 carte validée → tampons du calendrier (indépendant de la série). */
  activeDays: string[];
  progress: Record<string, BookProgress>;
  completedBooks: string[];
  unlockedBadges: string[];
  /** Compteurs additionnels nécessaires à certains badges (extension de la spec). */
  stats: {
    morningReads: number;
    bestDayCount: number;
    todayDate: string | null;
    todayCount: number;
  };
  quiz: QuizState;
  settings: {
    dailyGoal: number;
    theme: ThemePref;
    reminder: ReminderSettings;
  };
}

/** Réglages du rappel quotidien local (cf. spec §10.7). */
export interface ReminderSettings {
  enabled: boolean;
  /** Heure locale au format "HH:MM". */
  time: string;
  /** Jours actifs, convention getDay() : 0=dimanche … 6=samedi. */
  days: number[];
  /** Ne pas notifier si l'objectif quotidien est déjà atteint. */
  skipIfDone: boolean;
}
