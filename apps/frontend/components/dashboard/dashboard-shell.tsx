"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MeResponse } from "@shared/api";

export default function DashboardShell({
  user,
  children
}: {
  user: MeResponse;
  children: ReactNode;
}) {
  const displayName = user.name?.trim() || "Set your name";
  const displayEmail = user.email?.trim() || "Add your email";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#f8f7ff] via-[#fefefe] to-[#fff7f0]">
      <header className="px-6 pt-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/60 bg-white/70 px-6 py-4 shadow-sm backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {user.orgId ? user.orgId : "Astalla internal"}
              </p>
              <h1 className="text-2xl font-semibold text-foreground">Operations control center</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-2 text-xs text-muted-foreground sm:flex">
                <Search className="h-4 w-4" />
                <span>Search workspaces</span>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-3 py-2 shadow-sm">
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
