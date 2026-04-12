import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { STUDIO_SESSIONS_COLLECTION, type StudioSessionDoc } from "@/lib/studioSessionDoc";
import type { Branding, Slide, StudioFormat } from "@/lib/types";

export const runtime = "nodejs";

const COLLECTION = STUDIO_SESSIONS_COLLECTION;

function isMongoConfigured(): boolean {
  if (process.env.MONGODB_URI?.trim()) return true;
  const u = process.env.DB_USERNAME?.trim();
  const p = process.env.DB_PASSWORD?.trim();
  const c = process.env.DB_CLUSTER?.trim();
  const n = process.env.DB_NAME?.trim();
  return Boolean(u && p && c && n);
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (!isMongoConfigured()) {
    return NextResponse.json({ session: null, mongo: "unconfigured" });
  }
  try {
    const db = await getMongoDb();
    const coll = db.collection<StudioSessionDoc>(COLLECTION);
    const session = await coll.findOne({ _id: id } as { _id: string });
    return NextResponse.json({ session: session ?? null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed to load session" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    prompt?: string;
    format?: StudioFormat;
    branding?: Branding;
    slides?: Slide[];
    selectedIndex?: number;
    phase?: "prompt" | "generating" | "studio";
  };

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (!isMongoConfigured()) {
    return NextResponse.json({ ok: false, mongo: "unconfigured" }, { status: 503 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const format = body.format ?? "carousel";
  const branding = body.branding ?? ({} as Branding);
  const slides = Array.isArray(body.slides) ? body.slides : [];
  const selectedIndex =
    typeof body.selectedIndex === "number" && Number.isFinite(body.selectedIndex)
      ? Math.max(0, Math.floor(body.selectedIndex))
      : 0;
  const phase =
    body.phase === "studio" || body.phase === "generating" || body.phase === "prompt"
      ? body.phase
      : "prompt";

  const doc: StudioSessionDoc = {
    _id: id,
    updatedAt: new Date(),
    prompt,
    format,
    branding,
    slides,
    selectedIndex,
    phase,
  };

  try {
    const db = await getMongoDb();
    const coll = db.collection<StudioSessionDoc>(COLLECTION);
    await coll.replaceOne({ _id: id } as { _id: string }, doc, { upsert: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("maximum document size") || msg.includes("too large")) {
      return NextResponse.json(
        { error: "Session too large for database (try smaller uploads or fewer data URLs)." },
        { status: 413 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "failed to save session" }, { status: 500 });
  }
}
