import type { GameState } from "../types";

const STORAGE_KEY = "inkling.state.v1";

export function defaultState(): GameState {
  return {
    version: 1,
    lastBookId: null,
    lastCardId: null,
    totalXp: 0,
    streak: { count: 0, lastReadDate: null },
    activeDays: [],
    progress: {},
    completedBooks: [],
    unlockedBadges: [],
    stats: { morningReads: 0, bestDayCount: 0, todayDate: null, todayCount: 0 },
    settings: { dailyGoal: 1, theme: "system" },
  };
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    // Fusion défensive : un état ancien/partiel reste utilisable.
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      streak: { ...base.streak, ...parsed.streak },
      stats: { ...base.stats, ...parsed.stats },
      settings: { ...base.settings, ...parsed.settings },
      progress: parsed.progress ?? base.progress,
      activeDays: parsed.activeDays ?? base.activeDays,
      completedBooks: parsed.completedBooks ?? base.completedBooks,
      unlockedBadges: parsed.unlockedBadges ?? base.unlockedBadges,
    };
  } catch (err) {
    console.warn("[Inkling] État local illisible, réinitialisation.", err);
    return defaultState();
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[Inkling] Impossible d'enregistrer l'état local.", err);
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
