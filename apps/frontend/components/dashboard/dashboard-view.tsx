"use client";

import { ArrowUpRight, CalendarCheck, Plus, Search, Sparkles } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { internalDashboardData } from "@/lib/internal-dashboard-data";
import { cn } from "@/lib/utils";

import { DashboardShell } from "./dashboard-shell";

const quickActionToneStyles = {
  sunrise: "from-orange-100/80 via-white to-white",
  peach: "from-rose-100/80 via-white to-white",
  lavender: "from-indigo-100/80 via-white to-white"
} as const;

const metricToneStyles = {
  coral: "from-rose-50 via-white to-white",
  amber: "from-amber-50 via-white to-white",
  teal: "from-emerald-50 via-white to-white",
  indigo: "from-indigo-50 via-white to-white"
} as const;

const timelineCategoryStyles = {
  meeting: "bg-sky-500/15 text-sky-600",
  update: "bg-amber-500/15 text-amber-600",
  insight: "bg-purple-500/15 text-purple-600"
} as const;

const statusStyles = {
  "In Review": "bg-blue-500/10 text-blue-600",
  Blocked: "bg-rose-500/10 text-rose-600",
  Live: "bg-emerald-500/10 text-emerald-600",
  Planning: "bg-amber-500/10 text-amber-600"
} as const;

const priorityStyles = {
  High: "bg-rose-500/10 text-rose-600",
  Medium: "bg-amber-500/10 text-amber-600",
  Low: "bg-slate-500/10 text-slate-600"
} as const;

const healthStyles = {
  "On Track": "bg-emerald-500/10 text-emerald-600",
  Watch: "bg-amber-500/10 text-amber-600",
  Risk: "bg-rose-500/10 text-rose-600"
} as const;

const severityStyles = {
  high: "bg-rose-500/15 text-rose-600",
  medium: "bg-amber-500/15 text-amber-600",
  low: "bg-sky-500/15 text-sky-600"
} as const;

const progressStyles = {
  "On Track": "bg-emerald-500",
  Watch: "bg-amber-500",
  Risk: "bg-rose-500"
} as const;

export function DashboardView() {
  const data = internalDashboardData;

  return (
    <DashboardShell user={data.user}>
      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-orange-50 via-white to-white p-8 shadow-sm">
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  {data.welcome.dateLabel}
                </p>
                <h2 className="text-3xl font-semibold text-foreground lg:text-[2.15rem]">
                  {data.welcome.headline}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">{data.welcome.message}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Internal MVP mode — external connectors are paused for now.</span>
                </div>
              </div>
              <div className="rounded-3xl border border-white/60 bg-white/80 px-6 py-5 text-sm shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">This week</p>
                <div className="mt-4 flex items-center gap-6">
                  <div>
                    <p className="text-3xl font-semibold text-foreground">{data.welcome.stats.activeReports}</p>
                    <p className="text-xs text-muted-foreground">Active reports</p>
                  </div>
                  <div className="h-12 w-px bg-border" aria-hidden />
                  <div>
                    <p className="text-3xl font-semibold text-foreground">{data.welcome.stats.tasksDue}</p>
                    <p className="text-xs text-muted-foreground">Tasks due</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-6 gap-2 text-xs text-foreground">
                  Review schedule <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.quickActions.map((action) => (
                <div
                  key={action.id}
                  className={cn(
                    "rounded-3xl border border-white/60 bg-gradient-to-br p-4 shadow-sm",
                    quickActionToneStyles[action.tone]
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>{action.label}</span>
                    <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Snapshot
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{action.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{action.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Card className="rounded-3xl border border-white/60 bg-white/80 shadow-sm backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Daily flow</span>
              <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground">
                <CalendarCheck className="h-3.5 w-3.5" />
                Sync calendar
              </Button>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Focus on the moments that keep the team in rhythm.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.timeline.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4">
                <div className="flex h-full flex-col items-center">
                  <span className="rounded-full border border-white/60 bg-white px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    {entry.time}
                  </span>
                </div>
                <div className="flex-1 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                    <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold capitalize", timelineCategoryStyles[entry.category])}>
                      {entry.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.meta}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            helperText={metric.helperText}
            change={metric.change}
            trend={metric.trend}
            className={cn(
              "rounded-3xl border border-white/60 bg-gradient-to-br shadow-sm backdrop-blur",
              metricToneStyles[metric.tone]
            )}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr,1fr]">
        <Card className="rounded-3xl border border-white/60 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-wrap items-center justify-between space-y-0 gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Team playbook</CardTitle>
              <p className="text-sm text-muted-foreground">Internal automations and deliverables in motion</p>
            </div>
            <Button variant="secondary" size="sm" className="gap-2 rounded-full border border-white/60 bg-white text-xs text-foreground shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              New task
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Owner • {task.owner}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", statusStyles[task.status])}>{task.status}</span>
                  <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", priorityStyles[task.priority])}>
                    {task.priority} priority
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    {task.due}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-white/60 bg-gradient-to-br from-indigo-50 via-white to-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Highlights</span>
              <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                Discover
              </Button>
            </CardTitle>
            <p className="text-sm text-muted-foreground">What to surface in the next internal readout.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.insights.map((insight) => (
              <div key={insight.id} className="space-y-2 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{insight.detail}</p>
                <button className="inline-flex items-center gap-1 text-xs font-semibold text-foreground transition-colors hover:text-primary">
                  {insight.action}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2.1fr,1fr]">
        <Card className="rounded-3xl border border-white/60 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-wrap items-center justify-between space-y-0 gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Workspace report</CardTitle>
              <p className="text-sm text-muted-foreground">Last synced {data.sheet.lastSynced}</p>
            </div>
            <Button variant="secondary" size="sm" className="rounded-full border border-white/60 bg-white text-xs text-foreground shadow-sm">
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="hidden grid-cols-[1.6fr,1fr,1fr,1fr,1fr,1fr] gap-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Workspace</span>
              <span>Owner</span>
              <span>Status</span>
              <span>Health</span>
              <span>Progress</span>
              <span>Updated</span>
            </div>
            <div className="space-y-3">
              {data.sheet.rows.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-4 rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-sm sm:grid-cols-[1.6fr,1fr,1fr,1fr,1fr,1fr]"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{row.workspace}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:hidden">{row.owner}</p>
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">{row.owner}</div>
                  <div>
                    <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", statusStyles[row.status])}>{row.status}</span>
                  </div>
                  <div>
                    <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", healthStyles[row.health])}>{row.health}</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{row.progress}%</div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div
                        className={cn("h-2 rounded-full", progressStyles[row.health])}
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{row.lastUpdated}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col rounded-3xl border border-white/60 bg-white/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold text-foreground">Watchlist & alerts</CardTitle>
            <p className="text-sm text-muted-foreground">Internal follow-ups to keep momentum high.</p>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{alert.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.detail}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold capitalize", severityStyles[alert.severity])}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  );
}
