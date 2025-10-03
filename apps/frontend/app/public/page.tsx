"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

export default function PublicDashboard() {
  const searchParams = useSearchParams();
  const host = searchParams.get("x-host") || "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-dashboard", host],
    queryFn: async () => {
      if (!host) {
        throw new Error("missing host");
      }
      const response = await fetch(`/api/public/resolve?host=${encodeURIComponent(host)}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("not found");
      }
      return response.json();
    }
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading dashboard…</div>;
  }

  if (isError || !data) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Dashboard not found.</div>;
  }

  const widgets = Array.isArray(data.widgets) ? data.widgets : [];

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-foreground">{data.title}</h1>
        <p className="text-sm text-muted-foreground">Read-only experience powered by Astalla.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {widgets.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border/70 bg-white/80 p-10 text-center text-sm text-muted-foreground">
            Dashboard widgets will appear here once the owner publishes a layout.
          </div>
        ) : (
          widgets.map((widget: any) => (
            <div key={widget.id ?? widget.label} className="card-surface rounded-2xl border bg-white/90 p-5 shadow-card">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{widget.label ?? widget.id}</div>
              <div className="mt-2 text-3xl font-semibold text-foreground">{widget.value ?? "—"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
