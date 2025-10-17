"use client";

import { useState, useTransition } from "react";
import type { FeatureFlagState } from "@shared/api";

import { updateFeatureFlag } from "@/lib/api/feature-flags";
import { cn } from "@/lib/utils";

interface ReferencesSettingsClientProps {
  flag: string;
  workspaceId: string;
  userId: string;
  initialState: FeatureFlagState;
}

export function ReferencesSettingsClient({ flag, workspaceId, userId, initialState }: ReferencesSettingsClientProps) {
  const [workspaceEnabled, setWorkspaceEnabled] = useState(Boolean(initialState.workspaceEnabled));
  const [userEnabled, setUserEnabled] = useState(Boolean(initialState.userEnabled));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveEnabled = workspaceEnabled && userEnabled;

  const handleWorkspaceToggle = (next: boolean) => {
    startTransition(async () => {
      try {
        const state = await updateFeatureFlag(flag, {
          scope: "workspace",
          enabled: next,
          workspaceId,
        });
        setWorkspaceEnabled(Boolean(state.workspaceEnabled));
        setUserEnabled(Boolean(state.userEnabled));
        setError(null);
      } catch (err) {
        console.error("Failed to update workspace feature flag", err);
        setError("Unable to update workspace setting. Please try again.");
      }
    });
  };

  const handleUserToggle = (next: boolean) => {
    startTransition(async () => {
      try {
        const state = await updateFeatureFlag(flag, {
          scope: "user",
          enabled: next,
          workspaceId,
          userId,
        });
        setWorkspaceEnabled(Boolean(state.workspaceEnabled));
        setUserEnabled(Boolean(state.userEnabled));
        setError(null);
      } catch (err) {
        console.error("Failed to update user feature flag", err);
        setError("Unable to update your preference. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Feature preview</p>
        <h1 className="text-2xl font-semibold text-text">Reference autocomplete</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Control access to AI-assisted reference autocomplete. Enable the feature for your workspace, then opt in for your
          account to start using the assistant in supported editors.
        </p>
      </header>

      <section className={cn("rounded-2xl border border-border/70 bg-card p-6 shadow-sm", isPending && "opacity-70")}> 
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-text">Enable for workspace</p>
              <p className="text-sm text-muted-foreground">Makes reference autocomplete available to members of this workspace.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={workspaceEnabled}
              onChange={(event) => handleWorkspaceToggle(event.target.checked)}
              disabled={isPending}
            />
          </label>

          <label className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-text">Opt in for your user</p>
              <p className="text-sm text-muted-foreground">
                Personal toggle that controls whether the assistant appears for your account.
              </p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={userEnabled}
              onChange={(event) => handleUserToggle(event.target.checked)}
              disabled={isPending || !workspaceEnabled}
            />
          </label>

          <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
            <p className="font-medium text-text">Current status</p>
            <p className="text-muted-foreground">
              {effectiveEnabled ? "Reference autocomplete is enabled for your account." : "Reference autocomplete is currently disabled."}
            </p>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
