import { NextRequest, NextResponse } from "next/server";

function decodeBase64Url(u: string): string | null {
  try {
    const pad = u.length % 4 === 0 ? "" : "=".repeat(4 - (u.length % 4));
    const b64 = u.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function isAllowedImageHost(u: URL): boolean {
  const h = u.hostname;
  if (h === "image.pollinations.ai" && u.pathname.startsWith("/prompt/")) return true;
  if (h === "picsum.photos") return true;
  if (h === "i.picsum.photos") return true;
  if (h === "fastly.picsum.photos") return true;
  if (h === "placehold.co") return true;
  if (h === "images.pexels.com" || h.endsWith(".pexels.com")) return true;
  if (h === "images.unsplash.com" || h.endsWith(".unsplash.com")) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const b64 = req.nextUrl.searchParams.get("u");
  const urlParam = req.nextUrl.searchParams.get("url");

  let raw: string | null = null;
  if (b64) {
    raw = decodeBase64Url(b64);
  } else if (urlParam) {
    raw = urlParam;
  }

  if (!raw) {
    return NextResponse.json({ error: "Missing u or url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" || !isAllowedImageHost(target)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  const controller = new AbortController();
  const kill = setTimeout(() => controller.abort(), 120_000);
  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: { Accept: "image/*,*/*" },
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(kill);
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Upstream failed", status: upstream.status },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const buf = Buffer.from(await upstream.arrayBuffer());

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType.split(";")[0]!.trim(),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
