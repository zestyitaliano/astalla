import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function parseUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
}

const hostedServerFallbackOrigins = [
  process.env.NEXTAUTH_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
]
  .filter((value): value is string => Boolean(value))
  .map((value) => ({ value, parsed: parseUrl(value) }))
  .filter((entry): entry is { value: string; parsed: URL } => {
    if (!entry.parsed) {
      return false;
    }

    return !LOCAL_HOSTNAMES.has(entry.parsed.hostname);
  });

const isHostedEnvironment = Boolean(
  process.env.VERCEL || hostedServerFallbackOrigins.length > 0
);

export const apiBaseUrl = (() => {
  const envValue = process.env.NEXT_PUBLIC_API_BASE_URL;
  const parsedEnv = parseUrl(envValue);
  const isServer = typeof window === "undefined";

  if (isServer) {
    if (!envValue) {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL must be set so the frontend can reach the backend."
      );
    }

    if (!parsedEnv) {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL must be a valid URL so the frontend can reach the backend."
      );
    }

    if (LOCAL_HOSTNAMES.has(parsedEnv.hostname) && isHostedEnvironment) {
      const fallbackOrigin = hostedServerFallbackOrigins[0];

      if (fallbackOrigin) {
        console.warn(
          "NEXT_PUBLIC_API_BASE_URL points to a localhost address. Falling back to a hosted origin so server-side requests remain reachable.",
          { fallbackOrigin: fallbackOrigin.value }
        );

        return fallbackOrigin.value;
      }

      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL points to a localhost address, but hosted environments require a reachable backend URL."
      );
    }

    return envValue;
  }

  const isLocalClient = LOCAL_HOSTNAMES.has(window.location.hostname);

  if (!envValue || !parsedEnv) {
    if (isLocalClient) {
      if (!envValue || !parsedEnv) {
        console.warn(
          "NEXT_PUBLIC_API_BASE_URL is missing or invalid. Falling back to window.location.origin for local development."
        );
      }

      return window.location.origin;
    }

    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be configured in hosted environments so the frontend can reach the backend."
    );
  }

  if (
    LOCAL_HOSTNAMES.has(parsedEnv.hostname) &&
    !LOCAL_HOSTNAMES.has(window.location.hostname)
  ) {
    console.warn(
      "NEXT_PUBLIC_API_BASE_URL points to a localhost address, but the app is running on a non-localhost origin. Falling back to window.location.origin so requests stay on the deployed domain."
    );

    return window.location.origin;
  }

  return envValue;
})();

export const isMockMode = () =>
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";
