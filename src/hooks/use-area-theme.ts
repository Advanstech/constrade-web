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
    // An area default is applied but never persisted — only an explicit user
    // toggle (applyThemePreference) writes THEME_KEY. Otherwise the first
    // page a visitor sees would lock in its theme and block the other area.
    const target = chosen ?? defaultTheme;
    if (target !== theme) {
      setTheme(target);
    }
  }, [setTheme, theme, defaultTheme]);
}

/** Persist the user's explicit toggle choice so it survives navigation. */
export function applyThemePreference(theme: "light" | "dark" | "system") {
  localStorage.setItem(THEME_KEY, theme);
}
