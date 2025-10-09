import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { apiBaseUrl } from "@/lib/utils";

const isDevelopment = process.env.NODE_ENV === "development";

class CredentialsSigninError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialsSignin";
  }
}

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

async function authenticateWithBackend(identifier: string, password: string) {
  const loginUrl = `${apiBaseUrl}/auth/basic-login`;

  if (isDevelopment) {
    console.log(`[auth] POST ${loginUrl}`);
  }

  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ identifier, password })
    });
  } catch (error) {
    console.error("Failed to reach authentication service", error);
    throw new Error("Unable to contact the authentication service. Please try again.");
  }

  if (isDevelopment) {
    console.log(`[auth] POST ${loginUrl} -> ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let responseBody: unknown = null;
  if (isJson) {
    try {
      responseBody = await response.json();
    } catch (error) {
      console.error("Failed to parse authentication response as JSON", error);
      responseBody = null;
    }
  }

  if (!response.ok) {
    let message = "Unable to sign in. Please try again.";
    if (responseBody && typeof responseBody === "object") {
      const candidate = responseBody as Record<string, unknown>;
      const possibleMessage = candidate.message ?? candidate.error;
      if (typeof possibleMessage === "string" && possibleMessage.trim() !== "") {
        message = possibleMessage;
      }
    }

    if (response.status >= 400 && response.status < 500) {
      throw new CredentialsSigninError(message);
    }

    throw new Error(message);
  }

  if (!isBackendLoginResponse(responseBody)) {
    console.error("Authentication response did not match the expected shape");
    throw new Error("Received an unexpected response from the authentication service.");
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
          throw new CredentialsSigninError("Please enter your email or username and password.");
        }

        const { token, user } = await authenticateWithBackend(identifier, password);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role ?? undefined,
          accessToken: token
        };
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
