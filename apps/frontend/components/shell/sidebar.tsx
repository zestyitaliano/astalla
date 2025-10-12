"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { useShellNavItems } from "@/components/shell/nav-items";

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ variant = "desktop", onNavigate, onClose }: SidebarProps) {
  const path = usePathname();
  const navItems = useShellNavItems();

  const containerClasses =
    variant === "desktop"
      ? "sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/60 bg-card/80 backdrop-blur-xl md:block"
      : "flex h-full w-64 flex-col bg-card/95 text-text shadow-xl";

  return (
    <aside className={containerClasses}>
      <div className="flex h-16 items-center justify-between gap-4 border-b border-border/60 px-6 text-lg font-heading uppercase tracking-[0.2em]">
        <span className="text-accent">Astalla</span>
        {variant === "mobile" ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-sm text-text transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <span className="sr-only">Close navigation</span>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = path?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                active
                  ? "bg-accent/15 font-semibold text-accent"
                  : "text-muted-foreground hover:bg-card hover:text-text"
              }`}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-muted-foreground"}`} aria-hidden="true" />
              <span className="text-[clamp(.9rem,1.5vw,1rem)]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
