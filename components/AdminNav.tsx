"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/tracepos/check", label: "TracePOS check", icon: RefreshCw },
];

const storeUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://fluffynyummystore.com";

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      className="flex min-w-0 items-center gap-3 rounded-xl text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
      aria-label="Fluffy'n'Yummy admin overview"
    >
      <Image
        src="/images/fm logo.png"
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-white/20"
      />
      <span className="min-w-0">
        <span className="block truncate font-display text-base leading-tight">
          Fluffy&apos;n&apos;Yummy
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
          Store admin
        </span>
      </span>
    </Link>
  );
}

function NavigationLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Admin sections" className="space-y-1">
      <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-cream-200/70">
        Workspace
      </p>

      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
              active
                ? "bg-terracotta-500 text-white"
                : "text-cream-100 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0 flex-1">{label}</span>
            {active && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-white"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="space-y-1 border-t border-white/15 pt-4">
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-cream-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
      >
        <ExternalLink size={18} aria-hidden="true" />
        <span>View store</span>
      </a>

      <form action="/api/admin/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-cream-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <LogOut size={18} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </form>
    </div>
  );
}

export default function AdminNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };

    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  if (pathname === "/admin/login") return null;

  const closeMenu = () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <>
      {/* Full-height sidebar on desktop */}
      <aside className="hidden w-64 shrink-0 bg-cocoa-800 text-cream-50 lg:block">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto px-4 py-6">
          <div className="px-2">
            <Brand />
          </div>
          <div className="mt-10 flex-1">
            <NavigationLinks pathname={pathname} />
          </div>
          <SidebarFooter />
        </div>
      </aside>

      {/* Compact header and slide-out sidebar on smaller screens */}
      <div className="flex items-center justify-between gap-3 bg-cocoa-800 px-4 py-3 text-cream-50 lg:hidden">
        <Brand />
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open admin navigation"
          aria-controls="admin-mobile-navigation"
          aria-expanded={menuOpen}
          className="shrink-0 rounded-xl p-2.5 ring-1 ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <Menu size={21} aria-hidden="true" />
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={closeMenu}
            tabIndex={-1}
            aria-label="Close admin navigation"
            className="absolute inset-0 h-full w-full bg-black/60"
          />

          <aside
            id="admin-mobile-navigation"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="relative flex h-full w-[min(20rem,calc(100vw-3rem))] flex-col overflow-y-auto bg-cocoa-800 px-4 py-5 text-cream-50 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 px-2">
              <Brand onNavigate={closeMenu} />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                aria-label="Close admin navigation"
                className="shrink-0 rounded-xl p-2 text-cream-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                <X size={21} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-9 flex-1">
              <NavigationLinks pathname={pathname} onNavigate={closeMenu} />
            </div>
            <SidebarFooter />
          </aside>
        </div>
      )}
    </>
  );
}