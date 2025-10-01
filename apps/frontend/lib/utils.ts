import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export const apiBaseUrl = (() => {
  const envValue = process.env.NEXT_PUBLIC_API_BASE_URL;
  const isServer = typeof window === "undefined";

  if (isServer) {
    if (!envValue) {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL must be set so the frontend can reach the backend."
      );
    }

    return envValue;
  }

  const isLocalClient = LOCAL_HOSTNAMES.has(window.location.hostname);

  if (!envValue) {
    if (isLocalClient) {
      return window.location.origin;
    }

    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be configured in hosted environments so the frontend can reach the backend."
    );
  }

  try {
    const { hostname } = new URL(envValue);

    if (
      LOCAL_HOSTNAMES.has(hostname) &&
      !LOCAL_HOSTNAMES.has(window.location.hostname)
    ) {
      console.warn(
        "NEXT_PUBLIC_API_BASE_URL points to a localhost address, but the app is running on a non-localhost origin. Falling back to window.location.origin so requests stay on the deployed domain."
      );

      return window.location.origin;
    }
  } catch (error) {
    if (isLocalClient) {
      console.warn(
        "NEXT_PUBLIC_API_BASE_URL is not a valid URL. Falling back to window.location.origin for local development.",
        error
      );

      return window.location.origin;
    }

    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid URL.");
  }

  return envValue;
})();

export const isMockMode = () =>
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";
