import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../state/GameContext";
import type { ThemePref } from "../../types";
import { notificationPermission, requestNotificationPermission } from "../../lib/reminders";
import { ArrowLeft } from "../../components/icons";
import styles from "./Settings.module.css";

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
];

// Affichage des jours, semaine commençant le lundi (convention getDay : 0=dim).
const DAYS: { d: number; l: string; full: string }[] = [
  { d: 1, l: "L", full: "lundi" },
  { d: 2, l: "M", full: "mardi" },
  { d: 3, l: "M", full: "mercredi" },
  { d: 4, l: "J", full: "jeudi" },
  { d: 5, l: "V", full: "vendredi" },
  { d: 6, l: "S", full: "samedi" },
  { d: 0, l: "D", full: "dimanche" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { state, setDailyGoal, setTheme, setReminder, resetProgress } = useGame();
  const [confirming, setConfirming] = useState(false);
  const [permBlocked, setPermBlocked] = useState(false);

  const reminder = state.settings.reminder;
  const unsupported = notificationPermission() === "unsupported";

  const toggleReminder = async () => {
    if (reminder.enabled) {
      setReminder({ enabled: false });
      return;
    }
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      setPermBlocked(false);
      setReminder({ enabled: true });
    } else {
      setPermBlocked(true);
    }
  };

  const toggleDay = (d: number) => {
    const days = reminder.days.includes(d)
      ? reminder.days.filter((x) => x !== d)
      : [...reminder.days, d].sort((a, b) => a - b);
    setReminder({ days });
  };

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
        <div className={styles.rowBetween}>
          <div>
            <h2 className={styles.groupTitle}>Rappel quotidien</h2>
            <p className={styles.hint}>Une notification pour penser à lire ta carte du jour.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reminder.enabled}
            aria-label="Activer le rappel quotidien"
            disabled={unsupported}
            className={`${styles.switch} ${reminder.enabled ? styles.switchOn : ""}`}
            onClick={toggleReminder}
          >
            <span className={styles.knob} />
          </button>
        </div>

        {unsupported && (
          <p className={styles.warn}>Ton navigateur ne supporte pas les notifications.</p>
        )}
        {permBlocked && (
          <p className={styles.warn}>
            Les notifications sont bloquées. Autorise-les pour ce site dans les réglages de ton
            navigateur, puis réessaie.
          </p>
        )}

        {reminder.enabled && (
          <div className={styles.reminderBody}>
            <label className={styles.rowBetween}>
              <span>Heure</span>
              <input
                type="time"
                className={styles.time}
                value={reminder.time}
                onChange={(e) => setReminder({ time: e.target.value })}
              />
            </label>

            <div>
              <div className={styles.rowBetween}>
                <span className={styles.subLabel}>Jours</span>
                <div className={styles.presets}>
                  <button
                    type="button"
                    className={styles.preset}
                    onClick={() => setReminder({ days: [0, 1, 2, 3, 4, 5, 6] })}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    className={styles.preset}
                    onClick={() => setReminder({ days: [1, 2, 3, 4, 5] })}
                  >
                    Semaine
                  </button>
                </div>
              </div>
              <div className={styles.days}>
                {DAYS.map(({ d, l, full }) => (
                  <button
                    type="button"
                    key={d}
                    className={`${styles.day} ${reminder.days.includes(d) ? styles.dayOn : ""}`}
                    aria-pressed={reminder.days.includes(d)}
                    aria-label={full}
                    onClick={() => toggleDay(d)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.rowBetween}>
              <span>Ne pas me rappeler si j'ai déjà lu</span>
              <button
                type="button"
                role="switch"
                aria-checked={reminder.skipIfDone}
                aria-label="Ne pas rappeler si déjà lu"
                className={`${styles.switch} ${reminder.skipIfDone ? styles.switchOn : ""}`}
                onClick={() => setReminder({ skipIfDone: !reminder.skipIfDone })}
              >
                <span className={styles.knob} />
              </button>
            </label>
          </div>
        )}
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
