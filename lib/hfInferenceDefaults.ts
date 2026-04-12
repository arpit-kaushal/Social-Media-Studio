import type { InferenceProviderOrPolicy } from "@huggingface/inference";

/**
 * Default matches Hugging Face docs: Replicate-backed SDXL. Enable Replicate under
 * https://huggingface.co/settings/inference-providers and ensure your HF token can bill
 * inference (same token as HUGGINGFACE_API_TOKEN).
 *
 * `provider: "auto"` is avoided — it can call Hub without a token. Override with
 * HUGGINGFACE_INFERENCE_PROVIDER (e.g. hf-inference) and HUGGINGFACE_SD_MODEL if needed.
 */
const DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

export function huggingFaceSdModelId(): string {
  return (process.env.HUGGINGFACE_SD_MODEL?.trim() || DEFAULT_MODEL).replace(/^\/+|\/+$/g, "");
}

export function huggingFaceTextToImageProvider(): InferenceProviderOrPolicy {
  const p = process.env.HUGGINGFACE_INFERENCE_PROVIDER?.trim();
  return (p || "replicate") as InferenceProviderOrPolicy;
}

/** Provider-specific extras; Replicate SDXL expects num_inference_steps in examples. */
export function huggingFaceTextToImageParameters(): Record<string, unknown> | undefined {
  const provider = String(huggingFaceTextToImageProvider());
  if (provider === "replicate") {
    const n = Number(process.env.HUGGINGFACE_SD_NUM_INFERENCE_STEPS);
    return {
      num_inference_steps: Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 50) : 5,
    };
  }
  const raw = process.env.HUGGINGFACE_SD_PARAMETERS_JSON?.trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function huggingFaceTextToImageArgs(inputs: string) {
  const args: {
    provider: InferenceProviderOrPolicy;
    model: string;
    inputs: string;
    parameters?: Record<string, unknown>;
  } = {
    provider: huggingFaceTextToImageProvider(),
    model: huggingFaceSdModelId(),
    inputs,
  };
  const params = huggingFaceTextToImageParameters();
  if (params && Object.keys(params).length > 0) {
    args.parameters = params;
  }
  return args;
}
