import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { CredentialsConfig } from "next-auth/providers/credentials";

describe("authOptions credentials authorize", () => {
  const originalEnv = process.env;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("falls back to NEXT_PUBLIC_API_BASE_URL when server-only API variables are unset", async () => {
    delete process.env.API_BASE_URL;
    delete process.env.BACKEND_API_BASE_URL;
    delete process.env.INTERNAL_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = "false";

    const backendResponse = {
      token: "token-123",
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Example User"
      }
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(backendResponse)
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { authOptions } = await import("../auth-options");
    const credentialsProvider = authOptions.providers.find(
      (provider): provider is CredentialsConfig => provider.id === "credentials"
    );

    if (!credentialsProvider || typeof credentialsProvider.authorize !== "function") {
      throw new Error("Missing credentials authorize implementation");
    }

    const result = await credentialsProvider.authorize(
      {
        identifier: "User@example.com",
        password: "SuperSecret1!"
      },
      undefined as any
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.com/auth/basic-login");
    expect(result).toMatchObject({
      id: backendResponse.user.id,
      email: backendResponse.user.email,
      name: backendResponse.user.name,
      token: backendResponse.token
    });
  });
});
