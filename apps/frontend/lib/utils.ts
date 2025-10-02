import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.toString();
  } catch (error) {
    console.warn("Invalid URL provided for NEXT_PUBLIC_API_BASE_URL", error);
    return null;
  }
}

function resolveServerFallbackOrigin() {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  return normalizeUrl(process.env.NEXTAUTH_URL) ?? normalizeUrl(vercelUrl) ?? "http://localhost:3000";
}

export const apiBaseUrl = (() => {
  const configured = normalizeUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const isServer = typeof window === "undefined";

  if (isServer) {
    return configured ?? resolveServerFallbackOrigin();
  }

  if (!configured) {
    return window.location.origin;
  }

  try {
    const hostname = new URL(configured).hostname;

    if (LOCAL_HOSTNAMES.has(hostname) && !LOCAL_HOSTNAMES.has(window.location.hostname)) {
      console.warn(
        "NEXT_PUBLIC_API_BASE_URL points to a localhost address, but the app is running on a different origin. Falling back to the current window origin."
      );
      return window.location.origin;
    }
  } catch (error) {
    console.warn("Unable to parse NEXT_PUBLIC_API_BASE_URL on the client. Falling back to window.location.origin.", error);
    return window.location.origin;
  }

  return configured;
})();

export const isMockMode = () =>
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";

export const isPersistenceEnabled = () =>
  process.env.NEXT_PUBLIC_DATA_PERSISTENCE !== "false";
