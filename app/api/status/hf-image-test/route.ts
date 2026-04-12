import { NextResponse } from "next/server";
import { readHuggingFaceToken } from "@/lib/hfEnv";
import { huggingFaceSdModelId } from "@/lib/hfInferenceDefaults";
import { generateSdImageBytes } from "@/lib/hfStableDiffusion";
import { isStatusPageDisabledInProduction } from "@/lib/statusCheckDetail";

export const runtime = "nodejs";
export const maxDuration = 120;

const PROBE_PROMPT =
  "soft pastel abstract gradient background, minimal, no text, no watermark";

export async function POST() {
  if (isStatusPageDisabledInProduction()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!readHuggingFaceToken()) {
    return NextResponse.json(
      { ok: false, detail: "No token found. Set HUGGINGFACE_API_TOKEN in .env.local (project root)." },
      { status: 400 }
    );
  }

  const t0 = Date.now();
  const model = huggingFaceSdModelId();

  const result = await generateSdImageBytes(PROBE_PROMPT, "carousel", 90_000);
  const ms = Date.now() - t0;

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      ms,
      model,
      detail: result.message,
    });
  }

  return NextResponse.json({
    ok: true,
    ms,
    model,
    detail: `Image OK (${result.buffer.length} bytes, ${result.contentType}). Model ${model} via your configured Inference Provider.`,
  });
}
