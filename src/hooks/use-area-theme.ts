"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const THEME_KEY = "cc-theme";

/**
 * Applies the user's saved theme preference; on the very first visit it
 * defaults to the given area theme (dark for the trading terminal, light for
 * the marketing site) without fighting a later manual toggle.
 */
export function useAreaTheme(defaultTheme: "light" | "dark" | "system") {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const chosen = localStorage.getItem(THEME_KEY);
    if (!chosen) {
      setTheme(defaultTheme);
      localStorage.setItem(THEME_KEY, defaultTheme);
    } else if (chosen !== theme) {
      setTheme(chosen);
    }
  }, [setTheme, theme, defaultTheme]);
}

/** Persist the user's explicit toggle choice so it survives navigation. */
export function applyThemePreference(theme: "light" | "dark" | "system") {
  localStorage.setItem(THEME_KEY, theme);
}
