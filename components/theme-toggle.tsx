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
    <span aria-live="polite" className="inline-flex h-10 w-10 shrink-0">
      <button
        type="button"
        disabled={!mounted}
        aria-label={
          mounted ? `Ganti tema (sekarang: ${currentTheme})` : "Ganti tema"
        }
        onClick={cycleTheme}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-[var(--shadow)] transition-colors hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait"
      >
        {mounted && (
          <svg
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
      </button>
      {mounted && (
        <span className="sr-only">Tema sekarang: {currentTheme}</span>
      )}
    </span>
  );
}
