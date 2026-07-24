"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/account-menu";

const items = [
  { href: "/today", label: "Өнөөдөр", icon: "●" },
  { href: "/journey", label: "Замнал", icon: "◇" },
  { href: "/progress", label: "Ахиц", icon: "↗" },
  { href: "/profile", label: "Профайл", icon: "○" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/today" aria-label="Өнөөдрийн дасгал">
          <span className="brand-mark">Ө</span><span>Өдөр бүрийн харилцаа</span>
        </Link>
        <nav className="desktop-app-nav" aria-label="Дасгалын үндсэн цэс">
          {items.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}
        </nav>
        <AccountMenu />
      </header>
      <div className="app-content">{children}</div>
      <nav className="mobile-app-nav" aria-label="Дасгалын үндсэн цэс">
        {items.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
