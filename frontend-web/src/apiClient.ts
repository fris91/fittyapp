// Shared API client for feature modules (body data, exercises, recipes, AI).
//
// Mirrors the config-resolution strategy used by main.tsx so a single container image works
// across environments: runtime (window.__FITTY_ENV__) -> build-time Vite env -> safe fallback.

const runtimeEnv: Record<string, string | undefined> =
  (typeof window !== "undefined" && (window as unknown as { __FITTY_ENV__?: Record<string, string> }).__FITTY_ENV__) || {};

export function readConfig(key: string, fallback: string): string {
  const runtimeValue = runtimeEnv[key];
  if (runtimeValue && !runtimeValue.startsWith("__")) return runtimeValue;
  const buildValue = (import.meta.env as Record<string, string | undefined>)[key];
  if (buildValue) return buildValue;
  return fallback;
}

export const API_BASE_URL = readConfig("VITE_API_BASE_URL", "http://fitty-cp-01:30080");

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status})`);
  return response.json();
}

export async function apiPost<T>(path: string, token: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(stripEmpty(payload))
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Salvataggio non riuscito (${response.status})${details ? `: ${details.slice(0, 180)}` : ""}`);
  }
  return response.json();
}

// Drops null/undefined/"" so optional body-data fields are omitted rather than sent as null,
// matching the backend's lenient @DecimalMin/@Max validation (which only runs on present values).
export function stripEmpty(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
}
