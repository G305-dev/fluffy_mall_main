import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import CategoryProductRail from "@/components/CategoryProductRail";
import { CATEGORIES } from "@/lib/categories";
import { getProducts } from "@/lib/db";
import settings from "@/data/settings.json";
import {
  MapPin,
  ShoppingBag,
  Truck,
  BadgePercent,
} from "lucide-react";
import HeroSlideshow from "@/components/HeroSlideshow";
import NewsletterPopup from "@/components/NewsletterPopup";

export default async function HomePage() {
  const products = await getProducts();

  const featured = products
    .filter((product) => product.featured)
    .slice(0, 8);

  const bestsellers = products
    .filter((product) => product.bestseller)
    .slice(0, 4);

  return (
    <div>
      <NewsletterPopup />

     {/* Mobile and tablet hero — previous layout */}
<section className="relative min-h-[560px] overflow-hidden sm:min-h-[650px] lg:hidden">
  <HeroSlideshow variant="background" />

  <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
    <p className="animate-hero animate-hero-1 text-[10px] uppercase leading-relaxed tracking-[0.18em] text-gold-400 sm:text-xs sm:tracking-[0.28em]">
      Lagos · @fluffy_nyummy_mall
    </p>

    <h1 className="animate-hero animate-hero-2 mt-4 max-w-xl font-display text-4xl leading-tight text-cream-50 sm:text-6xl">
      Home, kitchen &amp; gifting.
    </h1>

    <p className="animate-hero animate-hero-3 mt-5 max-w-lg text-base text-cream-200 sm:text-lg">
      {settings.tagline}. Browse prices, pay securely with Paystack, or order on WhatsApp.
    </p>

    <div className="animate-hero animate-hero-4 mt-8 grid gap-3 min-[430px]:flex min-[430px]:flex-wrap">
      <Link
        href="/shop"
        className="btn-pop rounded-full bg-terracotta-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg"
      >
        Shop the catalog
      </Link>

      <Link
        href="/contact"
        className="btn-pop rounded-full bg-white/10 px-6 py-3 text-center text-sm font-semibold text-cream-50 ring-1 ring-white/30"
      >
        Visit 30A Oseni Street
      </Link>
    </div>
  </div>
</section>

{/* Desktop hero — separated text and slideshow */}
<section className="hidden bg-cream-100 lg:block">
  <div className="mx-auto max-w-6xl px-8 py-8">
    <div className="grid overflow-hidden rounded-[2rem] bg-cream-100 shadow-card ring-1 ring-cream-200 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex min-h-[560px] flex-col justify-center px-12 py-20">
        <p className="animate-hero animate-hero-1 text-xs uppercase tracking-[0.28em] text-gold-600">
          Lagos · @fluffy_nyummy_mall
        </p>

        <h1 className="animate-hero animate-hero-2 mt-4 max-w-xl font-display text-5xl leading-tight text-cocoa-800 xl:text-6xl">
          Home, kitchen &amp; gifting.
        </h1>

        <p className="animate-hero animate-hero-3 mt-5 max-w-lg text-lg leading-relaxed text-cocoa-700">
          {settings.tagline}. Browse prices, pay securely with Paystack, or order on WhatsApp.
        </p>

        <div className="animate-hero animate-hero-4 mt-8 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="btn-pop rounded-full bg-terracotta-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg"
          >
            Shop the catalog
          </Link>

          <Link
            href="/contact"
            className="btn-pop rounded-full bg-cocoa-800 px-6 py-3 text-center text-sm font-semibold text-cream-50"
          >
            Visit 30A Oseni Street
          </Link>
        </div>
      </div>

      <div className="min-h-[560px]">
        <HeroSlideshow variant="panel" />
      </div>
    </div>
  </div>
</section>

      <div className="overflow-hidden border-y border-cream-200 bg-terracotta-500 text-white">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap py-2.5 text-sm">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="flex gap-10 px-6"
            >
              <span>
                Home, kitchen &amp; gifting essentials
              </span>

              <span>
                Paystack · WhatsApp
              </span>

              <span>
                Shop online or visit our Lagos store
              </span>

              <span>
                30A Oseni Street, Anthony Village
              </span>
            </div>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="reveal flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gold-600">
              Shop from categories
            </p>

            <h2 className="mt-2 font-display text-3xl text-cocoa-800">
              Categories
            </h2>
          </div>

          <Link
            href="/shop"
            className="text-sm text-terracotta-600"
          >
            View all
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((category, index) => (
            <Link
              key={category.slug}
              href={`/shop/${category.slug}`}
              data-reveal-delay={index * 70}
              className="reveal hover-lift min-w-0 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-cream-200 sm:p-4"
            >
              <span className="text-2xl">
                {category.emoji}
              </span>

              <p className="mt-3 font-display text-base leading-snug text-cocoa-800">
                {category.name}
              </p>

              <p className="mt-1 text-xs text-cocoa-700/70">
                {category.blurb}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Jumia-style product rows for every category */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {CATEGORIES.map((category, index) => {
            const categoryProducts = products
              .filter(
                (product) =>
                  product.category === category.slug
              )
              .slice(0, 12);

            if (categoryProducts.length === 0) {
              return null;
            }

            return (
              <CategoryProductRail
                key={category.slug}
                category={category}
                products={categoryProducts}
                index={index}
              />
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <h2 className="reveal font-display text-3xl text-cocoa-800">
          Featured for launch
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((product, index) => (
            <div
              key={product.id}
              className="reveal"
              data-reveal-delay={(index % 4) * 90}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="reveal hover-lift rounded-3xl bg-cocoa-800 p-6 text-cream-50">
            <Truck className="text-gold-400" />

            <h3 className="mt-4 font-display text-2xl">
              Nationwide delivery
            </h3>
          </div>

          <div
            className="reveal hover-lift rounded-3xl bg-terracotta-500 p-6 text-white"
            data-reveal-delay={120}
          >
            <BadgePercent />

            <h3 className="mt-4 font-display text-2xl">
              Pickup from store
            </h3>

            <p className="mt-2 text-sm text-white/90">
              Collect at {settings.address}.
            </p>
          </div>

          <div
            className="reveal hover-lift rounded-3xl bg-cream-200 p-6 text-cocoa-800"
            data-reveal-delay={240}
          >
            <ShoppingBag />

            <h3 className="mt-4 font-display text-2xl">
              Order on WhatsApp
            </h3>

            <p className="mt-2 text-sm text-cocoa-700">
              Still prefer DMs? Every product has a pre-filled WhatsApp order. Lines:{" "}
              {settings.phones.join(" · ")}.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="reveal font-display text-3xl text-cocoa-800">
          Store bestsellers
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-4">
          {bestsellers.map((product, index) => (
            <div
              key={product.id}
              className="reveal"
              data-reveal-delay={index * 90}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="reveal overflow-hidden rounded-[2rem] bg-white shadow-card ring-1 ring-cream-200 md:grid md:grid-cols-2">
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.22em] text-gold-600">
              Physical store
            </p>

            <h2 className="mt-2 font-display text-3xl text-cocoa-800">
              Come in, see it, take it home.
            </h2>

            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-cocoa-700">
              <MapPin
                className="mt-0.5 shrink-0"
                size={16}
              />

              {settings.address}
            </p>

            <p className="mt-3 text-sm text-cocoa-700">
              {settings.hours}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-cocoa-800 px-5 py-2.5 text-sm text-cream-50"
              >
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