import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

import { apiBaseUrl } from "@/lib/utils";
import { basicAuthLoginResponseSchema } from "@shared/api";

 codex/fix-deployment-issue-on-vercel-6wxxpp
type Account = {

type EnvironmentAccount = {
 main
  id: string;
  name: string;
  email: string;
};

const isMockMode =
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";

 codex/fix-deployment-issue-on-vercel-6wxxpp
const fallbackAccount = {

const fallbackUser = {
 main
  id: "demo-user",
  name: "Demo User",
  email: "demo@example.com",
  username: "demo"
};

const envEmail = process.env.BASIC_AUTH_EMAIL;
const envUsername = process.env.BASIC_AUTH_USERNAME;
 codex/fix-deployment-issue-on-vercel-6wxxpp
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

const configuredEmail = envEmail?.toLowerCase();
const configuredUsername = envUsername?.toLowerCase();
const configuredPassword = process.env.BASIC_AUTH_PASSWORD ?? "password";
const configuredDisplayName = process.env.BASIC_AUTH_NAME;

 codex/fix-deployment-issue-on-vercel-k6bm9d

 codex/fix-deployment-issue-on-vercel-rnbuxy
 main
function resolveEnvironmentAccount(
  normalizedIdentifier: string,
  password: string
): EnvironmentAccount | null {
 codex/fix-deployment-issue-on-vercel-k6bm9d
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

  const matchesEmail = configuredEmail ? normalizedIdentifier === configuredEmail : false;
  const matchesUsername = configuredUsername
    ? normalizedIdentifier === configuredUsername
    : false;

  if (!matchesEmail && !matchesUsername) {
 main
    return null;
  }

  if (password !== configuredPassword) {
    return null;
  }

 codex/fix-deployment-issue-on-vercel-k6bm9d
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

  const resolvedEmail = matchesEmail && envEmail ? envEmail : envEmail ?? fallbackUser.email;
  const resolvedName =
    configuredDisplayName || (matchesUsername && envUsername ? envUsername : fallbackUser.name);
  const resolvedId = matchesUsername && envUsername
    ? envUsername
    : matchesEmail && envEmail
      ? envEmail
      : fallbackUser.id;
 main

  return {
    id: resolvedId,
    name: resolvedName,
    email: resolvedEmail
 codex/fix-deployment-issue-on-vercel-6wxxpp
  } satisfies Account;

 main
  };
 main
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
 codex/fix-deployment-issue-on-vercel-6wxxpp
      name: payload.name ?? fallbackAccount.name,
      email: payload.email
    } satisfies Account;

      name: payload.name ?? fallbackUser.name,
      email: payload.email
    } satisfies EnvironmentAccount;
 main
  } catch (error) {
    console.error("Failed to verify credentials with backend", error);
    return null;
  }
}

 codex/fix-deployment-issue-on-vercel-6wxxpp

 codex/fix-deployment-issue-on-vercel-k6bm9d

const acceptedIdentifiers = [configuredEmail, configuredUsername].filter(
  (value): value is string => Boolean(value)
);
 main

 main
 main
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Basic Auth",
      credentials: {
        identifier: {
          label: "Email or username",
          type: "text",
 codex/fix-deployment-issue-on-vercel-6wxxpp
          placeholder: envEmail ?? envUsername ?? fallbackAccount.email

          placeholder: envEmail ?? envUsername ?? fallbackUser.email
 main
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
 codex/fix-deployment-issue-on-vercel-6wxxpp
            name: fallbackAccount.name,
            email: identifier.includes("@") ? identifier : fallbackAccount.email
          } satisfies Account;
        }

        const normalizedIdentifier = identifier.toLowerCase();


            name: fallbackUser.name,
            email: identifier.includes("@") ? identifier : fallbackUser.email
          };
        }

        const normalizedIdentifier = identifier.toLowerCase();
 codex/fix-deployment-issue-on-vercel-k6bm9d

 codex/fix-deployment-issue-on-vercel-rnbuxy
 main
 main
        const environmentAccount = resolveEnvironmentAccount(normalizedIdentifier, password);
        if (environmentAccount) {
          return environmentAccount;
        }

        const backendAccount = await attemptBackendLogin(identifier, password);
        if (backendAccount) {
          return backendAccount;
        }

 codex/fix-deployment-issue-on-vercel-6wxxpp
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

        if (configuredEmail || configuredUsername) {
          return null;
        }

 codex/fix-deployment-issue-on-vercel-k6bm9d
        const fallbackIdentifiers = [
          fallbackUser.email.toLowerCase(),
          fallbackUser.username.toLowerCase()
        ];

        if (!fallbackIdentifiers.includes(normalizedIdentifier)) {

        const matchesFallbackEmail = normalizedIdentifier === fallbackUser.email.toLowerCase();
        const matchesFallbackUsername = normalizedIdentifier === fallbackUser.username.toLowerCase();

        if (!matchesFallbackEmail && !matchesFallbackUsername) {
 main
          return null;
        }

        if (password !== configuredPassword) {
          return null;
        }

        return {
          id: fallbackUser.id,
          name: fallbackUser.name,
          email: fallbackUser.email
 codex/fix-deployment-issue-on-vercel-k6bm9d


        const identifiersToMatch =
          acceptedIdentifiers.length > 0
            ? acceptedIdentifiers
            : [fallbackUser.email.toLowerCase(), fallbackUser.username.toLowerCase()];

        const isIdentifierValid = identifiersToMatch.includes(normalizedIdentifier);
        const isPasswordValid = password === configuredPassword;

        if (!isIdentifierValid || !isPasswordValid) {
          return null;
        }

        const matchesEmail = configuredEmail ? normalizedIdentifier === configuredEmail : false;
        const matchesUsername = configuredUsername
          ? normalizedIdentifier === configuredUsername
          : false;

        const resolvedEmail = matchesEmail && envEmail ? envEmail : envEmail ?? fallbackUser.email;
        const resolvedName =
          configuredDisplayName || (matchesUsername && envUsername ? envUsername : fallbackUser.name);
        const resolvedId = matchesUsername && envUsername
          ? envUsername
          : matchesEmail && envEmail
            ? envEmail
            : fallbackUser.id;

        return {
          id: resolvedId,
          name: resolvedName,
          email: resolvedEmail
 main
 main
        };
 main
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  callbacks: {
    async session({ session }) {
      if (session.user) {
 codex/fix-deployment-issue-on-vercel-6wxxpp
        session.user.name = session.user.name ?? fallbackAccount.name;
        session.user.email = session.user.email ?? fallbackAccount.email;

        session.user.name = session.user.name ?? fallbackUser.name;
        session.user.email = session.user.email ?? fallbackUser.email;
 main
      }
      return session;
    }
  }
};
