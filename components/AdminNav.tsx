"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const storeUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://fluffynyummystore.com";
  if (pathname === "/admin/login") return null;

  const navLinks = links.map((link) => {
    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`rounded-full px-3 py-2 text-center transition ${
          active ? "bg-white/15 text-white" : "text-cream-200 hover:bg-white/10 hover:text-white"
        }`}
      >
        {link.label}
      </Link>
    );
  });

  return (
    <header className="border-b border-cream-200 bg-cocoa-800 text-cream-50">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm sm:gap-3 sm:px-6 lg:px-8">
          <Link href="/admin" className="shrink-0 rounded-full" aria-label="Admin dashboard">
            <Image
              src="/images/fm logo.png"
              alt="Fluffy'n'Yummy Mall"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          </Link>
          <nav aria-label="Admin navigation" className="hidden min-w-0 flex-1 items-center gap-0.5 sm:flex">
            {navLinks}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3 text-xs sm:text-sm">
           <a
            href={storeUrl}
            className="text-cream-200 hover:text-white"
          >
           View store
            </a>
            <form action="/api/admin/logout" method="post">
              <button className="text-cream-200 hover:text-white">Log out</button>
            </form>
          </div>
        </div>
        <nav
          aria-label="Admin navigation"
          className="grid grid-cols-2 gap-1 border-t border-white/10 px-3 py-1.5 text-sm sm:hidden"
        >
          {navLinks}
        </nav>
      </div>
    </header>
  );
}
