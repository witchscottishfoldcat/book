import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", theme === "dark" ? "#0f0f12" : "#f8f9fc");
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      resolvedTheme: "dark",

      setTheme: (theme: Theme) => {
        const resolved = theme === "system" ? getSystemTheme() : theme;
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },

      toggleTheme: () => {
        const { resolvedTheme } = get();
        const newTheme = resolvedTheme === "dark" ? "light" : "dark";
        applyTheme(newTheme);
        set({ theme: newTheme, resolvedTheme: newTheme });
      },

      initTheme: () => {
        const { theme } = get();
        const resolved = theme === "system" ? getSystemTheme() : theme;
        applyTheme(resolved);
        set({ resolvedTheme: resolved });

        if (typeof window !== "undefined") {
          const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
          const handleChange = () => {
            const currentTheme = get().theme;
            if (currentTheme === "system") {
              const newResolved = getSystemTheme();
              applyTheme(newResolved);
              set({ resolvedTheme: newResolved });
            }
          };
          mediaQuery.addEventListener("change", handleChange);
        }
      },
    }),
    {
      name: "mdnotes-theme",
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
