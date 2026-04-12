"use client";

import { useEffect, useState } from "react";
import { GENERATING_STATUS_MESSAGES } from "@/lib/generatingStatusMessages";
import styles from "./StudioGeneratingSkeleton.module.css";

type EditorProps = {
  promptPreview: string;
  formatLabel: string;
};

/** Left column — mirrors StudioEditor chrome while generating. */
export function StudioGeneratingEditorSkeleton({ promptPreview, formatLabel }: EditorProps) {
  const idea = promptPreview.trim() || "—";

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarTitle} aria-hidden />
        <div className={styles.toolbarPill} aria-hidden />
      </div>
      <div className={styles.chips} aria-hidden>
        <div className={styles.chip} />
        <div className={`${styles.chip} ${styles.chipWide}`} />
        <div className={styles.chip} />
      </div>
      <div className={styles.tools} aria-hidden>
        <div className={styles.tool} />
        <div className={styles.tool} />
      </div>
      <div className={styles.fieldLabel} aria-hidden />
      <div className={styles.input} aria-hidden />
      <div className={styles.fieldLabel} aria-hidden />
      <div className={styles.textarea} aria-hidden />
      <div className={styles.brandBlock} aria-hidden />
      <p className={styles.formatLine}>Format · {formatLabel}</p>
      <div className={styles.ideaBlock}>
        <p className={styles.ideaLabel}>Your idea</p>
        <p className={styles.ideaText}>{idea}</p>
      </div>
      <p className={styles.hint}>Status updates show on the preview →</p>
      <div className={styles.actions} aria-hidden>
        <div className={styles.action} />
        <div className={styles.action} />
        <div className={styles.action} />
      </div>
      <div className={styles.exportBlock}>
        <div className={styles.exportTitle} aria-hidden />
        <div className={styles.exportNote} aria-hidden />
        <div className={styles.exportBtn} aria-hidden />
      </div>
    </div>
  );
}

/** Right column — progress + messages + phone shimmer (matches live preview dock). */
export function StudioGeneratingPreviewSkeleton() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIndex((i) => (i + 1) % GENERATING_STATUS_MESSAGES.length);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  const msg = GENERATING_STATUS_MESSAGES[msgIndex] ?? GENERATING_STATUS_MESSAGES[0];

  return (
    <div className={styles.previewCol}>
      <p className={styles.caption}>Live preview</p>
      <div className={styles.previewStatus} aria-live="polite" aria-busy="true">
        <div
          className={styles.previewProgressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={msg}
        >
          <div className={styles.previewProgressIndeterminate} />
        </div>
        <p className={styles.previewMessage}>{msg}</p>
      </div>
      <div className={styles.phoneOuter} aria-hidden>
        <div className={styles.phoneInner} />
      </div>
    </div>
  );
}
