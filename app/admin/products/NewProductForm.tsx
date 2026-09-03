"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { CategorySlug } from "@/lib/types";
import { Plus, X } from "lucide-react";

const emptyForm = {
  name: "",
  price: "",
  category: CATEGORIES[0].slug as CategorySlug,
  stock: "",
  short: "",
  description: "",
  deliveryNote: "",
  featured: false,
  bestseller: false,
};

export default function NewProductForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function reset() {
    setForm(emptyForm);
    setFile(null);
    setPreview(null);
    setError(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose a product image.");
      return;
    }
    const price = Number(form.price);
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price.");
      return;
    }

    setBusy(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || "Image upload failed");
      }

      const createRes = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price,
          stock: Number(form.stock || 0),
          image: uploadJson.path,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createJson.error || "Could not create product");
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 flex items-center gap-2 rounded-full bg-cocoa-800 px-4 py-2 text-sm font-semibold text-cream-50"
      >
        <Plus size={16} /> Add product
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-cocoa-800">New product</h2>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-full p-1 text-cocoa-700/70 hover:bg-cream-100"
        >
          <X size={18} />
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Product name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Category
          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as CategorySlug })
            }
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Price (₦)
          <input
            required
            type="number"
            min="1"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Stock
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          Short description
          <input
            value={form.short}
            onChange={(e) => setForm({ ...form, short: e.target.value })}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
            placeholder="One line shown on product cards"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          Full description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          Additional delivery note (optional)
          <input
            value={form.deliveryNote}
            onChange={(e) => setForm({ ...form, deliveryNote: e.target.value })}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
            placeholder="For example: Large item — please confirm access."
          />
        </label>

        <label className="text-sm sm:col-span-2">
          Product image
          <input
            required
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Preview"
              className="mt-3 h-24 w-24 rounded-xl object-cover"
            />
          )}
        </label>

        <div className="grid gap-3 sm:col-span-2 sm:flex sm:gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Featured on homepage
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.bestseller}
              onChange={(e) => setForm({ ...form, bestseller: e.target.checked })}
            />
            Bestseller
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-full bg-terracotta-500 px-5 sm:w-auto py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}