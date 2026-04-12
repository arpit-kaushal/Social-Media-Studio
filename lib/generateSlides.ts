import { buildImageCandidateUrls } from "./imageProviders";
import { inferImageSourceFromUrl } from "./inferImageSource";
import { buildImagePromptForSlide } from "./slideImagePrompt";
import { slideTextFingerprint } from "./slideTextFingerprint";
import { DEFAULT_BRANDING, type Slide, type StudioFormat } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type CandidateMeta = {
  title: string;
  body: string;
  slideIndex: number;
  tryHuggingFace: boolean;
};

async function fetchImageCandidates(
  visual: string,
  format: StudioFormat,
  seed: number,
  topic: string,
  meta: CandidateMeta
): Promise<string[]> {
  try {
    const res = await fetch("/api/build-image-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visualPrompt: visual,
        format,
        seed,
        topic,
        title: meta.title,
        slideBody: meta.body,
        slideIndex: meta.slideIndex,
        tryHuggingFace: meta.tryHuggingFace,
      }),
    });
    if (!res.ok) throw new Error("candidates api");
    const data = (await res.json()) as { candidates?: string[] };
    if (Array.isArray(data.candidates) && data.candidates.length > 0) {
      return data.candidates;
    }
  } catch {
    // Use static candidate URLs when the API isn’t available.
  }
  return buildImageCandidateUrls(visual, format, seed);
}

export async function generateSlides(prompt: string, format: StudioFormat): Promise<Slide[]> {
  await new Promise((r) => setTimeout(r, 200));

  const res = await fetch("/api/generate-studio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, format }),
  });

  if (!res.ok) {
    throw new Error("generate-studio failed");
  }

  const data = (await res.json()) as {
    slides: {
      title: string;
      body: string;
      image: string;
      imageCandidates: string[];
      imageSource?: Slide["imageSource"];
      imageSyncedText?: string;
    }[];
    copySource?: "gemini" | "groq" | "heuristic";
  };

  if (
    process.env.NODE_ENV === "development" &&
    data.copySource === "heuristic" &&
    typeof console !== "undefined" &&
    console.warn
  ) {
    console.warn(
      "[generate-studio] Using template copy — add GEMINI_API_KEY or GROQ_API_KEY, or check quota."
    );
  }

  return data.slides.map((item) => ({
    id: newId(),
    title: item.title,
    body: item.body,
    image: item.image,
    imageSource: item.imageSource ?? inferImageSourceFromUrl(item.image),
    imageCandidates: item.imageCandidates,
    imageSyncedText: item.imageSyncedText ?? slideTextFingerprint(item.title, item.body),
    branding: { ...DEFAULT_BRANDING },
  }));
}

export async function refreshStockImagesForSlide(
  slide: Slide,
  fullPrompt: string,
  format: StudioFormat,
  slideIndex: number,
  _total: number
): Promise<Pick<Slide, "image" | "imageCandidates" | "imageSource" | "imageSyncedText">> {
  const seed = Math.floor(Math.random() * 2_147_483_647);
  const visual = `${fullPrompt.slice(0, 100)} ${slide.title} ${slide.body.slice(0, 60)}`;
  const candidates = await fetchImageCandidates(visual, format, seed, fullPrompt, {
    title: slide.title,
    body: slide.body,
    slideIndex,
    tryHuggingFace: false,
  });
  const primary = candidates[0]!;
  return {
    image: primary,
    imageCandidates: candidates,
    imageSource: inferImageSourceFromUrl(primary),
    imageSyncedText: slideTextFingerprint(slide.title, slide.body),
  };
}

export type GenerateAiImageResult =
  | {
      ok: true;
      patch: Pick<Slide, "image" | "imageCandidates" | "imageSource" | "imageSyncedText">;
    }
  | { ok: false; message: string };

async function fetchHfImageDataUrl(
  visualPrompt: string,
  format: StudioFormat
): Promise<{ dataUrl: string | null; detail?: string }> {
  const res = await fetch("/api/generate-hf-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: visualPrompt, format }),
  });
  let j: { dataUrl?: string; detail?: string; error?: string } = {};
  try {
    j = (await res.json()) as typeof j;
  } catch {
    // Response wasn’t JSON; handled below.
  }
  if (!res.ok) {
    const msg =
      typeof j.detail === "string" && j.detail.trim()
        ? j.detail
        : typeof j.error === "string"
          ? j.error
          : `HTTP ${res.status}`;
    return { dataUrl: null, detail: msg };
  }
  if (typeof j.dataUrl !== "string") {
    return { dataUrl: null, detail: j.detail ?? "No image in response" };
  }
  return { dataUrl: j.dataUrl };
}

export async function generateAiImageForSlide(
  slide: Slide,
  fullPrompt: string,
  format: StudioFormat,
  slideIndex: number
): Promise<GenerateAiImageResult> {
  const visual = buildImagePromptForSlide(fullPrompt, slide.title, slide.body, slideIndex);
  const { dataUrl, detail } = await fetchHfImageDataUrl(visual || fullPrompt.slice(0, 200), format);
  if (!dataUrl) {
    return {
      ok: false,
      message:
        detail ??
        "Could not generate an AI image right now. Try stock photos or upload your own, or try again in a moment.",
    };
  }

  const seed = Math.floor(Math.random() * 2_147_483_647);
  const fallbacks = await fetchImageCandidates(
    `${fullPrompt.slice(0, 80)} ${slide.title}`,
    format,
    seed,
    fullPrompt,
    {
      title: slide.title,
      body: slide.body,
      slideIndex,
      tryHuggingFace: false,
    }
  );
  const candidates = [dataUrl, ...fallbacks.filter((u) => u !== dataUrl)];

  return {
    ok: true,
    patch: {
      image: dataUrl,
      imageCandidates: candidates,
      imageSource: "ai_hf",
      imageSyncedText: slideTextFingerprint(slide.title, slide.body),
    },
  };
}

export async function createInsertedSlide(
  promptSnippet: string,
  format: StudioFormat,
  title: string,
  body: string,
  brandingTemplate = DEFAULT_BRANDING
): Promise<Slide> {
  const seed = Math.floor(Math.random() * 2_147_483_647);
  const visual = `${promptSnippet.slice(0, 80)} ${title}`;
  const candidates = await fetchImageCandidates(visual, format, seed, promptSnippet, {
    title,
    body,
    slideIndex: 0,
    tryHuggingFace: false,
  });
  const primary = candidates[0]!;
  return {
    id: newId(),
    title,
    body,
    image: primary,
    imageSource: inferImageSourceFromUrl(primary),
    imageCandidates: candidates,
    imageSyncedText: slideTextFingerprint(title, body),
    branding: { ...brandingTemplate },
  };
}
