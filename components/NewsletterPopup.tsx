"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

type PopupStatus =
  | "closed"
  | "subscribed";

type SessionResponse = {
  authenticated?: boolean;
  newsletterSubscribed?: boolean;
};

const AUTH_CHANGED_EVENT =
  "fny:customer-auth-changed";

export default function NewsletterPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const [status, setStatus] =
    useState<PopupStatus>("closed");

  const [firstName, setFirstName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      setOpen(false);
      setStatus("closed");
      return;
    }

    let cancelled = false;

    let timer:
      | ReturnType<typeof setTimeout>
      | undefined;

    let requestVersion = 0;

    function clearPopupTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }

    async function checkNewsletterEligibility() {
      const currentVersion =
        ++requestVersion;

      clearPopupTimer();

      /*
       * Hide the popup while checking the
       * current signed-in customer.
       */
      setOpen(false);
      setStatus("closed");

      try {
        const response = await fetch(
          "/api/customer/session",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as SessionResponse;

        if (
          cancelled ||
          currentVersion !== requestVersion
        ) {
          return;
        }

        /*
         * Fail closed:
         *
         * - Guests do not see the popup.
         * - Subscribed customers do not see it.
         * - Missing subscription information does
         *   not show a marketing popup.
         */
        if (
          !data.authenticated ||
          data.newsletterSubscribed !== false
        ) {
          return;
        }

        timer = setTimeout(() => {
          if (
            !cancelled &&
            currentVersion === requestVersion
          ) {
            setStatus("closed");
            setOpen(true);
          }
        }, 1200);
      } catch {
        /*
         * Do not show the popup if the customer
         * or subscription check fails.
         */
      }
    }

    function handleAuthChange() {
      void checkNewsletterEligibility();
    }

    void checkNewsletterEligibility();

    window.addEventListener(
      AUTH_CHANGED_EVENT,
      handleAuthChange
    );

    return () => {
      cancelled = true;
      requestVersion += 1;
      clearPopupTimer();

      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        handleAuthChange
      );
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function closePopup(
    nextStatus: PopupStatus
  ) {
    setOpen(false);
    setStatus(nextStatus);
  }

  function dismiss() {
    /*
     * Closing does not create a subscription.
     * The popup can appear on a future visit if
     * the customer is still not subscribed.
     */
    setOpen(false);
    setStatus("closed");
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        "/api/subscribers",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: firstName,
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not complete subscription."
        );
      }

      /*
       * The server has now created or reactivated
       * the customer's newsletter subscription.
       */
      setStatus("subscribed");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not complete subscription."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open || pathname?.startsWith("/admin")) {
    return null;
  }

  const successful =
    status === "subscribed";

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-popup-title"
    >
      <div className="relative w-full max-w-[610px] overflow-hidden rounded-2xl border-b-4 border-terracotta-500 bg-white shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close newsletter popup"
          className="absolute right-4 top-4 z-10 rounded-full p-1 text-cocoa-700/60 transition hover:bg-cream-100 hover:text-cocoa-800"
        >
          <X size={22} />
        </button>

        {successful ? (
          <div className="px-6 py-14 text-center sm:px-12 sm:py-16">
            <h2
              id="newsletter-popup-title"
              className="font-display text-3xl text-cocoa-800 sm:text-4xl"
            >
              Thank You for Subscribing!
            </h2>

            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-cocoa-700/80">
              You&apos;ve been added to our mailing list and will get updates about our products and special offers.
            </p>

            <button
              type="button"
              onClick={() =>
                closePopup("subscribed")
              }
              className="mt-8 rounded-none bg-terracotta-500 px-6 py-3 text-base font-medium text-white transition hover:bg-terracotta-600"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="px-6 py-10 sm:px-9 sm:py-11">
            <h2
              id="newsletter-popup-title"
              className="text-center font-display text-3xl text-cocoa-800 sm:text-4xl"
            >
              Unlock Exclusive Deals
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-center text-base leading-relaxed text-cocoa-700/80 sm:text-lg">
              Join the Insider Club! Get exclusive deals, early product access, and perks.
            </p>

            <form
              onSubmit={submit}
              className="mt-8 space-y-4"
            >
              <label
                className="sr-only"
                htmlFor="newsletter-first-name"
              >
                First name
              </label>

              <input
                id="newsletter-first-name"
                type="text"
                required
                maxLength={80}
                value={firstName}
                onChange={(event) =>
                  setFirstName(event.target.value)
                }
                placeholder="First Name"
                className="w-full rounded-md border border-cream-300 bg-white px-4 py-4 text-base text-cocoa-800 outline-none placeholder:text-cocoa-700/40 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20"
              />

              <label
                className="sr-only"
                htmlFor="newsletter-email"
              >
                Email address
              </label>

              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Email Address"
                className="w-full rounded-md border border-cream-300 bg-white px-4 py-4 text-base text-cocoa-800 outline-none placeholder:text-cocoa-700/40 focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20"
              />

              {error && (
                <p className="text-center text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-none bg-terracotta-500 px-5 py-4 text-base font-medium text-white transition hover:bg-terracotta-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Subscribing…"
                  : "Subscribe Now"}
              </button>
            </form>

            <button
              type="button"
              onClick={dismiss}
              className="mx-auto mt-6 block text-base text-red-700 transition hover:text-red-900"
            >
              No thanks, I&apos;ll miss out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}