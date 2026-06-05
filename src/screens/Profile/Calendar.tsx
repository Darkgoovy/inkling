import { useState } from "react";
import { dateKey } from "../../lib/gamification";
import { ChevronLeft, ChevronRight } from "../../components/icons";
import styles from "./Calendar.module.css";

interface Props {
  activeDays: string[];
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

/** Calendrier mensuel à tampons (cf. spec §9.3), indépendant de la série. */
export default function Calendar({ activeDays }: Props) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const active = new Set(activeDays);
  const todayStr = dateKey(now);

  const firstDay = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  // Lundi = 0
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const next = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

  const monthActiveCount = activeDays.filter((d) =>
    d.startsWith(`${view.year}-${String(view.month + 1).padStart(2, "0")}`),
  ).length;

  return (
    <div className={styles.cal}>
      <div className={styles.head}>
        <button className={styles.navBtn} aria-label="Mois précédent" onClick={prev}>
          <ChevronLeft width={18} height={18} />
        </button>
        <div className={styles.monthLabel}>
          {MONTHS[view.month]} {view.year}
          <span className={styles.count}>{monthActiveCount} jour(s) actif(s)</span>
        </div>
        <button className={styles.navBtn} aria-label="Mois suivant" onClick={next}>
          <ChevronRight width={18} height={18} />
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <span key={i} className={styles.empty} />;
          const key = `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isActive = active.has(key);
          const isToday = key === todayStr;
          return (
            <span
              key={i}
              className={`${styles.day} ${isActive ? styles.active : ""} ${isToday ? styles.today : ""}`}
            >
              {isActive ? <span className={styles.stamp}>✓</span> : day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
