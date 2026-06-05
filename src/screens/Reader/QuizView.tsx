import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AnswerRewards, QuizItem } from "../../lib/quiz";
import type { BadgeDef } from "../../lib/gamification";
import { Check } from "../../components/icons";
import styles from "./QuizView.module.css";

interface Props {
  items: QuizItem[];
  accent: string;
  answerQuestion: (item: QuizItem, correct: boolean) => AnswerRewards;
  onComplete: (correctCount: number, xp: number, badges: BadgeDef[]) => void;
}

export default function QuizView({ items, accent, answerQuestion, onComplete }: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState(false);

  const acc = useRef({ correct: 0, xp: 0, badges: [] as BadgeDef[] });

  const item = items[index];
  const answered = selected !== null;
  const total = items.length;
  const gauge = (index + (answered ? 1 : 0)) / total;

  const choose = (choiceIdx: number) => {
    if (answered) return;
    const correct = choiceIdx === item.correctIndex;
    const rewards = answerQuestion(item, correct);
    acc.current.correct += correct ? 1 : 0;
    acc.current.xp += rewards.xpGained;
    acc.current.badges.push(...rewards.newBadges);
    setSelected(choiceIdx);
    setLastCorrect(correct);
    if (!reduce && "vibrate" in navigator) {
      try {
        navigator.vibrate(correct ? 16 : [8, 40, 8]);
      } catch {
        /* ignore */
      }
    }
  };

  const next = () => {
    if (index + 1 < total) {
      setIndex(index + 1);
      setSelected(null);
    } else {
      onComplete(acc.current.correct, acc.current.xp, acc.current.badges);
    }
  };

  const letters = ["A", "B", "C", "D"];

  return (
    <div className={styles.screen} style={{ ["--book-accent" as string]: accent }}>
      {/* Jauge de progression du quiz */}
      <div className={styles.header}>
        <div className={styles.gaugeTrack}>
          <motion.div
            className={styles.gaugeFill}
            animate={{ width: `${gauge * 100}%` }}
            transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }}
          />
        </div>
        <div className={styles.meta}>
          <span>
            Question {index + 1} / {total}
          </span>
          {item.isReview && <span className={styles.reviewChip}>🔁 Révision</span>}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={item.question.id}
          className={styles.body}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
          transition={{ duration: reduce ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className={styles.question}>{item.question.question}</h1>

          <div className={styles.choices}>
            {item.displayChoices.map((choice, i) => {
              const isCorrect = i === item.correctIndex;
              const isSelected = i === selected;
              let cls = styles.choice;
              if (answered) {
                if (isCorrect) cls += ` ${styles.correct}`;
                else if (isSelected) cls += ` ${styles.wrong}`;
                else cls += ` ${styles.dim}`;
              }
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => choose(i)}
                  disabled={answered}
                >
                  <span className={styles.letter}>{letters[i]}</span>
                  <span className={styles.choiceText}>{choice}</span>
                  {answered && isCorrect && <Check width={20} height={20} className={styles.choiceIcon} />}
                  {answered && isSelected && !isCorrect && (
                    <span className={styles.choiceIcon}>✕</span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Feedback + suite */}
      <AnimatePresence>
        {answered && (
          <motion.div
            className={styles.footer}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <div className={`${styles.verdict} ${lastCorrect ? styles.vOk : styles.vKo}`}>
              <span className={styles.verdictLabel}>
                {lastCorrect ? "Bonne réponse !" : "Pas tout à fait…"}
              </span>
              {lastCorrect && <span className={styles.pop}>+5 XP</span>}
            </div>
            {item.question.explanation && (
              <p className={styles.explanation}>{item.question.explanation}</p>
            )}
            <button className={styles.continueBtn} onClick={next}>
              {index + 1 < total ? "Continuer" : "Voir mon résultat"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
