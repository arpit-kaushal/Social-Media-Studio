"use client";

import type { CSSProperties } from "react";
import { forwardRef } from "react";
import { scrimGradient, scrimGradientStory } from "@/lib/colorCss";
import type { Branding, Slide, StudioFormat } from "@/lib/types";
import { SlideBgImage } from "./SlideBgImage";
import styles from "./SlideFrame.module.css";

export type SlideFrameLayout = "export" | "phonePreview";

type Props = {
  slide: Slide;
  branding: Branding;
  format: StudioFormat;
  widthPx: number;
  layout?: SlideFrameLayout;
  /** Only for the on-screen preview — exported PNGs use the usual story proportions. */
  phonePreviewStoryHeightPx?: number;
};

function heightForFormat(widthPx: number, format: StudioFormat): number {
  if (format === "story") {
    return Math.round((widthPx * 16) / 9);
  }
  return widthPx;
}

export const SlideFrame = forwardRef<HTMLDivElement, Props>(function SlideFrame(
  { slide, branding, format, widthPx, layout = "export", phonePreviewStoryHeightPx },
  ref
) {
  const isPhone = layout === "phonePreview";

  const h =
    isPhone &&
    format === "story" &&
    typeof phonePreviewStoryHeightPx === "number" &&
    phonePreviewStoryHeightPx > 0
      ? Math.round(phonePreviewStoryHeightPx)
      : heightForFormat(widthPx, format);
  const baseFont = Math.max(12, Math.round(widthPx * 0.038));

  const posClass =
    branding.textPosition === "top"
      ? styles.contentTop
      : branding.textPosition === "center"
        ? styles.contentCenter
        : styles.contentBottom;

  const carouselBottomNudge =
    isPhone && format === "carousel" && branding.textPosition === "bottom"
      ? styles.contentBottomCarousel
      : "";

  const frameClass = styles.frame;

  const contentClass = [
    styles.content,
    posClass,
    carouselBottomNudge,
    isPhone ? styles.contentPhonePreview : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bodyClass = [styles.body, isPhone ? styles.bodyPhonePreview : ""]
    .filter(Boolean)
    .join(" ");

  const sizeStyle: CSSProperties = {
    width: widthPx,
    height: h,
    fontSize: baseFont,
  };

  return (
    <div
      ref={ref}
      className={frameClass}
      style={
        {
          ...sizeStyle,
          "--slide-primary": branding.primaryColor,
          "--slide-secondary": branding.secondaryColor,
          "--slide-title-color": branding.titleColor,
          "--slide-body-color": branding.bodyColor,
          "--title-scale": branding.titleSizePercent / 100,
          "--body-scale": branding.bodySizePercent / 100,
          fontFamily: branding.fontFamily,
        } as CSSProperties
      }
    >
      <div className={styles.imageLayer}>
        <SlideBgImage slide={slide} objectFit={format === "story" ? "contain" : "cover"} />
        {format === "story" ? (
          <div
            className={styles.scrimStoryTint}
            style={{
              background: scrimGradientStory(branding.primaryColor, branding.secondaryColor),
            }}
            aria-hidden
          />
        ) : (
          <div
            className={styles.scrim}
            style={{ background: scrimGradient(branding.primaryColor, branding.secondaryColor) }}
          />
        )}
      </div>
      <div className={contentClass}>
        <p className={styles.title}>{slide.title}</p>
        <p className={bodyClass}>{slide.body}</p>
      </div>
    </div>
  );
});
