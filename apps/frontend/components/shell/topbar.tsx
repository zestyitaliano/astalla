"use client";

import Image from "next/image";
import Link from "next/link";

import { Menu, Search, UserCircle2, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";

interface TopbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Topbar({ onToggleSidebar, isSidebarOpen }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 text-text backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm transition hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:hidden"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
        >
          {isSidebarOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>

        <Link href="/" className="flex items-center gap-2" aria-label="Home">
          {/* Auto-wired by script: light theme uses /brand/astalla_logo_dark.svg, dark theme uses /brand/astalla_logo_light.svg. */}
          {/* Light theme: dark-ink logo */}
          <Image
            src="/brand/astalla_logo_dark.svg"
            alt="Astalla"
            width={120}
            height={28}
            priority
            className="block dark:hidden"
          />
          {/* Dark theme: light-ink logo */}
          <Image
            src="/brand/astalla_logo_light.svg"
            alt="Astalla"
            width={120}
            height={28}
            priority
            className="hidden dark:block"
          />
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="w-64 rounded-full border border-border/60 bg-card/90 py-2 pl-9 pr-3 text-sm text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              placeholder="Search…"
              type="search"
              aria-label="Search"
            />
          </div>
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-text shadow-sm transition hover:bg-card/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <UserCircle2 className="h-4 w-4" aria-hidden="true" />
            <span className="text-[clamp(.9rem,1.5vw,1rem)]">Account</span>
          </button>
        </div>
      </div>
    </header>
  );
}
