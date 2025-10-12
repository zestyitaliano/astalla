"use client";

import { useMemo } from "react";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { BarChart3, FileChartLine, Globe2, LayoutDashboard, PlugZap, Table2 } from "lucide-react";

import { useAppSession, type AppRole } from "@/lib/use-app-session";

export type ShellNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

type NavItemConfig = ShellNavItem & { roles: AppRole[] };

const NAV_ITEMS: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ORG_ADMIN", "MEMBER", "GUEST"],
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["ORG_ADMIN", "MEMBER"],
  },
  {
    href: "/tables",
    label: "Tables",
    icon: Table2,
    roles: ["ORG_ADMIN", "MEMBER"],
  },
  {
    href: "/admin/sources",
    label: "Sources",
    icon: PlugZap,
    roles: ["ORG_ADMIN"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileChartLine,
    roles: ["ORG_ADMIN", "MEMBER"],
  },
  {
    href: "/websites",
    label: "Websites",
    icon: Globe2,
    roles: ["ORG_ADMIN"],
  },
];

export function useShellNavItems(): ShellNavItem[] {
  const { role } = useAppSession();

  return useMemo(() => NAV_ITEMS.filter((item) => item.roles.includes(role)), [role]);
}
