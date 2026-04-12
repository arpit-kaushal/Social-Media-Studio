/**
 * Encode a target URL for /api/image-proxy so nested `&` never breaks query parsing.
 */
export function proxiedImageRequestPath(originalUrl: string): string {
  const bytes = new TextEncoder().encode(originalUrl);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(binary);
  const u = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `/api/image-proxy?u=${u}`;
}
