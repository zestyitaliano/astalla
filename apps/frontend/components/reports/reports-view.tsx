"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ExternalLink,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import {
  createPublicDashboard,
  deletePublicDashboard,
  listPublicDashboards,
  updatePublicDashboard
} from "@/lib/api/public-dashboards";
import type { PublicDashboard } from "@shared/api";

const LAYOUT_TEMPLATES = [
  {
    id: "executive",
    name: "Executive summary",
    description: "Top-line KPIs for leadership standups",
    config: {
      widgets: [
        { id: "occupancy", label: "Occupancy rate", value: "95%" },
        { id: "leasing", label: "Leases signed", value: "42" },
        { id: "pipeline", label: "Active pipeline", value: "$186k" }
      ],
      filters: []
    }
  },
  {
    id: "leasing",
    name: "Leasing velocity",
    description: "Track conversions from lead to lease",
    config: {
      widgets: [
        { id: "leads", label: "New leads", value: "128" },
        { id: "tours", label: "Tours scheduled", value: "64" },
        { id: "applications", label: "Applications approved", value: "27" }
      ],
      filters: ["Last 30 days"]
    }
  },
  {
    id: "marketing",
    name: "Marketing efficiency",
    description: "Blend spend and performance data for campaigns",
    config: {
      widgets: [
        { id: "spend", label: "Marketing spend", value: "$24.5k" },
        { id: "cpl", label: "Cost per lead", value: "$182" },
        { id: "roi", label: "Projected ROI", value: "3.4x" }
      ],
      filters: ["Multi-channel"]
    }
  }
] as const;

const MAIN_HOST = (process.env.NEXT_PUBLIC_MAIN_HOST ?? "astalla.com").replace(/^https?:\/\//, "");

interface DashboardFormState {
  title: string;
  subdomain: string;
  propertyId: string;
  layoutId: string;
  config: unknown;
}

interface ModalState {
  open: boolean;
  mode: "create" | "edit";
  dashboard?: PublicDashboard;
}

const DEFAULT_FORM: DashboardFormState = {
  title: "",
  subdomain: "",
  propertyId: "",
  layoutId: LAYOUT_TEMPLATES[0].id,
  config: LAYOUT_TEMPLATES[0].config
};

export function ReportsView() {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<ModalState>({ open: false, mode: "create" });
  const [formState, setFormState] = useState<DashboardFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDashboardId, setPendingDashboardId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const propertiesQuery = useQuery({ queryKey: ["properties"], queryFn: api.properties });
  const dashboardsQuery = useQuery({ queryKey: ["public-dashboards"], queryFn: listPublicDashboards });

  const dashboards = dashboardsQuery.data?.dashboards ?? [];
  const orgId = meQuery.data?.orgId ?? modalState.dashboard?.orgId ?? "";

  const createMutation = useMutation({
    mutationFn: createPublicDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-dashboards"] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      updatePublicDashboard(id, payload),
    onMutate: ({ id }) => {
      setPendingDashboardId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-dashboards"] });
      closeModal();
    },
    onSettled: () => {
      setPendingDashboardId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePublicDashboard(id),
    onMutate: (id) => {
      setPendingDeleteId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-dashboards"] });
    },
    onSettled: () => {
      setPendingDeleteId(null);
    }
  });

  const propertyOptions = propertiesQuery.data?.properties ?? [];

  const layoutOptions = useMemo(() => LAYOUT_TEMPLATES, []);

  const openCreateModal = () => {
    const defaultPropertyId = propertyOptions[0]?.id ?? "";
    setFormState({ ...DEFAULT_FORM, propertyId: defaultPropertyId });
    setModalState({ open: true, mode: "create" });
    setFormError(null);
  };

  const openEditModal = (dashboard: PublicDashboard) => {
    setFormState({
      title: dashboard.title,
      subdomain: dashboard.subdomain,
      propertyId: dashboard.propertyId ?? "",
      layoutId: "custom",
      config: dashboard.config ?? { widgets: [] }
    });
    setModalState({ open: true, mode: "edit", dashboard });
    setFormError(null);
  };

  const closeModal = () => {
    setModalState({ open: false, mode: "create" });
    setFormState(DEFAULT_FORM);
    setFormError(null);
  };

  const updateField = <K extends keyof DashboardFormState>(field: K, value: DashboardFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleLayoutChange = (layoutId: string) => {
    if (layoutId === "custom") {
      updateField("layoutId", layoutId);
      return;
    }

    const layout = layoutOptions.find((option) => option.id === layoutId);
    if (layout) {
      setFormState((prev) => ({ ...prev, layoutId, config: layout.config }));
    }
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!orgId) {
      setFormError("We need your organization id before publishing. Refresh and try again.");
      return;
    }

    const payload = {
      title: formState.title.trim(),
      subdomain: formState.subdomain.trim(),
      orgId,
      propertyId: formState.propertyId || undefined,
      config: formState.config
    };

    try {
      if (modalState.mode === "create") {
        await createMutation.mutateAsync(payload);
      } else if (modalState.dashboard) {
        await updateMutation.mutateAsync({ id: modalState.dashboard.id, payload });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save dashboard";
      setFormError(message);
    }
  };

  const slugPreview = formState.subdomain ? `${formState.subdomain}.${MAIN_HOST}` : `your-team.${MAIN_HOST}`;

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Reports & templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Launch ready-made scorecards and automate delivery to property and regional teams.
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-brand-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create live dashboard
          </Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {layoutOptions.map((layout) => (
            <div key={layout.id} className="card-surface flex flex-col gap-3 rounded-2xl border bg-white/90 p-5 shadow-card">
              <div className="flex items-center gap-3">
                <Globe2 className="h-5 w-5 text-brand-primary" />
                <div>
                  <h2 className="text-base font-semibold text-foreground">{layout.name}</h2>
                  <p className="text-sm text-muted-foreground">{layout.description}</p>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-border/70 bg-slate-50/70 p-4 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">Widget preview</div>
                <ul className="mt-2 space-y-1">
                  {layout.config.widgets.map((widget: any) => (
                    <li key={widget.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{widget.label}</span>
                      <span className="font-medium text-foreground">{widget.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Live dashboards</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish secure read-only dashboards on branded subdomains. Share links with leadership or property teams.
            </p>
          </div>
          <Button variant="outline" className="inline-flex items-center gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            New live dashboard
          </Button>
        </div>

        {dashboardsQuery.isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : dashboardsQuery.isError ? (
          <div className="mt-6 rounded-xl border border-dashed border-danger/40 bg-danger/5 p-8 text-center text-sm text-danger">
            We couldn’t load your live dashboards. Refresh the page or try again shortly.
          </div>
        ) : dashboards.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-slate-50/70 p-8 text-center text-sm text-muted-foreground">
            No live dashboards yet. Use the templates above to publish your first experience.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {dashboards.map((dashboard) => {
              const url = `https://${dashboard.subdomain}.${MAIN_HOST}`;
              const isUpdating = pendingDashboardId === dashboard.id;
              const isDeleting = pendingDeleteId === dashboard.id;

              return (
                <div
                  key={dashboard.id}
                  className="card-surface flex flex-col gap-4 rounded-2xl border bg-white/90 p-5 shadow-card transition hover:shadow-cardHover md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-border bg-slate-50/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                        {dashboard.isActive ? "Active" : "Paused"}
                      </span>
                      <h3 className="text-base font-semibold text-foreground">{dashboard.title}</h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-primary hover:underline"
                      >
                        {url}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <span>Subdomain: {dashboard.subdomain}</span>
                      {dashboard.propertyId ? <span>Property scope: {dashboard.propertyId}</span> : <span>Org-wide</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      className="inline-flex items-center gap-2"
                      onClick={() =>
                        updateMutation.mutate({ id: dashboard.id, payload: { isActive: !dashboard.isActive } })
                      }
                      disabled={isUpdating || isDeleting}
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                      {dashboard.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      className="inline-flex items-center gap-2"
                      onClick={() => openEditModal(dashboard)}
                      disabled={isDeleting}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="inline-flex items-center gap-2 text-danger"
                      onClick={() => deleteMutation.mutate(dashboard.id)}
                      disabled={isDeleting || isUpdating}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalState.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {modalState.mode === "create" ? "Create live dashboard" : "Edit live dashboard"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a layout, assign a subdomain, and we will render a secure read-only dashboard for your clients.
                </p>
              </div>
              <button className="text-muted-foreground transition hover:text-foreground" onClick={closeModal}>
                ×
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={submitForm}>
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Title
                <Input
                  value={formState.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="Midwest portfolio dashboard"
                  required
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                  Subdomain
                  <Input
                    value={formState.subdomain}
                    onChange={(event) =>
                      updateField("subdomain", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                    }
                    placeholder="acme"
                    pattern="[a-z0-9-]+"
                    required
                  />
                  <span className="text-xs font-normal text-muted-foreground">https://{slugPreview}</span>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                  Property scope (optional)
                  <select
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
                    value={formState.propertyId}
                    onChange={(event) => updateField("propertyId", event.target.value)}
                  >
                    <option value="">All properties</option>
                    {propertyOptions.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Pick from existing dashboard layout
                <select
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground"
                  value={formState.layoutId}
                  onChange={(event) => {
                    const layoutId = event.target.value;
                    updateField("layoutId", layoutId);
                    handleLayoutChange(layoutId);
                  }}
                >
                  {layoutOptions.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                  {modalState.mode === "edit" ? <option value="custom">Keep current layout</option> : null}
                </select>
              </label>
              <div className="rounded-xl border border-dashed border-border/70 bg-slate-50/70 p-4 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">Layout preview</div>
                <ul className="mt-2 space-y-1">
                  {(Array.isArray((formState.config as any)?.widgets)
                    ? ((formState.config as any).widgets as any[])
                    : []).map((widget) => (
                    <li key={widget.id ?? widget.label} className="flex items-center justify-between">
                      <span>{widget.label ?? widget.id}</span>
                      <span className="font-medium text-foreground">{widget.value ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <div className="flex flex-col">
                  <span>Org scope</span>
                  <span className="font-medium text-foreground">{orgId || "Loading…"}</span>
                </div>
                <a
                  href={`https://${slugPreview}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand-primary"
                >
                  Preview URL
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
              {formError ? <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</div> : null}
              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {modalState.mode === "create" ? "Create dashboard" : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
