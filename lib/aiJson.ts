export type SlidePayload = { title: string; body: string };

function stripFences(raw: string): string {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) t = fence[1]!.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return t;
}

export function parseSlidesJson(raw: string): SlidePayload[] | null {
  try {
    const t = stripFences(raw);
    const data = JSON.parse(t) as { slides?: SlidePayload[] } | SlidePayload[];
    if (Array.isArray(data)) {
      return data.map((s) => ({
        title: String(s.title ?? "").slice(0, 120),
        body: String(s.body ?? "").slice(0, 400),
      }));
    }
    if (!Array.isArray(data.slides)) return null;
    return data.slides.map((s) => ({
      title: String(s.title ?? "").slice(0, 120),
      body: String(s.body ?? "").slice(0, 400),
    }));
  } catch {
    return null;
  }
}
