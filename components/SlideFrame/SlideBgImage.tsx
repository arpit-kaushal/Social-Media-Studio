"use client";

import { useEffect, useMemo, useState } from "react";
import { proxiedImageUrl } from "@/lib/fetchImages";
import type { Slide } from "@/lib/types";
import styles from "./SlideFrame.module.css";

type Props = {
  slide: Slide;
  objectFit?: "cover" | "contain";
};

export function SlideBgImage({ slide, objectFit = "cover" }: Props) {
  const list = useMemo(() => {
    const isUploadData =
      slide.imageSource === "upload" && slide.image.startsWith("data:");
    const isOtherData =
      slide.image.startsWith("data:") && slide.imageSource !== "ai_hf";
    if (isUploadData || isOtherData) {
      return [slide.image];
    }
    if (slide.imageCandidates?.length) {
      return slide.imageCandidates;
    }
    return [slide.image];
  }, [slide]);

  const [i, setI] = useState(0);
  const listKey = list.join("|");

  useEffect(() => {
    setI(0);
  }, [slide.id, slide.image, slide.imageSource, listKey]);

  const raw = list[Math.min(i, list.length - 1)] ?? slide.image;

  if (raw.startsWith("data:") || raw.startsWith("blob:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={raw}
        alt=""
        className={`${styles.bgImage} ${objectFit === "contain" ? styles.bgContain : styles.bgCover}`}
        crossOrigin="anonymous"
        draggable={false}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={proxiedImageUrl(raw)}
      alt=""
      className={`${styles.bgImage} ${objectFit === "contain" ? styles.bgContain : styles.bgCover}`}
      crossOrigin="anonymous"
      draggable={false}
      onError={() => setI((x) => (x + 1 < list.length ? x + 1 : x))}
    />
  );
}
