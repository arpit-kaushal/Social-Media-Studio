"use client";

import { useEffect, useMemo, useState } from "react";
import { proxiedImageUrl } from "@/lib/fetchImages";
import type { Slide } from "@/lib/types";
import styles from "./SlideFrame.module.css";

type Props = {
  slide: Slide;
};

export function SlideBgImage({ slide }: Props) {
  const list = useMemo(() => {
    if (slide.imageSource === "upload" || slide.image.startsWith("data:")) {
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
      <img src={raw} alt="" className={styles.bgImage} crossOrigin="anonymous" draggable={false} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={proxiedImageUrl(raw)}
      alt=""
      className={styles.bgImage}
      crossOrigin="anonymous"
      draggable={false}
      onError={() => setI((x) => (x + 1 < list.length ? x + 1 : x))}
    />
  );
}
