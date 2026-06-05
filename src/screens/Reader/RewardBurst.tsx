import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ValidationRewards } from "../../lib/gamification";
import { badgeById } from "../../lib/gamification";
import { Check } from "../../components/icons";
import styles from "./RewardBurst.module.css";

interface Props {
  reward: ValidationRewards;
  onDone: () => void;
}

/** Micro-animation de validation : coche + pluie d'XP + toast (cf. spec §7.3, §9). */
export default function RewardBurst({ reward, onDone }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = window.setTimeout(onDone, reduce ? 1100 : 1900);
    return () => window.clearTimeout(t);
  }, [onDone, reduce]);

  // Vibration discrète si supportée.
  useEffect(() => {
    if (!reduce && "vibrate" in navigator) {
      try {
        navigator.vibrate(18);
      } catch {
        /* ignore */
      }
    }
  }, [reduce]);

  const particles = reduce ? [] : Array.from({ length: 14 });

  return (
    <div className={styles.overlay} aria-live="polite">
      <motion.div
        className={styles.checkBubble}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.15, 1], opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Check width={40} height={40} />
      </motion.div>

      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 90 + (i % 3) * 26;
        return (
          <motion.span
            key={i}
            className={styles.xp}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: [0, 1, 0],
              scale: 1,
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            +XP
          </motion.span>
        );
      })}

      <motion.div
        className={styles.toast}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 22 }}
      >
        <span className={styles.xpGain}>+{reward.xpGained} XP</span>
        {reward.bookCompleted && <span className={styles.line}>📖 Livre terminé&nbsp;!</span>}
        {reward.leveledUp && reward.newLevel && (
          <span className={styles.line}>⬆️ Niveau {reward.newLevel.name}&nbsp;!</span>
        )}
        {reward.newBadges.map((b) => {
          const def = badgeById(b.id);
          return (
            <span key={b.id} className={styles.line}>
              {def?.emoji} Badge « {def?.name} »
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}
