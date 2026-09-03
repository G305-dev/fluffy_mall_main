import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/categories";
import { naira } from "@/lib/format";
import { getProducts } from "@/lib/db";
import settings from "@/data/settings.json";
import { MapPin, ShoppingBag, Truck, BadgePercent } from "lucide-react";
import Image from "next/image";

export default async function HomePage() {
  const products = await getProducts();
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const bestsellers = products.filter((p) => p.bestseller).slice(0, 4);

  return (
    <div>
      <section className="relative min-h-[560px] overflow-hidden sm:min-h-[650px] lg:min-h-[680px]">
        <div className="absolute inset-0 animate-hero-bg">
          <Image
            src="/images/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_28%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cocoa-900/80 via-cocoa-900/50 to-cocoa-900/20" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <p className="animate-hero animate-hero-1 text-[10px] uppercase leading-relaxed tracking-[0.18em] sm:text-xs sm:tracking-[0.28em] text-gold-400">
            Lagos · @fluffy_nyummy_mall
          </p>
          <h1 className="animate-hero animate-hero-2 mt-4 max-w-xl font-display text-4xl leading-tight text-cream-50 sm:text-6xl">
            Home, kitchen &amp; gifting.
          </h1>
          <p className="animate-hero animate-hero-3 mt-5 max-w-lg text-base text-cream-200 sm:text-lg">
            {settings.tagline}. Browse prices, pay with Paystack or transfer, or order on WhatsApp the way you always have.
          </p>
          <div className="animate-hero animate-hero-4 mt-8 grid gap-3 min-[430px]:flex min-[430px]:flex-wrap">
            <Link
              href="/shop"
              className="btn-pop rounded-full bg-terracotta-500 text-center px-6 py-3 text-sm font-semibold text-white shadow-lg"
            >
              Shop the catalog
            </Link>
            <Link
              href="/contact"
              className="btn-pop rounded-full bg-white/10 text-center px-6 py-3 text-sm font-semibold text-cream-50 ring-1 ring-white/30"
            >
              Visit 30A Oseni Street
            </Link>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-cream-200 bg-terracotta-500 text-white">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap py-2.5 text-sm">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-10 px-6">
              <span>Free Lagos delivery from {naira(settings.lagosFreeThreshold)}</span>
              <span>Free nationwide from {naira(settings.outsideFreeThreshold)}</span>
              <span>2%–5% off for in-store pickup</span>
              <span>Paystack · Bank transfer · WhatsApp</span>
              <span>30A Oseni Street, Anthony Village</span>
            </div>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="reveal flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Shop from categories</p>
            <h2 className="mt-2 font-display text-3xl text-cocoa-800">Categories</h2>
          </div>
          <Link href="/shop" className="text-sm text-terracotta-600">
            View all
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              data-reveal-delay={i * 70}
              className="reveal hover-lift min-w-0 rounded-2xl bg-white p-3 sm:p-4 shadow-soft ring-1 ring-cream-200"
            >
              <span className="text-2xl">{c.emoji}</span>
              <p className="mt-3 font-display text-base leading-snug text-cocoa-800">{c.name}</p>
              <p className="mt-1 text-xs text-cocoa-700/70">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <h2 className="reveal font-display text-3xl text-cocoa-800">Featured for launch</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p, i) => (
            <div key={p.id} className="reveal" data-reveal-delay={(i % 4) * 90}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="reveal hover-lift rounded-3xl bg-cocoa-800 p-6 text-cream-50">
            <Truck className="text-gold-400" />
            <h3 className="mt-4 font-display text-2xl">Nationwide delivery</h3>
            <p className="mt-2 text-sm text-cream-300">
              Lagos fee {naira(settings.lagosDeliveryFee)}, outside Lagos {naira(settings.outsideDeliveryFee)}. Free at {naira(settings.lagosFreeThreshold)} / {naira(settings.outsideFreeThreshold)}.
            </p>
          </div>
          <div className="reveal hover-lift rounded-3xl bg-terracotta-500 p-6 text-white" data-reveal-delay={120}>
            <BadgePercent />
            <h3 className="mt-4 font-display text-2xl">Pickup &amp; save</h3>
            <p className="mt-2 text-sm text-white/90">
              Collect at {settings.address} and enjoy a {settings.pickupDiscountPercent}% walk-in discount (2%–5% as in store).
            </p>
          </div>
          <div className="reveal hover-lift rounded-3xl bg-cream-200 p-6 text-cocoa-800" data-reveal-delay={240}>
            <ShoppingBag />
            <h3 className="mt-4 font-display text-2xl">Order on WhatsApp</h3>
            <p className="mt-2 text-sm text-cocoa-700">
              Still prefer DMs? Every product has a pre-filled WhatsApp order. Lines: {settings.phones.join(" · ")}.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="reveal font-display text-3xl text-cocoa-800">Store bestsellers</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-4">
          {bestsellers.map((p, i) => (
            <div key={p.id} className="reveal" data-reveal-delay={i * 90}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="reveal overflow-hidden rounded-[2rem] bg-white shadow-card ring-1 ring-cream-200 md:grid md:grid-cols-2">
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Physical store</p>
            <h2 className="mt-2 font-display text-3xl text-cocoa-800">Come in, see it, take it home.</h2>
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-cocoa-700">
              <MapPin className="mt-0.5 shrink-0" size={16} />
              {settings.address}
            </p>
            <p className="mt-3 text-sm text-cocoa-700">{settings.hours}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-full bg-cocoa-800 px-5 py-2.5 text-sm text-cream-50">
                Directions &amp; hours
              </Link>
              <a
                href="https://instagram.com/fluffy_nyummy_mall"
                className="rounded-full px-5 py-2.5 text-sm ring-1 ring-cream-300"
              >
                @fluffy_nyummy_mall
              </a>
            </div>
          </div>
          <iframe
            title="Fluffy'n'Yummy Mall map"
            className="h-72 w-full md:h-full"
            loading="lazy"
            src="https://maps.google.com/maps?q=30A%20Oseni%20Street%20Anthony%20Village%20Lagos&t=&z=16&ie=UTF8&iwloc=&output=embed"
          />
        </div>
      </section>
    </div>
  );
}
