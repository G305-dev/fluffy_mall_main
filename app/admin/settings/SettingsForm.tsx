"use client";

import { StoreSettings } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function num(key: keyof StoreSettings, value: string) {
    setForm({ ...form, [key]: Number(value) } as StoreSettings);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6">
      {(
        [
          ["lagosDeliveryFee", "Lagos delivery fee"],
          ["outsideDeliveryFee", "Outside Lagos delivery fee"],
          ["lagosFreeThreshold", "Free delivery threshold — Lagos"],
          ["outsideFreeThreshold", "Free delivery threshold — outside Lagos"],
          ["pickupDiscountPercent", "Pickup discount %"],
        ] as [keyof StoreSettings, string][]
      ).map(([key, label]) => (
        <label key={key} className="block text-sm">
          {label}
          <input
            type="number"
            value={form[key] as number}
            onChange={(e) => num(key, e.target.value)}
            className="mt-1 w-full rounded-2xl border border-cream-300 px-4 py-2"
          />
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-full bg-cocoa-800 px-6 py-2.5 text-sm text-cream-50">Save settings</button>
        {saved && <span className="text-sm text-sage-600">Saved</span>}
      </div>
    </form>
  );
}
