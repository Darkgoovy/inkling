import { useNavigate } from "react-router-dom";
import { useGame } from "../../state/GameContext";
import { BADGES, levelInfo, totalReadCards } from "../../lib/gamification";
import ProgressBar from "../../components/ProgressBar";
import Calendar from "./Calendar";
import { ArrowLeft, Flame } from "../../components/icons";
import styles from "./Profile.module.css";

export default function Profile() {
  const navigate = useNavigate();
  const { state } = useGame();
  const lvl = levelInfo(state.totalXp);
  const unlocked = new Set(state.unlockedBadges);

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <button className={styles.backBtn} aria-label="Retour" onClick={() => navigate("/")}>
          <ArrowLeft />
        </button>
        <h1 className={styles.heading}>Mon profil</h1>
        <span className={styles.spacer} />
      </header>

      <section className={styles.levelCard}>
        <div className={styles.levelTop}>
          <div>
            <p className={styles.levelName}>{lvl.level.name}</p>
            <p className={styles.levelXp}>{state.totalXp} XP au total</p>
          </div>
          <div className={styles.streakBig}>
            <Flame width={22} height={22} style={{ color: "var(--accent)" }} />
            <span>
              <strong>{state.streak.count}</strong> j
            </span>
          </div>
        </div>
        <ProgressBar value={lvl.progress} height={9} />
        <p className={styles.nextLevel}>
          {lvl.next
            ? `Encore ${lvl.next.threshold - state.totalXp} XP pour devenir ${lvl.next.name}`
            : "Vous avez atteint le niveau maximum ✨"}
        </p>
      </section>

      <section className={styles.statsGrid}>
        <Stat value={totalReadCards(state)} label="Cartes lues" />
        <Stat value={state.completedBooks.length} label="Livres terminés" />
        <Stat value={state.activeDays.length} label="Jours actifs" />
      </section>

      <h2 className={styles.sectionTitle}>Calendrier</h2>
      <Calendar activeDays={state.activeDays} />

      <h2 className={styles.sectionTitle}>
        Badges <span className={styles.badgeCount}>{unlocked.size}/{BADGES.length}</span>
      </h2>
      <ul className={styles.badges}>
        {BADGES.map((b) => {
          const has = unlocked.has(b.id);
          return (
            <li key={b.id} className={`${styles.badge} ${has ? "" : styles.locked}`}>
              <span className={styles.badgeEmoji}>{b.emoji}</span>
              <span className={styles.badgeName}>{b.name}</span>
              <span className={styles.badgeDesc}>{b.description}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
