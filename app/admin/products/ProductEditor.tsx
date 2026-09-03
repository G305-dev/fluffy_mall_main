"use client";

import { Product } from "@/lib/types";
import { categoryName } from "@/lib/categories";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Trash2 } from "lucide-react";

export default function ProductEditor({
  product,
  mobile = false,
}: {
  product: Product;
  mobile?: boolean;
}) {
  const [price, setPrice] = useState(product.price);
  const [stock, setStock] = useState(product.stock);
  const [name, setName] = useState(product.name);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  async function save() {
    setBusy(true);
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, price, stock, name }),
    });
    setBusy(false);
    router.refresh();
  }

  async function changeImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setImageError(null);
    setBusy(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Image upload failed");

      const patchRes = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, image: uploadJson.path }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchJson.error || "Could not update image");
      router.refresh();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirming) {
      // First click arms the button; it disarms itself after 4 seconds.
      setConfirming(true);
      confirmTimer.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setBusy(true);
    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id }),
    });
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  if (mobile) {
    return (
      <article className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-cream-200">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            title="Change image"
            aria-label={`Change image for ${product.name}`}
            className="group relative shrink-0 disabled:opacity-60"
          >
            <Image
              src={product.images[0]}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-cover"
            />
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-cocoa-800 text-cream-50 ring-2 ring-white">
              <Camera size={11} />
            </span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={changeImage}
            className="hidden"
          />
          <div className="min-w-0 flex-1">
            <label className="block text-xs text-stone-500">
              Product name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-2 text-base"
              />
            </label>
            <p className="mt-1 text-xs text-cocoa-700/60">{categoryName(product.category)}</p>
          </div>
        </div>
        {imageError && <p className="mt-2 break-words text-xs text-red-600">{imageError}</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-stone-500">
            Price (₦)
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-2 text-base"
            />
          </label>
          <label className="text-xs text-stone-500">
            Stock
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-2 text-base"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-cream-100 pt-3">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-cocoa-800 px-5 py-2 text-sm text-cream-50 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            aria-label={confirming ? "Confirm delete" : `Delete ${product.name}`}
            className={
              confirming
                ? "flex items-center gap-1 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                : "rounded-full p-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
            }
          >
            <Trash2 size={15} />
            {confirming && "Delete?"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <tr className="border-b border-cream-100">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            title="Change image"
            aria-label={`Change image for ${product.name}`}
            className="group relative shrink-0 disabled:opacity-60"
          >
            <Image
              src={product.images[0]}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-cover"
            />
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-cocoa-800 text-cream-50 ring-2 ring-white group-hover:bg-terracotta-500">
              <Camera size={11} />
            </span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={changeImage}
            className="hidden"
          />
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-56 rounded-lg border border-cream-300 px-2 py-1"
            />
            {imageError && (
              <p className="mt-1 text-xs text-red-600">{imageError}</p>
            )}
          </div>
        </div>
      </td>
      <td className="p-3 text-xs">{categoryName(product.category)}</td>
      <td className="p-3">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-28 rounded-lg border border-cream-300 px-2 py-1"
        />
      </td>
      <td className="p-3">
        <input
          type="number"
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
          className="w-20 rounded-lg border border-cream-300 px-2 py-1"
        />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-cocoa-800 px-3 py-1.5 text-xs text-cream-50 disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={remove}
            disabled={busy}
            aria-label={confirming ? "Confirm delete" : `Delete ${product.name}`}
            className={
              confirming
                ? "flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                : "rounded-full p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
            }
          >
            <Trash2 size={15} />
            {confirming && "Delete?"}
          </button>
        </div>
      </td>
    </tr>
  );
}
