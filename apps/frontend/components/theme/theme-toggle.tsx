"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const next = resolvedTheme === "dark" ? "light" : "dark";
  const label = !mounted ? "Loading theme" : resolvedTheme === "dark" ? "🌙 Dark" : "☀️ Light";

  return (
    <button
      onClick={() => setTheme(next)}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-card"
      aria-label="Toggle theme"
      type="button"
      disabled={!mounted}
    >
      {label}
    </button>
  );
}
