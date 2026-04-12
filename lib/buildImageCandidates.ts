import { dimensionsForFormat } from "./fetchImages";
import { buildImageCandidateUrls } from "./imageProviders";
import { getExtraStockUrls } from "./stockPhotos";
import type { StudioFormat } from "./types";

export async function buildFullImageCandidates(
  visualPrompt: string,
  format: StudioFormat,
  seed: number,
  topic: string
): Promise<string[]> {
  const { width, height } = dimensionsForFormat(format);
  const base = buildImageCandidateUrls(visualPrompt, format, seed);
  try {
    const extras = await getExtraStockUrls(topic, width, height, seed);
    return [...extras, ...base];
  } catch {
    return base;
  }
}
