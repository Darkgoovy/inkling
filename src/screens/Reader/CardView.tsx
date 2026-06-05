import type { Card } from "../../types";
import { Bulb, Check, Target } from "../../components/icons";
import styles from "./CardView.module.css";

interface Props {
  card: Card;
  isRead: boolean;
  onValidate: () => void;
}

/** Disposition d'une carte de lecture (cf. spec §7.1). */
export default function CardView({ card, isRead, onValidate }: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.scroll}>
        <header className={styles.head}>
          <h1 className={styles.title}>{card.title}</h1>
          <p className={styles.subtitle}>{card.subtitle}</p>
        </header>

        <div className={styles.tags}>
          {card.tags.map((t, i) => (
            <span key={t} className={`${styles.tag} ${styles[`tag${i % 3}`]}`}>
              {t}
            </span>
          ))}
        </div>

        <div className={styles.summary}>
          {card.summary.split(/\n{2,}|\n/).map((para, i) =>
            para.trim() ? <p key={i}>{para.trim()}</p> : null,
          )}
        </div>

        <div className={`${styles.box} ${styles.idea}`}>
          <div className={styles.boxHead}>
            <Bulb width={18} height={18} />
            <span>L'idée clé</span>
          </div>
          <p>{card.keyIdea}</p>
        </div>

        <div className={`${styles.box} ${styles.action}`}>
          <div className={styles.boxHead}>
            <Target width={18} height={18} />
            <span>À appliquer aujourd'hui</span>
          </div>
          <p>{card.action}</p>
        </div>

        <div className={styles.minutes}>≈ {card.estimatedMinutes} min de lecture</div>
      </div>

      <div className={styles.footer}>
        <button
          className={`${styles.validate} ${isRead ? styles.validated : ""}`}
          onClick={onValidate}
        >
          <Check width={20} height={20} />
          {isRead ? "Carte lue · continuer" : "J'ai lu cette carte"}
        </button>
      </div>
    </article>
  );
}
