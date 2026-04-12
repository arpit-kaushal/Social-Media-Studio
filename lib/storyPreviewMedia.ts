"use client";

import { useEffect, useState } from "react";
import { proxiedImageUrl } from "./fetchImages";
import type { Slide } from "./types";

export function getSlidePrimaryImageUrl(slide: Slide): string {
  const raw = slide.image;
  if (raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }
  return proxiedImageUrl(raw);
}

/** Biggest box that fits the strip; `aspect` is image width / height. */
export function storyPreviewBoxForAspect(
  stripInnerW: number,
  stripInnerH: number,
  aspect: number
): { w: number; h: number } {
  if (stripInnerW < 48 || stripInnerH < 48) {
    return { w: 260, h: Math.round((260 * 16) / 9) };
  }
  if (!aspect || aspect <= 0 || !Number.isFinite(aspect)) {
    aspect = 9 / 16;
  }
  const padX = 8;
  const padY = 10;
  const maxW = Math.max(72, stripInnerW - padX * 2);
  const maxH = Math.max(72, stripInnerH - padY * 2);

  let w = Math.min(maxW, maxH * aspect);
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { w: Math.max(48, Math.floor(w)), h: Math.max(48, Math.floor(h)) };
}

export function useSlideImageAspectRatio(slide: Slide): number | null {
  const [aspect, setAspect] = useState<number | null>(null);
  const src = getSlidePrimaryImageUrl(slide);

  useEffect(() => {
    setAspect(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspect(img.naturalWidth / img.naturalHeight);
      } else {
        setAspect(9 / 16);
      }
    };
    img.onerror = () => setAspect(9 / 16);
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [slide.id, src]);

  return aspect;
}
