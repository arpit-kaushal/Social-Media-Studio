"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StudioApiLoader } from "@/components/StudioApiLoader/StudioApiLoader";
import {
  StudioGeneratingEditorSkeleton,
  StudioGeneratingPreviewSkeleton,
} from "@/components/StudioGeneratingSkeleton/StudioGeneratingSkeleton";
import { PhonePreview } from "@/components/PhonePreview/PhonePreview";
import { SlideFrame } from "@/components/SlideFrame/SlideFrame";
import { StudioEditor } from "@/components/StudioEditor/StudioEditor";
import { captureElementAsPng, downloadBlob } from "@/lib/exportSlides";
import {
  createInsertedSlide,
  generateAiImageForSlide,
  generateSlides,
  refreshStockImagesForSlide,
} from "@/lib/generateSlides";
import { getSlideBranding, normalizeSlidesBranding } from "@/lib/slideBranding";
import { slideTextFingerprint } from "@/lib/slideTextFingerprint";
import { DEFAULT_BRANDING, type Branding, type Slide, type StudioFormat } from "@/lib/types";
import styles from "./StudioWorkspace.module.css";

const EXPORT_WIDTH_PX = 1080;

type StudioView = "loading" | "generating" | "editor" | "empty";

function formatLabel(f: StudioFormat): string {
  if (f === "story") return "Story (9:16)";
  if (f === "post") return "Post (1:1)";
  return "Carousel";
}

type Props = {
  sessionId: string;
};

function StudioTopBar() {
  return (
    <header className={styles.topBar}>
      <span className={styles.topBarBrand}>Social Media Studio</span>
      <span className={styles.topBarSep} aria-hidden>
        ·
      </span>
      <span className={styles.topBarHint}>Refine your deck, then export PNGs ready to post.</span>
    </header>
  );
}

export function StudioWorkspace({ sessionId }: Props) {
  const router = useRouter();
  const [view, setView] = useState<StudioView>("loading");
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<StudioFormat>("carousel");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageBusyId, setImageBusyId] = useState<string | null>(null);
  const [imageBusyMode, setImageBusyMode] = useState<"stock" | "ai" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [fetchDone, setFetchDone] = useState(false);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const generationStartedRef = useRef(false);

  useEffect(() => {
    generationStartedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (slides.length === 0) return;
    setSelectedIndex((i) => Math.min(i, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/studio-session?id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const j = (await res.json()) as {
          session?: {
            prompt?: string;
            format?: StudioFormat;
            branding?: Branding;
            slides?: Slide[];
            selectedIndex?: number;
            phase?: "prompt" | "generating" | "studio";
          } | null;
        };

        const s = j.session;

        if (!cancelled && s?.slides?.length) {
          if (typeof s.prompt === "string") setPrompt(s.prompt);
          if (s.format) setFormat(s.format);
          const sessionBrand =
            s.branding && typeof s.branding === "object"
              ? { ...DEFAULT_BRANDING, ...s.branding }
              : DEFAULT_BRANDING;
          setSlides(normalizeSlidesBranding(s.slides!, sessionBrand));
          if (typeof s.selectedIndex === "number") {
            setSelectedIndex(Math.max(0, Math.floor(s.selectedIndex)));
          }
          setView("editor");
          setFetchDone(true);
          return;
        }

        if (s) {
          if (typeof s.prompt === "string") setPrompt(s.prompt);
          if (s.format) setFormat(s.format);
        }

        if (!cancelled) {
          if (s?.phase === "generating") {
            setView("generating");
          } else {
            setView("empty");
          }
        }
      } catch {
        if (!cancelled) setView("empty");
      } finally {
        if (!cancelled) setFetchDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (view !== "generating" || !prompt.trim()) return;
    if (generationStartedRef.current) return;
    generationStartedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const next = await generateSlides(prompt.trim(), format);
        if (cancelled) return;
        const normalized = normalizeSlidesBranding(next, DEFAULT_BRANDING);
        setSlides(normalized);
        setSelectedIndex(0);
        setView("editor");
        await fetch("/api/studio-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sessionId,
            prompt: prompt.trim(),
            format,
            branding: normalized[0] ? getSlideBranding(normalized[0]!) : DEFAULT_BRANDING,
            slides: normalized,
            selectedIndex: 0,
            phase: "studio" as const,
          }),
        }).catch(() => {});
      } catch (e) {
        console.error(e);
        generationStartedRef.current = false;
        if (!cancelled) {
          alert("Could not generate slides. Try again from the home page.");
          setView("empty");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view, prompt, format, sessionId]);

  useEffect(() => {
    if (!fetchDone) return;
    if (view !== "editor" && view !== "generating") return;

    const phaseToSave: "prompt" | "generating" | "studio" =
      view === "editor" && slides.length > 0 ? "studio" : view === "generating" ? "generating" : "prompt";

    const t = setTimeout(() => {
      void fetch("/api/studio-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          prompt,
          format,
          branding: slides[0] ? getSlideBranding(slides[0]!) : DEFAULT_BRANDING,
          slides,
          selectedIndex,
          phase: phaseToSave,
        }),
      }).catch(() => {});
    }, 900);

    return () => clearTimeout(t);
  }, [fetchDone, view, sessionId, prompt, format, slides, selectedIndex]);

  const handleStartOver = useCallback(async () => {
    generationStartedRef.current = false;
    try {
      await fetch("/api/studio-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          prompt: "",
          format: "carousel",
          branding: DEFAULT_BRANDING,
          slides: [],
          selectedIndex: 0,
          phase: "prompt",
        }),
      });
    } catch {
      // Session cleanup is best-effort; user still returns home.
    }
    router.push("/");
  }, [router, sessionId]);

  const updateSlide = useCallback((id: string, patch: Partial<Slide>) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const handleRefreshStockImages = useCallback(
    async (id: string) => {
      const idx = slides.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const slide = slides[idx];
      setImageBusyId(id);
      setImageBusyMode("stock");
      try {
        const patch = await refreshStockImagesForSlide(slide, prompt, format, idx, slides.length);
        updateSlide(id, patch);
      } finally {
        setImageBusyId(null);
        setImageBusyMode(null);
      }
    },
    [slides, prompt, format, updateSlide]
  );

  const handleGenerateAiImage = useCallback(
    async (id: string) => {
      const idx = slides.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const slide = slides[idx];
      setImageBusyId(id);
      setImageBusyMode("ai");
      try {
        const result = await generateAiImageForSlide(slide, prompt, format, idx);
        if (result.ok) {
          updateSlide(id, result.patch);
        } else {
          alert(result.message);
        }
      } finally {
        setImageBusyId(null);
        setImageBusyMode(null);
      }
    },
    [slides, prompt, format, updateSlide]
  );

  const handleUploadImage = useCallback((id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result ?? "");
      if (!data.startsWith("data:")) return;
      setSlides((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                image: data,
                imageSource: "upload" as const,
                imageCandidates: undefined,
                imageSyncedText: slideTextFingerprint(s.title, s.body),
              }
            : s
        )
      );
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAddSlide = useCallback(async () => {
    if (slides.length >= 15) return;
    const insertAt = selectedIndex;
    const snippet = prompt.trim() || "your idea";
    const template = slides[selectedIndex] ? getSlideBranding(slides[selectedIndex]!) : DEFAULT_BRANDING;
    const slide = await createInsertedSlide(
      snippet,
      format,
      "New slide",
      "Write your copy here.",
      template
    );
    setSlides((prev) => [...prev.slice(0, insertAt + 1), slide, ...prev.slice(insertAt + 1)]);
    setSelectedIndex(insertAt + 1);
  }, [selectedIndex, prompt, format, slides]);

  const handleDeleteSlide = useCallback((id: string) => {
    setSlides((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== id);
    });
  }, []);

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

  const busy = !!imageBusyId || exporting;

  const mainCls = `${styles.main} ${styles.mainViewport}`;

  if (view === "loading") {
    return (
      <main className={mainCls}>
        <StudioTopBar />
        <div className={styles.apiLoaderWrap}>
          <StudioApiLoader label="Loading your deck…" />
        </div>
      </main>
    );
  }

  if (view === "generating") {
    return (
      <main className={mainCls}>
        <StudioTopBar />
        <div className={styles.studioShell}>
          <div className={styles.studioLayout}>
            <div className={styles.studioLeft}>
              <StudioGeneratingEditorSkeleton
                promptPreview={prompt}
                formatLabel={formatLabel(format)}
              />
            </div>
            <div className={styles.studioRight}>
              <StudioGeneratingPreviewSkeleton />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (view === "empty") {
    return (
      <main className={mainCls}>
        <StudioTopBar />
        <div className={styles.emptyFill}>
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nothing to edit here</p>
            <p className={styles.emptyBody}>
              This link doesn&apos;t have a deck yet, or it may have expired. Start fresh from the home
              page.
            </p>
            <Link href="/" className={styles.emptyLink}>
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={mainCls}>
      <StudioTopBar />
      <div className={styles.studioShell}>
        <div className={styles.studioLayout}>
          <div className={styles.studioLeft}>
            <StudioEditor
              slides={slides}
              selectedIndex={selectedIndex}
              onSelectSlide={setSelectedIndex}
              format={format}
              onTitleChange={(id, title) => updateSlide(id, { title })}
              onBodyChange={(id, body) => updateSlide(id, { body })}
              onBrandingChange={(id, b) => updateSlide(id, { branding: b })}
              onRefreshStockImages={handleRefreshStockImages}
              onGenerateAiImage={handleGenerateAiImage}
              onUploadImage={handleUploadImage}
              onAddSlide={handleAddSlide}
              onDeleteSlide={handleDeleteSlide}
              onStartOver={handleStartOver}
              onExportAll={handleExportAll}
              busy={busy}
              imageBusyId={imageBusyId}
              imageBusyMode={imageBusyMode}
              exporting={exporting}
            />
          </div>
          <div className={styles.studioRight}>
            <PhonePreview
              slides={slides}
              format={format}
              activeIndex={selectedIndex}
              onSelectSlide={setSelectedIndex}
              variant="studio"
            />
          </div>
        </div>
      </div>

      <div className={styles.exportDock} aria-hidden>
        {slides.map((s, i) => (
          <SlideFrame
            key={`${s.id}-export`}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            slide={s}
            branding={getSlideBranding(s)}
            format={format}
            widthPx={EXPORT_WIDTH_PX}
          />
        ))}
      </div>
    </main>
  );
}
