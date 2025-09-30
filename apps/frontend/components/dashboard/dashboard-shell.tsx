import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MeResponse } from "@shared/api";

export function DashboardShell({
  user,
  children
}: {
  user: MeResponse;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Astalla</p>
            <h1 className="text-2xl font-semibold text-foreground">Performance Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Avatar>
              <AvatarFallback>{user.name?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      <ScrollArea className="flex-1">
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          <div className="grid gap-6">{children}</div>
        </main>
      </ScrollArea>
    </div>
  );
}
