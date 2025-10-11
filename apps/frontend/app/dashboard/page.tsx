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
        <div className="rounded-3xl border border-border/60 bg-white/85 p-6 shadow-sm supports-[backdrop-filter]:bg-white/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-[clamp(1.125rem,2vw,1.375rem)] font-semibold text-foreground">Accelerate your rollout</h2>
              <p className="text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground">
                Connect marketing sources and publish a live dashboard for your teams in minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/sources"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-4 py-2 text-[clamp(.9rem,1.5vw,1rem)] font-medium text-foreground shadow-sm transition hover:shadow-md"
              >
                Connect a source
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-full border border-brand-primary/40 bg-brand-primary/10 px-4 py-2 text-[clamp(.9rem,1.5vw,1rem)] font-semibold text-brand-primary transition hover:bg-brand-primary/20"
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
