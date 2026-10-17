"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Beranda" },
  { href: "/transaksi", label: "Transaksi" },
  { href: "/ocr", label: "Pindai struk" },
  { href: "/profil", label: "Profil" },
];

const iconProps = {
  viewBox: "0 0 24 24",
  width: 22,
  height: 22,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </svg>
  );
}

function iconFor(href: string) {
  switch (href) {
    case "/dashboard": return HomeIcon;
    case "/transaksi": return ReceiptIcon;
    case "/ocr": return CameraIcon;
    default: return UserIcon;
  }
}

export default function BottomNav() {
  const pathname = usePathname();
  const secondaryRoutes = ["/kategori", "/budget", "/recurring"];
  const isSecondary = secondaryRoutes.some((href) => pathname === href || pathname.startsWith(href + "/"));
  const isAppPage = isSecondary || items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  if (!isAppPage) return null;

  return (
    <>
    <div aria-hidden="true" className="h-[calc(5rem+env(safe-area-inset-bottom))] shrink-0 md:hidden" />
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card px-2 pt-2 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.25)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const isHighlighted = isActive || (item.href === "/dashboard" && isSecondary);
        const Icon = iconFor(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-16 min-w-0 flex-1 flex-col items-center gap-1 rounded-xl pb-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
              isHighlighted ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${isHighlighted ? "bg-primary/15" : ""}`}>
              <Icon />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
    </>
  );
}
