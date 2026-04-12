"use client";

import type { Branding, TextPosition } from "@/lib/types";
import styles from "./BrandingPanel.module.css";

const FONT_OPTIONS = [
  { value: "var(--font-inter), system-ui, sans-serif", label: "Inter" },
  { value: "var(--font-dm), system-ui, sans-serif", label: "DM Sans" },
  { value: "var(--font-space-grotesk), system-ui, sans-serif", label: "Space Grotesk" },
  { value: "var(--font-playfair), Georgia, serif", label: "Playfair Display" },
  { value: "var(--font-jetbrains-mono), ui-monospace, monospace", label: "JetBrains Mono" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "system-ui, sans-serif", label: "System UI" },
];

const POSITION_OPTIONS: { value: TextPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

type Props = {
  branding: Branding;
  onChange: (b: Branding) => void;
  disabled?: boolean;
};

export function BrandingPanel({ branding, onChange, disabled }: Props) {
  return (
    <section className={styles.wrap} aria-label="Branding">
      <h2 className={styles.heading}>Slide look</h2>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Overlay primary</span>
          <input
            type="color"
            className={styles.color}
            value={branding.primaryColor}
            onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
            disabled={disabled}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Overlay secondary</span>
          <input
            type="color"
            className={styles.color}
            value={branding.secondaryColor}
            onChange={(e) => onChange({ ...branding, secondaryColor: e.target.value })}
            disabled={disabled}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Title color</span>
          <input
            type="color"
            className={styles.color}
            value={hexFromColor(branding.titleColor)}
            onChange={(e) => onChange({ ...branding, titleColor: e.target.value })}
            disabled={disabled}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Body color</span>
          <input
            type="color"
            className={styles.color}
            value={hexFromColor(branding.bodyColor)}
            onChange={(e) => onChange({ ...branding, bodyColor: e.target.value })}
            disabled={disabled}
          />
        </label>
        <label className={styles.fieldWide}>
          <span className={styles.label}>Font</span>
          <select
            className={styles.select}
            value={branding.fontFamily}
            onChange={(e) => onChange({ ...branding, fontFamily: e.target.value })}
            disabled={disabled}
          >
            {FONT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.fieldWide}>
          <span className={styles.label}>Text position</span>
          <select
            className={styles.select}
            value={branding.textPosition}
            onChange={(e) =>
              onChange({ ...branding, textPosition: e.target.value as TextPosition })
            }
            disabled={disabled}
          >
            {POSITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.fieldWide}>
          <span className={styles.label}>Title size ({branding.titleSizePercent}%)</span>
          <input
            type="range"
            className={styles.range}
            min={70}
            max={200}
            value={branding.titleSizePercent}
            onChange={(e) =>
              onChange({ ...branding, titleSizePercent: Number(e.target.value) })
            }
            disabled={disabled}
          />
        </label>
        <label className={styles.fieldWide}>
          <span className={styles.label}>Body size ({branding.bodySizePercent}%)</span>
          <input
            type="range"
            className={styles.range}
            min={70}
            max={200}
            value={branding.bodySizePercent}
            onChange={(e) =>
              onChange({ ...branding, bodySizePercent: Number(e.target.value) })
            }
            disabled={disabled}
          />
        </label>
      </div>
    </section>
  );
}

function hexFromColor(c: string): string {
  const s = c.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
  if (!m) return "#ffffff";
  const r = Number(m[1]).toString(16).padStart(2, "0");
  const g = Number(m[2]).toString(16).padStart(2, "0");
  const b = Number(m[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
