"use client";

import styles from "./GenerationSkeleton.module.css";

export function GenerationSkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-label="Generating your carousel">
      <div className={styles.editorCol}>
        <div className={styles.pill} />
        <div className={styles.block} />
        <div className={styles.blockTall} />
        <div className={styles.row}>
          <div className={styles.mini} />
          <div className={styles.mini} />
        </div>
        <div className={styles.block} />
      </div>
      <div className={styles.phoneCol}>
        <div className={styles.phoneShimmer}>
          <div className={styles.phoneInner}>
            <div className={styles.fakeSlide} />
            <div className={styles.fakeSlide} />
            <div className={styles.fakeSlide} />
          </div>
        </div>
        <p className={styles.status}>Crafting slides & visuals…</p>
      </div>
    </div>
  );
}
