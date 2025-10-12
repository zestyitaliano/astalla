"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useShellNavItems } from "@/components/shell/nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const navItems = useShellNavItems();

  if (navItems.length === 0) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-panel/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-panel/75 md:hidden"
      aria-label="Primary navigation"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 py-2.5 text-[clamp(.8rem,1.6vw,.95rem)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-current={active ? "page" : undefined}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-brand-secondary" : "text-muted-foreground"}`} aria-hidden="true" />
                <span className={active ? "font-semibold text-brand-secondary" : "text-muted-foreground"}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
