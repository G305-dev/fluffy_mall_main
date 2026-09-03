"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Where to send the customer after creating an account. Defaults to checkout
  // (signup is usually entered from there), but honours a ?next= if provided.
  const requested = searchParams.get("next") || "";
  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/checkout";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/customer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create account");
      router.push(next);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Customer account</p>
      <h1 className="mt-2 font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">Create your account</h1>
      <p className="mt-3 text-sm leading-relaxed text-cocoa-700/70">
        Sign up to complete checkout and keep your order history together.
      </p>
      <form onSubmit={submit} className="mt-7 rounded-3xl bg-white p-5 ring-1 ring-cream-200 sm:mt-8 sm:p-6">
        <label className="block text-sm text-cocoa-800">
          Email address
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
          />
        </label>
        <label className="mt-4 block text-sm text-cocoa-800">
          Password
          <div className="relative mt-2">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-700/50 hover:text-cocoa-800"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <span className="mt-1 block text-xs text-cocoa-700/60">Use at least 8 characters.</span>
        </label>
        <label className="mt-4 block text-sm text-cocoa-800">
          Confirm password
          <div className="relative mt-2">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-700/50 hover:text-cocoa-800"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
        <button
          disabled={busy}
          className="mt-6 w-full rounded-full bg-cocoa-800 px-7 py-3 text-sm font-semibold text-cream-50 disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="mt-5 text-sm text-cocoa-700/70">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-terracotta-600">Sign in</Link>
        </p>
        <a href="/api/customer/google" className="mt-4 block rounded-full border border-cream-300 px-5 py-3 text-center text-sm font-semibold text-cocoa-800">
          Continue with Google
        </a>
      </form>
    </main>
  );
}
