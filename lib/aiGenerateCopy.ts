import { parseSlidesJson, type SlidePayload } from "./aiJson";
import { buildHeuristicSlidePayloads, slideCountForFormat, titleForSlideIndex } from "./slideCopy";
import type { StudioFormat } from "./types";

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
] as const;

function buildStudioPrompt(prompt: string, format: StudioFormat): string {
  const n = slideCountForFormat(format);
  return `Return JSON only with this exact structure:
{"slides":[{"title":"string","body":"string"},...]}

You must include exactly ${n} objects in "slides".

Topic: ${JSON.stringify(prompt)}

For each index i from 0 to ${n - 1}:
- "title": a short, scroll-stopping headline for this beat (max ~8 words). Be specific and creative — this is shown large on the slide.
- "body": main copy, max 260 characters, punchy Instagram tone. No markdown.
- Slide 0 = hook (pattern interrupt). Middle slides build the story. Last slide = summary + clear CTA.

Both "title" and "body" are required for every slide.`;
}

function finalizePayloads(
  partial: SlidePayload[] | null,
  n: number,
  prompt: string,
  format: StudioFormat
): SlidePayload[] {
  const fallback = buildHeuristicSlidePayloads(prompt, format);
  const out: SlidePayload[] = [];
  for (let i = 0; i < n; i++) {
    const raw = partial?.[i];
    const bodyRaw = (raw?.body ?? "").trim();
    const titleRaw = (raw?.title ?? "").trim();
    const body =
      bodyRaw.length > 0
        ? bodyRaw.slice(0, 400)
        : (raw?.title ?? "").trim().slice(0, 400) || fallback[i]!.body;
    const title =
      titleRaw.length > 0
        ? titleRaw.slice(0, 120)
        : bodyRaw.length > 0
          ? titleForSlideIndex(i, n)
          : fallback[i]!.title;
    out.push({ title, body });
  }
  return out;
}

async function geminiRawText(prompt: string, format: StudioFormat): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const body = {
    contents: [{ role: "user", parts: [{ text: buildStudioPrompt(prompt, format) }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const raw = await res.text();
    if (!res.ok) {
      console.error(`[Gemini ${model}]`, res.status, raw.slice(0, 500));
      continue;
    }

    try {
      const data = JSON.parse(raw) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        error?: { message?: string };
      };
      if (data.error?.message) {
        console.error(`[Gemini ${model}]`, data.error.message);
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text.trim()) return text;
    } catch {
      console.error(`[Gemini ${model}] invalid JSON`, raw.slice(0, 300));
    }
  }
  return null;
}

async function groqRawText(prompt: string, format: StudioFormat): Promise<string | null> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;

  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] as const;

  for (const model of models) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.65,
        max_tokens: 8196,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You output only valid JSON. No markdown. Root must be {\"slides\":[{\"title\":\"\",\"body\":\"\"},...]}.",
          },
          { role: "user", content: buildStudioPrompt(prompt, format) },
        ],
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error(`[Groq ${model}]`, res.status, raw.slice(0, 400));
      continue;
    }

    try {
      const data = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] };
      const content = data?.choices?.[0]?.message?.content ?? null;
      if (content?.trim()) return content;
    } catch {
      console.error(`[Groq ${model}] parse error`, raw.slice(0, 300));
    }
  }
  return null;
}

export async function generateSlideCopyOrHeuristic(
  prompt: string,
  format: StudioFormat
): Promise<SlidePayload[]> {
  const n = slideCountForFormat(format);

  let text = await geminiRawText(prompt, format);
  if (!text) text = await groqRawText(prompt, format);

  let partial = text ? parseSlidesJson(text) : null;
  if ((!partial || partial.length === 0) && text) {
    partial = tryRecoverSlidesArray(text);
  }

  if (partial && partial.length !== n) {
    partial = partial.slice(0, n);
    while (partial.length < n) {
      partial.push({ title: "", body: "" });
    }
  }

  return finalizePayloads(partial, n, prompt, format);
}

function tryRecoverSlidesArray(text: string): SlidePayload[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const arr = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(arr)) return null;
    return arr.map((item) => {
      const o = item as { title?: unknown; body?: unknown };
      return {
        title: String(o.title ?? ""),
        body: String(o.body ?? ""),
      };
    });
  } catch {
    return null;
  }
}

export async function regenerateOneSlideCopy(
  topicPrompt: string,
  format: StudioFormat,
  current: SlidePayload,
  index: number,
  total: number
): Promise<SlidePayload> {
  const key = process.env.GEMINI_API_KEY?.trim();
  const groq = process.env.GROQ_API_KEY?.trim();

  const userMsg = `Topic: ${JSON.stringify(topicPrompt)}
Rewrite ONE slide. Current title: ${JSON.stringify(current.title)}
Current body: ${JSON.stringify(current.body)}
This is slide ${index + 1} of ${total}.
Return ONLY JSON: {"title":"short label","body":"main copy max 260 chars"}`;

  if (key) {
    for (const model of GEMINI_MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: userMsg }] }],
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 512,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const one = parseOneSlide(text);
      if (one) {
        const t = (one.title ?? "").trim();
        return {
          title: (t.length > 0 ? t : titleForSlideIndex(index, total)).slice(0, 120),
          body: one.body.slice(0, 400),
        };
      }
    }
  }

  if (groq) {
    for (const model of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] as const) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groq}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.85,
          max_tokens: 512,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: 'Reply with JSON: {"title":"","body":""}' },
            { role: "user", content: userMsg },
          ],
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data?.choices?.[0]?.message?.content ?? "";
      const one = parseOneSlide(text);
      if (one) {
        const t = (one.title ?? "").trim();
        return {
          title: (t.length > 0 ? t : titleForSlideIndex(index, total)).slice(0, 120),
          body: one.body.slice(0, 400),
        };
      }
    }
  }

  const variants = [
    `Reframe: ${current.body}`,
    `Sharper angle: ${topicPrompt.slice(0, 200)}`,
    `One-liner: ${current.body.split(".")[0] ?? current.body}`,
  ];
  const body =
    variants[Math.floor(Math.random() * variants.length)] ?? current.body;
  return {
    title: titleForSlideIndex(index, total),
    body: body.length > 320 ? `${body.slice(0, 317)}…` : body,
  };
}

function parseOneSlide(raw: string): SlidePayload | null {
  try {
    let t = raw.trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
    if (fence) t = fence[1]!.trim();
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) t = t.slice(start, end + 1);
    const data = JSON.parse(t) as SlidePayload;
    if (!data.body && !data.title) return null;
    return {
      title: String(data.title ?? "").slice(0, 120),
      body: String(data.body ?? data.title ?? "").slice(0, 400),
    };
  } catch {
    return null;
  }
}
