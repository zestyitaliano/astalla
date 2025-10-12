"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const defaultTheme = process.env.NEXT_PUBLIC_THEME_DEFAULT || "system";

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme as any}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
