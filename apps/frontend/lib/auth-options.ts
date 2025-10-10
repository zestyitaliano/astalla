import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

type BackendUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
};

type BackendLoginResponse = {
  token: string;
  user: BackendUser;
};

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

function isBackendLoginResponse(value: unknown): value is BackendLoginResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.token !== "string") {
    return false;
  }

  return isBackendUser(candidate.user);
}

const LOGIN_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = LOGIN_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function authenticateWithBackend(
  identifier: string,
  password: string
): Promise<BackendLoginResponse | null> {
  const baseUrl = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();

  if (!baseUrl) {
    console.error("[auth] Missing API_BASE_URL/NEXT_PUBLIC_API_BASE_URL environment variables");
    return null;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const loginUrl = `${normalizedBase}/auth/basic-login`;
  const safeIdentifier = identifier.trim().toLowerCase();

  console.log(`[auth] authorize() POST ${loginUrl}`);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      loginUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ identifier, password })
      }
    );
  } catch (error) {
    console.error(`[auth] authorize() request failed for ${safeIdentifier}`, error);
    return null;
  }

  console.log(`[auth] authorize() response status ${response.status}`);

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch (error) {
    console.error("[auth] Failed to parse backend response as JSON", error);
    return null;
  }

  if (!response.ok) {
    console.error(
      `[auth] authorize() backend login failed for ${safeIdentifier}. status=${response.status}`,
      responseBody
    );
    return null;
  }

  if (!isBackendLoginResponse(responseBody)) {
    console.error("[auth] authorize() unexpected response shape", responseBody);
    return null;
  }

  return responseBody;
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
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password ?? "";

        if (!identifier || password.trim() === "") {
          console.error("[auth] authorize() missing identifier or password");
          return null;
        }

        // Developer-only bypass to unblock local testing when the backend is unavailable.
        if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true") {
          console.log("[auth] NEXT_PUBLIC_DEV_AUTH_BYPASS enabled - returning fake user");
          return {
            id: "dev-bypass-user",
            email: identifier,
            name: "Dev Bypass",
            token: "dev-bypass-token"
          };
        }

        try {
          const result = await authenticateWithBackend(identifier, password);

          if (!result) {
            return null;
          }

          const { token, user } = result;

          const minimalUser: {
            id: string;
            email: string;
            name: string | null;
            token: string;
          } & { accessToken?: string } = {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            token
          };

          Object.defineProperty(minimalUser, "accessToken", {
            value: token,
            enumerable: false,
            configurable: true,
            writable: false
          });

          return minimalUser;
        } catch (error) {
          console.error("[auth] authorize() unexpected error", error);
          return null;
        }
      }
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
          role: enrichedUser.role ?? null
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
          role?: string | null;
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
