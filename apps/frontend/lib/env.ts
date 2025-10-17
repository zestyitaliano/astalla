const normalizePath = (path: string): string => {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
};

const getConfiguredBaseUrl = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    return url.toString().replace(/\/+$/, "");
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[env] Ignoring invalid NEXT_PUBLIC_API_BASE_URL", error);
    }
    return null;
  }
};

export function buildApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  const base = getConfiguredBaseUrl();
  if (!base) {
    return normalizedPath;
  }

  try {
    const url = new URL(normalizedPath, base);
    return url.toString();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[env] Failed to resolve API URL", error);
    }
    return normalizedPath;
  }
}
