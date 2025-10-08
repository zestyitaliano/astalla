import { NextResponse } from "next/server";

import { resolveBackendBaseUrl } from "../../_lib/backend";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  let backendBase: string;

  try {
    backendBase = resolveBackendBaseUrl();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const targetUrl = new URL(`/ops/${params.id}`, backendBase);
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
      signal: request.signal
    });

    const text = await response.text();
    const isJson = response.headers.get("content-type")?.includes("application/json");
    let data: unknown = null;

    if (text) {
      if (isJson) {
        try {
          data = JSON.parse(text);
        } catch (error) {
          return NextResponse.json({ error: "Invalid JSON response from backend" }, { status: 502 });
        }
      } else {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const errorPayload = data ?? { error: "Failed to fetch operation" };
      return NextResponse.json(errorPayload, { status: response.status });
    }

    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(null, { status: 499, statusText: "Client Closed Request" });
    }

    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
