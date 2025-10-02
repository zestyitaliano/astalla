"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDashboardState } from "@/lib/dashboard-state";

import DashboardShell from "./dashboard-shell";
import { DashboardCard } from "./dashboard-card";
import { OperationsTable } from "./operations-table";

const inputClassName =
  "w-full rounded-xl border border-border/70 bg-card px-4 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const textareaClassName = cn(inputClassName, "min-h-[120px] resize-none align-top");

const dashedPlaceholderClass =
  "rounded-2xl border border-dashed border-border/70 bg-card/60 p-6 text-sm text-muted-foreground";

export function DashboardView() {
  const { state, updateUser, updateWelcome, addQuickStat, removeQuickStat, clearAll } = useDashboardState();

  const [isEditingWelcome, setIsEditingWelcome] = useState(false);
  const [welcomeDraft, setWelcomeDraft] = useState(state.welcome);

  const [profileDraft, setProfileDraft] = useState({
    name: state.user.name ?? "",
    email: state.user.email ?? "",
    orgId: state.user.orgId ?? ""
  });

  const [showQuickStatForm, setShowQuickStatForm] = useState(false);
  const [quickStatDraft, setQuickStatDraft] = useState({ label: "", value: "", helper: "" });
  const [quickStatError, setQuickStatError] = useState<string | null>(null);

  useEffect(() => {
    setWelcomeDraft(state.welcome);
  }, [state.welcome]);

  useEffect(() => {
    setProfileDraft({
      name: state.user.name ?? "",
      email: state.user.email ?? "",
      orgId: state.user.orgId ?? ""
    });
  }, [state.user.email, state.user.name, state.user.orgId]);

  const overviewIsEmpty = useMemo(
    () => !state.welcome.headline && !state.welcome.message && !state.welcome.note,
    [state.welcome.headline, state.welcome.message, state.welcome.note]
  );

  const handleWelcomeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateWelcome({
      headline: welcomeDraft.headline.trim(),
      message: welcomeDraft.message.trim(),
      note: welcomeDraft.note.trim()
    });
    setIsEditingWelcome(false);
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateUser({
      name: profileDraft.name.trim(),
      email: profileDraft.email.trim(),
      orgId: profileDraft.orgId.trim() || "internal"
    });
  };

  const handleAddQuickStat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const label = quickStatDraft.label.trim();
    const value = quickStatDraft.value.trim();

    if (!label || !value) {
      setQuickStatError("Provide both a label and a value to save this metric.");
      return;
    }

    addQuickStat({
      label,
      value,
      helper: quickStatDraft.helper.trim()
    });

    setQuickStatDraft({ label: "", value: "", helper: "" });
    setQuickStatError(null);
    setShowQuickStatForm(false);
  };

  const handleClearAll = () => {
    clearAll();
    setIsEditingWelcome(false);
    setQuickStatDraft({ label: "", value: "", helper: "" });
    setWelcomeDraft({ headline: "", message: "", note: "" });
    setQuickStatError(null);
  };

  return (
    <DashboardShell user={state.user}>
      <section className="grid gap-6 xl:grid-cols-[2fr,1.1fr]">
        <DashboardCard
          title="Overview"
          description="Craft the copy that anchors your workspace."
          action={
            <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setIsEditingWelcome((value) => !value)}>
              <Pencil className="h-3.5 w-3.5" />
              {isEditingWelcome ? "Close editor" : "Edit overview"}
            </Button>
          }
        >
          {overviewIsEmpty ? (
            <div className={cn(dashedPlaceholderClass, "text-center")}>Use this space to greet collaborators and share context.</div>
          ) : (
            <div className="space-y-3">
              {state.welcome.headline ? (
                <h2 className="text-3xl font-semibold tracking-tight text-foreground lg:text-[2rem]">
                  {state.welcome.headline}
                </h2>
              ) : null}
              {state.welcome.message ? (
                <p className="text-base leading-7 text-muted-foreground">{state.welcome.message}</p>
              ) : null}
              {state.welcome.note ? (
                <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
                  {state.welcome.note}
                </div>
              ) : null}
            </div>
          )}

          {isEditingWelcome ? (
            <form className="space-y-4" onSubmit={handleWelcomeSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Headline</label>
                <Input
                  value={welcomeDraft.headline}
                  onChange={(event) => setWelcomeDraft((previous) => ({ ...previous, headline: event.target.value }))}
                  placeholder="Give your workspace a title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</label>
                <textarea
                  className={textareaClassName}
                  value={welcomeDraft.message}
                  onChange={(event) => setWelcomeDraft((previous) => ({ ...previous, message: event.target.value }))}
                  placeholder="Share the context for this dashboard"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note</label>
                <textarea
                  className={cn(textareaClassName, "min-h-[80px] text-sm")}
                  value={welcomeDraft.note}
                  onChange={(event) => setWelcomeDraft((previous) => ({ ...previous, note: event.target.value }))}
                  placeholder="Optional: add a callout or reminder"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" size="sm" className="gap-2">
                  Save overview
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setIsEditingWelcome(false);
                    setWelcomeDraft(state.welcome);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </DashboardCard>

        <DashboardCard
          title="Workspace identity"
          description="This information powers the shell header for collaborators."
          dense
        >
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
              <Input
                value={profileDraft.name}
                onChange={(event) => setProfileDraft((previous) => ({ ...previous, name: event.target.value }))}
                placeholder="Who is signed in?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label>
              <Input
                type="email"
                value={profileDraft.email}
                onChange={(event) => setProfileDraft((previous) => ({ ...previous, email: event.target.value }))}
                placeholder="user@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Org ID</label>
              <Input
                value={profileDraft.orgId}
                onChange={(event) => setProfileDraft((previous) => ({ ...previous, orgId: event.target.value }))}
                placeholder="internal"
              />
            </div>
            <Button type="submit" size="sm" className="gap-2">
              Update identity
            </Button>
          </form>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr,1fr]">
        <DashboardCard
          title="Quick metrics"
          description="Create callouts for the numbers you reference often."
          action={
            <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setShowQuickStatForm((value) => !value)}>
              <Plus className="h-3.5 w-3.5" />
              {showQuickStatForm ? "Close" : "Add metric"}
            </Button>
          }
        >
          {state.quickStats.length === 0 ? (
            <div className={dashedPlaceholderClass}>No quick metrics yet. Add your first one to see it here.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {state.quickStats.map((stat) => (
                <div
                  key={stat.id}
                  className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm transition hover:border-border"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                      {stat.helper ? (
                        <p className="text-xs text-muted-foreground">{stat.helper}</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => removeQuickStat(stat.id)}
                      aria-label={`Remove ${stat.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showQuickStatForm ? (
            <form className="space-y-4" onSubmit={handleAddQuickStat}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label</label>
                  <Input
                    value={quickStatDraft.label}
                    onChange={(event) => setQuickStatDraft((previous) => ({ ...previous, label: event.target.value }))}
                    placeholder="Metric label"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Value</label>
                  <Input
                    value={quickStatDraft.value}
                    onChange={(event) => setQuickStatDraft((previous) => ({ ...previous, value: event.target.value }))}
                    placeholder="42, 93%, etc."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Helper text</label>
                <Input
                  value={quickStatDraft.helper}
                  onChange={(event) => setQuickStatDraft((previous) => ({ ...previous, helper: event.target.value }))}
                  placeholder="Optional context"
                />
              </div>
              {quickStatError ? <p className="text-xs text-destructive">{quickStatError}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" size="sm" className="gap-2">
                  Save metric
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setShowQuickStatForm(false);
                    setQuickStatDraft({ label: "", value: "", helper: "" });
                    setQuickStatError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </DashboardCard>

        <DashboardCard
          title="Reset dashboard"
          description="Clear all saved content and start from a blank canvas. This removes locally stored data only."
          dense
        >
          <Button type="button" variant="ghost" className="gap-2" onClick={handleClearAll}>
            <RefreshCw className="h-3.5 w-3.5" />
            Clear saved data
          </Button>
        </DashboardCard>
      </section>

      <OperationsTable />
    </DashboardShell>
  );
}
