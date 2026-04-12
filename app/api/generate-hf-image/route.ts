import { NextResponse } from "next/server";
import { MAX_VISUAL_PROMPT_CHARS } from "@/lib/apiLimits";
import { formatHuggingFaceInferenceError } from "@/lib/hfErrors";
import { readHuggingFaceToken } from "@/lib/hfEnv";
import { generateSdImageBytes } from "@/lib/hfStableDiffusion";
import type { StudioFormat } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 130;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      format?: StudioFormat;
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const format = body.format ?? "carousel";
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }
    if (prompt.length > MAX_VISUAL_PROMPT_CHARS) {
      return NextResponse.json({ error: "prompt too long" }, { status: 400 });
    }

    if (!readHuggingFaceToken()) {
      return NextResponse.json(
        {
          error: "missing_token",
          detail:
            "No Hugging Face token in environment. Add HUGGINGFACE_API_TOKEN to .env.local (no quotes) and restart the server.",
        },
        { status: 400 }
      );
    }

    const result = await generateSdImageBytes(prompt, format);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "generation_failed",
          detail: result.message,
        },
        { status: 502 }
      );
    }

    const b64 = result.buffer.toString("base64");
    const dataUrl = `data:${result.contentType};base64,${b64}`;
    return NextResponse.json({ dataUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "failed", detail: formatHuggingFaceInferenceError(e) },
      { status: 500 }
    );
  }
}
