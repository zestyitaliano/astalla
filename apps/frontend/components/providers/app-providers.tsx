"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";

import { isMockMode } from "@/lib/utils";
import { ThemeProvider } from "../theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60,
          refetchOnWindowFocus: false
        }
      }
    })
  );

  useEffect(() => {
    if (isMockMode()) {
      import("@/mocks/browser").then(({ worker }) => {
        worker.start({ onUnhandledRequest: "bypass" });
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === "development" ? <ReactQueryDevtools /> : null}
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
