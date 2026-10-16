"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/admin-session-token";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";

const PRIMARY_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

const POS_LINK = { href: "/admin/pos", label: "Point of sale", icon: ShoppingCart };

const INVENTORY_SECTIONS: Array<{ label: string; href?: string }> = [
  { label: "Overview", href: "/admin/inventory" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Brands" },
  { label: "Variants" },
  { label: "Batch management" },
  { label: "Stock transfer" },
  { label: "Stock adjustment" },
  { label: "Price adjustment" },
  { label: "Print barcode" },
];

const OTHER_LINKS = [
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const ALL_LINKS = [
  PRIMARY_LINKS[0],
  POS_LINK,
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Package },
  ...PRIMARY_LINKS.slice(1),
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  ...OTHER_LINKS,
];
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
  menuId,
  role,
}: {
  pathname: string;
  onNavigate?: () => void;
  menuId: string;
  role?: AdminRole;
}) {
  const inventoryActive =
    pathname === "/admin/inventory" || pathname.startsWith("/admin/inventory/") ||
    pathname === "/admin/products" || pathname.startsWith("/admin/products/") ||
    pathname === "/admin/categories" || pathname.startsWith("/admin/categories/");
  const [inventoryOpen, setInventoryOpen] = useState(inventoryActive);
  const ordersActive = pathname === "/admin/orders" || pathname.startsWith("/admin/orders/");
  const [ordersOpen, setOrdersOpen] = useState(ordersActive);
  const reportsActive = pathname === "/admin/reports" || pathname.startsWith("/admin/reports/");
  const [reportsOpen, setReportsOpen] = useState(reportsActive);
  const peopleActive = pathname === "/admin/staff" || pathname.startsWith("/admin/staff/");
  const [peopleOpen, setPeopleOpen] = useState(peopleActive);

  useEffect(() => {
    if (inventoryActive) setInventoryOpen(true);
  }, [inventoryActive]);

  useEffect(() => {
    if (ordersActive) setOrdersOpen(true);
  }, [ordersActive]);

  useEffect(() => {
    if (reportsActive) setReportsOpen(true);
  }, [reportsActive]);

  useEffect(() => {
    if (peopleActive) setPeopleOpen(true);
  }, [peopleActive]);

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
      {renderLink(PRIMARY_LINKS[0])}
      {renderLink(POS_LINK)}

      {role !== "sales_representative" && (
        <>
      <button
        type="button"
        onClick={() => setInventoryOpen((open) => !open)}
        aria-expanded={inventoryOpen}
        aria-controls={menuId}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
          inventoryActive ? "text-orange-700" : "text-stone-600"
        }`}
      >
        <Warehouse size={18} strokeWidth={1.8} aria-hidden="true" />
        <span className="flex-1">Inventory</span>
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${inventoryOpen ? "rotate-180" : ""}`} />
      </button>

      {inventoryOpen && (
        <div id={menuId} className="ml-5 space-y-0.5 border-l border-orange-200 pl-3">
          {INVENTORY_SECTIONS.map((section) => {
            if (!section.href) {
              return (
                <span
                  key={section.label}
                  aria-disabled="true"
                  title="Coming soon"
                  className="flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-xs text-stone-400"
                >
                  <span>{section.label}</span><span className="text-[10px]">Soon</span>
                </span>
              );
            }
            const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
            return (
              <Link
                key={section.label}
                href={section.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-2 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  active ? "bg-orange-100 text-orange-800" : "text-stone-600 hover:bg-orange-50"
                }`}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
      )}
        </>
      )}

      <div className={`flex items-center rounded-xl ${ordersActive ? "bg-[#ff8200] text-white shadow-sm" : "text-stone-600"}`}>
        <Link
          href="/admin/orders"
          onClick={onNavigate}
          aria-current={ordersActive ? "page" : undefined}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${ordersActive ? "hover:bg-white/10" : "hover:bg-orange-50 hover:text-cocoa-800"}`}
        >
          <ShoppingBag size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>Orders</span>
        </Link>
        <button
          type="button"
          onClick={() => setOrdersOpen((open) => !open)}
          aria-label={ordersOpen ? "Collapse orders menu" : "Expand orders menu"}
          aria-expanded={ordersOpen}
          aria-controls={`${menuId}-orders`}
          className={`mr-1 rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${ordersActive ? "hover:bg-white/10" : "hover:bg-orange-50"}`}
        >
          <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${ordersOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {ordersOpen && (
        <div id={`${menuId}-orders`} className="ml-5 space-y-0.5 border-l border-orange-200 pl-3">
          {[
            { label: "All orders", href: "/admin/orders" },
            { label: "Store sales", href: "/admin/orders?channel=pos" },
            { label: "Website sales", href: "/admin/orders?channel=website" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              className="block rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
      {role !== "sales_representative" && (
        <>
      {renderLink(PRIMARY_LINKS[2])}
      <div className={`flex items-center rounded-xl ${reportsActive ? "bg-[#ff8200] text-white shadow-sm" : "text-stone-600"}`}>
        <Link
          href="/admin/reports"
          onClick={onNavigate}
          aria-current={reportsActive ? "page" : undefined}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${reportsActive ? "hover:bg-white/10" : "hover:bg-orange-50 hover:text-cocoa-800"}`}
        >
          <BarChart3 size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>Reports</span>
        </Link>
        <button
          type="button"
          onClick={() => setReportsOpen((open) => !open)}
          aria-label={reportsOpen ? "Collapse reports menu" : "Expand reports menu"}
          aria-expanded={reportsOpen}
          aria-controls={`${menuId}-reports`}
          className={`mr-1 rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${reportsActive ? "hover:bg-white/10" : "hover:bg-orange-50"}`}
        >
          <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${reportsOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {reportsOpen && (
        <div id={`${menuId}-reports`} className="ml-5 space-y-0.5 border-l border-orange-200 pl-3">
          {[
            { label: "Overview", href: "/admin/reports" },
            { label: "Sales report", href: "/admin/reports?tab=sales" },
            { label: "Inventory report", href: "/admin/reports?tab=inventory" },
            { label: "Stock movement", href: "/admin/reports?tab=movement" },
            { label: "Product performance", href: "/admin/reports?tab=performance" },
            { label: "Low stock report", href: "/admin/reports?tab=low-stock" },
            { label: "Custom reports", href: "/admin/reports?tab=custom" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={onNavigate}
              className="block rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
        </>
      )}
      {role === "admin" && (
        <>
          <button
            type="button"
            onClick={() => setPeopleOpen((open) => !open)}
            aria-expanded={peopleOpen}
            aria-controls={`${menuId}-people`}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              peopleActive ? "text-orange-700" : "text-stone-600"
            }`}
          >
            <UsersRound size={18} strokeWidth={1.8} aria-hidden="true" />
            <span className="flex-1">People manage</span>
            <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${peopleOpen ? "rotate-180" : ""}`} />
          </button>
          {peopleOpen && (
            <div id={`${menuId}-people`} className="ml-5 space-y-0.5 border-l border-orange-200 pl-3">
              <Link
                href="/admin/staff"
                onClick={onNavigate}
                aria-current={peopleActive ? "page" : undefined}
                className={`block rounded-lg px-2 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  peopleActive ? "bg-orange-100 text-orange-800" : "text-stone-600 hover:bg-orange-50"
                }`}
              >
                Staff members
              </Link>
            </div>
          )}
        </>
      )}
      {role !== "sales_representative" && (
        <>
          <div className="my-5 border-t border-stone-200" />
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            Tools
          </p>
          {OTHER_LINKS.map(renderLink)}
        </>
      )}
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

export default function AdminNav({
  children,
  role,
  staffName,
  roleLabel,
}: {
  children: React.ReactNode;
  role?: AdminRole;
  staffName?: string;
  roleLabel?: string;
}) {
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
            <NavigationLinks pathname={pathname} menuId="desktop-inventory-menu" role={role} />
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
                  placeholder="Search stock or barcode"
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
                  <strong className="block max-w-36 truncate text-sm text-cocoa-800" title={staffName || "Staff"}>
                    {staffName || "Staff"}
                  </strong>
                  {roleLabel || "Staff"}
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
                placeholder="Search stock or barcode"
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
            <NavigationLinks pathname={pathname} onNavigate={closeMenu} menuId="mobile-inventory-menu" role={role} />
            <SidebarFooter />
          </aside>
        </div>
      )}
    </div>
  );
}