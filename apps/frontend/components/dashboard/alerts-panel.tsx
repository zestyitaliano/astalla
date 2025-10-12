"use client";

import { Bell, CheckCircle2, Circle, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Alert } from "@shared/api";

interface AlertsPanelProps {
  alerts: Alert[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

type Severity = Alert["severity"];

const severityStyles: Record<Severity, string> = {
  high: "border-danger/40 bg-danger/10 text-danger",
  medium: "border-warning/40 bg-warning/10 text-warning",
  low: "border-success/40 bg-success/10 text-success"
};

function formatRelativeTime(timestamp: string) {
  const delta = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.round(delta / (1000 * 60));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function AlertsPanel({ alerts, isLoading, isError, onRetry }: AlertsPanelProps) {
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const alertCount = alerts?.length ?? 0;

  useEffect(() => {
    if (!activeAlertId && alerts && alerts.length > 0) {
      setActiveAlertId(alerts[0].id);
    }
  }, [activeAlertId, alerts]);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-card/85 shadow-sm supports-[backdrop-filter]:bg-card/70">
      <header className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            {alertCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                {alertCount}
              </span>
            ) : null}
          </div>
          <div>
            <p className="text-[clamp(.75rem,1.2vw,.875rem)] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Signals</p>
            <h3 className="text-[clamp(1.125rem,2vw,1.375rem)] font-semibold text-text">Alerts & notifications</h3>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRetry} disabled={isLoading} aria-label="Refresh alerts">
          <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")}
          />
        </Button>
      </header>
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border/60 border-t-primary" />
          </div>
        ) : null}
        {isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <Circle className="h-8 w-8 text-destructive" />
            <p>We couldn&apos;t load alerts. Try again in a moment.</p>
            <Button type="button" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
        {!isLoading && !isError ? (
          alerts && alerts.length > 0 ? (
            <div className="grid h-full grid-rows-[minmax(0,1fr),auto]">
              <div className="divide-y divide-border/60 overflow-y-auto">
                {alerts.map((alert) => {
                  const isActive = activeAlertId === alert.id;
                  return (
                    <button
                      key={alert.id}
                      type="button"
                      className={cn(
                        "group flex w-full flex-col gap-2 px-6 py-4 text-left transition",
                        isActive ? "bg-primary/5" : "hover:bg-card-contrast/40"
                      )}
                      onClick={() => setActiveAlertId(alert.id)}
                      aria-pressed={isActive}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                            severityStyles[alert.severity]
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {alert.severity}
                        </span>
                        <span className="text-[clamp(.8rem,1.4vw,.9rem)] text-muted-foreground">{formatRelativeTime(alert.occurredAt)}</span>
                      </div>
                      <p className="text-[clamp(.95rem,1.5vw,1.05rem)] font-semibold text-text">{alert.label}</p>
                      <p className="text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground line-clamp-2">{alert.detail}</p>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-border/60 px-5 py-4">
                {alerts.find((alert) => alert.id === activeAlertId) ? (
                  (() => {
                    const activeAlert = alerts.find((alert) => alert.id === activeAlertId)!;
                    return (
                      <div className="space-y-2">
                        <p className="text-[clamp(.75rem,1.2vw,.875rem)] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Details</p>
                        <p className="text-[clamp(.95rem,1.5vw,1.05rem)] font-semibold text-text">{activeAlert.label}</p>
                        <p className="text-[clamp(.9rem,1.5vw,1rem)] leading-6 text-muted-foreground">{activeAlert.detail}</p>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground">Select an alert to view the full context.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <p className="text-[clamp(.95rem,1.5vw,1.05rem)] font-medium text-text">No alerts right now.</p>
              <p className="text-[clamp(.9rem,1.5vw,1rem)] text-muted-foreground">We&apos;ll notify you as soon as we detect something noteworthy.</p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
