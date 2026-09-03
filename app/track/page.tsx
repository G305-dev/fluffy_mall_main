"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackPage() {
  const [id, setId] = useState("");
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/customer/session")
      .then((response) => response.json())
      .then((data) => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16 text-center">
        <h1 className="font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">Sign in to track an order</h1>
        <p className="mt-3 text-sm text-cocoa-700/70">
          Sign in first so we can show only the orders connected to your account.
        </p>
        <button
          onClick={() => router.push("/login?next=/track")}
          className="mt-6 rounded-full bg-cocoa-800 px-6 py-3 text-sm font-semibold text-cream-50"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (authenticated === null) return <p className="p-10 text-center">Checking your account…</p>;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">Track an order</h1>
      <p className="mt-3 text-sm text-cocoa-700/70">
        Enter the order ID from your confirmation page or WhatsApp message (for example FNY-20260827-AB12).
      </p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (id.trim()) router.push(`/order/${id.trim().toUpperCase()}`);
        }}
      >
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="FNY-…"
          className="w-full rounded-2xl border border-cream-300 bg-white px-4 py-3"
        />
        <button className="w-full rounded-full bg-cocoa-800 py-3 text-sm font-semibold text-cream-50">
          View order
        </button>
      </form>
    </div>
  );
}
