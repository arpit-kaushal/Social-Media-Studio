/**
 * Avoid echoing upstream error bodies in production (may leak provider hints).
 */
export function upstreamFailDetail(
  status: number,
  devBodySnippet: string,
  productionHint: string
): string {
  if (process.env.NODE_ENV !== "production") {
    return `HTTP ${status}: ${devBodySnippet}`;
  }
  return `HTTP ${status}. ${productionHint}`;
}

export function isStatusPageDisabledInProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.STATUS_PAGE_ENABLED === "false"
  );
}
