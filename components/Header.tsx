"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Home, LogIn, LogOut, Menu, Search, ShoppingBag, X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { useCart } from "./CartProvider";
import { usePathname, useRouter } from "next/navigation";

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    fetch("/api/customer/session")
      .then((response) => response.json())
      .then((data) => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setAuthenticated(false));
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  }

  async function logout() {
    await fetch("/api/customer/logout", { method: "POST" });
    setAuthenticated(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-cream-200 bg-[#fff9f2]/90 backdrop-blur-md">
      <div className="bg-cocoa-800 text-cream-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 text-[10px] tracking-wide sm:px-6 sm:text-xs lg:px-8">
          <p className="truncate">
             Home, kitchen and gifting essentials from Lagos
          </p>
          <Link href="/track" className="hidden shrink-0 underline-offset-2 hover:underline sm:block">
            Track an order
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        <button
          className="relative z-[101] shrink-0 rounded-full p-2 text-cocoa-800 hover:bg-cream-100 lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Image
            src="/images/fm logo.png"
            alt="Fluffy'n'Yummy Mall"
            width={36}
            height={36}
            className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-9 sm:w-9"
          />
          <span className="min-w-0">
            <span className="block truncate font-display text-base leading-none text-cocoa-800 sm:text-xl">
              Fluffy&apos;n&apos;Yummy
            </span>
            <span className="hidden truncate text-[10px] uppercase tracking-[0.18em] text-gold-600 lg:block">
              Mall · Home · Kitchen · Gifting
            </span>
          </span>
        </Link>
        <form onSubmit={onSearch} className="relative mx-auto hidden min-w-0 max-w-md flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-600" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pots, blenders, gifts…"
            className="w-full rounded-full border border-cream-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-terracotta-400 focus:ring-2"
          />
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 lg:gap-2">
          <Link
            href="/"
            className="hidden rounded-full p-2 text-cocoa-800 hover:bg-cream-100 lg:inline-flex"
            aria-label="Home"
          >
            <Home size={22} />
          </Link>
          <Link
            href="/shop"
            className="hidden rounded-full px-3 py-2 text-sm text-cocoa-700 hover:bg-cream-100 lg:inline"
          >
            Shop
          </Link>
          <Link
            href="/contact"
            className="hidden rounded-full px-3 py-2 text-sm text-cocoa-700 hover:bg-cream-100 xl:inline"
          >
            Visit us
          </Link>
          <Link
            href="/account/orders"
            className="hidden rounded-full px-3 py-2 text-sm text-cocoa-700 hover:bg-cream-100 lg:inline"
          >
            Orders
          </Link>
          {authenticated ? (
            <button
              onClick={logout}
              className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm text-cocoa-700 hover:bg-cream-100 lg:flex"
            >
              <LogOut size={15} />
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm text-cocoa-700 hover:bg-cream-100 lg:flex"
            >
              <LogIn size={15} />
              Sign in
            </Link>
          )}
          <Link
            href="/cart"
            className="relative rounded-full p-2 text-cocoa-800 hover:bg-cream-100"
            aria-label="Cart"
          >
            <ShoppingBag size={22} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-terracotta-500 px-1 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
      <nav className="hidden border-t border-cream-200 lg:block">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-1 px-6 py-2 text-sm lg:px-8">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-cocoa-700 hover:bg-cream-100"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] bg-cocoa-900/70 lg:hidden" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="h-full w-[90%] max-w-sm overflow-y-auto overscroll-contain border-r-4 border-terracotta-500 bg-cream-50 p-4 shadow-2xl sm:p-5" role="dialog" aria-modal="true" aria-label="Store menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between border-b border-cream-200 pb-4">
              <p className="font-display text-2xl text-cocoa-800">Menu</p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-full p-2 text-cocoa-800 hover:bg-cream-100"
              >
                <X />
              </button>
            </div>
            <form onSubmit={onSearch} className="mb-5">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products"
                className="w-full rounded-full border border-cream-300 bg-white px-4 py-2.5 text-sm"
              />
            </form>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-terracotta-600">
              Categories
            </p>
            <nav aria-label="Product categories" className="grid gap-2 text-base">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/shop/${c.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-3 font-medium text-cocoa-800 hover:bg-cream-100"
                >
                  <span className="text-xl" aria-hidden="true">{c.emoji}</span>
                  {c.name}
                </Link>
              ))}
            </nav>
            <div className="mt-5 grid gap-2 border-t border-cream-200 pt-4 text-base">
              <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-3 font-medium text-cocoa-800 hover:bg-cream-100">
                <Home size={17} />
                Home
              </Link>
              <Link href="/shop" className="rounded-xl px-3 py-3 font-medium text-cocoa-800 hover:bg-cream-100">
                All products
              </Link>
              <Link
  href="/track"
  className="rounded-xl px-3 py-3 text-cocoa-800 hover:bg-cream-100"
>
  Track order
</Link>

<Link
  href="/account/orders"
  className="rounded-xl px-3 py-3 text-cocoa-800 hover:bg-cream-100"
>
  Order history
</Link>

{authenticated ? (
  <button
    onClick={logout}
    className="flex items-center gap-2 rounded-xl px-3 py-3 text-left text-cocoa-800 hover:bg-cream-100"
  >
    <LogOut size={17} />
    Logout
  </button>
) : (
              ) : (
                <Link href="/login" className="flex items-center gap-2 rounded-xl px-3 py-3 text-cocoa-800 hover:bg-cream-100">
                  <LogIn size={17} />
                  Sign in
                </Link>
              )}
              <Link href="/contact" className="rounded-xl px-3 py-3 text-cocoa-800 hover:bg-cream-100">
                Store & contact
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
