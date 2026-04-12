export type StudioFormat = "post" | "story" | "carousel";

export type SlideImageSource = "generated" | "upload" | "stock" | "ai_hf";

export type TextPosition = "top" | "center" | "bottom";

export type Branding = {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  titleColor: string;
  bodyColor: string;
  titleSizePercent: number;
  bodySizePercent: number;
  textPosition: TextPosition;
};

export type Slide = {
  id: string;
  title: string;
  body: string;
  image: string;
  imageSource?: SlideImageSource;
  imageCandidates?: string[];
  imageSyncedText?: string;
  branding?: Branding;
};

export const DEFAULT_BRANDING: Branding = {
  primaryColor: "#6366f1",
  secondaryColor: "#0f172a",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  titleColor: "#ffffff",
  bodyColor: "rgba(248, 250, 252, 0.95)",
  titleSizePercent: 100,
  bodySizePercent: 100,
  textPosition: "bottom",
};
