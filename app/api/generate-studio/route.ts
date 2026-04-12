import { NextResponse } from "next/server";
import { generateSlideCopyOrHeuristic } from "@/lib/aiGenerateCopy";
import { MAX_TOPIC_PROMPT_CHARS } from "@/lib/apiLimits";
import { buildFullImageCandidates } from "@/lib/buildImageCandidates";
import { randomSeed } from "@/lib/imageProviders";
import type { StudioFormat } from "@/lib/types";

export const runtime = "nodejs";

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

    const copy = await generateSlideCopyOrHeuristic(prompt, format);

    const slides = await Promise.all(
      copy.map(async (item) => {
        const seed = randomSeed();
        const visual = `${prompt.slice(0, 80)} ${item.title}`;
        const candidates = await buildFullImageCandidates(visual, format, seed, prompt);
        return {
          title: item.title,
          body: item.body,
          image: candidates[0]!,
          imageCandidates: candidates,
        };
      })
    );

    return NextResponse.json({ slides });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "generation failed" }, { status: 500 });
  }
}
