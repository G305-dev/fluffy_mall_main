"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { CategorySlug } from "@/lib/types";
import { Plus, X } from "lucide-react";

type VariantDraft = {
  size: string;
  color: string;
  price: string;
  stock: string;
};

type FormState = {
  name: string;
  price: string;
  category: CategorySlug;
  subcategory: string;
  stock: string;
  short: string;
  description: string;
  deliveryNote: string;
  featured: boolean;
  bestseller: boolean;
  variants: VariantDraft[];
};

function createEmptyVariant(): VariantDraft {
  return {
    size: "",
    color: "",
    price: "",
    stock: "",
  };
}

function createEmptyForm(): FormState {
  return {
    name: "",
    price: "",
    category: CATEGORIES[0].slug as CategorySlug,
    subcategory: CATEGORIES[0].subcategories[0] || "",
    stock: "",
    short: "",
    description: "",
    deliveryNote: "",
    featured: false,
    bestseller: false,
    variants: [],
  };
}

export default function NewProductForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(createEmptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function reset() {
    setForm(createEmptyForm());
    setFile(null);
    setPreview(null);
    setError(null);
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    setFile(selected);
    setPreview(
      selected ? URL.createObjectURL(selected) : null
    );
  }

  function updateVariant(
    index: number,
    field: keyof VariantDraft,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? { ...variant, [field]: value }
          : variant
      ),
    }));
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        createEmptyVariant(),
      ],
    }));
  }

  function removeVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter(
        (_, variantIndex) => variantIndex !== index
      ),
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
      setError("Enter a valid base price.");
      return;
    }

    async function readApiResponse(
  response: Response,
  name: string
): Promise<Record<string, unknown>> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `${name} returned an empty response. HTTP status: ${response.status}`
    );
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `${name} returned invalid JSON. HTTP status: ${response.status}. Response: ${text.slice(
        0,
        300
      )}`
    );
  }
}

    const variants: Array<{
      size: string;
      color: string;
      price: number;
      stock: number;
    }> = [];

    for (let index = 0; index < form.variants.length; index++) {
      const draft = form.variants[index];

      const size = draft.size.trim();
      const color = draft.color.trim();
      const hasAnyValue = Boolean(
        size ||
          color ||
          draft.price.trim() ||
          draft.stock.trim()
      );

      // Ignore completely empty rows.
      if (!hasAnyValue) {
        continue;
      }

      if (!size && !color) {
        setError(
          `Variant ${index + 1} needs a size or a color.`
        );
        return;
      }

      const variantPrice = Number(draft.price);
      const variantStock = Number(draft.stock || 0);

      if (!Number.isFinite(variantPrice) || variantPrice <= 0) {
        setError(
          `Enter a valid price for variant ${index + 1}.`
        );
        return;
      }

      if (!Number.isFinite(variantStock) || variantStock < 0) {
        setError(
          `Enter a valid stock quantity for variant ${index + 1}.`
        );
        return;
      }

      variants.push({
        size,
        color,
        price: variantPrice,
        stock: variantStock,
      });
    }

    setBusy(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const uploadResponse = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadData,
      });

      const uploadJson = await readApiResponse(
  uploadResponse,
  "Image upload"
);

      if (!uploadResponse.ok) {
        throw new Error(
          uploadJson.error || "Image upload failed."
        );
      }

      const createResponse = await fetch(
        "/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            price,
            category: form.category,
            subcategory: form.subcategory,
            stock: Number(form.stock || 0),
            short: form.short.trim(),
            description: form.description.trim(),
            deliveryNote: form.deliveryNote.trim(),
            featured: form.featured,
            bestseller: form.bestseller,
            variants,
            image: uploadJson.path,
          }),
        }
      );

      const createJson = await readApiResponse(
  createResponse,
  "Product creation"
);

      if (!createResponse.ok) {
        throw new Error(
          createJson.error || "Could not create product."
        );
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 flex items-center gap-2 rounded-full bg-cocoa-800 px-4 py-2 text-sm font-semibold text-cream-50"
      >
        <Plus size={16} />
        Add product
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-cocoa-800">
          New product
        </h2>

        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-full p-1 text-cocoa-700/70 hover:bg-cream-100"
          aria-label="Close form"
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
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Category
          <select
            value={form.category}
            onChange={(event) => {
              const category = CATEGORIES.find(
                (item) => item.slug === event.target.value
              );
              setForm({
                ...form,
                category: event.target.value as CategorySlug,
                subcategory: category?.subcategories[0] || "",
              });
            }}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          >
            {CATEGORIES.map((category) => (
              <option
                key={category.slug}
                value={category.slug}
              >
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Subcategory / product type
          <select
            value={form.subcategory}
            onChange={(event) =>
              setForm({ ...form, subcategory: event.target.value })
            }
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          >
            {(CATEGORIES.find((item) => item.slug === form.category)?.subcategories || []).map(
              (subcategory) => (
                <option key={subcategory} value={subcategory}>
                  {subcategory}
                </option>
              )
            )}
          </select>
          <span className="mt-1 block text-xs text-stone-500">
            Options change automatically when the main category changes.
          </span>
        </label>

        <label className="text-sm">
          Base price (₦)
          <input
            required
            type="number"
            min="1"
            value={form.price}
            onChange={(event) =>
              setForm({
                ...form,
                price: event.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-stone-500">
            Used when the product has no variants.
          </span>
        </label>

        <label className="text-sm">
          Base stock
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) =>
              setForm({
                ...form,
                stock: event.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-stone-500">
            Variant stock is used when variants are added.
          </span>
        </label>

        <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4 sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-cocoa-800">
                Product variants
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                Add one row for each size and color combination.
                Each row can have its own price and stock.
              </p>
            </div>

            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-1 rounded-full bg-cocoa-800 px-3 py-2 text-xs font-semibold text-cream-50"
            >
              <Plus size={14} />
              Add variant
            </button>
          </div>

          {form.variants.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white px-3 py-3 text-sm text-stone-500">
              No variants added. This will be treated as a
              single-option product.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {form.variants.map((variant, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-white p-3 ring-1 ring-cream-200"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">
                      Variant {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                    >
                      <X size={14} />
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm">
                      Size
                      <input
                        value={variant.size}
                        onChange={(event) =>
                          updateVariant(
                            index,
                            "size",
                            event.target.value
                          )
                        }
                        placeholder="Small, Medium, Large"
                        className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      Color
                      <input
                        value={variant.color}
                        onChange={(event) =>
                          updateVariant(
                            index,
                            "color",
                            event.target.value
                          )
                        }
                        placeholder="Red, Blue, Black"
                        className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      Variant price (₦)
                      <input
                        type="number"
                        min="1"
                        value={variant.price}
                        onChange={(event) =>
                          updateVariant(
                            index,
                            "price",
                            event.target.value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
                      />
                    </label>

                    <label className="text-sm">
                      Variant stock
                      <input
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(event) =>
                          updateVariant(
                            index,
                            "stock",
                            event.target.value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="text-sm sm:col-span-2">
          Short description
          <input
            value={form.short}
            onChange={(event) =>
              setForm({
                ...form,
                short: event.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
            placeholder="One line shown on product cards"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          Full description
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm({
                ...form,
                description: event.target.value,
              })
            }
            rows={3}
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          Additional delivery note
          <input
            value={form.deliveryNote}
            onChange={(event) =>
              setForm({
                ...form,
                deliveryNote: event.target.value,
              })
            }
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
              alt="Product preview"
              className="mt-3 h-24 w-24 rounded-xl object-cover"
            />
          )}
        </label>

        <div className="grid gap-3 sm:col-span-2 sm:flex sm:gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) =>
                setForm({
                  ...form,
                  featured: event.target.checked,
                })
              }
            />
            Featured on homepage
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.bestseller}
              onChange={(event) =>
                setForm({
                  ...form,
                  bestseller: event.target.checked,
                })
              }
            />
            Bestseller
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-full bg-terracotta-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}
