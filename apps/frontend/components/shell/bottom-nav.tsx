"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { shellNavItems } from "@/components/shell/nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 md:hidden"
      aria-label="Primary navigation"
    >
      <ul className="grid grid-cols-5 text-xs">
        {shellNavItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 py-2.5 text-[clamp(.8rem,1.6vw,.95rem)]"
                aria-current={active ? "page" : undefined}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-brand-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                <span className={active ? "font-medium text-brand-primary" : "text-muted-foreground"}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
