"use client";

import { type ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

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
