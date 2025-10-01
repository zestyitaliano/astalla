import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

 codex/update-apibaseurl-for-production-tp1cuq
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export const apiBaseUrl = (() => {
  const envValue = process.env.NEXT_PUBLIC_API_BASE_URL;
  const isServer = typeof window === "undefined";

  if (isServer) {

 codex/update-apibaseurl-for-production-xixhcs
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);


 main
export const apiBaseUrl = (() => {
  const envValue = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (typeof window === "undefined") {
 main
    if (!envValue) {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL must be set so the frontend can reach the backend."
      );
    }

    return envValue;
  }

 codex/update-apibaseurl-for-production-tp1cuq
  const isLocalClient = LOCAL_HOSTNAMES.has(window.location.hostname);

  if (!envValue) {
    if (isLocalClient) {
      return window.location.origin;
    }

    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be configured in hosted environments so the frontend can reach the backend."
    );

 codex/update-apibaseurl-for-production-xixhcs
  if (!envValue) {
    return window.location.origin;
 main
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
 codex/update-apibaseurl-for-production-tp1cuq
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

    console.warn(
      "NEXT_PUBLIC_API_BASE_URL is not a valid URL. Falling back to window.location.origin.",
      error
    );

    return window.location.origin;
  }

  return envValue;

  return envValue ?? window.location.origin;
 main
 main
})();

export const isMockMode = () =>
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";
