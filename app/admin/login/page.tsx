"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Incorrect password");
      return;
    }
    router.push(params.get("next") || "/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <Image
        src="/images/fm logo.png"
        alt="Fluffy'n'Yummy Mall"
        width={64}
        height={64}
        className="mx-auto mb-5 h-16 w-16 rounded-full object-cover shadow-soft ring-2 ring-cream-200"
      />
      <p className="text-center text-xs uppercase tracking-[0.25em] text-gold-600">Staff only</p>
      <h1 className="mt-2 text-center font-display text-3xl">Store admin</h1>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-cream-300 px-4 py-3 pr-11"
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
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button className="w-full rounded-full bg-cocoa-800 py-3 text-sm font-semibold text-cream-50">
          Sign in
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
