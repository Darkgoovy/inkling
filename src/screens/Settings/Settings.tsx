import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../state/GameContext";
import type { ThemePref } from "../../types";
import { ArrowLeft } from "../../components/icons";
import styles from "./Settings.module.css";

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { state, setDailyGoal, setTheme, resetProgress } = useGame();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <button className={styles.backBtn} aria-label="Retour" onClick={() => navigate("/")}>
          <ArrowLeft />
        </button>
        <h1 className={styles.heading}>Réglages</h1>
        <span className={styles.spacer} />
      </header>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Objectif quotidien</h2>
        <p className={styles.hint}>Nombre de cartes à lire chaque jour.</p>
        <div className={styles.goals}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`${styles.goal} ${state.settings.dailyGoal === n ? styles.goalActive : ""}`}
              onClick={() => setDailyGoal(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Thème</h2>
        <div className={styles.segmented}>
          {THEMES.map((t) => (
            <button
              key={t.value}
              className={`${styles.seg} ${state.settings.theme === t.value ? styles.segActive : ""}`}
              onClick={() => setTheme(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>À propos</h2>
        <p className={styles.about}>
          Inkling — cartes de lecture
          <br />
          <span className={styles.version}>Version 1.0</span>
        </p>
      </section>

      {/* Zone Données : volontairement discrète, en bas de page (cf. spec §8, §10.5) */}
      <section className={`${styles.group} ${styles.dataZone}`}>
        <h2 className={styles.dataTitle}>Données</h2>
        {!confirming ? (
          <button className={styles.resetLink} onClick={() => setConfirming(true)}>
            Réinitialiser ma progression
          </button>
        ) : (
          <div className={styles.confirm}>
            <p className={styles.confirmText}>
              Effacer toute votre progression (XP, série, cartes lues, badges) ? Cette action est
              irréversible.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.cancel} onClick={() => setConfirming(false)}>
                Annuler
              </button>
              <button
                className={styles.confirmReset}
                onClick={() => {
                  resetProgress();
                  setConfirming(false);
                }}
              >
                Tout effacer
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
