import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

import { apiBaseUrl } from "@/lib/utils";
import { basicAuthLoginResponseSchema } from "@shared/api";

type EnvironmentAccount = {
  id: string;
  name: string;
  email: string;
};

const isMockMode =
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";

const fallbackUser = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@example.com",
  username: "demo"
};

const envEmail = process.env.BASIC_AUTH_EMAIL;
const envUsername = process.env.BASIC_AUTH_USERNAME;
const configuredEmail = envEmail?.toLowerCase();
const configuredUsername = envUsername?.toLowerCase();
const configuredPassword = process.env.BASIC_AUTH_PASSWORD ?? "password";
const configuredDisplayName = process.env.BASIC_AUTH_NAME;

function resolveEnvironmentAccount(
  normalizedIdentifier: string,
  password: string
): EnvironmentAccount | null {
  const configuredIdentifiers: Array<{
    normalized: string;
    source: "email" | "username";
  }> = [];

  if (configuredEmail) {
    configuredIdentifiers.push({ normalized: configuredEmail, source: "email" });
  }

  if (configuredUsername) {
    configuredIdentifiers.push({ normalized: configuredUsername, source: "username" });
  }

  const matchedIdentifier = configuredIdentifiers.find(
    (entry) => entry.normalized === normalizedIdentifier
  );

  if (!matchedIdentifier) {
    return null;
  }

  if (password !== configuredPassword) {
    return null;
  }

  const email = matchedIdentifier.source === "email"
    ? envEmail ?? configuredEmail ?? fallbackUser.email
    : envEmail ?? fallbackUser.email;

  const name =
    configuredDisplayName ??
    (matchedIdentifier.source === "username"
      ? envUsername ?? configuredUsername ?? fallbackUser.name
      : fallbackUser.name);

  const id = matchedIdentifier.source === "username"
    ? envUsername ?? configuredUsername ?? fallbackUser.id
    : envEmail ?? configuredEmail ?? fallbackUser.id;

  return {
    id,
    name,
    email
  };
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
      name: payload.name ?? fallbackUser.name,
      email: payload.email
    } satisfies EnvironmentAccount;
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
          placeholder: envEmail ?? envUsername ?? fallbackUser.email
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
            name: fallbackUser.name,
            email: identifier.includes("@") ? identifier : fallbackUser.email
          };
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

        if (configuredEmail || configuredUsername) {
          return null;
        }

        const fallbackIdentifiers = [
          fallbackUser.email.toLowerCase(),
          fallbackUser.username.toLowerCase()
        ];

        if (!fallbackIdentifiers.includes(normalizedIdentifier)) {
          return null;
        }

        if (password !== configuredPassword) {
          return null;
        }

        return {
          id: fallbackUser.id,
          name: fallbackUser.name,
          email: fallbackUser.email
        };
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  callbacks: {
    async session({ session }) {
      if (session.user) {
        session.user.name = session.user.name ?? fallbackUser.name;
        session.user.email = session.user.email ?? fallbackUser.email;
      }
      return session;
    }
  }
};
