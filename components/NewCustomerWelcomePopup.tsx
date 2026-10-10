"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { usePathname } from "next/navigation";

const ANONYMOUS_PROMO_KEY =
  "fny_anonymous_new_customer_promo_seen";

type PopupMode =
  | "anonymous"
  | "new-customer";

type SessionResponse = {
  authenticated?: boolean;
  showNewCustomerWelcome?: boolean;
};

export default function NewCustomerWelcomePopup() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [mode, setMode] =
    useState<PopupMode>("anonymous");

  useEffect(() => {
    if (
      !pathname ||
      pathname.startsWith("/admin")
    ) {
      return;
    }

    let cancelled = false;

    async function checkCustomerSession() {
      try {
        const response = await fetch(
          "/api/customer/session",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as SessionResponse;

        if (cancelled) {
          return;
        }

        if (
          data.authenticated &&
          data.showNewCustomerWelcome
        ) {
          setMode("new-customer");
          setOpen(true);

          /*
           * Mark the personal welcome message as
           * seen. This does not claim the discount.
           */
          void fetch(
            "/api/customer/welcome-seen",
            {
              method: "POST",
              credentials: "include",
              cache: "no-store",
            }
          );

          return;
        }

        if (data.authenticated) {
          setOpen(false);
          return;
        }

        let anonymousPromoSeen = false;

        try {
          anonymousPromoSeen =
            sessionStorage.getItem(
              ANONYMOUS_PROMO_KEY
            ) === "1";
        } catch {
          anonymousPromoSeen = false;
        }

        if (anonymousPromoSeen) {
          setOpen(false);
          return;
        }

        try {
          sessionStorage.setItem(
            ANONYMOUS_PROMO_KEY,
            "1"
          );
        } catch {
          // Continue showing the popup.
        }

        setMode("anonymous");
        setOpen(true);
      } catch {
        /*
         * Do not show a customer-specific popup if
         * the session request fails.
         */
      }
    }

    void checkCustomerSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!open) {
    return null;
  }

  const nextPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";

  const signUpHref = `/signup?next=${encodeURIComponent(
    nextPath
  )}`;

  const signInHref = `/login?next=${encodeURIComponent(
    nextPath
  )}`;

  const isNewCustomer =
    mode === "new-customer";

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-cocoa-900/60 px-4"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-customer-welcome-title"
        className="relative w-full max-w-md rounded-3xl bg-[#fff9f2] p-6 text-center shadow-2xl ring-1 ring-cream-200 sm:p-8"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close promotion"
          className="absolute right-4 top-4 rounded-full p-2 text-cocoa-700/70 hover:bg-cream-200 hover:text-cocoa-900"
        >
          <X size={20} />
        </button>

        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-terracotta-500 text-white">
          <Gift size={30} />
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
          New customer offer
        </p>

        <h2
          id="new-customer-welcome-title"
          className="mt-2 font-display text-3xl leading-tight text-cocoa-900"
        >
          {isNewCustomer
            ? "You are welcome!"
            : "Welcome to Fluffy'n'Yummy"}
        </h2>

        <p className="mt-4 text-base leading-relaxed text-cocoa-700/80">
          {isNewCustomer
            ? "Enjoy 5% off your first purchase as a new customer."
            : "Create an account or sign in to enjoy 5% off your first purchase as a new customer."}
        </p>

        {isNewCustomer ? (
          <Link
            href="/shop"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white hover:bg-cocoa-800"
          >
            Start shopping
          </Link>
        ) : (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={signUpHref}
              onClick={() => setOpen(false)}
              className="rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white hover:bg-cocoa-800"
            >
              Create account
            </Link>

            <Link
              href={signInHref}
              onClick={() => setOpen(false)}
              className="rounded-full border border-cocoa-900 px-6 py-3 text-sm font-semibold text-cocoa-900 hover:bg-cream-200"
            >
              Sign in
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 text-sm text-cocoa-700/60 underline-offset-2 hover:text-cocoa-900 hover:underline"
        >
          Maybe later
        </button>
      </section>
    </div>
  );
}