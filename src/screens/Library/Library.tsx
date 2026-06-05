import { useNavigate } from "react-router-dom";
import { useGame } from "../../state/GameContext";
import { loadBooksIndex } from "../../lib/books";
import { useAsync } from "../../lib/useAsync";
import { levelInfo } from "../../lib/gamification";
import {
  bookProgress,
  bookStatus,
  globalProgress,
  readCountFor,
  sortBooks,
} from "../../lib/selectors";
import BookCover from "../../components/BookCover";
import ProgressBar from "../../components/ProgressBar";
import { Flame, Gear, User, Play, Check } from "../../components/icons";
import styles from "./Library.module.css";

export default function Library() {
  const navigate = useNavigate();
  const { state } = useGame();
  const { data: index, loading, error } = useAsync(() => loadBooksIndex(), []);

  const lvl = levelInfo(state.totalXp);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.greeting}>
          <p className={styles.hello}>Bonjour 👋</p>
          <h1 className={styles.brand}>Inkling</h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} aria-label="Profil" onClick={() => navigate("/profile")}>
            <User />
          </button>
          <button className={styles.iconBtn} aria-label="Réglages" onClick={() => navigate("/settings")}>
            <Gear />
          </button>
        </div>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.streakChip}>
          <Flame width={18} height={18} style={{ color: "var(--accent)" }} />
          <span>
            <strong>{state.streak.count}</strong> {state.streak.count > 1 ? "jours" : "jour"}
          </span>
        </div>
        <div className={styles.levelChip}>
          <span className={styles.levelName}>{lvl.level.name}</span>
          <ProgressBar value={lvl.progress} height={6} />
          <span className={styles.levelXp}>
            {lvl.next ? `${state.totalXp} / ${lvl.next.threshold} XP` : `${state.totalXp} XP · niveau max`}
          </span>
        </div>
      </div>

      {loading && <p className={styles.muted}>Chargement de la bibliothèque…</p>}
      {error && (
        <p className={styles.muted}>
          Impossible de charger les livres. Lance le build de l'index (`npm run build:index`).
        </p>
      )}

      {index && index.books.length === 0 && (
        <div className={styles.empty}>
          <h2>Aucun livre disponible</h2>
          <p className={styles.muted}>
            Déposez un fichier JSON de livre dans <code>public/books/</code> puis régénérez l'index.
          </p>
        </div>
      )}

      {index && index.books.length > 0 && (
        <>
          {(() => {
            const resumeBook =
              index.books.find((b) => b.id === state.lastBookId) ?? index.books[0];
            const read = readCountFor(state, resumeBook.id);
            const isStart = read === 0;
            return (
              <button
                className={styles.resume}
                style={{ ["--accent" as string]: resumeBook.accentColor }}
                onClick={() => navigate(`/read/${resumeBook.id}`)}
              >
                <div className={styles.resumeIcon}>
                  <Play width={26} height={26} />
                </div>
                <div className={styles.resumeText}>
                  <span className={styles.resumeLabel}>
                    {isStart ? "Commencer" : "Reprendre"}
                  </span>
                  <span className={styles.resumeTitle}>{resumeBook.title}</span>
                  <span className={styles.resumeSub}>
                    {isStart
                      ? "Votre carte du jour vous attend"
                      : `Carte ${Math.min(read + 1, resumeBook.cardCount)} sur ${resumeBook.cardCount}`}
                  </span>
                </div>
              </button>
            );
          })()}

          <h2 className={styles.sectionTitle}>Ma bibliothèque</h2>
          <ul className={styles.list}>
            {sortBooks(state, index.books).map((b) => {
              const status = bookStatus(state, b.id, b.cardCount);
              const ratio = bookProgress(state, b.id, b.cardCount);
              const read = readCountFor(state, b.id);
              return (
                <li key={b.id}>
                  <button className={styles.bookRow} onClick={() => navigate(`/read/${b.id}`)}>
                    <BookCover title={b.title} accentColor={b.accentColor} size="md" />
                    <div className={styles.bookInfo}>
                      <div className={styles.bookHead}>
                        <h3 className={styles.bookTitle}>{b.title}</h3>
                        {status === "done" && (
                          <span className={styles.doneBadge} title="Terminé">
                            <Check width={14} height={14} />
                          </span>
                        )}
                      </div>
                      <p className={styles.author}>{b.author}</p>
                      <ProgressBar value={ratio} accent={b.accentColor} height={7} />
                      <p className={styles.bookMeta}>
                        {status === "new"
                          ? "Non commencé"
                          : status === "done"
                            ? `Terminé · ${b.cardCount} cartes`
                            : `${read}/${b.cardCount} cartes · ${Math.round(ratio * 100)} %`}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {(() => {
            const g = globalProgress(state, index.books);
            return (
              <p className={styles.global}>
                Progression globale : <strong>{Math.round(g.ratio * 100)} %</strong> ({g.readCards}/
                {g.totalCards} cartes) · {g.completedBooks} livre
                {g.completedBooks > 1 ? "s" : ""} terminé{g.completedBooks > 1 ? "s" : ""}
              </p>
            );
          })()}
        </>
      )}
    </div>
  );
}
