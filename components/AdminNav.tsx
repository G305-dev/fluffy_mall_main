"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Warehouse,
  X,
} from "lucide-react";

const PRIMARY_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

const OTHER_LINKS = [
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { href: "/admin/tracepos/check", label: "TracePOS check", icon: RefreshCw },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...OTHER_LINKS];
const storeUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fluffynyummystore.com";

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      aria-label="Fluffy'n'Yummy admin dashboard"
      className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <Image
        src="/images/fm logo.png"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-xl object-cover"
      />
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] font-semibold leading-tight text-cocoa-800">
          Fluffy&apos;n&apos;Yummy
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">
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
  const renderLink = ({
    href,
    label,
    icon: Icon,
  }: (typeof ALL_LINKS)[number]) => {
    const active = href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
          active
            ? "bg-[#ff8200] text-white shadow-sm"
            : "text-stone-600 hover:bg-orange-50 hover:text-cocoa-800"
        }`}
      >
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="Admin navigation" className="mt-9 flex-1 space-y-1">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
        Workspace
      </p>
      {PRIMARY_LINKS.map(renderLink)}

      <div className="my-5 border-t border-stone-200" />
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
        Tools
      </p>
      {OTHER_LINKS.map(renderLink)}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-6 space-y-1 border-t border-stone-200 pt-4">
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        <ExternalLink size={18} aria-hidden="true" />
        View store
      </a>
      <form action="/api/admin/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-stone-600 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <LogOut size={18} aria-hidden="true" />
          Log out
        </button>
      </form>
    </div>
  );
}

export default function AdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = drawer.current?.querySelectorAll<HTMLElement>(
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

    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", handleKey);
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

  if (pathname === "/admin/login") {
    return <div className="min-h-screen bg-cream-50 px-4 py-8">{children}</div>;
  }

  const title = ALL_LINKS.find(({ href }) =>
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)
  )?.label || "Store admin";

  const closeMenu = () => {
    setMenuOpen(false);
    menuButton.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#e9dfd2] lg:p-6">
      <div className="mx-auto min-h-screen max-w-[1680px] bg-white shadow-soft lg:flex lg:min-h-[calc(100vh-3rem)] lg:overflow-clip lg:rounded-[26px]">
        <aside className="hidden w-60 shrink-0 border-r border-stone-200 bg-[#f8f8f8] lg:block">
          <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-4 xl:p-5">
            <div className="px-2 pt-2"><Brand /></div>
            <NavigationLinks pathname={pathname} />
            <SidebarFooter />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[#fbfaf8]">
          <header className="sticky top-0 z-20 border-b border-stone-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                ref={menuButton}
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open admin navigation"
                aria-controls="admin-mobile-navigation"
                aria-expanded={menuOpen}
                className="rounded-xl border border-stone-200 p-2 text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 lg:hidden"
              >
                <Menu size={20} aria-hidden="true" />
              </button>

              <span className="min-w-0 flex-1 truncate text-lg font-semibold text-cocoa-800 sm:text-xl lg:flex-none">
                {title}
              </span>

              <form
                action="/admin/inventory"
                method="get"
                role="search"
                className="ml-auto hidden w-full max-w-[290px] items-center gap-2 rounded-xl bg-[#f7f7f7] px-3 py-2 md:flex"
              >
                <input
                  name="q"
                  type="search"
                  placeholder="Search stock or item code"
                  aria-label="Search inventory"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
                <button type="submit" aria-label="Search inventory" className="text-stone-500">
                  <Search size={18} aria-hidden="true" />
                </button>
              </form>

              <Link
                href="/admin/inventory?status=attention"
                aria-label="See items needing restock"
                className="rounded-xl border border-stone-200 p-2 text-stone-600 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <Bell size={19} aria-hidden="true" />
              </Link>

              <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
                <Image
                  src="/images/fm logo.png"
                  alt=""
                  width={34}
                  height={34}
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <span className="hidden text-xs leading-tight text-stone-500 xl:block">
                  <strong className="block text-sm text-cocoa-800">Store admin</strong>
                  Staff access
                </span>
              </div>
            </div>

            <form
              action="/admin/inventory"
              method="get"
              role="search"
              className="mt-3 flex items-center gap-2 rounded-xl bg-[#f7f7f7] px-3 py-2 md:hidden"
            >
              <input
                name="q"
                type="search"
                placeholder="Search stock or item code"
                aria-label="Search inventory"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
              <button type="submit" aria-label="Search inventory" className="text-stone-500">
                <Search size={18} aria-hidden="true" />
              </button>
            </form>
          </header>

          <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close admin navigation"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full bg-black/50"
          />
          <aside
            id="admin-mobile-navigation"
            ref={drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="relative flex h-full w-[min(19rem,calc(100vw-3rem))] flex-col overflow-y-auto bg-[#f8f8f8] p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2">
              <Brand onNavigate={closeMenu} />
              <button
                ref={closeButton}
                type="button"
                onClick={closeMenu}
                aria-label="Close admin navigation"
                className="rounded-xl p-2 text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <NavigationLinks pathname={pathname} onNavigate={closeMenu} />
            <SidebarFooter />
          </aside>
        </div>
      )}
    </div>
  );
}