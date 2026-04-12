import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { STUDIO_SESSIONS_COLLECTION, type StudioSessionDoc } from "@/lib/studioSessionDoc";
import type { Branding, StudioFormat } from "@/lib/types";
import { DEFAULT_BRANDING } from "@/lib/types";

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

export async function POST(req: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "MongoDB is not configured. Add connection settings to create a deck." },
      { status: 503 }
    );
  }

  const body = (await req.json()) as {
    prompt?: string;
    format?: StudioFormat;
    branding?: Branding;
  };

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const format = body.format ?? "carousel";
  const branding =
    body.branding && typeof body.branding === "object"
      ? { ...DEFAULT_BRANDING, ...body.branding }
      : DEFAULT_BRANDING;

  const id = new ObjectId().toString();

  const doc: StudioSessionDoc = {
    _id: id,
    updatedAt: new Date(),
    prompt,
    format,
    branding,
    slides: [],
    selectedIndex: 0,
    phase: "generating",
  };

  try {
    const db = await getMongoDb();
    const coll = db.collection<StudioSessionDoc>(COLLECTION);
    await coll.insertOne(doc);
    return NextResponse.json({ id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed to create session" }, { status: 500 });
  }
}
