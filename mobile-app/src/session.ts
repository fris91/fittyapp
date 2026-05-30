import type { IdentityResponse, IdentityToken } from "./api";

declare const require: undefined | ((moduleName: string) => unknown);

export type FittySession = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionPlan: string;
  token: IdentityToken;
};

const SESSION_KEY = "fitty.session.v1";
let memorySession: FittySession | null = null;

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

function getSecureStore(): SecureStoreModule | null {
  try {
    if (typeof require !== "function") {
      return null;
    }
    return require("expo-secure-store") as SecureStoreModule;
  } catch {
    return null;
  }
}

export function sessionFromIdentity(response: IdentityResponse): FittySession | null {
  if (!response.token?.accessToken) {
    return null;
  }
  return {
    userId: response.appUserId,
    email: response.email,
    firstName: response.firstName,
    lastName: response.lastName,
    subscriptionPlan: response.subscriptionPlan,
    token: response.token
  };
}

export function sessionFromLogin(token: IdentityToken, fallbackEmail: string): FittySession | null {
  if (!token.accessToken) {
    return null;
  }
  const claims = decodeJwtPayload(token.accessToken);
  const email = stringClaim(claims.email) || fallbackEmail;
  return {
    userId: stringClaim(claims.sub) || "",
    email,
    firstName: stringClaim(claims.given_name) || email.split("@")[0],
    lastName: stringClaim(claims.family_name) || "",
    subscriptionPlan: stringClaim(claims.subscriptionPlan) || "FREE",
    token
  };
}

export async function saveSession(session: FittySession): Promise<void> {
  memorySession = session;
  const secureStore = getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }
}

export async function loadSession(): Promise<FittySession | null> {
  const secureStore = getSecureStore();
  if (!secureStore) {
    return memorySession;
  }
  const raw = await secureStore.getItemAsync(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    memorySession = JSON.parse(raw) as FittySession;
    return memorySession;
  } catch {
    await secureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  memorySession = null;
  const secureStore = getSecureStore();
  if (secureStore) {
    await secureStore.deleteItemAsync(SESSION_KEY);
  }
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload || typeof globalThis.atob !== "function") {
      return {};
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function stringClaim(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
