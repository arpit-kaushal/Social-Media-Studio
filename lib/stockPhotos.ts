/**
 * Server-only: fetch photo URLs from free APIs (keys in .env.local at project root).
 */

function searchQueryFromTopic(topic: string, seed: number): string {
  const words = topic
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5);
  if (words.length === 0) return "abstract minimal";
  const i = Math.abs(seed) % words.length;
  return [...words.slice(i), ...words.slice(0, i)].join(" ").slice(0, 80);
}

export async function fetchPexelsPhotoUrl(
  topic: string,
  width: number,
  height: number,
  seed: number
): Promise<string | null> {
  const key = process.env.PEXELS_ACCESS_KEY || process.env.PEXELS_API_KEY;
  if (!key) return null;

  const q = searchQueryFromTopic(topic, seed);
  const orient =
    height > width ? "portrait" : width > height ? "landscape" : "square";
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=15&orientation=${orient}`,
    {
      headers: { Authorization: key },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { photos?: { src?: { large2x?: string; large?: string } }[] };
  const photos = data.photos ?? [];
  if (photos.length === 0) return null;
  const pick = photos[Math.abs(seed) % photos.length]!;
  return pick.src?.large2x ?? pick.src?.large ?? null;
}

export async function fetchUnsplashPhotoUrl(
  topic: string,
  width: number,
  height: number,
  seed: number
): Promise<string | null> {
  const key =
    process.env.UNSPLASH_ACCESS_KEY?.trim() ||
    process.env.UNSPLASH_SECRET_KEY?.trim();
  if (!key) return null;

  const q = searchQueryFromTopic(topic, seed);
  const uOrient =
    height > width ? "portrait" : width === height ? "squarish" : "landscape";
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&orientation=${uOrient}`,
    {
      headers: { Authorization: `Client-ID ${key}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: { urls?: { regular?: string; small?: string } }[];
  };
  const results = data.results ?? [];
  if (results.length === 0) return null;
  const pick = results[Math.abs(seed) % results.length]!;
  return pick.urls?.regular ?? pick.urls?.small ?? null;
}

export async function getExtraStockUrls(
  topic: string,
  width: number,
  height: number,
  seed: number
): Promise<string[]> {
  const out: string[] = [];
  const u1 = await fetchUnsplashPhotoUrl(topic, width, height, seed + 17);
  if (u1) out.push(u1);
  const u2 = await fetchUnsplashPhotoUrl(topic, width, height, seed + 9_131);
  if (u2 && u2 !== u1) out.push(u2);

  const p1 = await fetchPexelsPhotoUrl(topic, width, height, seed);
  if (p1) out.push(p1);
  const p2 = await fetchPexelsPhotoUrl(topic, width, height, seed + 5_027);
  if (p2 && p2 !== p1) out.push(p2);

  return out;
}
