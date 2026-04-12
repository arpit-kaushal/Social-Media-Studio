"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenerationSkeleton } from "@/components/GenerationSkeleton/GenerationSkeleton";
import { PhonePreview } from "@/components/PhonePreview/PhonePreview";
import { PromptInput } from "@/components/PromptInput/PromptInput";
import { SlideFrame } from "@/components/SlideFrame/SlideFrame";
import { StudioEditor } from "@/components/StudioEditor/StudioEditor";
import { captureElementAsPng, downloadBlob } from "@/lib/exportSlides";
import {
  createInsertedSlide,
  generateSlides,
  newImageForSlide,
  regenerateSlideContent,
} from "@/lib/generateSlides";
import { DEFAULT_BRANDING, type Branding, type Slide, type StudioFormat } from "@/lib/types";
import styles from "./page.module.css";

const EXPORT_WIDTH_PX = 1080;

type Phase = "prompt" | "generating" | "studio";

function packState(slides: Slide[], branding: Branding): string {
  return JSON.stringify({
    branding,
    slides: slides.map((s) => ({
      id: s.id,
      title: s.title,
      body: s.body,
      img:
        s.imageSource === "upload" || s.image.startsWith("data:")
          ? `upload:${s.image.length}`
          : (s.imageCandidates ?? [s.image]).join(">"),
    })),
  });
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<StudioFormat>("carousel");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapshot, setSnapshot] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [imageBusyId, setImageBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  const dirty = useMemo(() => {
    if (!snapshot || slides.length === 0) return false;
    return packState(slides, branding) !== snapshot;
  }, [slides, branding, snapshot]);

  useEffect(() => {
    if (slides.length === 0) return;
    setSelectedIndex((i) => Math.min(i, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  const runGeneration = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    const resumeStudio = slidesRef.current.length > 0;
    setPhase("generating");
    try {
      const next = await generateSlides(text, format);
      setSlides(next);
      setSelectedIndex(0);
      setSnapshot(packState(next, branding));
      setPhase("studio");
    } catch (e) {
      console.error(e);
      setPhase(resumeStudio ? "studio" : "prompt");
      alert("Could not generate slides. Try again.");
    }
  }, [prompt, format, branding]);

  const handleGenerate = useCallback(async () => {
    await runGeneration();
  }, [runGeneration]);

  const handleRegenerateCarousel = useCallback(async () => {
    await runGeneration();
  }, [runGeneration]);

  const handleStartOver = useCallback(() => {
    setPhase("prompt");
    setSlides([]);
    setSnapshot("");
    setSelectedIndex(0);
    slideRefs.current = [];
  }, []);

  const updateSlide = useCallback((id: string, patch: Partial<Slide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const handleRegenerateSlide = useCallback(
    async (id: string) => {
      const idx = slides.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const slide = slides[idx];
      setRegeneratingId(id);
      try {
        const patch = await regenerateSlideContent(slide, prompt, format, idx, slides.length);
        updateSlide(id, patch);
      } finally {
        setRegeneratingId(null);
      }
    },
    [slides, prompt, format, updateSlide]
  );

  const handleChangeImage = useCallback(
    async (id: string) => {
      const idx = slides.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const slide = slides[idx];
      setImageBusyId(id);
      try {
        await new Promise((r) => setTimeout(r, 300));
        const patch = await newImageForSlide(slide, prompt, format, idx, slides.length);
        updateSlide(id, patch);
      } finally {
        setImageBusyId(null);
      }
    },
    [slides, prompt, format, updateSlide]
  );

  const handleUploadImage = useCallback(
    (id: string, file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result ?? "");
        if (!data.startsWith("data:")) return;
        updateSlide(id, {
          image: data,
          imageSource: "upload",
          imageCandidates: undefined,
        });
      };
      reader.readAsDataURL(file);
    },
    [updateSlide]
  );

  const handleAddSlide = useCallback(async () => {
    if (slides.length >= 15) return;
    const insertAt = selectedIndex;
    const snippet = prompt.trim() || "your idea";
    const slide = await createInsertedSlide(
      snippet,
      format,
      "New slide",
      "Write your copy here."
    );
    setSlides((prev) => [...prev.slice(0, insertAt + 1), slide, ...prev.slice(insertAt + 1)]);
    setSelectedIndex(insertAt + 1);
  }, [selectedIndex, prompt, format, slides.length]);

  const handleDeleteSlide = useCallback(
    (id: string) => {
      setSlides((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => s.id !== id);
      });
    },
    []
  );

  const handleExportAll = useCallback(async () => {
    if (slides.length === 0) return;
    setExporting(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;
        const blob = await captureElementAsPng(el);
        downloadBlob(blob, `social-studio-slide-${i + 1}.png`);
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (e) {
      console.error(e);
      alert("Export hit a snag. Try again after images finish loading.");
    } finally {
      setExporting(false);
    }
  }, [slides.length]);

  const busy =
    phase === "generating" || !!regeneratingId || !!imageBusyId || exporting;

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Social Media Studio</p>
        <h1 className={styles.title}>Carousels that feel designed, not templated.</h1>
        <p className={styles.sub}>
          Copy from free AI (Gemini or Groq when you add keys) with a local fallback. Images try
          Pollinations, then seeded Picsum, then a flat placeholder. Edit on the left, swipe the
          Instagram preview on the right.{" "}
          <Link href="/status" className={styles.statusLink}>
            Check API status
          </Link>
        </p>
      </header>

      {phase === "prompt" && (
        <div className={styles.promptStage}>
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            format={format}
            onFormatChange={setFormat}
            onGenerate={handleGenerate}
            disabled={busy}
            loading={false}
          />
        </div>
      )}

      {phase === "generating" && (
        <div className={styles.studioShell}>
          <GenerationSkeleton />
        </div>
      )}

      {phase === "studio" && slides.length > 0 && (
        <div className={styles.studioShell}>
          <div className={styles.studioGrid}>
            <StudioEditor
              slides={slides}
              selectedIndex={selectedIndex}
              onSelectSlide={setSelectedIndex}
              format={format}
              branding={branding}
              onBrandingChange={setBranding}
              onTitleChange={(id, title) => updateSlide(id, { title })}
              onBodyChange={(id, body) => updateSlide(id, { body })}
              onRegenerateSlide={handleRegenerateSlide}
              onChangeImage={handleChangeImage}
              onUploadImage={handleUploadImage}
              onAddSlide={handleAddSlide}
              onDeleteSlide={handleDeleteSlide}
              onRegenerateCarousel={handleRegenerateCarousel}
              onStartOver={handleStartOver}
              onExportAll={handleExportAll}
              dirty={dirty}
              busy={busy}
              regeneratingId={regeneratingId}
              imageBusyId={imageBusyId}
              exporting={exporting}
            />
            <PhonePreview
              slides={slides}
              format={format}
              branding={branding}
              activeIndex={selectedIndex}
              onSelectSlide={setSelectedIndex}
            />
          </div>
        </div>
      )}

      <div className={styles.exportDock} aria-hidden>
        {phase === "studio" &&
          slides.map((s, i) => (
            <SlideFrame
              key={`${s.id}-export`}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              slide={s}
              branding={branding}
              format={format}
              widthPx={EXPORT_WIDTH_PX}
            />
          ))}
      </div>
    </main>
  );
}
