import { NextResponse } from "next/server";
import { MAX_TOPIC_PROMPT_CHARS, MAX_VISUAL_PROMPT_CHARS } from "@/lib/apiLimits";
import { buildFullImageCandidates } from "@/lib/buildImageCandidates";
import type { StudioFormat } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 130;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      visualPrompt?: string;
      format?: StudioFormat;
      seed?: number;
      topic?: string;
      title?: string;
      slideBody?: string;
      slideIndex?: number;
      tryHuggingFace?: boolean;
    };
    const visualPrompt = typeof body.visualPrompt === "string" ? body.visualPrompt : "";
    const format = body.format ?? "carousel";
    const seed =
      typeof body.seed === "number" && Number.isFinite(body.seed)
        ? Math.floor(body.seed)
        : Math.floor(Math.random() * 2_147_483_647);
    const topic = typeof body.topic === "string" ? body.topic : visualPrompt;

    if (!visualPrompt.trim()) {
      return NextResponse.json({ error: "visualPrompt required" }, { status: 400 });
    }
    if (visualPrompt.length > MAX_VISUAL_PROMPT_CHARS) {
      return NextResponse.json({ error: "visualPrompt too long" }, { status: 400 });
    }
    if (topic.length > MAX_TOPIC_PROMPT_CHARS) {
      return NextResponse.json({ error: "topic too long" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title : "";
    const slideBody = typeof body.slideBody === "string" ? body.slideBody : "";
    const slideIndex =
      typeof body.slideIndex === "number" && Number.isFinite(body.slideIndex)
        ? Math.max(0, Math.floor(body.slideIndex))
        : 0;
    const tryHuggingFace = body.tryHuggingFace === true;

    const candidates =
      title.trim() && slideBody.trim()
        ? await buildFullImageCandidates(visualPrompt, format, seed, topic, {
            title,
            body: slideBody,
            slideIndex,
            tryHuggingFace,
          })
        : await buildFullImageCandidates(visualPrompt, format, seed, topic);

    return NextResponse.json({ candidates });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
