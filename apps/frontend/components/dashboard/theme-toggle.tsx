"use client";

import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full border border-border/60 bg-card/90 text-foreground shadow-sm hover:bg-card"
      aria-label={`Activate ${isDark ? "light" : "dark"} mode`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
    >
      <span className="sr-only">Toggle theme</span>
      {mounted ? (
        isDark ? (
          <SunMedium className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <MoonStar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )
      ) : null}
    </Button>
  );
}
