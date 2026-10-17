"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const currentTheme = theme === "light" || theme === "dark" ? theme : "system";
  const themeLabel = { system: "Sistem", light: "Terang", dark: "Gelap" }[currentTheme];

  function cycleTheme() {
    setTheme(
      currentTheme === "system"
        ? "light"
        : currentTheme === "light"
          ? "dark"
          : "system",
    );
  }

  return (
    <span aria-live="polite" className="inline-flex shrink-0">
      <button
        type="button"
        disabled={!mounted}
        aria-label={
          mounted ? `Ganti tema (sekarang: ${themeLabel})` : "Ganti tema"
        }
        title={mounted ? `Tema ${themeLabel}. Klik untuk mengganti tema.` : "Ganti tema"}
        onClick={cycleTheme}
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-transform duration-150 ease-out not-hover:ease-in hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait"
      >
        <span className="flex h-[18px] w-[18px] items-center justify-center">
        {mounted && (
          <svg
            key={currentTheme}
            className="animate-fade-in-up transition-transform duration-300 ease-out"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            {currentTheme === "light" ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
              </>
            ) : currentTheme === "dark" ? (
              <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
            ) : (
              <>
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M12 17v4M8 21h8" />
              </>
            )}
          </svg>
        )}
        </span>
        <span>Tema</span>
      </button>
      {mounted && (
        <span className="sr-only">Tema sekarang: {themeLabel}</span>
      )}
    </span>
  );
}
