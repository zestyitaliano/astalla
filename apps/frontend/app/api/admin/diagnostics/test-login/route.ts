import { NextResponse } from "next/server";

import { resolveServerBaseUrl } from "@/lib/utils";

const ADMIN_EMAIL = process.env.ADMIN_TEST_LOGIN_EMAIL?.toLowerCase() || "admin@astalla.com";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_LOGIN_PASSWORD || "Astalla2025!";

const isTestEnabled =
  process.env.NODE_ENV !== "production" || process.env.ADMIN_TEST_LOGIN_ENABLED === "true";

export async function POST() {
  if (!isTestEnabled) {
    return NextResponse.json({ ok: false, error: "Test login is disabled" }, { status: 403 });
  }

  const baseUrl = resolveServerBaseUrl();
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const loginUrl = `${normalizedBaseUrl}/auth/basic-login`;

  try {
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });

    const body = await response.json().catch(() => null);

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      body
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
