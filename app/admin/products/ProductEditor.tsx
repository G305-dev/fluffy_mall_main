"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, Plus, Trash2, X } from "lucide-react";
import type { AdminCategory } from "@/lib/admin-categories";
import { PRODUCT_UNITS, type ProductUnit } from "@/lib/product-units";
import type { Product } from "@/lib/types";

const PLACEHOLDER = "/images/product-placeholder.svg";

export default function ProductEditor({ product, categories, initialPurchaseCost }: {
  product: Product;
  categories: AdminCategory[];
  initialPurchaseCost?: number;
  mobile?: boolean; // Kept for the existing ProductList call site.
}) {
  const router = useRouter();
  const mainInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [cost, setCost] = useState(initialPurchaseCost === undefined ? "" : String(initialPurchaseCost));
  const [unit, setUnit] = useState<ProductUnit>(product.unit || "pcs");
  const [featured, setFeatured] = useState(Boolean(product.featured));
  const [bestseller, setBestseller] = useState(Boolean(product.bestseller));
  const [images, setImages] = useState(product.images || []);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const variable = product.productType === "variable" || Boolean(product.variants?.length);

  useEffect(() => { setImages(product.images || []); }, [product.id, product.images]);

  async function api(method: "PATCH" | "DELETE", payload: object) {
    const response = await fetch("/api/admin/products", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Could not save product (${response.status}).`);
    return data as { product?: Product };
  }

  async function upload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error("Choose a JPEG, PNG or WEBP image under 5 MB.");
    }
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.path !== "string") throw new Error(data.error || "Photo upload failed.");
    return data.path as string;
  }

  async function saveImages(next: string[]) {
    if (!next.length || next.length > 12) throw new Error("Keep 1–12 product photos.");
    const data = await api("PATCH", { id: product.id, images: next });
    setImages(data.product?.images || next);
    setNotice("Photos saved to the website.");
    router.refresh();
  }

  async function changeMain(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    try { await saveImages([await upload(file), ...images.slice(1)]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not change photo."); }
    finally { setBusy(false); }
  }

  async function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (images.length + files.length > 12) throw new Error("Keep at most 12 product photos.");
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await upload(file));
      await saveImages([...images, ...uploaded]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add photos."); }
    finally { setBusy(false); }
  }

  async function changeGallery(next: string[]) {
    setBusy(true); setError(""); setNotice("");
    try { await saveImages(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save gallery."); }
    finally { setBusy(false); }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (!name.trim()) throw new Error("Enter a product name.");
      if (!Number.isFinite(Number(price)) || Number(price) <= 0) throw new Error("Enter a selling price greater than zero.");
      if (!variable && (!Number.isSafeInteger(Number(stock)) || stock.trim() === "")) {
        throw new Error("Stock must be a whole number.");
      }
      if (cost.trim() && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) {
        throw new Error("Purchase cost must be zero or more.");
      }
      await api("PATCH", {
        id: product.id, name: name.trim(), category, price: Number(price),
        stock: variable ? product.stock : Number(stock), unit, images, featured, bestseller,
        purchaseCost: cost.trim() ? Number(cost) : undefined,
      });
      setNotice("Product saved. Stock changes after POS activation require an audited adjustment.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save product."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await api("DELETE", { id: product.id });
      setNotice("Product removed.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove product."); }
    finally { setBusy(false); setConfirmDelete(false); }
  }

  return <form onSubmit={save} className="space-y-4 rounded-xl border border-orange-100 bg-white p-4 text-sm" aria-label={`Edit ${product.name}`}>
    <div className="flex items-start gap-3">
      <button type="button" disabled={busy} onClick={() => mainInput.current?.click()}
        aria-label={`Change main photo for ${product.name}`} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100 disabled:opacity-50">
        <Image src={images[0] || PLACEHOLDER} alt="" fill sizes="64px" className="object-cover" />
        <span className="absolute bottom-0 right-0 rounded bg-cocoa-800 p-1 text-white"><Camera size={13} /></span>
      </button>
      <div className="min-w-0 flex-1">
        <label className="block text-xs">Product name<input required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <p className="mt-1 break-all font-mono text-xs text-stone-600">Item code: {product.itemCode}</p>
      </div>
    </div>
    <input ref={mainInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeMain} className="hidden" />
    <div className="rounded-lg bg-cream-50 p-3">
      <div className="flex items-center justify-between gap-2"><strong>Product photos</strong>
        <button type="button" disabled={busy} onClick={() => galleryInput.current?.click()} className="inline-flex items-center gap-1 rounded-lg bg-cocoa-800 px-3 py-1.5 text-xs text-white disabled:opacity-50"><Plus size={13} /> Add</button>
      </div>
      <input ref={galleryInput} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={addPhotos} className="hidden" />
      <div className="mt-2 flex flex-wrap gap-3">{images.map((image, index) => <div key={`${image}:${index}`} className="relative">
        <Image src={image} alt={`${product.name} photo ${index + 1}`} width={66} height={66} className="h-16 w-16 rounded-lg object-cover" />
        {index === 0 && <span className="absolute left-1 top-1 rounded bg-cocoa-800 px-1 text-[9px] text-white">Main</span>}
        {index > 0 && <button type="button" disabled={busy} onClick={() => changeGallery([images[index], ...images.filter((_, i) => i !== index)])} className="absolute bottom-1 left-1 rounded bg-white px-1 text-[9px]">Make main</button>}
        {images.length > 1 && <button type="button" disabled={busy} aria-label={`Remove photo ${index + 1}`} onClick={() => changeGallery(images.filter((_, i) => i !== index))}
          className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white"><X size={12} /></button>}
      </div>)}</div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm">
        {!categories.some((item) => item.slug === category) && <option value={category} disabled>Choose a new category (was {category})</option>}
        {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
      </select></label>
      <label className="text-xs">Unit<select value={unit} onChange={(event) => setUnit(event.target.value as ProductUnit)} className="mt-1 w-full rounded-lg border p-2 text-sm">
        {PRODUCT_UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <label className="text-xs">Selling price (₦)<input required type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="text-xs">{variable ? "Option stock (paused)" : "Stock"}<input type="number" step="1" disabled={variable} value={variable ? product.stock : stock} onChange={(event) => setStock(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm disabled:opacity-60" /></label>
      <label className="text-xs">Purchase cost (₦, private; blank leaves existing cost unchanged)<input type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="Not set" className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
    </div>
    {variable && <p className="text-xs text-amber-800">Variant records are preserved, but option sales and editing are paused. No option stock will be changed here.</p>}
    <div className="flex flex-wrap gap-4 text-xs">
      <label className="flex items-center gap-1"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Featured</label>
      <label className="flex items-center gap-1"><input type="checkbox" checked={bestseller} onChange={(event) => setBestseller(event.target.checked)} /> Bestseller</label>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-2 text-xs text-green-700">{notice}</p>}
    <div className="flex justify-between border-t pt-3"><button disabled={busy} className="rounded-lg bg-cocoa-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save product"}</button>
      <button type="button" disabled={busy} onClick={remove} title="Deletion is blocked after POS activation" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-700 disabled:opacity-50">
        <Trash2 size={14} /> {confirmDelete ? "Confirm delete" : "Delete"}
      </button></div>
  </form>;
}