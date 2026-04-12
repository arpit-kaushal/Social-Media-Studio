"use client";

import { useRef } from "react";
import type { Branding, Slide, StudioFormat } from "@/lib/types";
import { BrandingPanel } from "../BrandingPanel/BrandingPanel";
import { ExportBar } from "../ExportBar/ExportBar";
import styles from "./StudioEditor.module.css";

const MAX_SLIDES = 15;

type Props = {
  slides: Slide[];
  selectedIndex: number;
  onSelectSlide: (index: number) => void;
  format: StudioFormat;
  branding: Branding;
  onBrandingChange: (b: Branding) => void;
  onTitleChange: (id: string, title: string) => void;
  onBodyChange: (id: string, body: string) => void;
  onRegenerateSlide: (id: string) => void;
  onChangeImage: (id: string) => void;
  onUploadImage: (id: string, file: File) => void;
  onAddSlide: () => void | Promise<void>;
  onDeleteSlide: (id: string) => void;
  onRegenerateCarousel: () => void;
  onStartOver: () => void;
  onExportAll: () => void;
  dirty: boolean;
  busy: boolean;
  regeneratingId: string | null;
  imageBusyId: string | null;
  exporting: boolean;
};

export function StudioEditor({
  slides,
  selectedIndex,
  onSelectSlide,
  format,
  branding,
  onBrandingChange,
  onTitleChange,
  onBodyChange,
  onRegenerateSlide,
  onChangeImage,
  onUploadImage,
  onAddSlide,
  onDeleteSlide,
  onRegenerateCarousel,
  onStartOver,
  onExportAll,
  dirty,
  busy,
  regeneratingId,
  imageBusyId,
  exporting,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const slide = slides[selectedIndex];
  if (!slide) return null;

  const canAdd = slides.length < MAX_SLIDES;
  const canDelete = slides.length > 1;

  return (
    <div className={styles.panel}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.srOnly}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadImage(slide.id, f);
          e.target.value = "";
        }}
      />

      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Studio</h2>
        <button
          type="button"
          className={styles.ghost}
          onClick={onStartOver}
          disabled={busy}
        >
          New idea
        </button>
      </div>

      {dirty && (
        <div className={styles.dirtyBanner}>
          <p className={styles.dirtyText}>You changed copy or brand colors.</p>
          <button
            type="button"
            className={styles.dirtyBtn}
            onClick={onRegenerateCarousel}
            disabled={busy}
          >
            Regenerate carousel
          </button>
        </div>
      )}

      <div className={styles.chips} role="tablist" aria-label="Slides">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === selectedIndex}
            className={`${styles.chip} ${i === selectedIndex ? styles.chipOn : ""}`}
            onClick={() => onSelectSlide(i)}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      <div className={styles.slideTools}>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={onAddSlide}
          disabled={busy || !canAdd}
          title="Insert a slide after the current one"
        >
          + Add slide
        </button>
        <button
          type="button"
          className={styles.toolBtnDanger}
          onClick={() => onDeleteSlide(slide.id)}
          disabled={busy || !canDelete}
        >
          Delete slide
        </button>
      </div>

      <label className={styles.fieldLabel} htmlFor="slide-title">
        Title
      </label>
      <input
        id="slide-title"
        className={styles.input}
        value={slide.title}
        onChange={(e) => onTitleChange(slide.id, e.target.value)}
        disabled={busy}
      />

      <label className={styles.fieldLabel} htmlFor="slide-body">
        Body
      </label>
      <textarea
        id="slide-body"
        className={styles.textarea}
        rows={format === "story" ? 8 : 6}
        value={slide.body}
        onChange={(e) => onBodyChange(slide.id, e.target.value)}
        disabled={busy}
      />

      <div className={styles.brandBlock}>
        <BrandingPanel branding={branding} onChange={onBrandingChange} disabled={busy} />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onRegenerateSlide(slide.id)}
          disabled={busy}
        >
          {regeneratingId === slide.id ? "Regenerating…" : "Regenerate this slide"}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onChangeImage(slide.id)}
          disabled={busy}
        >
          {imageBusyId === slide.id ? "New image…" : "Change image"}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          Upload image
        </button>
      </div>

      <ExportBar
        onExportAll={onExportAll}
        disabled={busy}
        exporting={exporting}
        hasSlides
      />
    </div>
  );
}
