import { motion, useReducedMotion } from "framer-motion";
import type { BadgeDef } from "../../lib/gamification";
import styles from "./QuizResult.module.css";

interface Props {
  correct: number;
  total: number;
  xp: number;
  badges: BadgeDef[];
  accent: string;
  lastCard: boolean;
  onContinue: () => void;
}

export default function QuizResult({
  correct,
  total,
  xp,
  badges,
  accent,
  lastCard,
  onContinue,
}: Props) {
  const reduce = useReducedMotion();
  const perfect = total > 0 && correct === total;
  const ratio = total > 0 ? correct / total : 1;

  const title = perfect
    ? "Sans-faute ! 🎉"
    : ratio >= 0.6
      ? "Bien joué !"
      : "Continue, ça rentre !";

  const confetti = perfect && !reduce ? Array.from({ length: 18 }) : [];

  return (
    <div className={styles.screen} style={{ ["--book-accent" as string]: accent }}>
      {confetti.map((_, i) => {
        const angle = (i / confetti.length) * Math.PI * 2;
        const dist = 120 + (i % 4) * 22;
        return (
          <motion.span
            key={i}
            className={styles.confetti}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: [0, 1, 0],
              scale: 1,
              rotate: i * 40,
            }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          >
            {["🎉", "✨", "🎊", "⭐"][i % 4]}
          </motion.span>
        );
      })}

      <motion.div
        className={styles.scoreRing}
        initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        style={{
          background: `conic-gradient(var(--book-accent) ${ratio * 360}deg, var(--surface-2) 0deg)`,
        }}
      >
        <div className={styles.scoreInner}>
          <span className={styles.scoreValue}>
            {correct}/{total}
          </span>
          <span className={styles.scoreLabel}>bonnes</span>
        </div>
      </motion.div>

      <h1 className={styles.title}>{title}</h1>
      <p className={styles.xp}>+{xp} XP gagnés</p>

      {badges.length > 0 && (
        <div className={styles.badges}>
          {badges.map((b) => (
            <span key={b.id} className={styles.badge}>
              <span className={styles.badgeEmoji}>{b.emoji}</span> {b.name}
            </span>
          ))}
        </div>
      )}

      <button className={styles.continueBtn} onClick={onContinue}>
        {lastCard ? "Terminer le livre" : "Carte suivante"}
      </button>
    </div>
  );
}
