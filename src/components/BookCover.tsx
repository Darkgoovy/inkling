import { useState } from "react";
import styles from "./BookCover.module.css";

interface Props {
  title: string;
  accentColor: string;
  cover?: string;
  size?: "sm" | "md" | "lg";
}

const base = import.meta.env.BASE_URL;

/** Couverture du livre : image si dispo, sinon bloc coloré + initiales (cf. spec §6). */
export default function BookCover({ title, accentColor, cover, size = "md" }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = cover && !failed;

  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={`${styles.cover} ${styles[size]}`}
      style={{
        background: showImage ? undefined : `linear-gradient(150deg, ${accentColor}, ${tint(accentColor)})`,
      }}
    >
      {showImage ? (
        <img
          src={`${base}books/${cover}`}
          alt=""
          className={styles.img}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span className={styles.initials} aria-hidden>
          {initials}
        </span>
      )}
    </div>
  );
}

/** Éclaircit légèrement une couleur hex pour le dégradé. */
function tint(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const n = parseInt(m, 16);
  const r = Math.min(255, ((n >> 16) & 255) + 28);
  const g = Math.min(255, ((n >> 8) & 255) + 22);
  const b = Math.min(255, (n & 255) + 18);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
