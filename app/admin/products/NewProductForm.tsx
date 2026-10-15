"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { AdminCategory } from "@/lib/admin-categories";
import { PRODUCT_UNITS, type ProductUnit } from "@/lib/product-units";
import type { Product } from "@/lib/types";

type VariantDraft = {
  size: string;
  color: string;
  price: string;
  stock: string;
  barcode: string;
  traceposItemCode: string;
};

type FormState = {
  productType: "standard" | "variable";
  name: string;
  category: string;
  hasBarcode: boolean | null;
  barcode: string;
  purchaseCost: string;
  sellingPrice: string;
  stock: string;
  unit: ProductUnit;
  description: string;
  short: string;
  deliveryNote: string;
  featured: boolean;
  bestseller: boolean;
  variants: VariantDraft[];
};

function blankForm(category: string): FormState {
  return {
    productType: "standard", name: "", category,
    hasBarcode: null, barcode: "", purchaseCost: "", sellingPrice: "",
    stock: "", unit: "pcs", description: "", short: "", deliveryNote: "",
    featured: false, bestseller: false, variants: [],
  };
}

function blankVariant(): VariantDraft {
  return { size: "", color: "", price: "", stock: "", barcode: "", traceposItemCode: "" };
}

function Step({ number, title, children }: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-100 bg-white p-4 sm:p-5">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-cocoa-800">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-xs text-orange-700">{number}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function BarcodeLabel({ value, caption }: { value: string; caption: string }) {
  const href = `/api/admin/barcode?value=${encodeURIComponent(value)}`;
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="mb-2 text-xs font-medium text-stone-600">{caption}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={href} alt={`Code 128 barcode for ${value}`} className="max-h-24 max-w-full" />
      <p className="mt-2 break-all font-mono text-xs text-cocoa-800">{value}</p>
      <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-orange-700 hover:underline">
        Open label to print
      </a>
    </div>
  );
}

export default function NewProductForm({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => blankForm(categories[0]?.slug || ""));
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Product | null>(null);

  useEffect(() => {
    const next = images.map((file) => URL.createObjectURL(file));
    setPreviews(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function updateVariant(index: number, key: keyof VariantDraft, value: string) {
    setForm((previous) => ({
      ...previous,
      variants: previous.variants.map((variant, i) => i === index ? { ...variant, [key]: value } : variant),
    }));
  }

  function reset() {
    setForm(blankForm(categories[0]?.slug || ""));
    setImages([]);
    setError("");
    setCreated(null);
  }

  function chooseImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (images.length + files.length > 8) {
      setError("Choose up to eight product photos.");
      return;
    }
    if (files.some((file) =>
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024
    )) {
      setError("Photos must be JPEG, PNG or WEBP, up to 5 MB each.");
      return;
    }
    setImages((previous) => [...previous, ...files]);
    setError("");
  }

  function validate() {
    if (!form.name.trim()) throw new Error("Enter the product name.");
    if (!categories.some((category) => category.slug === form.category)) {
      throw new Error("Select a category from the list.");
    }
    if (form.hasBarcode === null) throw new Error("Choose Yes or No for the barcode.");
    if (form.hasBarcode && (!form.barcode.trim() ||
      form.barcode.trim().length > 48 || !/^[\x20-\x7e]+$/.test(form.barcode.trim()))) {
      throw new Error("Enter a Code 128 barcode using 1–48 printable English characters.");
    }
    if (form.purchaseCost.trim() &&
      (!Number.isFinite(Number(form.purchaseCost)) || Number(form.purchaseCost) < 0)) {
      throw new Error("Purchase cost must be zero or more when provided.");
    }
    if (!form.sellingPrice.trim() || !Number.isFinite(Number(form.sellingPrice)) || Number(form.sellingPrice) <= 0) {
      throw new Error("Enter a selling price greater than zero.");
    }
    if (form.productType === "standard") {
      if (form.stock.trim() === "" || !Number.isSafeInteger(Number(form.stock)) || Number(form.stock) < 0) {
        throw new Error("Enter a whole-number stock quantity of zero or more.");
      }
    } else {
      if (!form.variants.length) throw new Error("Add at least one option for a variable product.");
      const seen = new Set<string>();
      const seenTraceposCodes = new Set<string>();
      form.variants.forEach((variant, index) => {
        const label = `Option ${index + 1}`;
        if (!variant.size.trim() && !variant.color.trim()) throw new Error(`${label} needs a size or colour.`);
        const key = `${variant.size.trim().toLowerCase()}|${variant.color.trim().toLowerCase()}`;
        if (seen.has(key)) throw new Error(`${label} repeats a size/colour combination.`);
        seen.add(key);
        if (variant.price.trim() && (!Number.isFinite(Number(variant.price)) || Number(variant.price) <= 0)) {
          throw new Error(`${label} selling price must be greater than zero.`);
        }
        if (variant.stock.trim() === "" || !Number.isSafeInteger(Number(variant.stock)) || Number(variant.stock) < 0) {
          throw new Error(`${label} stock must be a whole number of zero or more.`);
        }
        const code = variant.traceposItemCode.trim().toUpperCase();
        if (variant.traceposItemCode.trim().length > 80) {
          throw new Error(`${label} TracePOS item code must be 80 characters or fewer.`);
        }
        if (code && seenTraceposCodes.has(code)) {
          throw new Error(`${label} repeats another option's TracePOS item code.`);
        }
        if (code) seenTraceposCodes.add(code);
        if (form.hasBarcode && variant.barcode.trim() &&
          (variant.barcode.trim().length > 48 || !/^[\x20-\x7e]+$/.test(variant.barcode.trim()))) {
          throw new Error(`${label} barcode must use printable English characters, up to 48.`);
        }
      });
    }
  }

  async function uploadPhoto(file: File) {
    const data = new FormData();
    data.set("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: data });
    const result: { path?: string; error?: string } = await response.json();
    if (!response.ok || !result.path) {
      throw new Error(result.error || `Could not upload ${file.name}.`);
    }
    return result.path;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    try {
      validate();
      setBusy(true);
      const paths: string[] = [];
      for (const file of images) paths.push(await uploadPhoto(file));
      const response = await fetch("/api/admin/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: form.productType,
          name: form.name.trim(),
          category: form.category,
          images: paths,
          hasBarcode: form.hasBarcode,
          barcode: form.hasBarcode ? form.barcode.trim() : "",
          purchaseCost: form.purchaseCost.trim() ? Number(form.purchaseCost) : undefined,
          price: Number(form.sellingPrice),
          stock: form.productType === "standard" ? Number(form.stock) : undefined,
          unit: form.unit,
          description: form.description.trim(),
          short: form.short.trim(),
          deliveryNote: form.deliveryNote.trim(),
          featured: form.featured,
          bestseller: form.bestseller,
          variants: form.productType === "variable" ? form.variants.map((variant) => ({
            size: variant.size.trim(),
            color: variant.color.trim(),
            price: variant.price.trim() ? Number(variant.price) : undefined,
            stock: Number(variant.stock),
            barcode: form.hasBarcode ? variant.barcode.trim() : "",
            traceposItemCode: variant.traceposItemCode.trim(),
          })) : [],
        }),
      });
      const result: { product?: Product; error?: string } = await response.json();
      if (!response.ok || !result.product) {
        throw new Error(result.error || "Could not save the product.");
      }
      setCreated(result.product);
      setImages([]);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save the product.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mb-5 inline-flex items-center gap-2 rounded-xl bg-[#ff8200] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e87700]">
        <Plus size={17} aria-hidden="true" /> Add new product
      </button>
    );
  }

  if (created) {
    return (
      <section className="mb-6 space-y-4 rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-6" aria-live="polite">
        <div>
          <h2 className="font-display text-2xl text-cocoa-800">Product saved</h2>
          <p className="mt-1 text-sm text-stone-600">{created.name} · {created.stock} {created.unit || "pcs"} in stock. Your Code 128 labels are ready.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {created.barcode && <BarcodeLabel value={created.barcode} caption="Product barcode" />}
          {created.variants.map((variant) => variant.barcode && (
            <BarcodeLabel key={variant.id} value={variant.barcode} caption={variant.name} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="rounded-xl bg-[#ff8200] px-4 py-2.5 text-sm font-semibold text-white">Add another product</button>
          <button type="button" onClick={() => { reset(); setOpen(false); }} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700">Done</button>
        </div>
      </section>
    );
  }

  const variable = form.productType === "variable";
  const totalStock = form.variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0);
  const inputClass = "mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-cocoa-800 outline-none focus:border-orange-500";
  const pricingFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium text-stone-700">Purchase cost (₦), optional
        <input type="number" min="0" step="0.01" value={form.purchaseCost} onChange={(event) => update("purchaseCost", event.target.value)} className={inputClass} placeholder="Leave blank if unknown" />
        <span className="mt-1 block text-xs font-normal text-stone-500">Private; leave blank if unknown. Shoppers will not see this amount.</span>
      </label>
      <label className="block text-sm font-medium text-stone-700">{variable ? "Parent/default selling price (₦) *" : "Selling price (₦) *"}
        <input required type="number" min="0.01" step="0.01" value={form.sellingPrice} onChange={(event) => update("sellingPrice", event.target.value)} className={inputClass} placeholder="0.00" />
        {variable && <span className="mt-1 block text-xs font-normal text-stone-500">Saved on the parent product. Each option uses this price unless you enter an override below.</span>}
      </label>
    </div>
  );
  return (
    <form onSubmit={save} className="mb-6 space-y-4" aria-label="Add new product">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-cocoa-800">Add new product</h2>
        <button type="button" disabled={busy} onClick={() => { reset(); setOpen(false); }} aria-label="Close new product form" className="rounded-xl border border-stone-200 p-2 text-stone-600 disabled:opacity-50"><X size={18} /></button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <Step number={1} title="Product type">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["standard", "variable"] as const).map((type) => (
            <label key={type} className={`cursor-pointer rounded-xl border p-4 ${form.productType === type ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>
              <input type="radio" name="productType" value={type} checked={form.productType === type} onChange={() => update("productType", type)} className="accent-orange-600" />
              <span className="ml-2 font-semibold text-cocoa-800">{type === "standard" ? "Standard product" : "Product with variants"}</span>
              <span className="mt-1 block text-xs text-stone-500">{type === "standard" ? "One price and one stock quantity." : "Options with their own stock, TracePOS codes and optional price overrides."}</span>
            </label>
          ))}
        </div>
      </Step>

      <Step number={2} title="Product details and photos">
        {variable && (
          <p className="mb-4 text-sm text-stone-600">These details belong to the parent product. Option stock, TracePOS codes and prices are entered below.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-stone-700">Product name *
            <input required maxLength={200} value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass} placeholder="Enter product name" />
          </label>
          <label className="block text-sm font-medium text-stone-700">Category *
            <select required value={form.category} onChange={(event) => update("category", event.target.value)} className={inputClass}>
              <option value="" disabled>Select category</option>
              {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
            </select>
          </label>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700">Product photos (optional)
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} className={inputClass} />
            </label>
            <p className="mt-1 text-xs text-stone-500">JPEG, PNG or WEBP · up to eight photos, 5 MB each. No photo? The storefront uses an “Image coming soon” placeholder.</p>
            {previews.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {previews.map((src, index) => (
                  <li key={src} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Product photo ${index + 1} preview`} className="h-20 w-20 rounded-xl object-cover ring-1 ring-stone-200" />
                    <button type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`} className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-600 shadow"><X size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Step>

      <Step number={3} title="Barcode · Code 128">
        <fieldset>
          <legend className="text-sm font-medium text-stone-700">Does this product already have a barcode? *</legend>
          <div className="mt-2 flex gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="hasBarcode" checked={form.hasBarcode === true} onChange={() => update("hasBarcode", true)} /> Yes, enter it</label>
            <label className="flex items-center gap-2"><input type="radio" name="hasBarcode" checked={form.hasBarcode === false} onChange={() => update("hasBarcode", false)} /> No, generate one</label>
          </div>
        </fieldset>
        {form.hasBarcode === true && (
          <label className="mt-4 block max-w-lg text-sm font-medium text-stone-700">Existing barcode *
            <input required maxLength={48} value={form.barcode} onChange={(event) => update("barcode", event.target.value)} className={inputClass} placeholder="Scan or enter the barcode" />
          </label>
        )}
        {form.hasBarcode === false && <p className="mt-2 text-sm text-stone-500">A unique, scannable Code 128 label is generated when you save.</p>}
      </Step>

      {variable ? (
        <>
          <Step number={4} title="Variant options and stock">
            <div className="space-y-4">
              <p className="text-sm text-stone-600">Total stock: <strong>{totalStock.toLocaleString("en-NG")}</strong> (sum of option stock). Add a TracePOS item code to link an option to stock sync; without one, that option will not sync automatically. Code 128 barcodes are separate and generated if not provided.</p>
              {form.variants.map((variant, index) => (
                <fieldset key={index} className="rounded-xl border border-stone-200 bg-stone-50 p-3 sm:p-4">
                  <legend className="px-1 text-sm font-semibold text-cocoa-800">Option {index + 1}</legend>
                  <div className="mb-2 flex justify-end">
                    <button type="button" onClick={() => update("variants", form.variants.filter((_, i) => i !== index))} className="text-xs font-medium text-red-600 hover:underline">Remove option</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-stone-700">Size
                      <input value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} maxLength={60} className={inputClass} placeholder="Small / Medium / Large" />
                    </label>
                    <label className="block text-xs font-medium text-stone-700">Colour
                      <input value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} maxLength={60} className={inputClass} placeholder="Red / Blue / Black" />
                    </label>
                    <label className="block text-xs font-medium text-stone-700">Number in stock *
                      <input required type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} className={inputClass} placeholder="0" />
                    </label>
                    <label className="block text-xs font-medium text-stone-700">TracePOS item code (optional)
                      <input maxLength={80} value={variant.traceposItemCode} onChange={(event) => updateVariant(index, "traceposItemCode", event.target.value)} className={inputClass} placeholder="Matching TracePOS item code" />
                    </label>
                    {form.hasBarcode === true && <label className="block text-xs font-medium text-stone-700 sm:col-span-2">Option Code 128 barcode (optional)
                      <input maxLength={48} value={variant.barcode} onChange={(event) => updateVariant(index, "barcode", event.target.value)} className={inputClass} placeholder="Leave blank to generate a unique barcode" />
                    </label>}
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Enter at least a size or colour. Product photos are used for this option. The TracePOS item code is not a barcode.</p>
                </fieldset>
              ))}
              <button type="button" disabled={form.variants.length >= 40} onClick={() => update("variants", [...form.variants, blankVariant()])} className="inline-flex items-center gap-2 rounded-xl border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700 disabled:opacity-50"><Plus size={16} /> Add option</button>
            </div>
          </Step>

          <Step number={5} title="Pricing">
            {pricingFields}
            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-cocoa-800">Variant selling prices</p>
              <p className="text-xs text-stone-600">Leave an option’s price blank to use the parent/default selling price. Its effective price is saved on the option.</p>
              {form.variants.length === 0 ? (
                <p className="text-sm text-stone-500">Add an option above to set its price.</p>
              ) : form.variants.map((variant, index) => {
                const optionName = [variant.size.trim(), variant.color.trim()].filter(Boolean).join(" / ");
                return (
                  <label key={index} className="block text-sm font-medium text-stone-700">
                    Option {index + 1}{optionName ? ` — ${optionName}` : ""}: selling price override (₦)
                    <input type="number" min="0.01" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} className={inputClass} placeholder="Use parent/default selling price" />
                  </label>
                );
              })}
            </div>
          </Step>
        </>
      ) : (
        <>
          <Step number={4} title="Pricing">{pricingFields}</Step>
          <Step number={5} title="Stock">
            <label className="block max-w-sm text-sm font-medium text-stone-700">Total number in stock *
              <input required type="number" min="0" step="1" value={form.stock} onChange={(event) => update("stock", event.target.value)} className={inputClass} placeholder="0" />
            </label>
          </Step>
        </>
      )}

      <Step number={6} title="Units and measurement">
        <label className="block max-w-sm text-sm font-medium text-stone-700">Unit *
          <select required value={form.unit} onChange={(event) => update("unit", event.target.value as ProductUnit)} className={inputClass}>
            {PRODUCT_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
          </select>
        </label>
        <p className="mt-2 text-xs text-stone-500">Stock is counted in whole units of the selection (for example, 3 kg means three 1 kg units).</p>
      </Step>

      <Step number={7} title="Product description (optional)">
        <label className="block text-sm font-medium text-stone-700">Description
          <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={4} maxLength={5000} className={inputClass} placeholder="Describe the product" />
        </label>
        <details className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-cocoa-800">More options (optional)</summary>
          <div className="mt-3 space-y-3">
            <label className="block">Short description
              <input maxLength={500} value={form.short} onChange={(event) => update("short", event.target.value)} className={inputClass} placeholder="Shown on product cards" />
            </label>
            <label className="block">Additional delivery note
              <input maxLength={1000} value={form.deliveryNote} onChange={(event) => update("deliveryNote", event.target.value)} className={inputClass} />
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(event) => update("featured", event.target.checked)} /> Featured on homepage</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.bestseller} onChange={(event) => update("bestseller", event.target.checked)} /> Store bestseller</label>
          </div>
        </details>
      </Step>
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#ff8200] px-6 py-3 text-sm font-semibold text-white hover:bg-[#e87700] disabled:opacity-50 sm:w-auto">
        {busy ? "Uploading photos and saving…" : "Save product"}
      </button>
    </form>
  );
}