const ACCESS_TOKEN_KEY = "cc_access_token";
const REFRESH_TOKEN_KEY = "cc_refresh_token";

export const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV === "production"
    ? "https://constrade-api-production.up.railway.app/api"
    : "http://localhost:3001/api");

export class ApiError extends Error {}

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

function safeStorage(type: "local" | "session"): Storage | null {
  try {
    return type === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readToken(key: string): string | null {
  if (memoryAccessToken && key === ACCESS_TOKEN_KEY) return memoryAccessToken;
  if (memoryRefreshToken && key === REFRESH_TOKEN_KEY) return memoryRefreshToken;
  const storage = safeStorage("local");
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeToken(key: string, value: string | null) {
  const storage = safeStorage("local");
  try {
    if (value === null) {
      storage?.removeItem(key);
    } else {
      storage?.setItem(key, value);
    }
  } catch {
    // ignore storage quota / privacy errors
  }
}

export function getAccessToken(): string | null {
  return memoryAccessToken ?? readToken(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return memoryRefreshToken ?? readToken(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
  writeToken(ACCESS_TOKEN_KEY, accessToken);
  writeToken(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  writeToken(ACCESS_TOKEN_KEY, null);
  writeToken(REFRESH_TOKEN_KEY, null);
}

export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const base = API_BASE_URL.replace(/\/$/, "");
  const url = path.startsWith("http") ? path : `${base}/${path.replace(/^\//, "")}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let fetchBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData || body instanceof URLSearchParams) {
      fetchBody = body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      fetchBody = JSON.stringify(body);
    }
  }

  const res = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    body: fetchBody,
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") ?? "";
  let json: unknown = {};
  if (contentType.includes("application/json")) {
    try {
      json = await res.json();
    } catch {
      json = {};
    }
  }

  if (res.ok) {
    const okJson = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
    if (okJson?.success === true && "data" in okJson) {
      return okJson.data as T;
    }
    return json as T;
  }

  const errJson = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  let message: string | undefined;

  if (errJson) {
    if (typeof errJson.error === "string") {
      message = errJson.error;
    } else if (typeof errJson.error === "object" && errJson.error !== null) {
      const inner = errJson.error as Record<string, unknown>;
      message = typeof inner.message === "string" ? inner.message : (typeof inner.error === "string" ? inner.error : undefined);
    }
    if (!message) {
      if (typeof errJson.message === "string") {
        message = errJson.message;
      } else if (Array.isArray(errJson.message)) {
        message = errJson.message.join(", ");
      }
    }
  }

  const finalMessage = message || res.statusText || `Request failed (${res.status})`;
  throw new ApiError(finalMessage);
}

export async function refreshTokens(): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
} | null> {
  const token = getRefreshToken();
  if (!token) return null;
  try {
    const res = await request<{
      success: boolean;
      accessToken: string;
      refreshToken: string;
      userId?: string;
      email?: string;
    }>("POST", "/auth/refresh", { refreshToken: token });
    if (!res.accessToken || !res.refreshToken) throw new ApiError("No token pair returned");
    setTokens(res.accessToken, res.refreshToken);
    const payload = decodeJwt<{ sub?: string; email?: string }>(res.accessToken);
    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      userId: res.userId ?? payload?.sub ?? "",
      email: res.email ?? payload?.email ?? "",
    };
  } catch {
    clearTokens();
    return null;
  }
}

export async function logoutRemote(): Promise<void> {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (refreshToken) {
    try {
      await request("POST", "/auth/logout", { refreshToken });
    } catch {
      // best-effort
    }
  }
}
