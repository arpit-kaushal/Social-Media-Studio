import { InferenceClient } from "@huggingface/inference";
import { readHuggingFaceToken } from "./hfEnv";
import { formatHuggingFaceInferenceError } from "./hfErrors";
import { huggingFaceTextToImageArgs } from "./hfInferenceDefaults";
import type { StudioFormat } from "./types";

export type GenerateSdImageResult =
  | { ok: true; buffer: Buffer; contentType: string }
  | { ok: false; message: string };

/** Recognize common inference outputs (Replicate often returns WebP URLs). */
export function detectImageBuffer(buf: Buffer): { contentType: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { contentType: "image/png" };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return { contentType: "image/jpeg" };
  }
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") {
    return { contentType: "image/webp" };
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return { contentType: "image/gif" };
  }
  return null;
}

/**
 * Text-to-image via Hugging Face InferenceClient (default: Replicate + SDXL per HF docs).
 * Surfaces provider errors instead of returning null (avoids misleading “check your token” copy).
 */
export async function generateSdImageBytes(
  prompt: string,
  _format: StudioFormat,
  overallTimeoutMs = 120_000
): Promise<GenerateSdImageResult> {
  const token = readHuggingFaceToken();
  if (!token) {
    return { ok: false, message: "No Hugging Face token in environment." };
  }

  const safe = prompt.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!safe) {
    return { ok: false, message: "Empty image prompt." };
  }

  const ac = new AbortController();
  const kill = setTimeout(() => ac.abort(), Math.max(5_000, overallTimeoutMs));

  try {
    const client = new InferenceClient(token);
    const blob = await client.textToImage(huggingFaceTextToImageArgs(safe), {
      signal: ac.signal,
      retry_on_error: true,
    });

    const buf = Buffer.from(await blob.arrayBuffer());
    const detected = detectImageBuffer(buf);
    if (!detected) {
      const head = buf.slice(0, Math.min(80, buf.length)).toString("utf8").replace(/\s+/g, " ").trim();
      const hint =
        buf[0] === 0x7b
          ? `Provider returned JSON instead of an image (start: ${head.slice(0, 120)}…). Check Inference Providers billing and model id.`
          : `Response was not a supported image (PNG/JPEG/WebP/GIF). First bytes: ${buf.slice(0, 8).toString("hex")}.`;
      return { ok: false, message: hint };
    }

    return {
      ok: true,
      buffer: buf,
      contentType: detected.contentType,
    };
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[HF textToImage]", e);
    }
    return { ok: false, message: formatHuggingFaceInferenceError(e) };
  } finally {
    clearTimeout(kill);
  }
}
