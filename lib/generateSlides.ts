import { buildImageCandidateUrls } from "./imageProviders";
import type { Slide, StudioFormat } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchImageCandidates(
  visual: string,
  format: StudioFormat,
  seed: number,
  topic: string
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
      }),
    });
    if (!res.ok) throw new Error("candidates api");
    const data = (await res.json()) as { candidates?: string[] };
    if (Array.isArray(data.candidates) && data.candidates.length > 0) {
      return data.candidates;
    }
  } catch {
    /* fallback below */
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
    }[];
  };

  return data.slides.map((item) => ({
    id: newId(),
    title: item.title,
    body: item.body,
    image: item.image,
    imageSource: "generated" as const,
    imageCandidates: item.imageCandidates,
  }));
}

export async function regenerateSlideContent(
  slide: Slide,
  fullPrompt: string,
  format: StudioFormat,
  index: number,
  total: number
): Promise<Pick<Slide, "title" | "body" | "image" | "imageCandidates" | "imageSource">> {
  await new Promise((r) => setTimeout(r, 150));

  const res = await fetch("/api/regenerate-slide-copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      format,
      slide: { title: slide.title, body: slide.body },
      index,
      total,
    }),
  });

  let title = slide.title;
  let body = slide.body;
  if (res.ok) {
    const j = (await res.json()) as { slide?: { title: string; body: string } };
    if (j.slide) {
      title = j.slide.title;
      body = j.slide.body;
    }
  }

  const seed = Math.floor(Math.random() * 2_147_483_647);
  const visual = `${fullPrompt.slice(0, 100)} ${title}`;
  const candidates = await fetchImageCandidates(visual, format, seed, fullPrompt);

  return {
    title,
    body,
    image: candidates[0]!,
    imageCandidates: candidates,
    imageSource: "generated",
  };
}

export async function newImageForSlide(
  slide: Slide,
  fullPrompt: string,
  format: StudioFormat,
  _index: number,
  _total: number
): Promise<Pick<Slide, "image" | "imageCandidates" | "imageSource">> {
  const seed = Math.floor(Math.random() * 2_147_483_647);
  const visual = `${fullPrompt.slice(0, 100)} ${slide.title} ${slide.body.slice(0, 60)}`;
  const candidates = await fetchImageCandidates(visual, format, seed, fullPrompt);
  return {
    image: candidates[0]!,
    imageCandidates: candidates,
    imageSource: "generated",
  };
}

export async function createInsertedSlide(
  promptSnippet: string,
  format: StudioFormat,
  title: string,
  body: string
): Promise<Slide> {
  const seed = Math.floor(Math.random() * 2_147_483_647);
  const visual = `${promptSnippet.slice(0, 80)} ${title}`;
  const candidates = await fetchImageCandidates(visual, format, seed, promptSnippet);
  return {
    id: newId(),
    title,
    body,
    image: candidates[0]!,
    imageSource: "generated",
    imageCandidates: candidates,
  };
}
