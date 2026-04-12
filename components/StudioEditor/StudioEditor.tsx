"use client";

import { useRef } from "react";
import { getSlideBranding } from "@/lib/slideBranding";
import { slideTextFingerprint } from "@/lib/slideTextFingerprint";
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
  onBrandingChange: (id: string, b: Branding) => void;
  onTitleChange: (id: string, title: string) => void;
  onBodyChange: (id: string, body: string) => void;
  onRefreshStockImages: (id: string) => void;
  onGenerateAiImage: (id: string) => void;
  onUploadImage: (id: string, file: File) => void;
  onAddSlide: () => void | Promise<void>;
  onDeleteSlide: (id: string) => void;
  onStartOver: () => void;
  onExportAll: () => void;
  busy: boolean;
  imageBusyId: string | null;
  imageBusyMode: "stock" | "ai" | null;
  exporting: boolean;
};

export function StudioEditor({
  slides,
  selectedIndex,
  onSelectSlide,
  format,
  onBrandingChange,
  onTitleChange,
  onBodyChange,
  onRefreshStockImages,
  onGenerateAiImage,
  onUploadImage,
  onAddSlide,
  onDeleteSlide,
  onStartOver,
  onExportAll,
  busy,
  imageBusyId,
  imageBusyMode,
  exporting,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const slide = slides[selectedIndex];
  if (!slide) return null;

  const canAdd = slides.length < MAX_SLIDES;
  const canDelete = slides.length > 1;
  const imageBusy = imageBusyId === slide.id;

  const copyFingerprint = slideTextFingerprint(slide.title, slide.body);
  const imageCopyMismatch =
    slide.imageSource !== "upload" &&
    typeof slide.imageSyncedText === "string" &&
    slide.imageSyncedText.length > 0 &&
    slide.imageSyncedText !== copyFingerprint;

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
          Start over
        </button>
      </div>

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
        <BrandingPanel
          branding={getSlideBranding(slide)}
          onChange={(b) => onBrandingChange(slide.id, b)}
          disabled={busy}
        />
      </div>

      {imageCopyMismatch && (
        <div className={styles.copyImageHint} role="status">
          <p className={styles.copyImageHintTitle}>Copy changed since this image was chosen</p>
          <p className={styles.copyImageHintBody}>
            Refresh stock, generate a new AI image, or upload a photo so the visual matches your
            updated title and body.
          </p>
        </div>
      )}

      <p className={styles.imageSectionLabel}>Background image</p>
      <p className={styles.imageSectionHint}>
        We match visuals to your <span className={styles.emph}>current</span> title and body. If
        you edit the copy, refresh or swap the image so it still fits.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onRefreshStockImages(slide.id)}
          disabled={busy}
        >
          {imageBusy && imageBusyMode === "stock" ? "Refreshing stock…" : "Use stock photos"}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onGenerateAiImage(slide.id)}
          disabled={busy}
        >
          {imageBusy && imageBusyMode === "ai" ? "Generating AI image…" : "Generate AI image"}
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
