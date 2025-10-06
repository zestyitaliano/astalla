import { Share2 } from "lucide-react";
import type { Metadata } from "next";

interface PublicDashboardProps {
  searchParams: Record<string, string | string[] | undefined>;
}

interface PublicDashboardResponse {
  title?: string;
  widgets?: Array<{ id?: string; label?: string; value?: string }>;
}

export const metadata: Metadata = {
  title: "Astalla Live Dashboard",
  description: "Public performance overview powered by Astalla"
};

async function loadDashboard(host: string): Promise<PublicDashboardResponse | null> {
  if (!host) {
    return null;
  }

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? process.env.BACKEND_URL;

  if (!apiBaseUrl) {
    return null;
  }

  const response = await fetch(`${apiBaseUrl}/public/resolve?host=${encodeURIComponent(host)}`, {
    headers: { "x-internal": "1" },
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
      <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col items-center justify-center px-4 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground sm:px-6 lg:px-8">
        Provide a host via the <code className="rounded bg-slate-100 px-2 py-1 text-foreground">x-host</code> query parameter to view a live dashboard.
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col items-center justify-center px-4 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground sm:px-6 lg:px-8">
        Dashboard unavailable. Please confirm the share link or try again later.
      </main>
    );
  }

  const widgets = Array.isArray(data.widgets) ? data.widgets : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1200px] px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <div className="space-y-2">
          <p className="text-[clamp(.8rem,1.4vw,.95rem)] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Live dashboard
          </p>
          <h1 className="text-[clamp(1.5rem,3vw,2.25rem)] font-semibold text-foreground">{data.title ?? "Property performance"}</h1>
          <p className="text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground">
            Read-only snapshot generated with Astalla.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-border/60 bg-white px-4 py-2 text-[clamp(.9rem,1.5vw,1rem)] font-medium text-foreground shadow-sm transition hover:shadow-md"
          aria-label="Share dashboard"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>
      </header>

      <section
        aria-label="Dashboard widgets"
        className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-6 md:gap-4"
      >
        {widgets.length === 0 ? (
          <div className="md:col-span-6 rounded-3xl border border-dashed border-border/70 bg-white/70 p-10 text-center text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground shadow-sm">
            Dashboard widgets will appear here once the owner publishes a layout.
          </div>
        ) : (
          widgets.map((widget) => (
            <article
              key={widget.id ?? widget.label ?? crypto.randomUUID()}
              className="flex min-h-[120px] flex-col justify-between rounded-3xl border border-border/60 bg-white/85 p-5 text-left shadow-sm supports-[backdrop-filter]:bg-white/70"
            >
              <p className="text-[clamp(.9rem,1.5vw,1rem)] font-medium text-muted-foreground">
                {widget.label ?? widget.id ?? "Widget"}
              </p>
              <p className="text-[clamp(1.5rem,3vw,2.25rem)] font-semibold text-foreground">
                {widget.value ?? "—"}
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
