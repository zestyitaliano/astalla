import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

import { apiBaseUrl } from "@/lib/utils";
import { basicAuthLoginResponseSchema } from "@shared/api";

type Account = {
  id: string;
  name: string;
  email: string;
};

const isMockMode =
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";

const fallbackAccount = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@example.com",
  username: "demo"
};

const envEmail = process.env.BASIC_AUTH_EMAIL;
const envUsername = process.env.BASIC_AUTH_USERNAME;
const envPassword = process.env.BASIC_AUTH_PASSWORD ?? "password";
const envDisplayName = process.env.BASIC_AUTH_NAME;

function resolveEnvironmentAccount(
  normalizedIdentifier: string,
  password: string
): Account | null {
  const matchesEmail = envEmail ? normalizedIdentifier === envEmail.toLowerCase() : false;
  const matchesUsername = envUsername ? normalizedIdentifier === envUsername.toLowerCase() : false;

  if (!matchesEmail && !matchesUsername) {
    return null;
  }

  if (password !== envPassword) {
    return null;
  }

  const resolvedEmail = matchesEmail ? envEmail! : envEmail ?? fallbackAccount.email;
  const resolvedName =
    envDisplayName ?? (matchesUsername ? envUsername ?? fallbackAccount.name : fallbackAccount.name);
  const resolvedId = matchesUsername
    ? envUsername ?? fallbackAccount.id
    : envEmail ?? fallbackAccount.id;

  return {
    id: resolvedId,
    name: resolvedName,
    email: resolvedEmail
  } satisfies Account;
}

async function attemptBackendLogin(identifier: string, password: string) {
  try {
    const response = await fetch(`${apiBaseUrl}/auth/basic-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ identifier, password })
    });

    if (!response.ok) {
      return null;
    }

    const payload = basicAuthLoginResponseSchema.parse(await response.json());

    return {
      id: payload.id,
      name: payload.name ?? fallbackAccount.name,
      email: payload.email
    } satisfies Account;
  } catch (error) {
    console.error("Failed to verify credentials with backend", error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Basic Auth",
      credentials: {
        identifier: {
          label: "Email or username",
          type: "text",
          placeholder: envEmail ?? envUsername ?? fallbackAccount.email
        },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password ?? "";

        if (!identifier || !password) {
          return null;
        }

        if (isMockMode) {
          return {
            id: "mock-user",
            name: fallbackAccount.name,
            email: identifier.includes("@") ? identifier : fallbackAccount.email
          } satisfies Account;
        }

        const normalizedIdentifier = identifier.toLowerCase();

        const environmentAccount = resolveEnvironmentAccount(normalizedIdentifier, password);
        if (environmentAccount) {
          return environmentAccount;
        }

        const backendAccount = await attemptBackendLogin(identifier, password);
        if (backendAccount) {
          return backendAccount;
        }

        if (envEmail || envUsername) {
          return null;
        }

        const fallbackIdentifiers = [
          fallbackAccount.email.toLowerCase(),
          fallbackAccount.username.toLowerCase()
        ];

        if (!fallbackIdentifiers.includes(normalizedIdentifier)) {
          return null;
        }

        if (password !== envPassword) {
          return null;
        }

        return {
          id: fallbackAccount.id,
          name: fallbackAccount.name,
          email: fallbackAccount.email
        } satisfies Account;
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  callbacks: {
    async session({ session }) {
      if (session.user) {
        session.user.name = session.user.name ?? fallbackAccount.name;
        session.user.email = session.user.email ?? fallbackAccount.email;
      }
      return session;
    }
  }
};
