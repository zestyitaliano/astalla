export function resolveBackendBaseUrl() {
  const baseUrl =
    process.env.BACKEND_API_BASE_URL ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    null;

  if (!baseUrl) {
    throw new Error("Backend API base URL is not configured");
  }

  return baseUrl;
}
