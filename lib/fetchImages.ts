import type { StudioFormat } from "./types";
import { proxiedImageRequestPath } from "./proxyUrl";

export function dimensionsForFormat(format: StudioFormat): { width: number; height: number } {
  switch (format) {
    case "story":
      return { width: 720, height: 1280 };
    case "post":
    case "carousel":
    default:
      return { width: 1080, height: 1080 };
  }
}

export function proxiedImageUrl(originalUrl: string): string {
  if (originalUrl.startsWith("data:") || originalUrl.startsWith("blob:")) {
    return originalUrl;
  }
  return proxiedImageRequestPath(originalUrl);
}
