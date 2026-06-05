import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useGame } from "../../state/GameContext";
import { loadBook, loadBooksIndex } from "../../lib/books";
import { useAsync } from "../../lib/useAsync";
import { firstUnreadIndex } from "../../lib/selectors";
import type { ValidationRewards } from "../../lib/gamification";
import CardView from "./CardView";
import EndOfBook from "./EndOfBook";
import RewardBurst from "./RewardBurst";
import { ArrowLeft, ArrowRight } from "../../components/icons";
import styles from "./Reader.module.css";

const SWIPE_THRESHOLD = 80; // px

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { state, readCard, rememberPosition } = useGame();
  const reduce = useReducedMotion();

  // Charge le livre depuis l'index pour récupérer son `file`.
  const { data: book, loading, error } = useAsync(async () => {
    const idx = await loadBooksIndex();
    const entry = idx.books.find((b) => b.id === bookId);
    if (!entry) throw new Error("Livre introuvable");
    return loadBook(entry.file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [ended, setEnded] = useState(false);
  const [reward, setReward] = useState<ValidationRewards | null>(null);
  const initialised = useRef(false);

  // Position initiale : première carte non lue.
  useEffect(() => {
    if (book && !initialised.current) {
      setPage(firstUnreadIndex(state, book));
      initialised.current = true;
    }
  }, [book, state]);

  // Mémorise la position vue.
  useEffect(() => {
    if (book && book.cards[page]) {
      rememberPosition(book.id, book.cards[page].id);
    }
  }, [book, page, rememberPosition]);

  const goTo = useCallback(
    (next: number, dir: number) => {
      if (!book) return;
      if (next < 0) return; // borne gauche : rebond géré par le drag élastique
      if (next >= book.cards.length) {
        setEnded(true);
        return;
      }
      setDirection(dir);
      setPage(next);
    },
    [book],
  );

  const handleDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      if (Math.abs(info.offset.x) < SWIPE_THRESHOLD) return;
      if (info.offset.x < 0) goTo(page + 1, 1);
      else goTo(page - 1, -1);
    },
    [goTo, page],
  );

  // Navigation clavier (desktop, cf. spec §7.2).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ended) return;
      if (e.key === "ArrowLeft") goTo(page - 1, -1);
      else if (e.key === "ArrowRight") goTo(page + 1, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, page, ended]);

  const onValidate = useCallback(() => {
    if (!book) return;
    const card = book.cards[page];
    const r = readCard(book, card.id);
    if (!r.alreadyRead) {
      setReward(r);
      if (r.bookCompleted) {
        // Laisse jouer l'animation puis bascule sur l'écran de fin.
        window.setTimeout(() => setEnded(true), reduce ? 0 : 900);
      }
    } else {
      // Déjà lue : on avance simplement.
      goTo(page + 1, 1);
    }
  }, [book, page, readCard, goTo, reduce]);

  if (loading) return <div className={styles.statusScreen}>Chargement du livre…</div>;
  if (error || !book)
    return (
      <div className={styles.statusScreen}>
        <p>Livre introuvable.</p>
        <button className={styles.linkBtn} onClick={() => navigate("/")}>
          Retour à la bibliothèque
        </button>
      </div>
    );

  if (ended) {
    return (
      <EndOfBook
        book={book}
        state={state}
        onReview={() => {
          setEnded(false);
          setDirection(-1);
          setPage(0);
        }}
        onLibrary={() => navigate("/")}
      />
    );
  }

  const card = book.cards[page];
  const readSet = new Set(state.progress[book.id]?.readCards ?? []);
  const isRead = readSet.has(card.id);
  const progress = (page + 1) / book.cards.length;

  const variants = {
    enter: (dir: number) =>
      reduce
        ? { opacity: 0 }
        : { x: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.96 },
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) =>
      reduce
        ? { opacity: 0 }
        : { x: dir > 0 ? "-100%" : "100%", opacity: 0, scale: 0.96 },
  };

  return (
    <div className={styles.screen} style={{ ["--book-accent" as string]: book.accentColor }}>
      <header className={styles.topbar}>
        <button className={styles.backBtn} aria-label="Retour" onClick={() => navigate("/")}>
          <ArrowLeft />
        </button>
        <div className={styles.topInfo}>
          <span className={styles.bookTitle}>{book.title}</span>
          <span className={styles.position}>
            {page + 1} / {book.cards.length}
          </span>
        </div>
        <div className={styles.topProgress}>
          <div className={styles.topProgressFill} style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      <div className={styles.stage}>
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.div
            key={card.id}
            className={styles.cardWrap}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduce ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={handleDragEnd}
          >
            <CardView card={card} isRead={isRead} onValidate={onValidate} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.navHints}>
        <button
          className={styles.navArrow}
          aria-label="Carte précédente"
          disabled={page === 0}
          onClick={() => goTo(page - 1, -1)}
        >
          <ArrowLeft width={20} height={20} />
        </button>
        <div className={styles.dots} aria-hidden>
          {book.cards.map((c, i) => (
            <span
              key={c.id}
              className={`${styles.dot} ${i === page ? styles.dotActive : ""} ${
                readSet.has(c.id) ? styles.dotRead : ""
              }`}
            />
          ))}
        </div>
        <button
          className={styles.navArrow}
          aria-label="Carte suivante"
          onClick={() => goTo(page + 1, 1)}
        >
          <ArrowRight width={20} height={20} />
        </button>
      </div>

      <AnimatePresence>
        {reward && <RewardBurst reward={reward} onDone={() => setReward(null)} />}
      </AnimatePresence>
    </div>
  );
}
