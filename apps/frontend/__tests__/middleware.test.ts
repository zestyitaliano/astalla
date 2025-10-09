import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "../middleware";

const originalMainHost = process.env.NEXT_PUBLIC_MAIN_HOST;

beforeEach(() => {
  process.env.NEXT_PUBLIC_MAIN_HOST = "astalla.com";
});

afterEach(() => {
  process.env.NEXT_PUBLIC_MAIN_HOST = originalMainHost;
});

describe("middleware host rewrites", () => {
  it("rewrites branded subdomains to the public dashboard", () => {
    const request = new NextRequest("https://north.astalla.com/dashboard", {
      headers: { host: "north.astalla.com" }
    });

    const response = middleware(request);

    expect(response?.headers.get("x-middleware-rewrite")).toContain("/public");
    expect(response?.headers.get("x-middleware-rewrite")).toContain("x-host=north.astalla.com");
  });

  it("skips rewrite when the request targets the app host", () => {
    const request = new NextRequest("https://app.astalla.com/dashboard", {
      headers: { host: "app.astalla.com" }
    });

    const response = middleware(request);

    expect(response?.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("skips rewrite when the request targets the main marketing site", () => {
    const request = new NextRequest("https://astalla.com/landing", {
      headers: { host: "astalla.com" }
    });

    const response = middleware(request);

    expect(response?.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
