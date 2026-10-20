/**
 * Client-side configuration can only point authentication and private writes
 * at their dedicated same-origin API paths. A VITE_* value is always public;
 * it must never be used as a bearer credential or an external webhook URL.
 *
 * This prevents accidental credential/data exfiltration. Authorization and
 * per-user isolation still have to be enforced by the eventual server.
 */
export function trustedSameOriginApiBase(value: string, expectedPath: "/api/auth" | "/api/admin"): string | null {
  const path = value.trim();
  if (path === expectedPath || path === `${expectedPath}/`) return expectedPath;
  return null;
}
