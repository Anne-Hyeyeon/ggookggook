export const PORT = 4321;

const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

/** Guards against DNS rebinding: a page on another origin cannot reach the tool through its own hostname. */
export function isAllowedHost(host: string | undefined): boolean {
  return host !== undefined && ALLOWED_HOSTS.has(host);
}
