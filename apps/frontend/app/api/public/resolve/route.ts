import { NextRequest, NextResponse } from "next/server";

import { apiBaseUrl } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host");
  if (!host) {
    return NextResponse.json({ error: "missing host" }, { status: 400 });
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
