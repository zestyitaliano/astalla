import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth-options";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const isAdmin = session.user?.role === "ORG_ADMIN";

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl border bg-card/90 p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare performance across properties, channels, and time ranges. Connect tables to unlock live dashboards for your
              teams.
            </p>
          </div>
        </div>
      </div>

      <AnalyticsClient />

      {isAdmin ? (
        <div className="card-surface rounded-2xl border bg-card/90 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text">Need data to explore?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your marketing sources and share a read-only analytics workspace with operations teams.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/sources"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/80 px-4 py-2 text-sm font-medium text-text shadow-sm transition hover:shadow-cardHover"
              >
                Connect a source
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
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
