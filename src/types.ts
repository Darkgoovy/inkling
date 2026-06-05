// Modèle de données du contenu (lecture seule, cf. spec §4).

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
  settings: { dailyGoal: number; theme: ThemePref };
}
