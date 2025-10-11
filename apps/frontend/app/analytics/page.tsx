import Link from "next/link";
import { ArrowRight, BarChart3, LineChart, PieChart, SlidersHorizontal } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth-options";

const chartPlaceholders = [
  { id: "occupancy", title: "Occupancy trend", description: "Trailing 90 days" },
  { id: "leasing", title: "Leasing velocity", description: "Leads → leases" },
  { id: "spend", title: "Marketing spend mix", description: "Channel contribution" },
  { id: "reviews", title: "Sentiment pulse", description: "Review volume" },
  { id: "conversion", title: "Funnel conversion", description: "Tours to leases" },
  { id: "applications", title: "Applications by source", description: "Last 30 days" }
];

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const isAdmin = session.user?.role === "ORG_ADMIN";

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare performance across properties, channels, and time ranges. Dashboards are wired and ready for your data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-white/80 px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:shadow-cardHover">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-white/60 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
              <BarChart3 className="h-4 w-4" />
              Property
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-white/60 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
              <LineChart className="h-4 w-4" />
              Channel
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-white/60 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
              <PieChart className="h-4 w-4" />
              Segment
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {chartPlaceholders.map((chart) => (
          <div
            key={chart.id}
            className="card-surface flex flex-col rounded-2xl border bg-white/90 p-5 shadow-card transition hover:shadow-cardHover"
          >
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">{chart.title}</h2>
              <p className="text-sm text-muted-foreground">{chart.description}</p>
            </div>
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/70 bg-slate-50/70 p-6 text-sm text-muted-foreground">
              Chart will render here once your sources are connected.
            </div>
          </div>
        ))}
      </div>

      {isAdmin ? (
        <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Need data to explore?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your marketing sources and share a read-only analytics workspace with operations teams.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/sources"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white/80 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:shadow-cardHover"
              >
                Connect a source
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/20"
              >
                Publish a live dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
