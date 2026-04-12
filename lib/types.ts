export type StudioFormat = "post" | "story" | "carousel";

export type SlideImageSource = "generated" | "upload";

export type TextPosition = "top" | "center" | "bottom";

export type Slide = {
  id: string;
  title: string;
  body: string;
  /** Primary image URL or data URL for uploads */
  image: string;
  imageSource?: SlideImageSource;
  /** Remote URLs to try in order when image fails (not used for uploads) */
  imageCandidates?: string[];
};

export type Branding = {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  titleColor: string;
  bodyColor: string;
  /** 70–200, scales title vs base */
  titleSizePercent: number;
  /** 70–200, scales body vs base */
  bodySizePercent: number;
  textPosition: TextPosition;
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
