import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { BarChart3, FileChartLine, LayoutDashboard, PlugZap, Table2 } from "lucide-react";

type ShellNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

export const shellNavItems: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/tables", label: "Tables", icon: Table2 },
  { href: "/admin/sources", label: "Sources", icon: PlugZap },
  { href: "/reports", label: "Reports", icon: FileChartLine }
];

export type { ShellNavItem };
