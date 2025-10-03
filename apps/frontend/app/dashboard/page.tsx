import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { authOptions } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role === "viewer" ? "viewer" : "admin";
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
        <DashboardView role={role} />
      </div>
      {isAdmin ? (
        <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Accelerate your rollout</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect marketing sources and publish a live dashboard for your teams in minutes.
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
