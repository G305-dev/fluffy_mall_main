import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { naira } from "@/lib/format";
import settings from "@/data/settings.json";
import { MapPin, MessageCircle, Music2, Phone } from "lucide-react";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16 bg-cocoa-800 text-cream-100">
      {/* Big statement block — Adikastore-style display heading with italic accent */}
      <div className="border-b border-white/10">
        <div className="reveal mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-14 lg:px-8">
          <p className="text-xs uppercase tracking-[0.28em] text-gold-400">
            Fluffy&apos;n&apos;Yummy Mall
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl leading-tight sm:text-5xl text-cream-50">
            Every home, <em className="italic text-terracotta-400">functional.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-cream-300">
            Household, kitchen &amp; gifting essentials from Anthony Village to every state in Nigeria.
          </p>
          <div className="mx-auto mt-7 grid max-w-xs gap-3 min-[430px]:flex min-[430px]:max-w-none min-[430px]:flex-wrap min-[430px]:justify-center">
            <Link
              href="/shop"
              className="btn-pop rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white"
            >
              Shop Now
            </Link>
            <Link
              href="/contact"
              className="btn-pop rounded-full px-6 py-3 text-sm font-semibold text-cream-50 ring-1 ring-white/25"
            >
              Visit the Store
            </Link>
          </div>
          {/* Stat row — mirrors Adikastore's hero/footer stats */}
          <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-2 sm:gap-4">
            <div>
              <p className="font-display text-xl text-cream-50 sm:text-2xl">6</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-cream-300">Categories</p>
            </div>
            <div>
              <p className="font-display text-xl text-cream-50 sm:text-2xl">36</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-cream-300">States served</p>
            </div>
            <div>
              <p className="font-display text-xl text-cream-50 sm:text-2xl">41k+</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-cream-300">Fluffy lovers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto grid max-w-6xl gap-9 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display text-2xl text-cream-50">Fluffy&apos;n&apos;Yummy Mall</p>
          <p className="mt-3 text-sm leading-relaxed text-cream-300">{settings.tagline}</p>
          <p className="mt-4 flex items-start gap-2 text-sm text-cream-200">
            <MapPin size={15} className="mt-0.5 shrink-0 text-gold-400" />
            {settings.address}
          </p>
          <p className="mt-2 text-xs text-gold-400">{settings.hours}</p>
          <div className="mt-5 flex gap-3">
            <a
              href="https://instagram.com/fluffy_nyummy_mall"
              aria-label="Instagram"
              className="btn-pop grid h-9 w-9 place-items-center rounded-full bg-white/10 text-cream-100 hover:bg-terracotta-500"
            >
              <InstagramIcon size={16} />
            </a>
            <a
              href="https://tiktok.com/@fluffy_nyummy_mall"
              aria-label="TikTok"
              className="btn-pop grid h-9 w-9 place-items-center rounded-full bg-white/10 text-cream-100 hover:bg-terracotta-500"
            >
              <Music2 size={16} />
            </a>
            <a
              href={`https://wa.me/234${settings.phones[0]?.replace(/\D/g, "").replace(/^0/, "")}`}
              aria-label="WhatsApp"
              className="btn-pop grid h-9 w-9 place-items-center rounded-full bg-white/10 text-cream-100 hover:bg-terracotta-500"
            >
              <MessageCircle size={16} />
            </a>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-400">Browse categories</p>
          <ul className="mt-3 space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className="text-cream-200 transition hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className="font-semibold text-terracotta-400 transition hover:text-terracotta-300">
                All products →
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-400">Help</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/track" className="text-cream-200 transition hover:text-white">
                Track an order
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-cream-200 transition hover:text-white">
                Visit the store
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-cream-200 transition hover:text-white">
                About us
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="text-cream-200 transition hover:text-white">
                My orders
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-cream-200 transition hover:text-white">
                Sign in
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-400">Order &amp; pay</p>
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-cream-200">
            <Phone size={15} className="mt-0.5 shrink-0 text-gold-400" />
            WhatsApp {settings.phones.join(" · ")}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-cream-300">{settings.antiFraudNote}</p>
        </div>
      </div>

      {/* Bottom bar — Adikastore-style clean copyright strip */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 pb-20 pt-5 text-center text-xs text-cream-300 sm:px-6 sm:py-5 lg:flex-row lg:px-8 lg:text-left">
          <p>
            © {new Date().getFullYear()} Fluffy&apos;n&apos;Yummy Concepts. All rights reserved.
          </p>
          <p className="text-cream-300/70">
            Paystack · Bank transfer · WhatsApp orders · fluffynyummy.com
          </p>
        </div>
      </div>
    </footer>
  );
}
