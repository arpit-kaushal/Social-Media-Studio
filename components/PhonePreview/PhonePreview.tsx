"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "react-feather";
import { storyPreviewBoxForAspect, useSlideImageAspectRatio } from "@/lib/storyPreviewMedia";
import { getSlideBranding } from "@/lib/slideBranding";
import type { Slide, StudioFormat } from "@/lib/types";
import { SlideFrame } from "../SlideFrame/SlideFrame";
import styles from "./PhonePreview.module.css";

const POST_MEDIA = 300;
const CAROUSEL_W = 300;

function AdaptiveStoryPreviewFrame({
  slide,
  stripW,
  stripH,
}: {
  slide: Slide;
  stripW: number;
  stripH: number;
}) {
  const aspect = useSlideImageAspectRatio(slide);
  const ar = aspect ?? 9 / 16;
  const { w, h } = storyPreviewBoxForAspect(stripW, stripH, ar);
  return (
    <div className={styles.storySlideCenter}>
      <SlideFrame
        slide={slide}
        branding={getSlideBranding(slide)}
        format="story"
        widthPx={w}
        layout="phonePreview"
        phonePreviewStoryHeightPx={h}
      />
    </div>
  );
}

type Props = {
  slides: Slide[];
  format: StudioFormat;
  activeIndex: number;
  onSelectSlide: (index: number) => void;
  variant?: "default" | "studio";
};

export function PhonePreview({
  slides,
  format,
  activeIndex,
  onSelectSlide,
  variant = "default",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const skipScrollRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, pointerId: -1 });
  const draggingRef = useRef(false);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const [storyViewport, setStoryViewport] = useState({ w: 360, h: 560 });

  const isCarousel = format === "carousel";
  const isStory = format === "story";
  const isPost = format === "post";
  const postW = variant === "studio" ? 320 : POST_MEDIA;
  const carouselW = variant === "studio" ? 320 : CAROUSEL_W;

  const showSlideNav = (isCarousel || isStory) && slides.length > 1;

  const goPrev = useCallback(() => {
    onSelectSlide(Math.max(0, activeIndex - 1));
  }, [activeIndex, onSelectSlide]);

  const goNext = useCallback(() => {
    onSelectSlide(Math.min(slides.length - 1, activeIndex + 1));
  }, [activeIndex, onSelectSlide, slides.length]);

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
    if (best !== activeIndexRef.current) {
      onSelectSlide(best);
    }
  }, [isCarousel, isStory, onSelectSlide]);

  const flushPickSlide = useCallback(() => {
    requestAnimationFrame(() => pickClosestToCenter());
  }, [pickClosestToCenter]);

  const measureStoryStrip = useCallback(() => {
    const root = scrollRef.current;
    if (!root || !isStory) return;
    const cw = root.clientWidth;
    const ch = root.clientHeight;
    if (cw < 48 || ch < 48) return;
    setStoryViewport((prev) =>
      Math.abs(prev.w - cw) > 2 || Math.abs(prev.h - ch) > 2 ? { w: cw, h: ch } : prev
    );
  }, [isStory]);

  useLayoutEffect(() => {
    if (!isStory) return;
    const root = scrollRef.current;
    if (!root) return;
    measureStoryStrip();
    const ro = new ResizeObserver(() => measureStoryStrip());
    ro.observe(root);
    return () => ro.disconnect();
  }, [isStory, measureStoryStrip, slides.length]);

  const onStripPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      pointerId: e.pointerId,
    };
  }, []);

  const onStripPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const d = dragRef.current;
    if (!el || !d.active || e.pointerId !== d.pointerId) return;
    el.scrollLeft = d.startScroll - (e.clientX - d.startX);
  }, []);

  const onStripPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (d.active && e.pointerId === d.pointerId) {
        d.active = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Pointer was already released.
        }
        flushPickSlide();
      }
      draggingRef.current = false;
    },
    [flushPickSlide]
  );

  const onStripWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const strip = scrollRef.current;
    if (!strip) return;

    const isVerticallyScrollable = (n: HTMLElement) => {
      const st = window.getComputedStyle(n);
      const oy = st.overflowY;
      if (oy !== "auto" && oy !== "scroll") return false;
      return n.scrollHeight > n.clientHeight + 1;
    };

    let node = e.target as HTMLElement | null;
    while (node && node !== strip) {
      if (isVerticallyScrollable(node) && e.deltaY !== 0) {
        return;
      }
      node = node.parentElement;
    }

    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta === 0) return;
    strip.scrollLeft += delta;
    e.preventDefault();
  }, []);

  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!isCarousel && !isStory) return;
    const root = scrollRef.current;
    if (!root) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      if (skipScrollRef.current || draggingRef.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(pickClosestToCenter, 140);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    const onScrollEnd = () => {
      if (skipScrollRef.current || draggingRef.current) return;
      pickClosestToCenter();
    };
    if ("onscrollend" in root) {
      root.addEventListener("scrollend", onScrollEnd);
    }
    return () => {
      clearTimeout(timeout);
      root.removeEventListener("scroll", onScroll);
      if ("onscrollend" in root) {
        root.removeEventListener("scrollend", onScrollEnd);
      }
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
    }, 480);
    return () => clearTimeout(t);
  }, [activeIndex, isCarousel, isStory]);

  if (slides.length === 0) return null;

  const active = slides[activeIndex] ?? slides[0]!;
  const captionPreview = `${active.title} — ${active.body.slice(0, 72)}${active.body.length > 72 ? "…" : ""}`;
  const wrapClass =
    variant === "studio" ? `${styles.wrap} ${styles.wrapStudio}` : styles.wrap;

  const stripProps = {
    className: `${isStory ? styles.storyCarousel : styles.igCarousel} ${styles.horizontalStrip}`,
    ref: scrollRef,
    onPointerDown: onStripPointerDown,
    onPointerMove: onStripPointerMove,
    onPointerUp: onStripPointerUp,
    onPointerCancel: onStripPointerUp,
    onWheel: onStripWheel,
  };

  const navPrev = (
    <button
      type="button"
      className={styles.carouselNavBtn}
      aria-label="Previous slide"
      disabled={activeIndex <= 0}
      onClick={goPrev}
    >
      <ChevronLeft size={22} strokeWidth={2} aria-hidden />
    </button>
  );

  const navNext = (
    <button
      type="button"
      className={styles.carouselNavBtn}
      aria-label="Next slide"
      disabled={activeIndex >= slides.length - 1}
      onClick={goNext}
    >
      <ChevronRight size={22} strokeWidth={2} aria-hidden />
    </button>
  );

  if (isPost) {
    return (
      <div className={wrapClass}>
        <p className={styles.caption}>Live preview · Post</p>
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
                    branding={getSlideBranding(active)}
                    format="post"
                    widthPx={postW}
                    layout="phonePreview"
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

  if (isStory) {
    const phone = (
      <div className={`${styles.iphone} ${styles.iphoneStory}`}>
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
            <div className={styles.storyProgressRow} aria-hidden>
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.storySeg} ${i === activeIndex ? styles.storySegOn : ""}`}
                />
              ))}
            </div>
            <div className={styles.storyCarouselSlot}>
              <div {...stripProps}>
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    ref={(el) => {
                      pageRefs.current[index] = el;
                    }}
                    className={styles.storyPage}
                  >
                    <AdaptiveStoryPreviewFrame
                      slide={slide}
                      stripW={storyViewport.w}
                      stripH={storyViewport.h}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.homeBar} aria-hidden />
        </div>
      </div>
    );

    return (
      <div className={wrapClass}>
        <p className={styles.caption}>Live preview · Story</p>
        {showSlideNav ? (
          <div className={styles.previewWithNav}>
            {navPrev}
            {phone}
            {navNext}
          </div>
        ) : (
          phone
        )}
      </div>
    );
  }

  const phone = (
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
            <div {...stripProps}>
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
                    branding={getSlideBranding(slide)}
                    format="carousel"
                    widthPx={carouselW}
                    layout="phonePreview"
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
  );

  return (
    <div className={wrapClass}>
      <p className={styles.caption}>Live preview · Carousel</p>
      {showSlideNav ? (
        <div className={styles.previewWithNav}>
          {navPrev}
          {phone}
          {navNext}
        </div>
      ) : (
        phone
      )}
    </div>
  );
}
