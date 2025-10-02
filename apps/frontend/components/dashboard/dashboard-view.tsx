"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardState } from "@/lib/dashboard-state";
import { cn } from "@/lib/utils";

import { DashboardShell } from "./dashboard-shell";

const fieldClassName =
  "w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-1 focus:ring-offset-white placeholder:text-muted-foreground/70";

export function DashboardView() {
  const {
    state,
    updateUser,
    updateWelcome,
    addQuickStat,
    removeQuickStat,
    createTable,
    deleteTable,
    addTableRow,
    removeTableRow,
    clearAll
  } = useDashboardState();

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

  const [tableFormOpen, setTableFormOpen] = useState(false);
  const [tableDraft, setTableDraft] = useState({ name: "", description: "", columns: "" });
  const [tableError, setTableError] = useState<string | null>(null);

  const [rowDrafts, setRowDrafts] = useState<Record<string, string[]>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string | null>>({});

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

  useEffect(() => {
    setRowDrafts((previous) => {
      const next: Record<string, string[]> = {};
      state.tables.forEach((table) => {
        const existing = previous[table.id];
        if (existing && existing.length === table.columns.length) {
          next[table.id] = existing;
        } else {
          next[table.id] = table.columns.map(() => "");
        }
      });
      return next;
    });

    setRowErrors((previous) => {
      const next: Record<string, string | null> = {};
      state.tables.forEach((table) => {
        next[table.id] = previous[table.id] ?? null;
      });
      return next;
    });
  }, [state.tables]);

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
      setQuickStatError("Add both a label and value to save this metric.");
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

  const handleCreateTable = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = tableDraft.name.trim();
    const description = tableDraft.description.trim();
    const columns = tableDraft.columns
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);

    if (!name) {
      setTableError("Give the table a name before saving.");
      return;
    }

    if (columns.length === 0) {
      setTableError("Add at least one column, separated by commas.");
      return;
    }

    createTable({
      name,
      description,
      columns
    });

    setTableDraft({ name: "", description: "", columns: "" });
    setTableError(null);
    setTableFormOpen(false);
  };

  const handleRowDraftChange = (tableId: string, columnIndex: number, value: string) => {
    setRowDrafts((previous) => {
      const next = { ...previous };
      const current = next[tableId] ? [...next[tableId]] : [];
      current[columnIndex] = value;
      next[tableId] = current;
      return next;
    });
  };

  const handleAddRow = (event: FormEvent<HTMLFormElement>, tableId: string) => {
    event.preventDefault();
    const table = state.tables.find((entry) => entry.id === tableId);

    if (!table) {
      return;
    }

    const draft = rowDrafts[tableId] ?? [];
    const values = table.columns.map((_, index) => draft[index]?.trim() ?? "");

    if (values.every((value) => value === "")) {
      setRowErrors((previous) => ({ ...previous, [tableId]: "Fill in at least one cell to add a row." }));
      return;
    }

    addTableRow(tableId, values);
    setRowDrafts((previous) => ({ ...previous, [tableId]: table.columns.map(() => "") }));
    setRowErrors((previous) => ({ ...previous, [tableId]: null }));
  };

  const handleClearAll = () => {
    clearAll();
    setIsEditingWelcome(false);
    setQuickStatDraft({ label: "", value: "", helper: "" });
    setTableDraft({ name: "", description: "", columns: "" });
    setShowQuickStatForm(false);
    setTableFormOpen(false);
    setRowDrafts({});
    setRowErrors({});
  };

  return (
    <DashboardShell user={state.user}>
      <section className="grid gap-6 xl:grid-cols-[2fr,1.2fr]">
        <Card className="rounded-3xl border border-white/60 bg-gradient-to-br from-orange-50 via-white to-white shadow-sm">
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Overview</CardTitle>
              <p className="text-sm text-muted-foreground">Craft the copy that anchors your workspace.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-foreground"
              onClick={() => setIsEditingWelcome((value) => !value)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {isEditingWelcome ? "Close editor" : "Edit overview"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {overviewIsEmpty ? (
              <p className="text-sm text-muted-foreground">
                Set a headline, supporting message and optional note to introduce teammates to this dashboard.
              </p>
            ) : (
              <div className="space-y-3">
                {state.welcome.headline ? (
                  <h2 className="text-3xl font-semibold text-foreground lg:text-[2rem]">{state.welcome.headline}</h2>
                ) : null}
                {state.welcome.message ? (
                  <p className="text-sm leading-6 text-muted-foreground">{state.welcome.message}</p>
                ) : null}
                {state.welcome.note ? (
                  <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-xs text-muted-foreground">
                    {state.welcome.note}
                  </div>
                ) : null}
              </div>
            )}

            {isEditingWelcome ? (
              <form className="space-y-4 rounded-2xl border border-dashed border-amber-200/80 bg-white/70 p-4" onSubmit={handleWelcomeSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Headline</label>
                  <input
                    className={fieldClassName}
                    value={welcomeDraft.headline}
                    onChange={(event) => setWelcomeDraft((previous) => ({ ...previous, headline: event.target.value }))}
                    placeholder="Give your workspace a title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Message</label>
                  <textarea
                    className={cn(fieldClassName, "min-h-[120px] resize-none")}
                    value={welcomeDraft.message}
                    onChange={(event) => setWelcomeDraft((previous) => ({ ...previous, message: event.target.value }))}
                    placeholder="Share the context for this dashboard"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</label>
                  <textarea
                    className={cn(fieldClassName, "min-h-[80px] resize-none text-xs")}
                    value={welcomeDraft.note}
                    onChange={(event) => setWelcomeDraft((previous) => ({ ...previous, note: event.target.value }))}
                    placeholder="Optional: add a callout or reminder"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" size="sm" className="gap-2 text-xs text-foreground">
                    Save overview
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
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
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-white/60 bg-white/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Workspace identity</CardTitle>
            <p className="text-sm text-muted-foreground">This information powers the shell header for collaborators.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</label>
                <input
                  className={fieldClassName}
                  value={profileDraft.name}
                  onChange={(event) => setProfileDraft((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="Who is signed in?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
                <input
                  className={fieldClassName}
                  value={profileDraft.email}
                  onChange={(event) => setProfileDraft((previous) => ({ ...previous, email: event.target.value }))}
                  placeholder="user@company.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Org ID</label>
                <input
                  className={fieldClassName}
                  value={profileDraft.orgId}
                  onChange={(event) => setProfileDraft((previous) => ({ ...previous, orgId: event.target.value }))}
                  placeholder="internal"
                />
              </div>
              <Button type="submit" size="sm" className="gap-2 text-xs text-foreground">
                Update identity
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr,1fr]">
        <Card className="rounded-3xl border border-white/60 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Quick metrics</CardTitle>
              <p className="text-sm text-muted-foreground">Create mini callouts for the numbers you reference often.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-foreground"
              onClick={() => setShowQuickStatForm((value) => !value)}
            >
              <Plus className="h-3.5 w-3.5" />
              {showQuickStatForm ? "Close" : "Add metric"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {state.quickStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quick metrics yet. Add your first one to see it here.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {state.quickStats.map((stat) => (
                  <div
                    key={stat.id}
                    className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
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
              <form
                className="space-y-4 rounded-2xl border border-dashed border-amber-200/80 bg-white/70 p-4"
                onSubmit={handleAddQuickStat}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Label</label>
                    <input
                      className={fieldClassName}
                      value={quickStatDraft.label}
                      onChange={(event) => setQuickStatDraft((previous) => ({ ...previous, label: event.target.value }))}
                      placeholder="Metric label"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Value</label>
                    <input
                      className={fieldClassName}
                      value={quickStatDraft.value}
                      onChange={(event) => setQuickStatDraft((previous) => ({ ...previous, value: event.target.value }))}
                      placeholder="42, 93%, etc."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Helper text</label>
                  <input
                    className={fieldClassName}
                    value={quickStatDraft.helper}
                    onChange={(event) => setQuickStatDraft((previous) => ({ ...previous, helper: event.target.value }))}
                    placeholder="Optional context"
                  />
                </div>
                {quickStatError ? <p className="text-xs text-rose-500">{quickStatError}</p> : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" size="sm" className="gap-2 text-xs text-foreground">
                    Save metric
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
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
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-white/60 bg-white/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Reset dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clear all saved content and start from a blank canvas. This removes locally stored data only.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-xs text-foreground"
              onClick={handleClearAll}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Clear saved data
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl border border-white/60 bg-white/90 shadow-sm">
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Data tables</CardTitle>
              <p className="text-sm text-muted-foreground">
                Structure the datasets you want to connect. Use them as the foundation for future integrations.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-foreground"
              onClick={() => setTableFormOpen((value) => !value)}
            >
              <Plus className="h-3.5 w-3.5" />
              {tableFormOpen ? "Close" : "Add table"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {tableFormOpen ? (
              <form
                className="space-y-4 rounded-2xl border border-dashed border-amber-200/80 bg-white/70 p-4"
                onSubmit={handleCreateTable}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Table name</label>
                    <input
                      className={fieldClassName}
                      value={tableDraft.name}
                      onChange={(event) => setTableDraft((previous) => ({ ...previous, name: event.target.value }))}
                      placeholder="Performance summary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Columns</label>
                    <input
                      className={fieldClassName}
                      value={tableDraft.columns}
                      onChange={(event) => setTableDraft((previous) => ({ ...previous, columns: event.target.value }))}
                      placeholder="Name, Status, Owner"
                    />
                    <p className="text-[11px] text-muted-foreground">Separate each column with a comma.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</label>
                  <textarea
                    className={cn(fieldClassName, "min-h-[80px] resize-none text-sm")}
                    value={tableDraft.description}
                    onChange={(event) => setTableDraft((previous) => ({ ...previous, description: event.target.value }))}
                    placeholder="Optional: explain what this table tracks"
                  />
                </div>
                {tableError ? <p className="text-xs text-rose-500">{tableError}</p> : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" size="sm" className="gap-2 text-xs text-foreground">
                    Create table
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      setTableFormOpen(false);
                      setTableDraft({ name: "", description: "", columns: "" });
                      setTableError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}

            {state.tables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/60 bg-white/60 p-6 text-sm text-muted-foreground">
                No tables yet. Add one to start outlining the data you want to sync with the dashboard.
              </div>
            ) : (
              <div className="space-y-5">
                {state.tables.map((table) => {
                  const draft = rowDrafts[table.id] ?? table.columns.map(() => "");
                  const error = rowErrors[table.id];
                  const updatedAt = new Date(table.updatedAt || table.createdAt);
                  const updatedLabel = Number.isNaN(updatedAt.getTime())
                    ? null
                    : updatedAt.toLocaleString();

                  return (
                    <div
                      key={table.id}
                      className="space-y-4 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{table.name}</p>
                          {table.description ? (
                            <p className="text-xs text-muted-foreground">{table.description}</p>
                          ) : null}
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {table.columns.length} columns • {table.rows.length} rows
                            {updatedLabel ? ` • Updated ${updatedLabel}` : null}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-xs text-muted-foreground"
                          onClick={() => deleteTable(table.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove table
                        </Button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                          <thead>
                            <tr>
                              {table.columns.map((column) => (
                                <th
                                  key={column}
                                  className="border-b border-white/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                >
                                  {column}
                                </th>
                              ))}
                              <th className="border-b border-white/60 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.length === 0 ? (
                              <tr>
                                <td
                                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                                  colSpan={table.columns.length + 1}
                                >
                                  No rows yet. Use the form below to add one.
                                </td>
                              </tr>
                            ) : (
                              table.rows.map((row, rowIndex) => (
                                <tr key={`${table.id}-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-white/70"}>
                                  {table.columns.map((_, columnIndex) => (
                                    <td key={`${table.id}-${rowIndex}-${columnIndex}`} className="px-3 py-2 text-sm text-foreground">
                                      {row[columnIndex] ?? ""}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="gap-2 text-xs text-muted-foreground"
                                      onClick={() => removeTableRow(table.id, rowIndex)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <form
                        className="space-y-3 rounded-2xl border border-dashed border-amber-200/80 bg-white/70 p-4"
                        onSubmit={(event) => handleAddRow(event, table.id)}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Add row
                        </p>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {table.columns.map((column, columnIndex) => (
                            <div key={`${table.id}-draft-${column}`} className="space-y-2">
                              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {column}
                              </label>
                              <input
                                className={fieldClassName}
                                value={draft[columnIndex] ?? ""}
                                onChange={(event) => handleRowDraftChange(table.id, columnIndex, event.target.value)}
                                placeholder={`Enter ${column}`}
                              />
                            </div>
                          ))}
                        </div>
                        {error ? <p className="text-xs text-rose-500">{error}</p> : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="submit" size="sm" className="gap-2 text-xs text-foreground">
                            <Plus className="h-3.5 w-3.5" />
                            Add row
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => {
                              setRowDrafts((previous) => ({
                                ...previous,
                                [table.id]: table.columns.map(() => "")
                              }));
                              setRowErrors((previous) => ({ ...previous, [table.id]: null }));
                            }}
                          >
                            Clear values
                          </Button>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  );
}
