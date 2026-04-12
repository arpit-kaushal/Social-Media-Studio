import { dimensionsForFormat } from "./fetchImages";
import { buildImageCandidateUrls } from "./imageProviders";
import { resolveSlideImageCandidates } from "./resolveSlideImages";
import { getExtraStockUrls } from "./stockPhotos";
import type { StudioFormat } from "./types";

export type BuildImageCandidatesOptions = {
  title: string;
  body: string;
  slideIndex: number;
  tryHuggingFace: boolean;
};

export async function buildFullImageCandidates(
  visualPrompt: string,
  format: StudioFormat,
  seed: number,
  topic: string,
  opts?: BuildImageCandidatesOptions
): Promise<string[]> {
  if (opts?.title != null && opts?.body != null) {
    const { candidates } = await resolveSlideImageCandidates({
      format,
      topicPrompt: topic,
      title: opts.title,
      body: opts.body,
      slideIndex: opts.slideIndex,
      baseSeed: seed,
      tryHuggingFace: opts.tryHuggingFace === true,
    });
    return candidates;
  }

  const { width, height } = dimensionsForFormat(format);
  const base = buildImageCandidateUrls(visualPrompt, format, seed);
  try {
    const extras = await getExtraStockUrls(topic, width, height, seed);
    return [...extras, ...base];
  } catch {
    return base;
  }
}
