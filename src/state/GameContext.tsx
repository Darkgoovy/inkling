import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Book, GameState, ThemePref } from "../types";
import { clearState, defaultState, loadState, saveState } from "../lib/storage";
import { recordCardRead, type ValidationRewards } from "../lib/gamification";
import { recordQuizAnswer, type AnswerRewards, type QuizItem } from "../lib/quiz";

interface GameContextValue {
  state: GameState;
  /** Enregistre une réponse au quiz et renvoie les récompenses (XP, badges). */
  answerQuestion: (item: QuizItem, correct: boolean) => AnswerRewards;
  /** Marque la carte lue après le quiz (XP de lecture + bonus quiz parfait). */
  finishCardRead: (book: Book, cardId: string, perfectQuiz: boolean) => ValidationRewards;
  /** Mémorise la dernière position vue (sans validation). */
  rememberPosition: (bookId: string, cardId: string) => void;
  setDailyGoal: (goal: number) => void;
  setTheme: (theme: ThemePref) => void;
  resetProgress: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => loadState());

  // Persistance à chaque changement.
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Application du thème (clair/sombre/système) sur <html data-theme>.
  useEffect(() => {
    return applyTheme(state.settings.theme);
  }, [state.settings.theme]);

  // Référence toujours à jour pour les actions (évite une dépendance sur state).
  const stateRef = useRef(state);
  stateRef.current = state;

  const answerQuestion = useCallback<GameContextValue["answerQuestion"]>((item, correct) => {
    const { state: next, rewards } = recordQuizAnswer(stateRef.current, item, correct);
    setState(next);
    return rewards;
  }, []);

  const finishCardRead = useCallback<GameContextValue["finishCardRead"]>(
    (book, cardId, perfectQuiz) => {
      const { state: next, rewards } = recordCardRead(stateRef.current, book, cardId, perfectQuiz);
      setState(next);
      return rewards;
    },
    [],
  );

  const rememberPosition = useCallback<GameContextValue["rememberPosition"]>(
    (bookId, cardId) => {
      setState((s) => {
        const prev = s.progress[bookId] ?? { readCards: [], lastCardId: null };
        if (s.lastBookId === bookId && s.lastCardId === cardId && prev.lastCardId === cardId) {
          return s; // rien à changer
        }
        return {
          ...s,
          lastBookId: bookId,
          lastCardId: cardId,
          progress: { ...s.progress, [bookId]: { ...prev, lastCardId: cardId } },
        };
      });
    },
    [],
  );

  const setDailyGoal = useCallback((goal: number) => {
    const clamped = Math.max(1, Math.min(5, Math.round(goal)));
    setState((s) => ({ ...s, settings: { ...s.settings, dailyGoal: clamped } }));
  }, []);

  const setTheme = useCallback((theme: ThemePref) => {
    setState((s) => ({ ...s, settings: { ...s.settings, theme } }));
  }, []);

  const resetProgress = useCallback(() => {
    clearState();
    setState((s) => ({ ...defaultState(), settings: s.settings }));
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      answerQuestion,
      finishCardRead,
      rememberPosition,
      setDailyGoal,
      setTheme,
      resetProgress,
    }),
    [state, answerQuestion, finishCardRead, rememberPosition, setDailyGoal, setTheme, resetProgress],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Applique le thème et garde le suivi du thème système ; renvoie un cleanup. */
function applyTheme(pref: ThemePref): () => void {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const resolve = () => {
    const dark = pref === "dark" || (pref === "system" && media.matches);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#1f1718" : "#fbefe3");
  };

  resolve();
  if (pref === "system") {
    media.addEventListener("change", resolve);
    return () => media.removeEventListener("change", resolve);
  }
  return () => {};
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé dans <GameProvider>");
  return ctx;
}
