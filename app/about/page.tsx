import settings from "@/data/settings.json";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Fluffy&apos;n&apos;Yummy Concepts</p>
      <h1 className="mt-3 font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">A Lagos home store, now open 24/7.</h1>
      <p className="mt-5 leading-relaxed text-cocoa-700">
        Fluffy&apos;n&apos;Yummy Mall is your one-stop store for everything home, kitchen and gifting. We trade from 30A Oseni Street, Anthony Village — opposite GTBank — and we&apos;ve grown a loyal following on Instagram and TikTok as @fluffy_nyummy_mall.
      </p>
      <p className="mt-4 leading-relaxed text-cocoa-700">
        This website turns the familiar screenshot-to-WhatsApp flow into a full catalog with prices, a cart, Paystack and company-account transfers, while keeping WhatsApp as a first-class ordering channel.
      </p>
      <ul className="mt-8 space-y-2 text-sm text-cocoa-700">
        <li>Kitchen appliances &amp; utensils — healthy cookware, blenders, slow juicers, kettles</li>
        <li>Home organisation — pantry organisers, shelves, acrylic drainers, cutlery organisers</li>
        <li>Household essentials — ladders (3–6 steps), ironing boards, scales, runner mats</li>
        <li>Corporate gifts &amp; souvenirs — events, weddings and office branding</li>
      </ul>
      <p className="mt-8 text-sm text-cocoa-700">{settings.address}</p>
      <p className="text-sm text-cocoa-700">WhatsApp {settings.phones.join(" · ")}</p>
    </div>
  );
}
