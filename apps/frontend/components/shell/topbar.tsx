"use client";

import { Search, UserCircle2 } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="w-64 rounded-lg border border-border/80 bg-white/80 py-2 pl-9 pr-3 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
              placeholder="Search…"
              type="search"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-white/80 px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:shadow-cardHover">
            <UserCircle2 className="h-4 w-4" />
            Account
          </button>
        </div>
      </div>
    </header>
  );
}
