import styles from "./ProgressBar.module.css";

interface Props {
  value: number; // 0..1
  accent?: string;
  height?: number;
  "aria-label"?: string;
}

export default function ProgressBar({ value, accent, height = 8, ...rest }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={styles.track}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={rest["aria-label"]}
    >
      <div
        className={styles.fill}
        style={{ width: `${pct}%`, background: accent ?? "var(--accent)" }}
      />
    </div>
  );
}
