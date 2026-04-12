"use client";

import type { StudioFormat } from "@/lib/types";
import styles from "./PromptInput.module.css";

type Props = {
  value: string;
  onChange: (v: string) => void;
  format: StudioFormat;
  onFormatChange: (f: StudioFormat) => void;
  onGenerate: () => void;
  disabled: boolean;
  loading: boolean;
};

const FORMAT_LABELS: Record<StudioFormat, string> = {
  post: "Instagram post (1:1)",
  story: "Story (9:16)",
  carousel: "Carousel (multi-slide)",
};

export function PromptInput({
  value,
  onChange,
  format,
  onFormatChange,
  onGenerate,
  disabled,
  loading,
}: Props) {
  return (
    <section className={styles.wrap} aria-label="Create from prompt">
      <label className={styles.label} htmlFor="idea">
        Your idea
      </label>
      <textarea
        id="idea"
        className={styles.textarea}
        rows={5}
        placeholder="e.g. 5 tips for better sleep, launching a coffee brand, why remote work wins…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="format">
            Format
          </label>
          <select
            id="format"
            className={styles.select}
            value={format}
            onChange={(e) => onFormatChange(e.target.value as StudioFormat)}
            disabled={disabled}
          >
            {(Object.keys(FORMAT_LABELS) as StudioFormat[]).map((key) => (
              <option key={key} value={key}>
                {FORMAT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={styles.generate}
          onClick={onGenerate}
          disabled={disabled || !value.trim()}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>
    </section>
  );
}
