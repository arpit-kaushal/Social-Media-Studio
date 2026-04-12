import type { StudioFormat } from "./types";

function splitSentences(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  return t
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function chunkForSlides(sentences: string[], count: number): string[] {
  if (sentences.length === 0) {
    return Array.from({ length: count }, (_, i) => `Idea point ${i + 1}`);
  }
  if (sentences.length >= count) {
    const per = Math.ceil(sentences.length / count);
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const slice = sentences.slice(i * per, (i + 1) * per);
      out.push(slice.join(" "));
    }
    return out;
  }
  const out = [...sentences];
  while (out.length < count) {
    out.push(`Expand on: ${sentences[sentences.length - 1] ?? "your core message"}.`);
  }
  return out.slice(0, count);
}

export function titleForSlideIndex(index: number, total: number): string {
  if (total === 1) return "Your post";
  if (index === 0) return "Hook";
  if (index === total - 1) return "Summary / CTA";
  return `Story · ${index}`;
}

export function slideCountForFormat(format: StudioFormat): number {
  switch (format) {
    case "story":
      return 5;
    case "post":
      return 1;
    case "carousel":
    default:
      return 7;
  }
}

export function buildHeuristicSlidePayloads(
  prompt: string,
  format: StudioFormat
): { title: string; body: string }[] {
  const count = slideCountForFormat(format);
  const sentences = splitSentences(prompt);
  const bodies = chunkForSlides(sentences, count);
  return bodies.map((body, index) => ({
    title: titleForSlideIndex(index, count),
    body: body.length > 320 ? `${body.slice(0, 317)}…` : body,
  }));
}
