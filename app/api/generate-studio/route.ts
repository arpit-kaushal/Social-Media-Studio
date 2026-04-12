import { NextResponse } from "next/server";
import { generateSlideCopyOrHeuristic } from "@/lib/aiGenerateCopy";
import { MAX_TOPIC_PROMPT_CHARS } from "@/lib/apiLimits";
import { randomSeed } from "@/lib/imageProviders";
import { resolveSlideImageCandidates } from "@/lib/resolveSlideImages";
import { slideTextFingerprint } from "@/lib/slideTextFingerprint";
import type { SlideImageSource, StudioFormat } from "@/lib/types";

export const runtime = "nodejs";
// Image generation can take a while; the host may still enforce its own cap.
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: string; format?: StudioFormat };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const format = body.format ?? "carousel";
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }
    if (prompt.length > MAX_TOPIC_PROMPT_CHARS) {
      return NextResponse.json({ error: "prompt too long" }, { status: 400 });
    }

    const { slides: copy, copySource } = await generateSlideCopyOrHeuristic(prompt, format);

    const slides: {
      title: string;
      body: string;
      image: string;
      imageCandidates: string[];
      imageSource: SlideImageSource;
      imageSyncedText: string;
    }[] = [];

    for (let i = 0; i < copy.length; i++) {
      const item = copy[i]!;
      const baseSeed = randomSeed();
      const { candidates, imageSource } = await resolveSlideImageCandidates({
        format,
        topicPrompt: prompt,
        title: item.title,
        body: item.body,
        slideIndex: i,
        baseSeed,
        tryHuggingFace: true,
        hfBudgetMs: 120_000,
      });
      const primary = candidates[0] ?? "";
      slides.push({
        title: item.title,
        body: item.body,
        image: primary,
        imageCandidates: candidates,
        imageSource,
        imageSyncedText: slideTextFingerprint(item.title, item.body),
      });
    }

    return NextResponse.json({ slides, copySource });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "generation failed" }, { status: 500 });
  }
}
