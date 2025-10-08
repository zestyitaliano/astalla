import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAIN_HOST = process.env.NEXT_PUBLIC_MAIN_HOST ?? "astalla.com";

export function middleware(req: NextRequest) {
  const hostHeader = req.headers.get("host") ?? "";
  const host = hostHeader.split(":")[0];
  const mainHost = MAIN_HOST.split(":")[0];
  const appHost = `app.${mainHost}`;
  const hostParts = host.split(".");
  const mainParts = mainHost.split(".");
  const isSubdomain = hostParts.length > mainParts.length && host.endsWith(mainHost);

  if (host === appHost) {
    return NextResponse.next();
  }

  if (isSubdomain) {
    const url = req.nextUrl.clone();
    url.pathname = "/public";
    url.searchParams.set("x-host", host);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico).*)"]
};
