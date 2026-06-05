import { motion } from "framer-motion";
import type { Book, GameState } from "../../types";
import { levelInfo } from "../../lib/gamification";
import BookCover from "../../components/BookCover";
import { Flame } from "../../components/icons";
import styles from "./EndOfBook.module.css";

interface Props {
  book: Book;
  state: GameState;
  onReview: () => void;
  onLibrary: () => void;
}

/** Écran de fin de livre (cf. spec §7.4). */
export default function EndOfBook({ book, state, onReview, onLibrary }: Props) {
  const completed = state.completedBooks.includes(book.id);
  const lvl = levelInfo(state.totalXp);

  return (
    <div className={styles.screen} style={{ ["--book-accent" as string]: book.accentColor }}>
      <motion.div
        className={styles.confetti}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        🎉
      </motion.div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <BookCover title={book.title} accentColor={book.accentColor} cover={book.cover} size="lg" />
      </motion.div>

      <h1 className={styles.title}>{completed ? "Livre terminé !" : "Bravo !"}</h1>
      <p className={styles.subtitle}>
        Vous avez parcouru <strong>{book.title}</strong> en entier.
      </p>

      <div className={styles.rewards}>
        <div className={styles.rewardCard}>
          <span className={styles.rewardValue}>{state.totalXp}</span>
          <span className={styles.rewardLabel}>XP au total</span>
        </div>
        <div className={styles.rewardCard}>
          <span className={styles.rewardValue}>{lvl.level.name}</span>
          <span className={styles.rewardLabel}>Niveau</span>
        </div>
        <div className={styles.rewardCard}>
          <span className={styles.rewardValue}>
            <Flame width={18} height={18} style={{ color: "var(--accent)" }} /> {state.streak.count}
          </span>
          <span className={styles.rewardLabel}>Jours de série</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.primary} onClick={onReview}>
          Revoir le livre
        </button>
        <button className={styles.secondary} onClick={onLibrary}>
          Retour à la bibliothèque
        </button>
      </div>
    </div>
  );
}
