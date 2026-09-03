import settings from "@/data/settings.json";
import { waLink } from "@/lib/format";

export const metadata = { title: "Visit & contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">Visit the store</h1>
      <p className="mt-3 max-w-xl text-cocoa-700">{settings.address}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:gap-8">
        <div className="overflow-hidden rounded-[2rem] ring-1 ring-cream-200">
          <iframe
            title="Store map"
            className="h-64 w-full sm:h-80"
            src="https://maps.google.com/maps?q=30A%20Oseni%20Street%20Anthony%20Village%20Lagos&t=&z=16&ie=UTF8&iwloc=&output=embed"
          />
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-cream-200 sm:rounded-[2rem] sm:p-8">
          <h2 className="font-display text-2xl">Hours</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {settings.openingHours.map((h) => (
              <li key={h.day} className="flex justify-between gap-4">
                <span>{h.day}</span>
                <span className="shrink-0 text-right">{h.hours}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-display text-2xl">WhatsApp lines</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {settings.phones.map((p) => (
              <li key={p}>
                <a className="text-terracotta-600" href={waLink(p, "Hello Fluffy'n'Yummy Mall!")}>
                  {p}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            Instagram{" "}
            <a className="underline" href="https://instagram.com/fluffy_nyummy_mall">
              @fluffy_nyummy_mall
            </a>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-cocoa-700/70">{settings.antiFraudNote}</p>
        </div>
      </div>
    </div>
  );
}
