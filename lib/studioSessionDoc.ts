import type { Branding, Slide, StudioFormat } from "./types";

export const STUDIO_SESSIONS_COLLECTION = "studio_sessions";

export type StudioSessionPhase = "prompt" | "generating" | "studio";

export type StudioSessionDoc = {
  _id: string;
  updatedAt: Date;
  prompt: string;
  format: StudioFormat;
  branding: Branding;
  slides: Slide[];
  selectedIndex: number;
  phase: StudioSessionPhase;
};
