"use client";

import { useState } from "react";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Triangle,
} from "lucide-react";
import Link from "next/link";

type Integration = {
  name: string;
  description: string;
  connected: boolean;
  icon: typeof Building2;
  tone: string;
  monogram?: string;
  details: Array<[string, string]>;
};

const integrations: Integration[] = [
  {
    name: "Bank transfers",
    description: "Accept and reconcile customer bank transfers.",
    connected: true,
    icon: Building2,
    tone: "bg-emerald-50 text-emerald-600",
    details: [
      ["Payment method", "Bank transfer"],
      ["Order handling", "Manual verification"],
    ],
  },
  {
    name: "Store POS",
    description: "Keep in-store sales and online stock in sync.",
    connected: true,
    icon: RefreshCw,
    tone: "bg-sky-50 text-sky-600",
    monogram: "POS",
    details: [
      ["Location", "Main store"],
      ["Last sync", "Today"],
    ],
  },
  {
    name: "Paystack",
    description: "Accept secure online payments at checkout.",
    connected: true,
    icon: Building2,
    tone: "bg-sky-50 text-sky-700",
    monogram: "P",
    details: [
      ["Provider", "Paystack"],
      ["Checkout", "Enabled"],
    ],
  },
  {
    name: "Instagram",
    description: "Bring your social presence closer to your store.",
    connected: false,
    icon: Camera,
    tone: "bg-pink-50 text-pink-600",
    details: [
      ["Channel", "@fluffy_nyummy_mall"],
      ["Connection", "Not configured"],
    ],
  },
  {
    name: "WhatsApp Business",
    description: "Connect business messaging for customer updates.",
    connected: false,
    icon: MessageCircle,
    tone: "bg-green-50 text-green-600",
    details: [
      ["Channel", "WhatsApp Business"],
      ["Connection", "Not configured"],
    ],
  },
  {
    name: "Vercel",
    description: "Monitor deployments and keep your storefront online.",
    connected: false,
    icon: Triangle,
    tone: "bg-stone-900 text-white",
    details: [
      ["Project", "Storefront"],
      ["Connection", "Not configured"],
    ],
  },
];

export default function IntegrationsDashboard() {
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const connectedCount = integrations.filter((item) => item.connected).length;
  const unconnectedCount = integrations.length - connectedCount;

  const stats = [
    { label: "Connected", value: connectedCount, icon: Check, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Not connected", value: unconnectedCount, icon: RefreshCw, tone: "bg-slate-100 text-slate-500" },
    { label: "Successful syncs", value: "—", detail: "not tracked", icon: RefreshCw, tone: "bg-violet-50 text-violet-600" },
    { label: "Failed syncs", value: "—", detail: "not tracked", icon: CircleAlert, tone: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-cocoa-800">Integrations</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Connect your store with external services to streamline your operations.
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2.5 text-sm font-medium text-orange-800 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <CircleAlert size={16} aria-hidden="true" />
          Integration support
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-cocoa-800">Available integrations</h2>
            <p className="mt-1 text-xs text-stone-500">
              Review the services connected to your store.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              const expanded = expandedIntegration === integration.name;

              return (
                <article
                  key={integration.name}
                  className="flex min-w-0 flex-col rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${integration.tone}`}>
                      {integration.monogram ? (
                        <span className={`font-bold ${integration.monogram.length > 1 ? "text-[10px]" : "text-lg"}`}>
                          {integration.monogram}
                        </span>
                      ) : (
                        <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        integration.connected
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {integration.connected ? "Connected" : "Not connected"}
                    </span>
                  </div>

                  <h3 className="mt-3 font-semibold text-cocoa-800">{integration.name}</h3>
                  <p className="mt-1 min-h-10 text-xs leading-5 text-stone-500">
                    {integration.description}
                  </p>

                  <div className="mt-3 border-t border-stone-100 pt-3">
                    {expanded && (
                      <dl className="mb-3 space-y-2">
                        {integration.details.map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-2 text-xs">
                            <dt className="text-stone-500">{label}</dt>
                            <dd className="text-right font-medium text-stone-700">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedIntegration(expanded ? null : integration.name)}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      {expanded ? "Hide details" : "View details"}
                      <ChevronRight
                        size={15}
                        aria-hidden="true"
                        className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>

                  {!integration.connected && (
                    <button
                      type="button"
                      disabled
                      title="Connection setup is not available yet"
                      className="mt-2 w-full cursor-not-allowed rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-400"
                    >
                      Connect — coming soon
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="font-semibold text-cocoa-800">Integration stats</h2>
            <div className="mt-3 space-y-1">
              {stats.map(({ label, value, detail, icon: Icon, tone }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl px-1 py-2">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold leading-none text-cocoa-800">{value}</p>
                    <p className="mt-1 text-[11px] text-stone-500">
                      {label}{detail ? ` (${detail})` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-cocoa-800">Recent activity</h2>
              <span className="text-[10px] text-stone-400">Latest</span>
            </div>
            <div className="mt-3 rounded-xl bg-stone-50 px-3 py-4 text-center">
              <Clock3 className="mx-auto text-stone-400" size={18} aria-hidden="true" />
              <p className="mt-2 text-xs font-medium text-stone-600">No integration events yet</p>
              <p className="mt-1 text-[10px] leading-4 text-stone-500">
                Sync history will appear here when connected services report activity.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <ShieldCheck className="shrink-0 text-emerald-700" size={20} aria-hidden="true" />
              <div>
                <h2 className="text-xs font-semibold text-emerald-900">Keep your store secure</h2>
                <p className="mt-1 text-[11px] leading-5 text-emerald-800/80">
                  Only connect services you trust and review their access regularly.
                </p>
                <Link
                  href="/contact"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline"
                >
                  Contact support
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
