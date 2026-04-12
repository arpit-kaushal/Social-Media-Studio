import { NextResponse } from "next/server";
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

export async function GET() {
  if (isStatusPageDisabledInProduction()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const services: ServiceRow[] = [];

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    services.push({
      id: "gemini",
      name: "Google Gemini (copy)",
      configured: false,
      ok: null,
      detail: "Set GEMINI_API_KEY in .env.local (project root).",
    });
  } else {
    const { ms, result: res } = await timed(() =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(geminiKey)}`
      )
    );
    const text = await res.text();
    services.push({
      id: "gemini",
      name: "Google Gemini (copy)",
      configured: true,
      ok: res.ok,
      ms,
      detail: res.ok
        ? "API key accepted; models list OK."
        : upstreamFailDetail(
            res.status,
            text.slice(0, 280),
            "Verify GEMINI_API_KEY and Google AI Studio access."
          ),
    });
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    services.push({
      id: "groq",
      name: "Groq (copy fallback)",
      configured: false,
      ok: null,
      detail: "Set GROQ_API_KEY in .env.local (optional).",
    });
  } else {
    const { ms, result: res } = await timed(() =>
      fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKey}` },
      })
    );
    const text = await res.text();
    services.push({
      id: "groq",
      name: "Groq (copy fallback)",
      configured: true,
      ok: res.ok,
      ms,
      detail: res.ok
        ? "API key accepted; models list OK."
        : upstreamFailDetail(res.status, text.slice(0, 280), "Verify GROQ_API_KEY."),
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
    note: "Never commit API keys. This endpoint does not echo secrets.",
  });
}
