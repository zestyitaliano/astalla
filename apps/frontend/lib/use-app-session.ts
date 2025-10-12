"use client";

export type AppRole = "ORG_ADMIN" | "MEMBER" | "GUEST";
export type AppSession = {
  status: "authenticated" | "unauthenticated" | "loading";
  role: AppRole;
};

type UseSessionHook = () => {
  data?: {
    user?: {
      role?: string | null;
      [key: string]: unknown;
    } | null;
  } | null;
  status: "authenticated" | "unauthenticated" | "loading";
};

const fallbackUseSession: UseSessionHook = () => ({
  data: null,
  status: "unauthenticated",
});

let useSessionImpl: UseSessionHook = fallbackUseSession;

try {
  const nextAuth = require("next-auth/react") as typeof import("next-auth/react");
  if (typeof nextAuth.useSession === "function") {
    useSessionImpl = nextAuth.useSession;
  }
} catch {
  // next-auth not available; keep fallback
}

export function useAppSession(): AppSession {
  const { data, status } = useSessionImpl();
  const role: AppRole =
    (data?.user?.role as AppRole | undefined) ?? (status === "authenticated" ? "MEMBER" : "GUEST");

  if (status === "loading") {
    return { status: "loading", role };
  }

  return { status, role };
}
