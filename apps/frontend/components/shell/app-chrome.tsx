"use client";

import { useEffect, useState, type ReactNode } from "react";

import { BottomNav } from "@/components/shell/bottom-nav";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppChromeProps {
  children: ReactNode;
}

export function AppChrome({ children }: AppChromeProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} />
        <main className="flex-1 min-h-0 pb-20">
          <div className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen ? (
        <div className="md:hidden" aria-hidden={!sidebarOpen}>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            role="presentation"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto rounded-r-3xl border-r border-border/60 bg-white shadow-2xl transition"
            role="dialog"
            aria-label="Navigation menu"
            aria-modal="true"
          >
            <Sidebar variant="mobile" onNavigate={() => setSidebarOpen(false)} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      ) : null}
      <BottomNav />
    </div>
  );
}
