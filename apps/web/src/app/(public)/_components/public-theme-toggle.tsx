"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { IvIcon } from "@/components/iv";

const PUBLIC_THEME_KEY = "iv-public-theme-touched";

export function PublicThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(PUBLIC_THEME_KEY)) return;
    window.localStorage.setItem(PUBLIC_THEME_KEY, "1");
    setTheme("dark");
  }, [setTheme]);

  function toggle() {
    const next = resolvedTheme === "light" ? "dark" : "light";
    setTheme(next);
    setFlip(true);
    window.setTimeout(() => setFlip(false), 520);
  }

  return (
    <button
      type="button"
      aria-label="Cambiar tema"
      onClick={toggle}
      className={`iv-icon-btn relative${flip ? " iv-flip" : ""}`}
    >
      <span className="block dark:hidden">
        <IvIcon name="moon" size={18} />
      </span>
      <span className="hidden dark:block">
        <IvIcon name="sun" size={18} />
      </span>
    </button>
  );
}
