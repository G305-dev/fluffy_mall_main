"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const policies = [
  "Return requests must be made within 24–48 hours of receiving the order. Please notify us before returning any item.",
  "There are no cash refunds after payment has been made or after a purchase has been completed.",
  "Returned items must be neat, unused, complete, and well packaged in the same condition in which they were received or purchased.",
  "Please contact us by phone or WhatsApp before sending any item back so that we can guide you through the return process.",
  "All returned items are subject to inspection before a return is accepted.",
];

export default function CheckoutPolicyModal() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-policy-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-b-4 border-terracotta-500 bg-white shadow-2xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close returns and refunds policy"
          className="absolute right-4 top-4 rounded-full p-1 text-cocoa-700/60 transition hover:bg-cream-100 hover:text-cocoa-800"
        >
          <X size={22} />
        </button>

        <div className="px-6 py-8 sm:px-9 sm:py-10">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-gold-600">
            Before you continue
          </p>

          <h2
            id="checkout-policy-title"
            className="mt-3 text-center font-display text-3xl text-cocoa-800 sm:text-4xl"
          >
            Returns &amp; refunds policy
          </h2>

          <p className="mt-4 text-center text-sm leading-relaxed text-cocoa-700/75">
            Please read our policy carefully before completing your order.
          </p>

          <ul className="mt-7 space-y-4">
            {policies.map((policy) => (
              <li
                key={policy}
                className="flex items-start gap-3 text-sm leading-relaxed text-cocoa-700"
              >
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-terracotta-500"
                />

                <span>{policy}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-8 w-full rounded-none bg-terracotta-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-terracotta-600"
          >
            I understand and continue
          </button>
        </div>
      </div>
    </div>
  );
}