"use client";

import { useMemo } from "react";
import type { Route } from "next";
import { useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  FileChartLine,
  Globe2,
  LayoutDashboard,
  PlugZap,
  Table2
} from "lucide-react";

export type ShellNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

const baseNavItems: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 }
];

const adminNavItems: ShellNavItem[] = [
  { href: "/admin/tables", label: "Tables", icon: Table2 },
  { href: "/admin/websites", label: "Websites", icon: Globe2 },
  { href: "/admin/sources", label: "Sources", icon: PlugZap },
  { href: "/admin/reports", label: "Reports", icon: FileChartLine },
  { href: "/admin/diagnostics", label: "Diagnostics", icon: Activity }
];

export function useShellNavItems(): ShellNavItem[] {
  const { data } = useSession();
  const role = data?.user?.role;

  return useMemo(() => {
    if (role === "ORG_ADMIN") {
      return [...baseNavItems, ...adminNavItems];
    }

    return baseNavItems;
  }, [role]);
}
