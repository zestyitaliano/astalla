import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host");
  if (!host) {
    return NextResponse.json({ error: "missing host" }, { status: 400 });
  }

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? process.env.BACKEND_URL;

  if (!apiBaseUrl) {
    return NextResponse.json({ error: "API base url not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/public/resolve?host=${encodeURIComponent(host)}`, {
      headers: {
        "x-internal": "1"
      },
      cache: "no-store"
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to reach API", details: String(error) }, { status: 502 });
  }
}
