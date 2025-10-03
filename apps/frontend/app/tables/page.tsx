import Link from "next/link";
import { ArrowRight, ClipboardList, Database, Layers3, PlusCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth-options";

const tableIdeas = [
  {
    id: "pipeline",
    title: "Leasing pipeline",
    description: "Track prospects from lead to lease with filters for source, agent, and property.",
    icon: Layers3
  },
  {
    id: "operations",
    title: "Operations tasks",
    description: "Monitor unit turns, maintenance tickets, and SLAs in a shared workspace.",
    icon: ClipboardList
  },
  {
    id: "integrations",
    title: "Data integrations",
    description: "Blend CRM, PMS, and marketing data to create custom tables for leadership reviews.",
    icon: Database
  }
];

export default async function TablesIndexPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user?.role !== "viewer";

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Tables</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build collaborative tables to track leasing, operations, and marketing workflows. Your layouts will sync across the
              team.
            </p>
          </div>
          <button
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary opacity-70"
            type="button"
            disabled
          >
            <PlusCircle className="h-4 w-4" />
            Create table (coming soon)
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tableIdeas.map(({ id, title, description, icon: Icon }) => (
            <div key={id} className="card-surface flex flex-col gap-3 rounded-2xl border bg-white/90 p-5 shadow-card">
              <Icon className="h-5 w-5 text-brand-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isAdmin ? (
        <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Prep your tables with real data</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect sources and publish a read-only dashboard so teams can explore live KPIs alongside their tables.
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
