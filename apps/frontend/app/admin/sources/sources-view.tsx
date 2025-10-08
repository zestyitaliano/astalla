
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, Loader2, Pencil, Play, Plus, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";
import { createSource, deleteSource, listSources, runSource, updateSource } from "@/lib/api/sources";
import { cn } from "@/lib/utils";
import type {
  CreateSourceRequest,
  PropertiesResponse,
  SourceAccount,
  SourceMutationResponse,
  SourceType,
  UpdateSourceRequest
} from "@shared/api";

interface BannerState {
  tone: "success" | "error" | "info";
  message: string;
}

interface ModalState {
  mode: "create" | "edit";
  source?: SourceAccount;
}

interface SourceFormValues {
  propertyId: string;
  type: SourceType;
  name: string;
  enabled: boolean;
  credential: Record<string, string>;
}

const TYPE_LABELS: Record<SourceType, string> = {
  ENTRATA: "Entrata",
  GA4: "Google Analytics 4",
  ADS: "Google Ads",
  GBP: "Google Business Profile"
};

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
  UNVERIFIED: "bg-amber-100 text-amber-800 border-amber-200"
};

function buildInitialValues(type: SourceType): SourceFormValues {
  return {
    propertyId: "",
    type,
    name: "",
    enabled: true,
    credential: {}
  };
}

function cleanCredential(credential: Record<string, string>) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(credential)) {
    if (typeof value === "string" && value.trim().length > 0) {
      result[key] = value.trim();
    }
  }
  return result;
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return value;
  }
}

function SourceStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        Unverified
      </span>
    );
  }
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.UNVERIFIED;
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", style)}>{label}</span>
  );
}

interface SourceFormProps {
  mode: "create" | "edit";
  values: SourceFormValues;
  onChange: (next: SourceFormValues) => void;
  onSubmit: (values: SourceFormValues) => void;
  onClose: () => void;
  isSubmitting: boolean;
  properties?: PropertiesResponse["properties"];
}

function SourceForm({ mode, values, onChange, onSubmit, onClose, isSubmitting, properties }: SourceFormProps) {
  const updateField = <K extends keyof SourceFormValues>(field: K, value: SourceFormValues[K]) => {
    onChange({ ...values, [field]: value });
  };

  const updateCredential = (key: string, value: string) => {
    onChange({ ...values, credential: { ...values.credential, [key]: value } });
  };

  const handleTypeChange = (type: SourceType) => {
    onChange({ ...values, type, credential: {} });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  const propertyOptions = properties ?? [];
  const typeOptions = Object.entries(TYPE_LABELS) as [SourceType, string][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {mode === "create" ? "Add connection" : `Edit ${TYPE_LABELS[values.type]}`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "create"
                ? "Provide credentials for the integration you want to connect. We'll verify immediately after saving."
                : "Update the connection details. Leave credential fields blank to keep the current secret values."}
            </p>
          </div>
          <button type="button" className="text-muted-foreground transition hover:text-foreground" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Integration type
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={values.type}
              onChange={(event) => handleTypeChange(event.target.value as SourceType)}
              disabled={mode === "edit"}
            >
              {typeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Property
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                value={values.propertyId}
                onChange={(event) => updateField("propertyId", event.target.value)}
                required
              >
                <option value="" disabled>
                  Select property
                </option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Display name
              <Input
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="source-enabled"
              checked={values.enabled}
              onCheckedChange={(checked) => updateField("enabled", Boolean(checked))}
            />
            <label htmlFor="source-enabled" className="text-sm text-foreground">
              Enable this connection
            </label>
          </div>

          <Separator />

          <CredentialFields
            type={values.type}
            credential={values.credential}
            onChange={updateCredential}
            mode={mode}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Save connection" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CredentialFields({
  type,
  credential,
  onChange,
  mode
}: {
  type: SourceType;
  credential: Record<string, string>;
  onChange: (key: string, value: string) => void;
  mode: "create" | "edit";
}) {
  const commonDescription =
    mode === "create"
      ? "All fields are encrypted before storing."
      : "Leave any field blank to keep the current stored credential.";

  switch (type) {
    case "ENTRATA":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Provide your Entrata API key and organization slug. {commonDescription}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Organization slug"
              value={credential.orgSlug ?? ""}
              onChange={(value) => onChange("orgSlug", value)}
              placeholder="example-org"
              required={mode === "create"}
            />
            <Field
              label="API key"
              value={credential.apiKey ?? ""}
              onChange={(value) => onChange("apiKey", value)}
              placeholder="Paste secure token"
              required={mode === "create"}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Entrata property ID"
              value={credential.propertyId ?? ""}
              onChange={(value) => onChange("propertyId", value)}
              placeholder="Numeric property ID"
              required={mode === "create"}
            />
            <Field
              label="Custom base URL"
              value={credential.baseUrl ?? ""}
              onChange={(value) => onChange("baseUrl", value)}
              placeholder="https://apis.entrata.com"
            />
          </div>
        </div>
      );
    case "GA4":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Provide an access token or service account exchange token and the GA4 property ID. {commonDescription}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Access token"
              value={credential.accessToken ?? ""}
              onChange={(value) => onChange("accessToken", value)}
              placeholder="ya29..."
              required={mode === "create"}
            />
            <Field
              label="GA4 property ID"
              value={credential.propertyId ?? ""}
              onChange={(value) => onChange("propertyId", value)}
              placeholder="properties/123456"
              required={mode === "create"}
            />
          </div>
        </div>
      );
    case "ADS":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect a Google Ads customer. Include the developer token if you override the default. {commonDescription}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Access token"
              value={credential.accessToken ?? ""}
              onChange={(value) => onChange("accessToken", value)}
              placeholder="ya29..."
              required={mode === "create"}
            />
            <Field
              label="Customer ID"
              value={credential.customerId ?? ""}
              onChange={(value) => onChange("customerId", value)}
              placeholder="123-456-7890"
              required={mode === "create"}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Manager customer ID"
              value={credential.loginCustomerId ?? ""}
              onChange={(value) => onChange("loginCustomerId", value)}
              placeholder="Optional MCC ID"
            />
            <Field
              label="Developer token"
              value={credential.developerToken ?? ""}
              onChange={(value) => onChange("developerToken", value)}
              placeholder="Optional developer token"
            />
          </div>
        </div>
      );
    case "GBP":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Provide Google Business access and location identifiers. {commonDescription}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Access token"
              value={credential.accessToken ?? ""}
              onChange={(value) => onChange("accessToken", value)}
              placeholder="ya29..."
              required={mode === "create"}
            />
            <Field
              label="Account ID"
              value={credential.accountId ?? ""}
              onChange={(value) => onChange("accountId", value)}
              placeholder="accounts/123456"
              required={mode === "create"}
            />
          </div>
          <Field
            label="Location ID"
            value={credential.locationId ?? ""}
            onChange={(value) => onChange("locationId", value)}
            placeholder="locations/123456"
            required={mode === "create"}
          />
        </div>
      );
    default:
      return null;
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
      {label}
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}

export function SourcesAdminView() {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [formValues, setFormValues] = useState<SourceFormValues>(buildInitialValues("ENTRATA"));

  const sourcesQuery = useQuery({ queryKey: ["admin-sources"], queryFn: listSources });
  const propertiesQuery = useQuery({ queryKey: ["properties"], queryFn: api.properties });

  const handleSuccess = useCallback(
    (response: SourceMutationResponse, action: "created" | "updated") => {
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      const tone: BannerState["tone"] = response.source.status === "ERROR" ? "error" : "success";
      const validationMessage = response.validationMessage
        ? response.validationMessage
        : action === "created"
          ? "Connection saved."
          : "Changes saved.";
      setBanner({ tone, message: validationMessage });
      setModal(null);
    },
    [queryClient]
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateSourceRequest) => createSource(payload),
    onSuccess: (data) => handleSuccess(data, "created"),
    onError: (error: unknown) => {
      setBanner({ tone: "error", message: (error as Error).message ?? "Unable to create source." });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSourceRequest }) => updateSource(id, payload),
    onSuccess: (data) => handleSuccess(data, "updated"),
    onError: (error: unknown) => {
      setBanner({ tone: "error", message: (error as Error).message ?? "Unable to update source." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      setBanner({ tone: "info", message: "Connection removed." });
    },
    onError: (error: unknown) => {
      setBanner({ tone: "error", message: (error as Error).message ?? "Unable to delete source." });
    }
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => runSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      setBanner({ tone: "success", message: "Sync triggered. Check back in a moment." });
    },
    onError: (error: unknown) => {
      setBanner({ tone: "error", message: (error as Error).message ?? "Unable to run sync." });
    }
  });

  const sources = sourcesQuery.data?.sources ?? [];

  const openModal = (type: SourceType, source?: SourceAccount) => {
    if (source) {
      setFormValues({
        propertyId: source.propertyId ?? "",
        type: source.type,
        name: source.name ?? "",
        enabled: source.enabled,
        credential: {}
      });
      setModal({ mode: "edit", source });
    } else {
      setFormValues(buildInitialValues(type));
      setModal({ mode: "create" });
    }
  };

  const handleSubmit = (values: SourceFormValues) => {
    const credential = cleanCredential(values.credential);
    if (modal?.mode === "create") {
      const payload: CreateSourceRequest = {
        propertyId: values.propertyId,
        type: values.type,
        name: values.name.trim() || undefined,
        credential,
        enabled: values.enabled
      };
      createMutation.mutate(payload);
    } else if (modal?.mode === "edit" && modal.source) {
      const payload: UpdateSourceRequest = {
        propertyId: values.propertyId,
        name: values.name.trim() || undefined,
        enabled: values.enabled,
        ...(Object.keys(credential).length > 0 ? { credential } : {})
      };
      updateMutation.mutate({ id: modal.source.id, payload });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Connections / Sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage API credentials for Entrata, Google Analytics, Ads, and Business Profile providers.
          </p>
        </div>
        <Button onClick={() => openModal("ENTRATA")}>
          <Plus className="mr-2 h-4 w-4" />
          Add connection
        </Button>
      </header>

      {banner ? (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
            banner.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            banner.tone === "error" && "border-red-200 bg-red-50 text-red-800",
            banner.tone === "info" && "border-blue-200 bg-blue-50 text-blue-800"
          )}
        >
          <span>{banner.message}</span>
          <button className="text-xs underline" onClick={() => setBanner(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {sourcesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading connections...
        </div>
      ) : null}

      {sourcesQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Unable to load sources. Please try again shortly.
        </div>
      ) : null}

      {!sourcesQuery.isLoading && sources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-base font-medium text-foreground">No connections yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your first integration to begin syncing operational data into the dashboard.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => openModal("ENTRATA")}>
            <Plus className="mr-2 h-4 w-4" /> Add connection
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4">
        {sources.map((source) => (
          <article
            key={source.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">{source.name || TYPE_LABELS[source.type]}</h3>
                <SourceStatusBadge status={source.status} />
                {!source.enabled ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Disabled</span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{TYPE_LABELS[source.type]}</p>
              <p className="text-xs text-muted-foreground">Last success: {formatTimestamp(source.lastSuccessAt)}</p>
              {source.status === "ERROR" ? (
                <p className="text-xs text-red-600">Validation failed. Update credentials and try again.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/sources/${source.id}/studio`}>
                  <Code2 className="mr-2 h-4 w-4" /> Open in Studio
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runMutation.mutate(source.id)}
                disabled={runMutation.isPending}
              >
                {runMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Run sync
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openModal(source.type, source)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => deleteMutation.mutate(source.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      {modal ? (
        <SourceForm
          mode={modal.mode}
          values={formValues}
          onChange={setFormValues}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          properties={propertiesQuery.data?.properties}
        />
      ) : null}
    </div>
  );
}
