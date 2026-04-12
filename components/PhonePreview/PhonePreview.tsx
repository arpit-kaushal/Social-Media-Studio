"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Branding, Slide, StudioFormat } from "@/lib/types";
import { SlideFrame } from "../SlideFrame/SlideFrame";
import styles from "./PhonePreview.module.css";

/** 1:1 post — inner media width */
const POST_MEDIA = 300;
/** Story width; height = 16/9 * width (9:16 portrait) */
const STORY_W = 280;
/** Carousel card width (square) */
const CAROUSEL_W = 300;

type Props = {
  slides: Slide[];
  format: StudioFormat;
  branding: Branding;
  activeIndex: number;
  onSelectSlide: (index: number) => void;
};

export function PhonePreview({
  slides,
  format,
  branding,
  activeIndex,
  onSelectSlide,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const skipScrollRef = useRef(false);

  const isCarousel = format === "carousel";
  const isStory = format === "story";
  const isPost = format === "post";

  const pickClosestToCenter = useCallback(() => {
    if (!isCarousel && !isStory) return;
    const root = scrollRef.current;
    if (!root) return;
    const cx = root.scrollLeft + root.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    pageRefs.current.forEach((el, i) => {
      if (!el) return;
      const mid = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(mid - cx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    onSelectSlide(best);
  }, [isCarousel, isStory, onSelectSlide]);

  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!isCarousel && !isStory) return;
    const root = scrollRef.current;
    if (!root) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      if (skipScrollRef.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(pickClosestToCenter, 70);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timeout);
      root.removeEventListener("scroll", onScroll);
    };
  }, [slides.length, isCarousel, isStory, pickClosestToCenter]);

  useEffect(() => {
    if (!isCarousel && !isStory) return;
    const el = pageRefs.current[activeIndex];
    const root = scrollRef.current;
    if (!el || !root) return;
    skipScrollRef.current = true;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    const t = setTimeout(() => {
      skipScrollRef.current = false;
    }, 420);
    return () => clearTimeout(t);
  }, [activeIndex, isCarousel, isStory]);

  if (slides.length === 0) return null;

  const active = slides[activeIndex] ?? slides[0]!;
  const captionPreview = `${active.title} — ${active.body.slice(0, 72)}${active.body.length > 72 ? "…" : ""}`;

  /* ——— Instagram post: single 1:1 card, no carousel strip ——— */
  if (isPost) {
    return (
      <div className={styles.wrap}>
        <p className={styles.caption}>Live preview · Instagram post (1:1)</p>
        <div className={styles.iphone}>
          <div className={styles.antenna} aria-hidden />
          <div className={styles.sideBtnL} aria-hidden />
          <div className={styles.sideBtnR1} aria-hidden />
          <div className={styles.sideBtnR2} aria-hidden />
          <div className={styles.iphoneInner}>
            <div className={styles.statusRow}>
              <span className={styles.time}>9:41</span>
              <div className={styles.dynamicIsland} aria-hidden />
              <span className={styles.statusIcons} aria-hidden>
                ●●●
              </span>
            </div>
            <div className={styles.igShell}>
              <header className={styles.igAppHeader}>
                <span className={styles.igLogo}>Instagram</span>
                <span className={styles.igHeaderActions} aria-hidden>
                  ♡ ✈
                </span>
              </header>
              <article className={styles.igPost}>
                <div className={styles.igPostHead}>
                  <div className={styles.igAvatar} aria-hidden>
                    S
                  </div>
                  <div className={styles.igUser}>
                    <span className={styles.igHandle}>studio.you</span>
                    <span className={styles.igSponsored}>Photo</span>
                  </div>
                  <span className={styles.igMore} aria-hidden>
                    ···
                  </span>
                </div>
                <div className={styles.postMediaSquare}>
                  <SlideFrame
                    slide={active}
                    branding={branding}
                    format="post"
                    widthPx={POST_MEDIA}
                  />
                </div>
                <div className={styles.igToolbar} aria-hidden>
                  <span>♡</span>
                  <span>💬</span>
                  <span>↗</span>
                  <span className={styles.igToolbarSpacer} />
                  <span>▢</span>
                </div>
                <div className={styles.igMeta}>
                  <p className={styles.igLikes}>
                    Liked by <strong>design_daily</strong> and others
                  </p>
                  <p className={styles.igCaption}>
                    <strong>studio.you</strong> {captionPreview}
                  </p>
                </div>
              </article>
            </div>
            <div className={styles.homeBar} aria-hidden />
          </div>
        </div>
      </div>
    );
  }

  /* ——— Instagram story: 9:16, story chrome, swipe when multiple ——— */
  if (isStory) {
    return (
      <div className={styles.wrap}>
        <p className={styles.caption}>Live preview · Story (9:16) · swipe between slides</p>
        <div className={styles.iphone}>
          <div className={styles.antenna} aria-hidden />
          <div className={styles.sideBtnL} aria-hidden />
          <div className={styles.sideBtnR1} aria-hidden />
          <div className={styles.sideBtnR2} aria-hidden />
          <div className={styles.iphoneInner}>
            <div className={styles.statusRow}>
              <span className={styles.time}>9:41</span>
              <div className={styles.dynamicIsland} aria-hidden />
              <span className={styles.statusIcons} aria-hidden>
                ●●●
              </span>
            </div>
            <div className={styles.storyShell}>
              <div className={styles.storyTopBar}>
                <div className={styles.storyRing} aria-hidden>
                  <span className={styles.storyRingInner}>S</span>
                </div>
                <div className={styles.storyUserBlock}>
                  <span className={styles.storyHandle}>studio.you</span>
                  <span className={styles.storyTime}>Just now</span>
                </div>
                <span className={styles.storyClose} aria-hidden>
                  ✕
                </span>
              </div>
              <div className={styles.storyProgressRow} aria-hidden>
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`${styles.storySeg} ${i === activeIndex ? styles.storySegOn : ""}`}
                  />
                ))}
              </div>
              <div ref={scrollRef} className={styles.storyCarousel}>
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    ref={(el) => {
                      pageRefs.current[index] = el;
                    }}
                    className={styles.storyPage}
                  >
                    <SlideFrame
                      slide={slide}
                      branding={branding}
                      format="story"
                      widthPx={STORY_W}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.homeBar} aria-hidden />
          </div>
        </div>
      </div>
    );
  }

  /* ——— Feed carousel (multi-slide) ——— */
  return (
    <div className={styles.wrap}>
      <p className={styles.caption}>Live preview · Feed carousel · swipe</p>
      <div className={styles.iphone}>
        <div className={styles.antenna} aria-hidden />
        <div className={styles.sideBtnL} aria-hidden />
        <div className={styles.sideBtnR1} aria-hidden />
        <div className={styles.sideBtnR2} aria-hidden />
        <div className={styles.iphoneInner}>
          <div className={styles.statusRow}>
            <span className={styles.time}>9:41</span>
            <div className={styles.dynamicIsland} aria-hidden />
            <span className={styles.statusIcons} aria-hidden>
              ●●●
            </span>
          </div>
          <div className={styles.igShell}>
            <header className={styles.igAppHeader}>
              <span className={styles.igLogo}>Instagram</span>
              <span className={styles.igHeaderActions} aria-hidden>
                ♡ ✈
              </span>
            </header>
            <article className={styles.igPost}>
              <div className={styles.igPostHead}>
                <div className={styles.igAvatar} aria-hidden>
                  S
                </div>
                <div className={styles.igUser}>
                  <span className={styles.igHandle}>studio.you</span>
                  <span className={styles.igSponsored}>Carousel</span>
                </div>
                <span className={styles.igMore} aria-hidden>
                  ···
                </span>
              </div>
              <div ref={scrollRef} className={styles.igCarousel}>
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    ref={(el) => {
                      pageRefs.current[index] = el;
                    }}
                    className={styles.igPage}
                  >
                    <SlideFrame
                      slide={slide}
                      branding={branding}
                      format="carousel"
                      widthPx={CAROUSEL_W}
                    />
                  </div>
                ))}
              </div>
              <div className={styles.igToolbar} aria-hidden>
                <span>♡</span>
                <span>💬</span>
                <span>↗</span>
                <span className={styles.igToolbarSpacer} />
                <span>▢</span>
              </div>
              <div className={styles.igDots} aria-hidden>
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`${styles.dot} ${i === activeIndex ? styles.dotOn : ""}`}
                  />
                ))}
              </div>
              <div className={styles.igMeta}>
                <p className={styles.igLikes}>
                  Liked by <strong>design_daily</strong> and others
                </p>
                <p className={styles.igCaption}>
                  <strong>studio.you</strong> {captionPreview}
                </p>
              </div>
            </article>
          </div>
          <div className={styles.homeBar} aria-hidden />
        </div>
      </div>
    </div>
  );
}
