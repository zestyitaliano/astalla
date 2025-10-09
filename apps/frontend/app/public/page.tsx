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
  propertyId?: string | null;
  updatedAt?: string | null;
}

interface DashboardLoadResult {
  data: PublicDashboardResponse | null;
  status: number;
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

function normalizeHost(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.toLowerCase().trim().split("/")[0]?.split("?")[0]?.split("#")[0]?.split(":")[0] ?? "";
}

function extractHostname(origin: string | null): string {
  if (!origin) {
    return "";
  }

  try {
    return new URL(origin).hostname;
  } catch (error) {
    console.warn("Failed to parse origin for public dashboard", error);
    return "";
  }
}

export async function loadDashboard(host: string): Promise<DashboardLoadResult> {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost) {
    return { data: null, status: 400 };
  }

  const origin = resolveAppOrigin();
  const requestUrl = origin
    ? `${origin}/api/public/resolve?host=${encodeURIComponent(normalizedHost)}`
    : `${apiBaseUrl}/public/resolve?host=${encodeURIComponent(normalizedHost)}`;

  try {
    const response = await fetch(requestUrl, {
      next: { revalidate: 120 }
    });

    if (!response.ok) {
      return { data: null, status: response.status };
    }

    const payload = (await response.json()) as PublicDashboardResponse;
    return { data: payload, status: response.status };
  } catch (error) {
    console.error("Failed to resolve public dashboard", error);
    return { data: null, status: 502 };
  }
}

export default async function PublicDashboard({ searchParams }: PublicDashboardProps) {
  const hostParam = searchParams["x-host"];
  const hostFromQuery = Array.isArray(hostParam) ? hostParam[0] ?? "" : hostParam ?? "";
  const normalizedHost = normalizeHost(hostFromQuery) || extractHostname(resolveAppOrigin());
  const { data, status } = normalizedHost
    ? await loadDashboard(normalizedHost)
    : { data: null, status: 400 };

  if (!normalizedHost) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-4 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground sm:px-6">
        Provide a host via the <code className="rounded bg-slate-100 px-2 py-1 text-foreground">x-host</code> query parameter to
        view a live dashboard. Share links from the Astalla app automatically include this parameter.
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground sm:px-6">
        <p>
          {status === 404
            ? `We couldn’t find a published dashboard for ${normalizedHost}.`
            : status === 400
              ? "The share link is missing a valid host. Double-check the URL you received."
              : "Dashboard unavailable. Please confirm the share link or try again later."}
        </p>
        <a
          href={`mailto:ops@astalla.com?subject=Live%20dashboard%20access&body=Please%20help%20me%20access%20${encodeURIComponent(normalizedHost)}.`}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-border"
        >
          Contact your Astalla admin
        </a>
      </main>
    );
  }

  const widgets = Array.isArray(data.widgets) ? data.widgets : [];
  const lastUpdated = data.updatedAt ? new Date(data.updatedAt) : null;
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <header className="content-visibility-auto flex flex-col gap-6 border-b border-border/60 pb-8 text-center md:flex-row md:items-end md:justify-between md:text-left">
        <div className="space-y-3">
          <p className="text-[clamp(.75rem,1.3vw,.9rem)] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Live dashboard
          </p>
          <h1 className="text-[clamp(1.65rem,4vw,2.75rem)] font-semibold text-foreground">
            {data.title ?? "Property performance"}
          </h1>
          <div className="space-y-1">
            <p className="text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground">
              Read-only snapshot generated with Astalla. Optimised for phones, tablets, and widescreen displays.
            </p>
            {lastUpdatedLabel ? (
              <p className="text-[clamp(.75rem,1.3vw,.85rem)] text-muted-foreground">Last updated {lastUpdatedLabel}</p>
            ) : null}
          </div>
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
        className="content-visibility-auto grid auto-rows-fr grid-cols-1 gap-4 [--min-card:18rem] sm:[grid-template-columns:repeat(auto-fit,minmax(var(--min-card),1fr))]"
      >
        {widgets.length === 0 ? (
          <div className="col-span-1 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-white/75 p-10 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground shadow-sm sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <p className="max-w-md">
              Dashboard widgets will appear here once the owner publishes a layout. Ask your Astalla admin to share the latest report.
            </p>
          </div>
        ) : (
          widgets.map((widget) => (
            <PublicWidgetCard key={widget?.id ?? widget?.label ?? crypto.randomUUID()} widget={widget ?? {}} />
          ))
        )}
      </section>

      <footer className="content-visibility-auto mt-auto rounded-3xl border border-border/60 bg-white/70 p-6 text-center text-[clamp(.85rem,1.4vw,.95rem)] text-muted-foreground shadow-sm">
        Need a custom view for another audience? Ask your Astalla admin to publish a fresh live dashboard from the reports area of the app.
      </footer>
    </main>
  );
}
