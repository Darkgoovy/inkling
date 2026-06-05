import type { Book, BookSummary, GameState } from "../types";
import { totalReadCards } from "./gamification";

export type BookStatus = "new" | "in-progress" | "done";

export function readCountFor(state: GameState, bookId: string): number {
  return state.progress[bookId]?.readCards.length ?? 0;
}

export function bookStatus(state: GameState, bookId: string, cardCount: number): BookStatus {
  const read = readCountFor(state, bookId);
  if (read === 0) return "new";
  if (read >= cardCount) return "done";
  return "in-progress";
}

/** Pourcentage de progression d'un livre (0..1). */
export function bookProgress(state: GameState, bookId: string, cardCount: number): number {
  if (cardCount === 0) return 0;
  return Math.min(1, readCountFor(state, bookId) / cardCount);
}

/** Index de la première carte non lue d'un livre (0 si tout lu / rien lu). */
export function firstUnreadIndex(state: GameState, book: Book): number {
  const read = new Set(state.progress[book.id]?.readCards ?? []);
  const idx = book.cards.findIndex((c) => !read.has(c.id));
  return idx === -1 ? 0 : idx;
}

/** Tri Bibliothèque : en cours → non commencés → terminés (cf. spec §6). */
export function sortBooks(state: GameState, books: BookSummary[]): BookSummary[] {
  const rank: Record<string, number> = { "in-progress": 0, new: 1, done: 2 };
  return [...books].sort((a, b) => {
    const sa = rank[bookStatus(state, a.id, a.cardCount)];
    const sb = rank[bookStatus(state, b.id, b.cardCount)];
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title, "fr");
  });
}

export interface GlobalProgress {
  readCards: number;
  totalCards: number;
  ratio: number;
  completedBooks: number;
}

export function globalProgress(state: GameState, index: BookSummary[]): GlobalProgress {
  const totalCards = index.reduce((n, b) => n + b.cardCount, 0);
  const readCards = totalReadCards(state);
  return {
    readCards,
    totalCards,
    ratio: totalCards === 0 ? 0 : Math.min(1, readCards / totalCards),
    completedBooks: state.completedBooks.length,
  };
}
