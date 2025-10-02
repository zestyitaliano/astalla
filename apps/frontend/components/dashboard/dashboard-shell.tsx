"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MeResponse } from "@shared/api";

import { ThemeToggle } from "./theme-toggle";

export default function DashboardShell({
  user,
  role,
  children
}: {
  user: MeResponse;
  role?: "admin" | "viewer";
  children: ReactNode;
}) {
  const displayName = user.name?.trim() || "Set your name";
  const displayEmail = user.email?.trim() || "Add your email";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 pt-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/70 bg-panel/90 px-6 py-5 shadow-sm supports-[backdrop-filter]:backdrop-blur">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                {user.orgId ? user.orgId : "Astalla internal"}
              </p>
              <h1 className="text-2xl font-semibold text-foreground">Operations control center</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-xs text-muted-foreground sm:flex">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Search workspaces</span>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card px-3 py-2 shadow-sm">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
                <Avatar className="h-9 w-9 bg-primary/10">
                  <AvatarFallback className="bg-transparent text-sm font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              {role ? (
                <span className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {role}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      <ScrollArea className="flex-1">
        <main className="mx-auto w-full max-w-7xl px-6 pb-12 pt-10">
          <div className="grid gap-6 pb-12">{children}</div>
        </main>
      </ScrollArea>
    </div>
  );
}
