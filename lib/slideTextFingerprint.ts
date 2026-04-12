/** Stable string for comparing slide copy to what the current image was generated for. */
export function slideTextFingerprint(title: string, body: string): string {
  return `${title.trim()}\n${body.trim()}`;
}
