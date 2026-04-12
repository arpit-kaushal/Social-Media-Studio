import { NextResponse } from "next/server";
import { regenerateOneSlideCopy } from "@/lib/aiGenerateCopy";
import { MAX_TOPIC_PROMPT_CHARS } from "@/lib/apiLimits";
import type { StudioFormat } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      format?: StudioFormat;
      slide?: { title?: string; body?: string };
      index?: number;
      total?: number;
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const format = body.format ?? "carousel";
    const slide = body.slide;
    const index = typeof body.index === "number" ? body.index : 0;
    const total = typeof body.total === "number" ? body.total : 1;
    if (!prompt || !slide) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    if (prompt.length > MAX_TOPIC_PROMPT_CHARS) {
      return NextResponse.json({ error: "prompt too long" }, { status: 400 });
    }

    const next = await regenerateOneSlideCopy(
      prompt,
      format,
      { title: String(slide.title ?? ""), body: String(slide.body ?? "") },
      index,
      total
    );
    return NextResponse.json({ slide: next });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
