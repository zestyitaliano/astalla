"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileChartLine, LayoutDashboard, PlugZap, Table2 } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/tables", label: "Tables", icon: Table2 },
  { href: "/admin/sources", label: "Sources / Connections", icon: PlugZap },
  { href: "/reports", label: "Reports", icon: FileChartLine }
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-white/75 backdrop-blur-xl lg:block">
      <div className="flex h-16 items-center border-b px-6 text-lg font-semibold tracking-tight">
        <span className="text-brand-primary">Astalla</span>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-brand-primary/10 font-medium text-brand-primary"
                  : "text-muted-foreground hover:bg-white hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
