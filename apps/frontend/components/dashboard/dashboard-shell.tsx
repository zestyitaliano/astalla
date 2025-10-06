"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
  const pathname = usePathname();

  type NavLink = { href: Route; label: string };

  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard" },
    ...(role === "admin"
      ? ([{ href: "/admin/sources", label: "Connections / Integrations" }] as NavLink[])
      : [])
  ];

  return (
    <div className="flex flex-col gap-6 pb-20">
      <header className="rounded-3xl border border-border/60 bg-white/80 p-6 shadow-sm supports-[backdrop-filter]:backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
              {user.orgId ? user.orgId : "Astalla internal"}
            </p>
            <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold text-foreground">Operations control center</h1>
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
                <AvatarFallback className="bg-transparent text-sm font-semibold text-primary">{initials}</AvatarFallback>
              </Avatar>
            </div>
            {role ? (
              <span className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {role}
              </span>
            ) : null}
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full border border-transparent px-4 py-1.5 transition hover:text-foreground",
                  isActive && "border-border bg-card text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="flex flex-col gap-8 pb-4 sm:gap-9 lg:gap-10">{children}</div>
    </div>
  );
}
