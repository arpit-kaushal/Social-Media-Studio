"use client";

import type { CSSProperties } from "react";
import { forwardRef } from "react";
import { scrimGradient } from "@/lib/colorCss";
import type { Branding, Slide, StudioFormat } from "@/lib/types";
import { SlideBgImage } from "./SlideBgImage";
import styles from "./SlideFrame.module.css";

type Props = {
  slide: Slide;
  branding: Branding;
  format: StudioFormat;
  /** Logical width in CSS pixels (height follows format aspect). */
  widthPx: number;
};

function heightForFormat(widthPx: number, format: StudioFormat): number {
  if (format === "story") {
    return Math.round((widthPx * 16) / 9);
  }
  return widthPx;
}

export const SlideFrame = forwardRef<HTMLDivElement, Props>(function SlideFrame(
  { slide, branding, format, widthPx },
  ref
) {
  const h = heightForFormat(widthPx, format);
  const baseFont = Math.max(12, Math.round(widthPx * 0.038));

  const posClass =
    branding.textPosition === "top"
      ? styles.contentTop
      : branding.textPosition === "center"
        ? styles.contentCenter
        : styles.contentBottom;

  return (
    <div
      ref={ref}
      className={styles.frame}
      style={
        {
          width: widthPx,
          height: h,
          fontSize: baseFont,
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
        <SlideBgImage slide={slide} />
        <div
          className={styles.scrim}
          style={{ background: scrimGradient(branding.primaryColor, branding.secondaryColor) }}
        />
      </div>
      <div className={`${styles.content} ${posClass}`}>
        <p className={styles.title}>{slide.title}</p>
        <p className={styles.body}>{slide.body}</p>
      </div>
    </div>
  );
});
