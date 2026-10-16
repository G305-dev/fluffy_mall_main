"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupAdminForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/admin/staff/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create the first Admin account.");
      router.replace("/admin");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not create the first Admin account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">First-time setup</p>
      <h1 className="mt-2 font-display text-2xl text-cocoa-800">Create the first Admin account</h1>
      <p className="mt-2 text-sm text-stone-600">
        This account replaces shared-password sign-in and can manage staff access.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-stone-700">
          Full name
          <input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5" />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Email
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5" />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          New password
          <input required minLength={7} maxLength={256} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5" />
          <span className="mt-1 block text-xs text-stone-500">Use at least 7 characters.</span>
        </label>
        <label className="block text-sm font-medium text-stone-700">
          Confirm password
          <input required minLength={7} maxLength={256} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5" />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={saving} className="w-full rounded-xl bg-cocoa-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? "Creating account…" : "Create Admin account"}
        </button>
      </form>
    </div>
  );
}
