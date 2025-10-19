import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

type BackendUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  accessToken?: string | null;
  access_token?: string | null;
  token?: string | null;
};

type CredentialsInput = {
  identifier?: string | null;
  password?: string | null;
} | null | undefined;

const KNOWN_ROLES = ["ORG_ADMIN", "REGIONAL", "PROPERTY", "MARKETING"] as const;
type KnownRole = (typeof KNOWN_ROLES)[number];

function normalizeRole(role: string | null | undefined): KnownRole | null {
  if (!role) {
    return null;
  }

  if ((KNOWN_ROLES as readonly string[]).includes(role)) {
    return role as KnownRole;
  }

  console.warn(`[auth] Unexpected user role received from backend: ${role}`);
  return null;
}

function isBackendUser(value: unknown): value is BackendUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string") {
    return false;
  }

  if (typeof candidate.email !== "string") {
    return false;
  }

  const { name, role } = candidate;
  if (name !== undefined && name !== null && typeof name !== "string") {
    return false;
  }

  if (role !== undefined && role !== null && typeof role !== "string") {
    return false;
  }

  return true;
}

export async function authorizeCredentials(
  credentialsInput: CredentialsInput,
  _req?: unknown
) {
  const identifier = credentialsInput?.identifier?.trim();
  const password = credentialsInput?.password ?? "";

  if (!identifier || password.trim() === "") {
    console.error("[auth] authorize() missing identifier or password");
    return null;
  }

  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true") {
    console.log("[auth] NEXT_PUBLIC_DEV_AUTH_BYPASS enabled - returning fake user");
    return {
      id: "dev-bypass-user",
      email: identifier,
      name: "Dev Bypass",
      role: null,
      accessToken: "dev-bypass-token"
    };
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;

  try {
    const response = await fetch(`${base}/auth/basic-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        emailOrUsername: identifier,
        password
      })
    });

    if (!response.ok) {
      console.warn("[credentials] backend returned", response.status);
      return null;
    }

    const user = await response.json();

    if (!isBackendUser(user)) {
      console.error("[auth] authorize() unexpected response shape", user);
      return null;
    }

    const accessToken =
      typeof user.accessToken === "string"
        ? user.accessToken
        : typeof user.access_token === "string"
          ? user.access_token
          : typeof user.token === "string"
            ? user.token
            : undefined;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: normalizeRole(user.role ?? null),
      accessToken
    };
  } catch (error) {
    console.error("[auth] authorize() unexpected error", error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  pages: {
    signIn: "/auth/signin"
  },
  providers: [
    CredentialsProvider({
      name: "Basic Auth",
      credentials: {
        identifier: {
          label: "Email or username",
          type: "text"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },
      authorize: authorizeCredentials
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const enrichedUser = user as {
          id: string;
          email: string;
          name?: string | null;
          role?: string | null;
          accessToken?: string;
        };

        token.user = {
          id: enrichedUser.id,
          email: enrichedUser.email,
          name: enrichedUser.name ?? null,
          role: normalizeRole(enrichedUser.role ?? null)
        };

        if (enrichedUser.accessToken) {
          token.accessToken = enrichedUser.accessToken;
        }
      }

      return token;
    },
    async session({ session, token }) {
      const tokenUser = (token as {
        user?: {
          id: string;
          email: string;
          name?: string | null;
          role?: KnownRole | null;
        };
        accessToken?: string;
      }).user;

      if (tokenUser) {
        session.user = {
          ...(session.user ?? {}),
          id: tokenUser.id,
          email: tokenUser.email,
          name: tokenUser.name ?? session.user?.name ?? null,
          role: tokenUser.role ?? undefined
        };
      }

      const accessToken = (token as { accessToken?: string }).accessToken;
      if (accessToken) {
        session.accessToken = accessToken;
      }

      return session;
    }
  }
};
