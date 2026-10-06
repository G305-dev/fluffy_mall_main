"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { naira, NIGERIAN_STATES } from "@/lib/format";
import {
  DELIVERY_CITIES,
  quoteDelivery,
  zoneFromState,
} from "@/lib/delivery";
import settingsFile from "@/data/settings.json";
import {
  Fulfilment,
  PayMethod,
  StoreSettings,
} from "@/lib/types";
import {
  NEW_CUSTOMER_DISCOUNT_PERCENT,
  roundMoney,
} from "@/lib/promotions";
import Link from "next/link";
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from "lucide-react";

type Step = 1 | 2 | 3;

function StepBadge({
  n,
  active,
  done,
}: {
  n: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition ${
        done
          ? "bg-sage-600 text-white"
          : active
            ? "bg-terracotta-500 text-white"
            : "bg-cream-200 text-cocoa-700/60"
      }`}
    >
      {done ? <Check size={16} /> : n}
    </span>
  );
}

export default function CheckoutPage() {
  const { items, subtotal } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Customers must sign in before checkout.
  const [gatePassed, setGatePassed] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] =
    useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState(
    () => searchParams.get("authError") || ""
  );
  const [signedInAs, setSignedInAs] = useState("");
  const [showSignInPassword, setShowSignInPassword] =
    useState(false);

  const [
    newCustomerDiscountEligible,
    setNewCustomerDiscountEligible,
  ] = useState(false);

  const [
    newCustomerDiscountPercent,
    setNewCustomerDiscountPercent,
  ] = useState(
    NEW_CUSTOMER_DISCOUNT_PERCENT
  );

  // Stepped checkout
  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);

  // Step 1 — contact
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2 — delivery
  const [state, setState] = useState("Lagos");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [fulfilment, setFulfilment] =
    useState<Fulfilment>("delivery");

  // Step 3 — payment
  const [method, setMethod] =
    useState<PayMethod>("paystack");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [settings, setSettings] =
    useState<StoreSettings>(
      settingsFile as StoreSettings
    );

  useEffect(() => {
    fetch("/api/settings")
      .then((response) =>
        response.ok ? response.json() : null
      )
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {
        // Keep the bundled settings fallback.
      });
  }, []);

  // Load the authenticated account and discount status.
  useEffect(() => {
    fetch("/api/customer/session", {
      cache: "no-store",
    })
      .then((response) =>
        response.ok ? response.json() : null
      )
      .then((data) => {
        if (data?.authenticated && data?.email) {
          setEmail(data.email);
          setSignedInAs(data.email);
          setGatePassed(true);
        }

        setNewCustomerDiscountEligible(
          Boolean(
            data?.newCustomerDiscountEligible
          )
        );

        const percent = Number(
          data?.newCustomerDiscountPercent
        );

        if (
          Number.isFinite(percent) &&
          percent > 0
        ) {
          setNewCustomerDiscountPercent(percent);
        }
      })
      .catch(() => {
        // Keep the sign-in screen visible.
      });
  }, []);

  const zone = zoneFromState(state);

  const quote = useMemo(
    () =>
      quoteDelivery({
        settings,
        fulfilment,
        zone,
        subtotal,
        city,
      }),
    [
      settings,
      fulfilment,
      zone,
      subtotal,
      city,
    ]
  );

  const newCustomerDiscount =
    newCustomerDiscountEligible
      ? roundMoney(
          subtotal *
            (newCustomerDiscountPercent / 100)
        )
      : 0;

  const checkoutTotal = roundMoney(
    Math.max(
      0,
      quote.total - newCustomerDiscount
    )
  );

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="font-display text-3xl">
          Nothing to check out
        </h1>

        <Link
          href="/shop"
          className="mt-4 inline-block text-terracotta-600"
        >
          Go to shop
        </Link>
      </div>
    );
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInBusy(true);
    setSignInError("");

    try {
      const response = await fetch(
        "/api/customer/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: signInEmail,
            password: signInPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 404) {
        router.push(
          `/signup?email=${encodeURIComponent(
            signInEmail
          )}`
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Could not sign in"
        );
      }

      const sessionResponse = await fetch(
        "/api/customer/session",
        {
          cache: "no-store",
        }
      );

      const sessionData =
        await sessionResponse.json().catch(
          () => null
        );

      const accountEmail =
        sessionData?.email || data.email;

      setEmail(accountEmail);
      setSignedInAs(accountEmail);

      setNewCustomerDiscountEligible(
        Boolean(
          sessionData?.newCustomerDiscountEligible
        )
      );

      const percent = Number(
        sessionData?.newCustomerDiscountPercent
      );

      if (
        Number.isFinite(percent) &&
        percent > 0
      ) {
        setNewCustomerDiscountPercent(percent);
      }

      setGatePassed(true);
    } catch (signInErrorValue) {
      setSignInError(
        signInErrorValue instanceof Error
          ? signInErrorValue.message
          : "Could not sign in"
      );
    } finally {
      setSignInBusy(false);
    }
  }

  function goTo(target: Step) {
    if (target <= maxStep) {
      setStep(target);
    }
  }

  function continueToDelivery(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim()) {
      setError("Name and phone number are required.");
      return;
    }

    setStep(2);
    setMaxStep((current) =>
      current < 2 ? 2 : current
    );
  }

  function continueToPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (fulfilment === "delivery" && !city) {
      setError("Please select your city.");
      return;
    }

    if (
      fulfilment === "delivery" &&
      !address.trim()
    ) {
      setError("Please add a delivery address.");
      return;
    }

    setStep(3);
    setMaxStep(3);
  }

  async function payNow(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            name,
            phone,
            email,
            address,
            state,
            city,
            notes,
          },
          items,
          fulfilment,
          method,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not place order"
        );
      }

      if (method === "paystack") {
        router.push(
          `/pay/paystack/${data.order.id}`
        );
      } else {
        router.push(
          `/pay/bank/${data.order.id}`
        );
      }
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Could not place order"
      );
    } finally {
      setBusy(false);
    }
  }

  const summary = (
    placement: "sidebar" | "top" = "sidebar"
  ) => (
    <aside
      className={`h-fit min-w-0 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-cream-200 sm:p-6 ${
        placement === "sidebar"
          ? "lg:sticky lg:top-32"
          : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-xl">
          Order summary
        </p>

        <span className="text-sm text-cocoa-700/60">
          {items.length} items
        </span>
      </div>

      <ul className="mt-5 min-w-0 space-y-3 border-b border-cream-200 pb-4 text-sm">
        {items.map((item) => (
          <li
            key={`${item.productId}-${item.variantId}`}
            className="flex min-w-0 justify-between gap-3"
          >
            <span className="min-w-0 break-words">
              {item.name}
              {item.variantName
                ? ` (${item.variantName})`
                : ""}{" "}
              × {item.qty}
            </span>

            <span className="shrink-0 font-medium">
              {naira(
                item.unitPrice * item.qty
              )}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{naira(subtotal)}</dd>
        </div>

        {newCustomerDiscount > 0 && (
          <div className="flex justify-between text-sage-600">
            <dt>
              New customer discount (
              {newCustomerDiscountPercent}%)
            </dt>

            <dd>
              -{naira(newCustomerDiscount)}
            </dd>
          </div>
        )}

        {quote.pickupDiscount > 0 && (
          <div className="flex justify-between text-sage-600">
            <dt>
              Pickup discount (
              {settings.pickupDiscountPercent}%)
            </dt>

            <dd>
              -{naira(quote.pickupDiscount)}
            </dd>
          </div>
        )}

        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd>
            {fulfilment === "pickup"
              ? "Pickup"
              : quote.freeDelivery
                ? "Free"
                : naira(quote.deliveryFee)}
          </dd>
        </div>

        <div className="flex justify-between border-t border-cream-200 pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{naira(checkoutTotal)}</dd>
        </div>
      </dl>
    </aside>
  );

  /* ---------- Gate: sign in ---------- */
  if (!gatePassed) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <main className="min-w-0">
          <h1 className="font-display text-3xl text-cocoa-800 sm:text-4xl">
            Ready to checkout?
          </h1>

          <p className="mt-3 max-w-xl text-base leading-relaxed text-cocoa-700/70">
            Sign in to continue to checkout. Your details are safe with us.
          </p>

          <div className="mt-7 max-w-xl">
            <form
              onSubmit={signIn}
              className="rounded-3xl bg-white p-5 ring-1 ring-cream-200 sm:p-6"
            >
              <h2 className="font-display text-lg leading-tight text-cocoa-800 sm:text-xl">
                Returning customer
              </h2>

              <p className="mt-2 text-sm text-cocoa-700/70">
                Sign in to use your saved details, view order history, and check out faster.
              </p>

              <label className="mt-5 block text-sm text-cocoa-800">
                Email address

                <input
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(event) =>
                    setSignInEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                />
              </label>

              <label className="mt-4 block text-sm text-cocoa-800">
                Password

                <div className="relative mt-2">
                  <input
                    type={
                      showSignInPassword
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={8}
                    value={signInPassword}
                    onChange={(event) =>
                      setSignInPassword(event.target.value)
                    }
                    className="w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 pr-11"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowSignInPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showSignInPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-700/50 hover:text-cocoa-800"
                  >
                    {showSignInPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>

              <button
                disabled={signInBusy}
                className="btn-pop mt-5 w-full rounded-full bg-cocoa-800 px-7 py-3 text-sm font-semibold text-cream-50 disabled:opacity-60"
              >
                {signInBusy
                  ? "Signing in…"
                  : "Sign in"}
              </button>

              <a
                href="/api/customer/google"
                className="btn-pop mt-3 block rounded-full border border-cream-300 px-4 py-2.5 text-center text-sm font-medium text-cocoa-800"
              >
                Continue with Google
              </a>

              <p className="mt-4 text-center text-sm text-cocoa-700/70">
                New here?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-terracotta-600"
                >
                  Create an account
                </Link>
              </p>
            </form>
          </div>

          {signInError && (
            <p className="mt-4 text-sm text-rose-700">
              {signInError}
            </p>
          )}
        </main>

        <div className="mt-7">
          {summary("top")}
        </div>
      </div>
    );
  }

  /* ---------- Stepped checkout: 1 Contact → 2 Delivery → 3 Payment ---------- */
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <main className="mt-7 min-w-0 space-y-4 sm:mt-10">
        <h1 className="font-display text-3xl text-cocoa-800 sm:text-4xl">
          Checkout
        </h1>

        <p className="break-all text-sm text-cocoa-700/70">
          Signed in as {signedInAs || email}.
        </p>

        {/* Step 1 — Contact */}
        <section className="rounded-3xl bg-white ring-1 ring-cream-200">
          <header className="flex items-start justify-between gap-3 p-4 sm:items-center sm:p-5">
            <div className="min-w-0 flex items-center gap-3">
              <StepBadge
                n={1}
                active={step === 1}
                done={maxStep > 1 && step !== 1}
              />

              <h2 className="font-display text-lg leading-tight text-cocoa-800 sm:text-xl">
                Contact information
              </h2>
            </div>

            {step !== 1 && maxStep > 1 && (
              <button
                onClick={() => goTo(1)}
                className="text-sm font-medium text-terracotta-600"
              >
                Edit
              </button>
            )}
          </header>

          {step === 1 ? (
            <form
              onSubmit={continueToDelivery}
              className="grid gap-4 border-t border-cream-100 p-4 sm:grid-cols-2 sm:p-5"
            >
              <label className="text-sm sm:col-span-2">
                Full name

                <input
                  required
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="mt-1 w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                />
              </label>

              <label className="text-sm">
                Phone / WhatsApp number

                <input
                  required
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="080…"
                  className="mt-1 w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                />

                <span className="mt-1 block text-xs text-cocoa-700/60">
                  We may contact you for delivery updates
                </span>
              </label>

              <label className="text-sm">
                Email address

                <input
                  type="email"
                  required
                  readOnly
                  value={email}
                  className="mt-1 w-full rounded-2xl border border-cream-300 bg-cream-100 px-4 py-3"
                />

                <span className="mt-1 block text-xs text-cocoa-700/60">
                  This is the email connected to your account
                </span>
              </label>

              {error && step === 1 && (
                <p className="text-sm text-rose-700 sm:col-span-2">
                  {error}
                </p>
              )}

              <div className="sm:col-span-2">
                <button className="btn-pop rounded-full bg-cocoa-800 px-5 py-3 text-sm font-semibold text-cream-50 sm:px-7">
                  Continue to delivery
                </button>
              </div>
            </form>
          ) : (
            maxStep > 1 && (
              <p className="break-words border-t border-cream-100 p-4 text-sm text-cocoa-700/70 sm:p-5">
                {name} · {phone} · {email}
              </p>
            )
          )}
        </section>

        {/* Step 2 — Delivery */}
        <section
          className={`rounded-3xl bg-white ring-1 ring-cream-200 ${
            maxStep < 2 ? "opacity-50" : ""
          }`}
        >
          <header className="flex items-start justify-between gap-3 p-4 sm:items-center sm:p-5">
            <div className="min-w-0 flex items-center gap-3">
              <StepBadge
                n={2}
                active={step === 2}
                done={maxStep > 2 && step !== 2}
              />

              <h2 className="font-display text-lg leading-tight text-cocoa-800 sm:text-xl">
                Delivery
              </h2>
            </div>

            {step !== 2 && maxStep > 2 && (
              <button
                onClick={() => goTo(2)}
                className="text-sm font-medium text-terracotta-600"
              >
                Edit
              </button>
            )}
          </header>

          {step === 2 && (
            <form
              onSubmit={continueToPayment}
              className="grid gap-4 border-t border-cream-100 p-4 sm:p-5"
            >
              <div>
                <p className="text-sm">
                  How should we get this to you?
                </p>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFulfilment("delivery")
                    }
                    className={`rounded-2xl p-4 text-left ring-1 transition ${
                      fulfilment === "delivery"
                        ? "bg-cocoa-800 text-cream-50 ring-cocoa-800"
                        : "ring-cream-300"
                    }`}
                  >
                    <p className="font-medium">
                      Delivery
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFulfilment("pickup")
                    }
                    className={`rounded-2xl p-4 text-left ring-1 transition ${
                      fulfilment === "pickup"
                        ? "bg-cocoa-800 text-cream-50 ring-cocoa-800"
                        : "ring-cream-300"
                    }`}
                  >
                    <p className="font-medium">
                      Pickup in store
                    </p>

                    <p className="mt-1 text-xs opacity-80">
                      {settings.address}
                    </p>
                  </button>
                </div>
              </div>

              <label className="text-sm">
                State

                <select
                  value={state}
                  onChange={(event) =>
                    setState(event.target.value)
                  }
                  className="mt-1 w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                >
                  {NIGERIAN_STATES.map(
                    (nigerianState) => (
                      <option key={nigerianState}>
                        {nigerianState}
                      </option>
                    )
                  )}
                </select>
              </label>

              {fulfilment === "delivery" && (
                <label className="text-sm">
                  City

                  <select
                    required
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                    className="mt-1 w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                  >
                    <option value="">
                      Select your city
                    </option>

                    {DELIVERY_CITIES.map(
                      (deliveryCity) => (
                        <option
                          key={deliveryCity}
                          value={deliveryCity}
                        >
                          {deliveryCity}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}

              {fulfilment === "delivery" && (
                <label className="text-sm">
                  Delivery address

                  <textarea
                    required
                    value={address}
                    onChange={(event) =>
                      setAddress(event.target.value)
                    }
                    rows={3}
                    className="mt-1 w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                  />
                </label>
              )}

              <label className="text-sm">
                Order notes (optional)

                <input
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  className="mt-1 w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                />
              </label>

              {error && step === 2 && (
                <p className="text-sm text-rose-700">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 sm:flex">
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="rounded-full px-6 py-3 text-sm font-medium text-cocoa-700 ring-1 ring-cream-300"
                >
                  Back
                </button>

                <button className="btn-pop rounded-full bg-cocoa-800 px-5 py-3 text-sm font-semibold text-cream-50 sm:px-7">
                  Continue to payment
                </button>
              </div>
            </form>
          )}

          {step !== 2 && maxStep > 2 && (
            <p className="break-words border-t border-cream-100 p-4 text-sm text-cocoa-700/70 sm:p-5">
              {fulfilment === "pickup"
                ? `Pickup at ${settings.address}`
                : `Deliver to ${address}, ${city}, ${state}`}
            </p>
          )}
        </section>

        {/* Step 3 — Payment */}
        <section
          className={`rounded-3xl bg-white ring-1 ring-cream-200 ${
            maxStep < 3 ? "opacity-50" : ""
          }`}
        >
          <header className="flex items-center gap-3 p-5">
            <StepBadge
              n={3}
              active={step === 3}
              done={false}
            />

            <h2 className="font-display text-lg leading-tight text-cocoa-800 sm:text-xl">
              Payment
            </h2>
          </header>

          {step === 3 && (
            <form
              onSubmit={payNow}
              className="grid gap-4 border-t border-cream-100 p-4 sm:p-5"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setMethod("paystack")
                  }
                  className={`rounded-2xl p-4 text-left ring-1 transition ${
                    method === "paystack"
                      ? "bg-terracotta-500 text-white ring-terracotta-500"
                      : "ring-cream-300"
                  }`}
                >
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldCheck size={16} />
                    Secure payment via Paystack
                  </p>

                  <p className="mt-1 text-xs opacity-80">
                    Pay with card, bank transfer, or USSD — all in one secure checkout.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMethod("bank_transfer")
                  }
                  className={`rounded-2xl p-4 text-left ring-1 transition ${
                    method === "bank_transfer"
                      ? "bg-terracotta-500 text-white ring-terracotta-500"
                      : "ring-cream-300"
                  }`}
                >
                  <p className="font-medium">
                    Company bank transfer
                  </p>

                  <p className="mt-1 text-xs opacity-80">
                    Parallex or Providus — we confirm in admin
                  </p>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Visa",
                  "Mastercard",
                  "Verve",
                  "Bank Transfer",
                  "USSD",
                ].map((paymentMethod) => (
                  <span
                    key={paymentMethod}
                    className="rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-cocoa-700"
                  >
                    {paymentMethod}
                  </span>
                ))}
              </div>

              <p className="text-xs leading-relaxed text-cocoa-700/70">
                {settings.antiFraudNote}
              </p>

              {error && step === 3 && (
                <p className="text-sm text-rose-700">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex">
                <button
                  type="button"
                  onClick={() => goTo(2)}
                  className="rounded-full px-6 py-3 text-sm font-medium text-cocoa-700 ring-1 ring-cream-300"
                >
                  Back
                </button>

                <button
                  disabled={busy}
                  className="btn-pop min-w-0 rounded-full bg-terracotta-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:px-8"
                >
                  {busy
                    ? "Processing…"
                    : `Pay now · ${naira(checkoutTotal)}`}
                </button>
              </div>

              <p className="flex items-start gap-1.5 text-xs text-cocoa-700/60">
                <Lock
                  size={12}
                  className="mt-0.5 shrink-0"
                />
                Your card details are never stored. Payment is handled securely by Paystack.
              </p>
            </form>
          )}
        </section>
      </main>

      <div className="mt-7">
        {summary("top")}
      </div>
    </div>
  );
}