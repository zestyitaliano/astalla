import { Share2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { apiBaseUrl } from "@/lib/utils";

interface PublicDashboardProps {
  searchParams: Record<string, string | string[] | undefined>;
}

interface PublicDashboardWidget {
  id?: string;
  label?: string;
  value?: string | number | null;
  description?: string | null;
  type?: string | null;
  media?: { src: string; alt?: string } | null;
  chart?: {
    type?: string | null;
    points?: Array<number> | null;
    color?: string | null;
  } | null;
}

interface PublicDashboardResponse {
  title?: string;
  widgets?: PublicDashboardWidget[];
}

const PublicWidgetCard = dynamic(() => import("./widgets/widget-card"), {
  loading: () => (
    <div className="content-visibility-auto contain-intrinsic-size-[320px] rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm supports-[backdrop-filter]:bg-white/60">
      <div className="h-4 w-20 rounded-full bg-slate-200/90" />
      <div className="mt-6 h-8 w-32 rounded-full bg-slate-200/90" />
    </div>
  )
});

export const metadata: Metadata = {
  title: "Astalla Live Dashboard",
  description: "Public performance overview powered by Astalla"
};

function resolveAppOrigin(): string | null {
  const headerList = headers();
  const forwardedProto = headerList.get("x-forwarded-proto");
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost ?? headerList.get("host");

  if (!host) {
    return null;
  }

  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

async function loadDashboard(host: string): Promise<PublicDashboardResponse | null> {
  if (!host) {
    return null;
  }

  const origin = resolveAppOrigin();
  const requestUrl = origin
    ? `${origin}/api/public/resolve?host=${encodeURIComponent(host)}`
    : `${apiBaseUrl}/public/resolve?host=${encodeURIComponent(host)}`;

  const response = await fetch(requestUrl, {
    next: { revalidate: 120 }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function PublicDashboard({ searchParams }: PublicDashboardProps) {
  const hostParam = searchParams["x-host"];
  const host = Array.isArray(hostParam) ? hostParam[0] ?? "" : hostParam ?? "";

  const data = await loadDashboard(host);

  if (!host) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground sm:px-6">
        Provide a host via the <code className="rounded bg-slate-100 px-2 py-1 text-foreground">x-host</code> query parameter to
        view a live dashboard.
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground sm:px-6">
        Dashboard unavailable. Please confirm the share link or try again later.
      </main>
    );
  }

  const widgets = Array.isArray(data.widgets) ? data.widgets : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-border/60 pb-8 text-center md:flex-row md:items-end md:justify-between md:text-left">
        <div className="space-y-3">
          <p className="text-[clamp(.75rem,1.3vw,.9rem)] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Live dashboard
          </p>
          <h1 className="text-[clamp(1.65rem,4vw,2.75rem)] font-semibold text-foreground">
            {data.title ?? "Property performance"}
          </h1>
          <p className="text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground">
            Read-only snapshot generated with Astalla. Optimised for phones, tablets, and widescreen displays.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-white px-5 py-2 text-[clamp(.9rem,1.5vw,1rem)] font-medium text-foreground shadow-sm transition hover:shadow-md sm:w-auto"
          aria-label="Share dashboard"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>
      </header>

      <section
        aria-label="Dashboard widgets"
        className="mt-10 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {widgets.length === 0 ? (
          <div className="col-span-1 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-white/75 p-10 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground shadow-sm sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <p className="max-w-md">
              Dashboard widgets will appear here once the owner publishes a layout. Ask your Astalla admin to share the latest
              report.
            </p>
          </div>
        ) : (
          widgets.map((widget) => (
            <PublicWidgetCard key={widget?.id ?? widget?.label ?? crypto.randomUUID()} widget={widget ?? {}} />
          ))
        )}
      </section>
    </main>
  );
}
