"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Sparkles, BookMarked } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Data Portal";

const LINKS = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/build", label: "Build a report", icon: Sparkles },
  { href: "/saved", label: "Saved", icon: BookMarked },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="nav-logo">◆</span>
        {APP_NAME}
      </div>
      <div className="nav-links">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`}>
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
