import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("authOptions credentials authorize", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("posts credentials to NEXT_PUBLIC_API_BASE_URL /auth/basic-login", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = "false";

    const backendResponse = {
      id: "user-1",
      email: "user@example.com",
      name: "Example User",
      role: "ORG_ADMIN",
      accessToken: "token-123"
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(backendResponse)
    });

    vi.stubGlobal("fetch", fetchMock);

    const { authorizeCredentials } = await import("../auth-options");

    const result = await authorizeCredentials({
      identifier: "User@example.com",
      password: "SuperSecret1!"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.com/auth/basic-login");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" }
    });
    const body = fetchMock.mock.calls[0]?.[1]?.body as string;
    expect(body && JSON.parse(body)).toEqual({
      emailOrUsername: "User@example.com",
      password: "SuperSecret1!"
    });
    expect(result).toMatchObject({
      id: backendResponse.id,
      email: backendResponse.email,
      name: backendResponse.name,
      role: "ORG_ADMIN",
      accessToken: backendResponse.accessToken
    });
  });
});
