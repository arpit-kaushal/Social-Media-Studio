import type { StudioFormat } from "./types";
import { dimensionsForFormat } from "./fetchImages";

const POLLINATIONS_ORIGIN = "https://image.pollinations.ai";

export function buildPollinationsImageUrl(
  visualPrompt: string,
  format: StudioFormat,
  seed: number
): string {
  const { width, height } = dimensionsForFormat(format);
  const safe = visualPrompt
    .replace(/[^\w\s,.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  const enriched = [
    "bold editorial social graphic",
    "high contrast",
    "minimal shapes",
    "no text in image",
    safe || "abstract gradient",
  ].join(", ");

  const pathSegment = encodeURIComponent(enriched);
  const u = new URL(`${POLLINATIONS_ORIGIN}/prompt/${pathSegment}`);
  u.searchParams.set("width", String(width));
  u.searchParams.set("height", String(height));
  u.searchParams.set("seed", String(seed));
  u.searchParams.set("nologo", "true");
  return u.toString();
}

/**
 * Ordered list: AI (Pollinations) → Picsum (seeded) → smaller Picsum → flat placeholder.
 * Client tries each until one loads (onError chain).
 */
export function buildImageCandidateUrls(
  visualPrompt: string,
  format: StudioFormat,
  seed: number
): string[] {
  const { width, height } = dimensionsForFormat(format);
  const primary = buildPollinationsImageUrl(visualPrompt, format, seed);
  const s = Math.abs(seed) % 1_000_000;
  const picsumMain = `https://picsum.photos/seed/sms-${s}/${width}/${height}`;
  const w2 = Math.min(width, 900);
  const h2 = Math.min(height, 900);
  const picsumAlt = `https://picsum.photos/seed/sms-${s}-b/${w2}/${h2}`;
  const ph = `https://placehold.co/${width}x${height}/0f172a/a5b4fc/png?text=+`;
  return [primary, picsumMain, picsumAlt, ph];
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}
