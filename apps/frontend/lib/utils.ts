import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const DEFAULT_PROD_API_BASE_URL = "https://api.astalla.com";
const DEFAULT_DEV_API_BASE_URL = "http://localhost:3001";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const normalized = url.toString().replace(/\/+$/, "");
    return normalized;
  } catch (error) {
    console.warn("Invalid URL provided for NEXT_PUBLIC_API_BASE_URL", error);
    return null;
  }
}

export function resolveServerBaseUrl() {
  const publicConfigured = normalizeUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (publicConfigured) {
    return publicConfigured;
  }

  const serverConfigured = normalizeUrl(
    process.env.API_BASE_URL ?? process.env.BACKEND_API_BASE_URL ?? process.env.INTERNAL_API_BASE_URL
  );
  if (serverConfigured) {
    return serverConfigured;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PROD_API_BASE_URL;
  }

  return DEFAULT_DEV_API_BASE_URL;
}

export const apiBaseUrl = (() => {
  const configured = normalizeUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const isServer = typeof window === "undefined";

  if (isServer) {
    const serverBaseUrl = resolveServerBaseUrl();
    console.info(`[utils] apiBaseUrl resolved on server: ${serverBaseUrl}`);
    return serverBaseUrl;
  }

  if (!configured) {
    const serverBaseUrl = resolveServerBaseUrl();
    console.info(`[utils] apiBaseUrl falling back to resolved server base url: ${serverBaseUrl}`);
    return serverBaseUrl;
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
    const serverBaseUrl = resolveServerBaseUrl();
    console.warn(
      "Unable to parse NEXT_PUBLIC_API_BASE_URL on the client. Falling back to resolved server base url.",
      error
    );
    return serverBaseUrl;
  }

  console.info(`[utils] apiBaseUrl resolved on client: ${configured}`);
  return configured;
})();

export const isMockMode = () =>
  process.env.DEV_MOCKS === "true" || process.env.NEXT_PUBLIC_DEV_MOCKS === "true";

export const isPersistenceEnabled = () =>
  process.env.NEXT_PUBLIC_DATA_PERSISTENCE !== "false";
