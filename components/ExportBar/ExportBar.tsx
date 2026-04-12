"use client";

import styles from "./ExportBar.module.css";

type Props = {
  onExportAll: () => void;
  disabled: boolean;
  exporting: boolean;
  hasSlides: boolean;
};

export function ExportBar({ onExportAll, disabled, exporting, hasSlides }: Props) {
  return (
    <section className={styles.wrap} aria-label="Export">
      <h2 className={styles.heading}>Export</h2>
      <p className={styles.note}>
        Each slide is saved as a PNG (2× resolution for sharper posts).
      </p>
      <button
        type="button"
        className={styles.btn}
        onClick={onExportAll}
        disabled={disabled || !hasSlides}
      >
        {exporting ? "Saving…" : "Download all slides"}
      </button>
    </section>
  );
}
