import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

describe("/api/public/resolve proxy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.astalla.test";
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
    const unstubAllGlobals = (vi as unknown as { unstubAllGlobals?: () => void }).unstubAllGlobals;
    unstubAllGlobals?.();
    vi.restoreAllMocks();
  });

  it("forwards the request to the backend resolver", async () => {
    const mockResponse = { ok: true, status: 200, json: vi.fn().mockResolvedValue({ widgets: [] }) };
    const fetchMock = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { GET } = await import("./route");
    const request = new NextRequest("https://app.astalla.test/api/public/resolve?host=north.astalla.test");

    const response = await GET(request);
    const body = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.astalla.test/public/resolve?host=north.astalla.test",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-internal": "1" }),
        cache: "no-store"
      })
    );
    expect(body).toEqual({ widgets: [] });
  });

  it("returns a 400 when host is missing", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest("https://app.astalla.test/api/public/resolve");

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "missing host" });
  });
});
