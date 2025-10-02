"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={process.env.NEXT_PUBLIC_THEME_DEFAULT ?? "system"}
      enableSystem
      disableTransitionOnChange
      storageKey="astalla-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
