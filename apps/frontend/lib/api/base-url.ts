let cachedBaseUrl: string | null = null;
let loggedBaseUrl = false;

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    return normalizeBaseUrl(url.toString());
  } catch (error) {
    console.warn("[api] Ignoring invalid NEXT_PUBLIC_API_BASE_URL", { raw, error });
    return null;
  }
}

export function getApiBaseUrl(): string {
  if (cachedBaseUrl !== null) {
    return cachedBaseUrl;
  }

  const fromEnv = resolveFromEnv();
  if (fromEnv) {
    cachedBaseUrl = fromEnv;
  } else if (typeof window !== "undefined" && window.location?.origin) {
    cachedBaseUrl = normalizeBaseUrl(window.location.origin);
  } else {
    cachedBaseUrl = "";
  }

  if (process.env.NODE_ENV !== "production" && !loggedBaseUrl) {
    const display = cachedBaseUrl || "(same origin)";
    console.info(`[api] Resolved backend base URL: ${display}`);
    loggedBaseUrl = true;
  }

  return cachedBaseUrl;
}

export function apiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!baseUrl) {
    return normalizedPath;
  }
  return `${baseUrl}${normalizedPath}`;
}
