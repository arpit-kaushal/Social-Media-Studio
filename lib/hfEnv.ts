/** Hugging Face User Access Token (read is enough for Hub + Inference Providers). */
export function readHuggingFaceToken(): string | null {
  const raw =
    process.env.HUGGINGFACE_API_TOKEN ??
    process.env.HF_TOKEN ??
    process.env.HUGGINGFACE_TOKEN ??
    process.env.HUGGINGFACE_API_KEY;
  if (typeof raw !== "string") return null;
  const t = raw.replace(/^['"]|['"]$/g, "").trim();
  return t || null;
}
