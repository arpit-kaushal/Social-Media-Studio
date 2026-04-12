import { upstreamFailDetail } from "./statusCheckDetail";

export type HfWhoamiResult = {
  ok: boolean;
  status: number;
  detail: string;
};

/**
 * Validates the token against the Hugging Face Hub (same auth inference uses for provider mapping).
 */
export async function checkHuggingFaceHubToken(token: string): Promise<HfWhoamiResult> {
  const res = await fetch("https://huggingface.co/api/whoami-v2", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const text = await res.text();

  if (res.ok) {
    try {
      const j = JSON.parse(text) as { name?: string; fullname?: string };
      const label = j.name ?? j.fullname ?? "account";
      return {
        ok: true,
        status: res.status,
        detail: `Hub accepted the token (signed in as ${label}).`,
      };
    } catch {
      return {
        ok: true,
        status: res.status,
        detail: "Hub accepted the token.",
      };
    }
  }

  return {
    ok: false,
    status: res.status,
    detail: upstreamFailDetail(
      res.status,
      text.slice(0, 220),
      "Hub rejected this token. Create a new User access token with at least Read scope at https://huggingface.co/settings/tokens — not a fine-grained token unless it includes Hub read. Remove stray quotes around the value in .env.local."
    ),
  };
}
