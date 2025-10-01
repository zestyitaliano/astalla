import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

type ParsedUrl = { raw: string; url: URL };

function parseUrl(raw: string | undefined): ParsedUrl | null {
  if (!raw) {
    return null;
  }

  try {
    return { raw, url: new URL(raw) };
  } catch (error) {
    return null;
  }
}

function resolveHostedFallback(): ParsedUrl | null {
  const candidates = [
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
  ];

  for (const candidate of candidates) {
    const parsed = parseUrl(candidate);

    if (parsed && !LOCAL_HOSTNAMES.has(parsed.url.hostname)) {
      return parsed;
    }
  }

  return null;
}

export const apiBaseUrl = (() => {
  const configured = parseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const isServer = typeof window === "undefined";
  const hostedFallback = resolveHostedFallback();
  const isHostedEnvironment = Boolean(process.env.VERCEL || hostedFallback);

  if (isServer) {
    if (!configured) {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL must be set to a valid URL so the frontend can reach the backend."
      );
    }

    if (LOCAL_HOSTNAMES.has(configured.url.hostname)) {
      if (!isHostedEnvironment) {
        return configured.raw;
      }

      if (hostedFallback) {
        console.warn(
          [
            "NEXT_PUBLIC_API_BASE_URL points to localhost.",
            "Falling back to a hosted origin so server-side requests remain reachable."
          ].join(" "),
          { fallbackOrigin: hostedFallback.raw }
        );

        return hostedFallback.raw;
      }

      throw new Error(
        "Hosted environments require NEXT_PUBLIC_API_BASE_URL to point to a reachable backend URL."
      );
    }

    return configured.raw;
  }

  const isLocalClient = LOCAL_HOSTNAMES.has(window.location.hostname);

  if (!configured) {
    if (isLocalClient) {
      console.warn(
        "NEXT_PUBLIC_API_BASE_URL is missing or invalid. Falling back to window.location.origin for local development."
      );

      return window.location.origin;
    }

    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be configured in hosted environments so the frontend can reach the backend."
    );
  }

  if (
    LOCAL_HOSTNAMES.has(configured.url.hostname) &&
    !isLocalClient
  ) {
    console.warn(
      [
        "NEXT_PUBLIC_API_BASE_URL points to localhost, but the app is running on a non-localhost origin.",
        "Falling back to window.location.origin so requests stay on the deployed domain."
      ].join(" ")
    );

    return window.location.origin;
  }

  return configured.raw;
})();

export const isMockMode = () =>
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";
