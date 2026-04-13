import { NextResponse } from "next/server";
import { GEMINI_COPY_MODELS } from "@/lib/aiGenerateCopy";
import { readHuggingFaceToken } from "@/lib/hfEnv";
import { checkHuggingFaceHubToken } from "@/lib/hfWhoami";
import { isStatusPageDisabledInProduction, upstreamFailDetail } from "@/lib/statusCheckDetail";

export const runtime = "nodejs";

type ServiceRow = {
  id: string;
  name: string;
  configured: boolean;
  ok: boolean | null;
  ms?: number;
  detail: string;
};

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; result: T }> {
  const t = Date.now();
  const result = await fn();
  return { ms: Date.now() - t, result };
}

function looksLikeQuotaOrRateLimit(status: number, body: string): boolean {
  if (status === 429) return true;
  const b = body.toLowerCase();
  return (
    b.includes("resource_exhausted") ||
    b.includes("too many requests") ||
    (b.includes("quota") && (b.includes("exceed") || b.includes("exhausted") || b.includes("limit")))
  );
}

async function geminiGenerateProbe(apiKey: string): Promise<{
  ok: boolean;
  detail: string;
  ms: number;
}> {
  const t0 = Date.now();
  let lastStatus = 0;
  let lastSnippet = "";

  for (const model of GEMINI_COPY_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
          generationConfig: { maxOutputTokens: 16, temperature: 0 },
        }),
      }
    );
    const raw = await res.text();
    lastStatus = res.status;
    lastSnippet = raw.slice(0, 280);
    if (res.ok) {
      return {
        ok: true,
        detail: `generateContent probe OK (${model}).`,
        ms: Date.now() - t0,
      };
    }
    if (looksLikeQuotaOrRateLimit(res.status, raw)) {
      return {
        ok: false,
        detail: upstreamFailDetail(
          res.status,
          lastSnippet,
          "Gemini copy quota or rate limit exceeded. Open Google AI Studio → usage / billing."
        ),
        ms: Date.now() - t0,
      };
    }
  }

  return {
    ok: false,
    detail: upstreamFailDetail(
      lastStatus,
      lastSnippet,
      "Gemini generateContent failed for every model in the copy list (wrong key, retired model names, or regional block)."
    ),
    ms: Date.now() - t0,
  };
}

async function groqChatProbe(apiKey: string): Promise<{
  ok: boolean;
  detail: string;
  ms: number;
}> {
  const t0 = Date.now();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 8,
      temperature: 0,
      messages: [{ role: "user", content: "Say OK" }],
    }),
  });
  const raw = await res.text();
  const ms = Date.now() - t0;
  const snippet = raw.slice(0, 280);
  if (res.ok) {
    return { ok: true, detail: "chat/completions probe OK (llama-3.1-8b-instant).", ms };
  }
  if (looksLikeQuotaOrRateLimit(res.status, raw)) {
    return {
      ok: false,
      detail: upstreamFailDetail(
        res.status,
        snippet,
        "Groq rate limit or quota exceeded. Check console.groq.com usage."
      ),
      ms,
    };
  }
  return {
    ok: false,
    detail: upstreamFailDetail(res.status, snippet, "Verify GROQ_API_KEY and model access."),
    ms,
  };
}

export async function GET() {
  if (isStatusPageDisabledInProduction()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const services: ServiceRow[] = [];

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    services.push({
      id: "gemini",
      name: "Google Gemini (texts)",
      configured: false,
      ok: null,
      detail: "Set GEMINI_API_KEY in .env.local (project root).",
    });
  } else {
    const { ms: listMs, result: res } = await timed(() =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(geminiKey)}`
      )
    );
    const text = await res.text();
    let ok = res.ok;
    let detail = res.ok
      ? "API key accepted; models list OK."
      : upstreamFailDetail(
          res.status,
          text.slice(0, 280),
          "Verify GEMINI_API_KEY and Google AI Studio access."
        );
    let totalMs = listMs;

    if (res.ok) {
      const { ms: probeMs, result: probe } = await timed(() => geminiGenerateProbe(geminiKey));
      totalMs += probeMs;
      if (!probe.ok) {
        ok = false;
        detail = `${detail} ${probe.detail}`;
      } else {
        detail = `${detail} ${probe.detail}`;
      }
    }

    services.push({
      id: "gemini",
      name: "Google Gemini (texts)",
      configured: true,
      ok,
      ms: totalMs,
      detail,
    });
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    services.push({
      id: "groq",
      name: "Groq (texts fallback)",
      configured: false,
      ok: null,
      detail: "Set GROQ_API_KEY in .env.local (optional).",
    });
  } else {
    const { ms: listMs, result: res } = await timed(() =>
      fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKey}` },
      })
    );
    const text = await res.text();
    let ok = res.ok;
    let detail = res.ok
      ? "API key accepted; models list OK."
      : upstreamFailDetail(res.status, text.slice(0, 280), "Verify GROQ_API_KEY.");
    let totalMs = listMs;

    if (res.ok) {
      const { ms: probeMs, result: probe } = await timed(() => groqChatProbe(groqKey));
      totalMs += probeMs;
      if (!probe.ok) {
        ok = false;
        detail = `${detail} ${probe.detail}`;
      } else {
        detail = `${detail} ${probe.detail}`;
      }
    }

    services.push({
      id: "groq",
      name: "Groq (texts fallback)",
      configured: true,
      ok,
      ms: totalMs,
      detail,
    });
  }

  const pexelsKey =
    process.env.PEXELS_ACCESS_KEY?.trim() || process.env.PEXELS_API_KEY?.trim();
  if (!pexelsKey) {
    services.push({
      id: "pexels",
      name: "Pexels (stock photos)",
      configured: false,
      ok: null,
      detail: "Set PEXELS_ACCESS_KEY in .env.local (optional).",
    });
  } else {
    const { ms, result: res } = await timed(() =>
      fetch("https://api.pexels.com/v1/collections/featured?per_page=1", {
        headers: { Authorization: pexelsKey },
      })
    );
    const text = await res.text();
    services.push({
      id: "pexels",
      name: "Pexels (stock photos)",
      configured: true,
      ok: res.ok,
      ms,
      detail: res.ok
        ? "Search API OK."
        : upstreamFailDetail(
            res.status,
            text.slice(0, 280),
            "Verify PEXELS_ACCESS_KEY (or PEXELS_API_KEY)."
          ),
    });
  }

  const unsplashKey =
    process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.UNSPLASH_SECRET_KEY?.trim();
  if (!unsplashKey) {
    services.push({
      id: "unsplash",
      name: "Unsplash (stock photos)",
      configured: false,
      ok: null,
      detail:
        "Set UNSPLASH_ACCESS_KEY (Access Key) in .env.local. UNSPLASH_SECRET_KEY is also read if you stored the access key there by mistake.",
    });
  } else {
    const { ms, result: res } = await timed(() =>
      fetch(
        "https://api.unsplash.com/search/photos?query=abstract&per_page=1&orientation=squarish",
        {
          headers: { Authorization: `Client-ID ${unsplashKey}` },
        }
      )
    );
    const text = await res.text();
    services.push({
      id: "unsplash",
      name: "Unsplash (stock photos)",
      configured: true,
      ok: res.ok,
      ms,
      detail: res.ok
        ? "Search API OK (using key as Client-ID)."
        : upstreamFailDetail(
            res.status,
            text.slice(0, 280),
            "Unsplash expects the Application Access Key as Client-ID, not the OAuth secret."
          ),
    });
  }

  const hfToken = readHuggingFaceToken();
  if (!hfToken) {
    services.push({
      id: "huggingface",
      name: "Hugging Face (Hub + image)",
      configured: false,
      ok: null,
      detail:
        "Set HUGGINGFACE_API_TOKEN to a User access token with Read scope from https://huggingface.co/settings/tokens (HF_TOKEN / HUGGINGFACE_TOKEN also work). No quotes in .env.local. Then run the live image test below.",
    });
  } else {
    const { ms: hfMs, result: hfCheck } = await timed(() => checkHuggingFaceHubToken(hfToken));
    services.push({
      id: "huggingface",
      name: "Hugging Face (Hub + image)",
      configured: true,
      ok: hfCheck.ok,
      ms: hfMs,
      detail: hfCheck.ok
        ? `${hfCheck.detail} For a real text-to-image check, use the button below (may take up to ~90s).`
        : hfCheck.detail,
    });
  }

  const { ms: pollMs, result: pollRes } = await timed(async () => {
    const c = new AbortController();
    const kill = setTimeout(() => c.abort(), 12_000);
    try {
      return await fetch(
        "https://image.pollinations.ai/prompt/abstract%20gradient?width=48&height=48&seed=1&nologo=true",
        { signal: c.signal, cache: "no-store" }
      );
    } finally {
      clearTimeout(kill);
    }
  });
  const pollOk = pollRes.ok;
  const pollText = pollOk ? "Image response OK." : `HTTP ${pollRes.status}`;
  services.push({
    id: "pollinations",
    name: "Pollinations (image gen)",
    configured: true,
    ok: pollOk,
    ms: pollMs,
    detail: pollText,
  });

  const configuredRows = services.filter((s) => s.configured);
  const testedOk = configuredRows.filter((s) => s.ok === true);

  return NextResponse.json({
    summary: {
      total: services.length,
      configured: configuredRows.length,
      passed: testedOk.length,
      allConfiguredServicesOk: configuredRows.length > 0 && testedOk.length === configuredRows.length,
    },
    services,
  });
}
