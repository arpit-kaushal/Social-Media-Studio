import { DEFAULT_BRANDING, type Branding, type Slide } from "./types";

export function getSlideBranding(slide: Slide, sessionFallback?: Branding | null): Branding {
  if (slide.branding && typeof slide.branding === "object") {
    return { ...DEFAULT_BRANDING, ...slide.branding };
  }
  if (sessionFallback) {
    return { ...DEFAULT_BRANDING, ...sessionFallback };
  }
  return { ...DEFAULT_BRANDING };
}

// Old decks stored one branding for the whole session; copy it onto each slide once.
export function normalizeSlidesBranding(slides: Slide[], sessionBranding?: Branding | null): Slide[] {
  const fallback = sessionBranding ? { ...DEFAULT_BRANDING, ...sessionBranding } : DEFAULT_BRANDING;
  return slides.map((s) => ({
    ...s,
    branding: s.branding && typeof s.branding === "object" ? { ...DEFAULT_BRANDING, ...s.branding } : { ...fallback },
  }));
}
