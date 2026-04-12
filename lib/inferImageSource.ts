import type { SlideImageSource } from "./types";

export function inferImageSourceFromUrl(url: string): SlideImageSource {
  if (url.startsWith("data:")) return "ai_hf";
  try {
    const u = new URL(url);
    if (u.hostname === "images.unsplash.com" || u.hostname.endsWith(".unsplash.com")) {
      return "stock";
    }
    if (u.hostname === "images.pexels.com" || u.hostname.endsWith(".pexels.com")) {
      return "stock";
    }
  } catch {
    // Not a normal URL; treat as generated.
  }
  return "generated";
}
