const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

export type SupabaseConnectionStatus =
  | { ok: true; configured: true }
  | { ok: false; configured: false; reason: "NOT_CONFIGURED" }
  | { ok: false; configured: true; reason: "UNREACHABLE" | "REJECTED" };

export function isSupabaseConfigured(): boolean {
  return /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_PUBLISHABLE_KEY.length > 0;
}

function publicHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
  headers.set("Accept", "application/json");
  return headers;
}

/**
 * Public connectivity probe only. It does not authenticate a user and does not
 * bypass RLS. The publishable key is intentionally browser-safe.
 */
export async function checkSupabaseConnection(
  signal?: AbortSignal
): Promise<SupabaseConnectionStatus> {
  if (!isSupabaseConfigured()) {
    return { ok: false, configured: false, reason: "NOT_CONFIGURED" };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: "GET",
      headers: publicHeaders(),
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      return { ok: false, configured: true, reason: "REJECTED" };
    }

    return { ok: true, configured: true };
  } catch {
    return { ok: false, configured: true, reason: "UNREACHABLE" };
  }
}

/**
 * Authenticated PostgREST helper for the next rollout step.
 * The caller must supply a real Supabase user access token; the bridge never
 * stores service-role credentials and never falls back to privileged access.
 */
export async function supabaseRest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const headers = publicHeaders(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`SUPABASE_REST_${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const supabasePublicConfig = Object.freeze({
  url: SUPABASE_URL,
  configured: isSupabaseConfigured(),
});
