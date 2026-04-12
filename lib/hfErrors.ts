/**
 * User-facing message for failed HF inference (Hub mapping or provider errors).
 */
export function formatHuggingFaceInferenceError(e: unknown): string {
  if (!(e instanceof Error)) return String(e);

  if (e.name === "AbortError") {
    return "Request timed out before the image finished. Replicate / SDXL can be slow on first run — try again, or increase time limits on your host.";
  }

  const msg = e.message;

  if (/invalid username or password/i.test(msg)) {
    return "Hub returned “invalid credentials” for the model metadata request. Regenerate a User token at https://huggingface.co/settings/tokens; use no quotes in .env.local. If whoami works on /status, set HUGGINGFACE_INFERENCE_PROVIDER=replicate (default) or another provider you enabled under https://huggingface.co/settings/inference-providers";
  }

  if (/repository not found/i.test(msg)) {
    return `${msg} The model id may be wrong or unavailable for your provider. Default is stabilityai/stable-diffusion-xl-base-1.0 with provider replicate (see HF docs). Override with HUGGINGFACE_SD_MODEL and HUGGINGFACE_INFERENCE_PROVIDER.`;
  }

  if (/inference provider mapping/i.test(msg)) {
    return `${msg} Enable the provider (e.g. Replicate) at https://huggingface.co/settings/inference-providers and check /status.`;
  }

  if (/malformed response from replicate/i.test(msg)) {
    return `${msg} The provider returned an unexpected shape (often billing, model version, or Replicate not enabled for your HF account). Check https://huggingface.co/settings/inference-providers and Replicate usage limits.`;
  }

  return msg;
}
