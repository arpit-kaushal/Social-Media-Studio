"use client";

import styles from "./StudioApiLoader.module.css";

type Props = {
  label?: string;
};

export function StudioApiLoader({ label = "Loading…" }: Props) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.loader} aria-hidden />
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
