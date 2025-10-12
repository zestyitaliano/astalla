import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Brush, Globe2, Layers, MonitorCheck, PenTool, ShieldCheck, Sparkles } from "lucide-react";

import { authOptions } from "@/lib/auth-options";

const featureCards = [
  {
    title: "Brand-safe templates",
    description:
      "Launch regional and property microsites with reusable blocks. Theme tokens and typography stay locked to brand standards",
    icon: PenTool
  },
  {
    title: "Instant publishing",
    description:
      "Push updates through our edge CDN with automatic cache busting. No deploy scripts or manual approvals required.",
    icon: Sparkles
  },
  {
    title: "Compliance guardrails",
    description:
      "Worried about fair housing or ADA content requirements? Built-in checklists keep every update compliant before go-live.",
    icon: ShieldCheck
  }
] as const;

const workflowSteps = [
  {
    name: "Design system powered",
    description:
      "Components map 1:1 to your marketing design tokens so property teams can launch new campaigns without designers on-call.",
    icon: Brush
  },
  {
    name: "Composable content",
    description:
      "Blend hero modules, pricing tables, reviews, and CTAs with drag-and-drop sections. Everything is versioned for quick rollback.",
    icon: Layers
  },
  {
    name: "Instant QA",
    description:
      "Automated lighthouse checks, link validation, and device previews catch issues before they hit production.",
    icon: MonitorCheck
  }
] as const;

export default async function AdminWebsitesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user?.role !== "ORG_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-3xl border bg-white/90 p-6 shadow-card">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-sm font-medium text-brand-primary">
              <Globe2 className="h-4 w-4" />
              Websites
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Marketing sites connected to your data</h1>
            <p className="text-sm text-muted-foreground">
              Publish high-performing property and regional sites with live pricing, availability, and reviews. Astalla ensures
              every update ships fast and on brand without relying on mock data or fragile manual workflows.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Ready for production</p>
            <p className="mt-1">
              Connect your property sources and we will handle deployment, analytics, and compliance with zero engineering lift.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {featureCards.map(({ title, description, icon: Icon }) => (
          <div key={title} className="rounded-3xl border border-border bg-white/90 p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-primary/40 bg-brand-primary/10 text-brand-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr,1fr]">
        <div className="rounded-3xl border border-border bg-white/90 p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">Go live without engineering backlogs</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Launching a new campaign site is as easy as filling out a brief. The workspace tracks status, reviewers, and rollbacks
            for every iteration.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>• Draft new pages using reusable modules and brand-safe typography.</li>
            <li>• Pull live pricing, availability, and reviews directly from your connected sources.</li>
            <li>• Schedule launches, approvals, and automated QA in a single timeline.</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-white/90 p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">How the workflow stays on track</h2>
          <div className="mt-4 space-y-4">
            {workflowSteps.map(({ name, description, icon: Icon }) => (
              <div key={name} className="flex gap-3">
                <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
