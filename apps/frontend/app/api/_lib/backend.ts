export function resolveBackendBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? null;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return baseUrl;
}
