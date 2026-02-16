"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "theme";

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.dataset["theme"] = resolved;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "system";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function onChange(next: Theme) {
    setTheme(next);
    localStorage.setItem(KEY, next);
    applyTheme(next);
  }

  return (
    <select
      value={theme}
      onChange={(e) => onChange(e.target.value as Theme)}
      className="h-10 rounded-xl border bg-background px-3 text-sm"
      aria-label="Theme"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
