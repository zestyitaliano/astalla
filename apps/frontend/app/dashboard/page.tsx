import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { authOptions } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const isOrgAdmin = session.user?.role === "ORG_ADMIN";
  const role = isOrgAdmin ? "admin" : "viewer";
  const isAdmin = isOrgAdmin;

  return (
    <div className="space-y-6 pb-16">
      <DashboardView role={role} />
      {isAdmin ? (
        <div className="rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm supports-[backdrop-filter]:bg-card/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="font-heading text-[clamp(1.25rem,2.2vw,1.75rem)] uppercase tracking-[0.24em] text-brand-secondary">
                Accelerate your rollout
              </h2>
              <p className="text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground">
                Connect marketing sources and publish a live dashboard for your teams in minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/sources"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-[clamp(.9rem,1.5vw,1rem)] font-medium text-foreground shadow-sm transition hover:bg-card/80 hover:text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Connect a source
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/40 bg-brand-secondary px-4 py-2 text-[clamp(.9rem,1.5vw,1rem)] font-semibold text-brand-secondary-foreground shadow-sm transition hover:bg-brand-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Publish a live dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
