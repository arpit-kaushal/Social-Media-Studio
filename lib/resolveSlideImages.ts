import { buildImageCandidateUrls } from "./imageProviders";
import { dimensionsForFormat } from "./fetchImages";
import { generateSdImageBytes } from "./hfStableDiffusion";
import { inferImageSourceFromUrl } from "./inferImageSource";
import { buildImagePromptForSlide } from "./slideImagePrompt";
import { getExtraStockUrls } from "./stockPhotos";
import type { SlideImageSource, StudioFormat } from "./types";

const SLIDE_SEED_STEP = 100_003;

/** Visual for Pollinations / Picsum (no duplicate of exact stock query). */
function pollinationsVisual(topicPrompt: string, title: string, body: string, slideIndex: number): string {
  const parts = [
    topicPrompt.slice(0, 60),
    title.slice(0, 80),
    body.slice(0, 50),
    `slide ${slideIndex + 1}`,
  ];
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 220);
}

function stockTopic(topicPrompt: string, title: string, body: string): string {
  return [title, body, topicPrompt].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 320);
}

/**
 * Per slide: optional HF (up to `hfBudgetMs`), then Unsplash → Pexels → Pollinations / Picsum / placeholder.
 * Seeds vary by `slideIndex` so each slide gets different stock / generated URLs.
 */
export async function resolveSlideImageCandidates(params: {
  format: StudioFormat;
  topicPrompt: string;
  title: string;
  body: string;
  slideIndex: number;
  baseSeed: number;
  tryHuggingFace: boolean;
  hfBudgetMs?: number;
}): Promise<{ candidates: string[]; imageSource: SlideImageSource }> {
  const {
    format,
    topicPrompt,
    title,
    body,
    slideIndex,
    baseSeed,
    tryHuggingFace,
    hfBudgetMs = 120_000,
  } = params;

  const seed = baseSeed + slideIndex * SLIDE_SEED_STEP;
  const { width, height } = dimensionsForFormat(format);
  const topic = stockTopic(topicPrompt, title, body);

  let hfDataUrl: string | null = null;
  if (tryHuggingFace) {
    const prompt = buildImagePromptForSlide(topicPrompt, title, body, slideIndex);
    const hfResult = await generateSdImageBytes(prompt, format, hfBudgetMs);
    if (hfResult.ok) {
      hfDataUrl = `data:${hfResult.contentType};base64,${hfResult.buffer.toString("base64")}`;
    }
  }

  let stockUrls: string[] = [];
  try {
    stockUrls = await getExtraStockUrls(topic, width, height, seed);
  } catch {
    stockUrls = [];
  }

  const visual = pollinationsVisual(topicPrompt, title, body, slideIndex);
  const chain = buildImageCandidateUrls(visual, format, seed);

  if (hfDataUrl) {
    const rest = [...stockUrls, ...chain].filter((u) => u !== hfDataUrl);
    return {
      candidates: [hfDataUrl, ...rest],
      imageSource: "ai_hf",
    };
  }

  const candidates = [...stockUrls, ...chain];
  const primary = candidates[0]!;
  return {
    candidates,
    imageSource: inferImageSourceFromUrl(primary),
  };
}
