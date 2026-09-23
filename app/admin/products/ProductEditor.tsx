"use client";

import { CATEGORIES } from "@/lib/categories";
import type { CategorySlug, Product } from "@/lib/types";
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
  const [traceposItemCode, setTraceposItemCode] = useState(
    product.traceposItemCode || ""
  );

  const [variantCodes, setVariantCodes] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      product.variants.map((variant) => [
        variant.id,
        variant.traceposItemCode || "",
      ])
    )
  );

  const [category, setCategory] = useState<CategorySlug>(
    product.category
  );
  const [subcategory, setSubcategory] = useState(
    product.subcategory ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const fileInput = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (confirmTimer.current) {
        clearTimeout(confirmTimer.current);
      }
    };
  }, []);

  const selectedCategory = CATEGORIES.find(
    (item) => item.slug === category
  );

  function handleCategoryChange(value: string) {
    const nextCategory = CATEGORIES.find(
      (item) => item.slug === value
    );

    if (!nextCategory) return;

    setCategory(nextCategory.slug);
    setSubcategory(nextCategory.subcategories[0] ?? "");
  }

  async function save() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: product.id,
          price,
          stock,
          name: name.trim(),
          category,
          subcategory,
          variantItemCodes: variantCodes,

          // Send an empty string when no parent code is wanted.
          // This allows a parent code to be cleared when variants
          // have their own separate Tracepos codes.
          traceposItemCode: traceposItemCode.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Could not save product."
        );
      }

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save product."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setError(null);
    setBusy(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const uploadResponse = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadData,
      });

      const uploadJson = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadJson.error || "Image upload failed."
        );
      }

      const patchResponse = await fetch(
        "/api/admin/products",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: product.id,
            image: uploadJson.path,
          }),
        }
      );

      const patchJson = await patchResponse.json();

      if (!patchResponse.ok) {
        throw new Error(
          patchJson.error || "Could not update image."
        );
      }

      router.refresh();
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Could not update image."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirming) {
      setConfirming(true);

      confirmTimer.current = setTimeout(() => {
        setConfirming(false);
      }, 4000);

      return;
    }

    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: product.id,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Could not delete product."
        );
      }

      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete product."
      );
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  function deleteButton() {
    return (
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={
          confirming
            ? "Confirm product deletion"
            : `Delete ${product.name}`
        }
        title={
          confirming
            ? "Click again to confirm deletion"
            : "Delete product"
        }
        className={
          confirming
            ? "grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white disabled:opacity-60"
            : "grid h-8 w-8 place-items-center rounded-full text-red-600 hover:bg-red-50 disabled:opacity-60"
        }
      >
        <Trash2 size={16} />
      </button>
    );
  }

  function variantCodeFields(compact = false) {
    if (product.variants.length === 0) {
      return null;
    }

    return (
      <div
        className={
          compact
            ? "mt-3 rounded-xl bg-cream-50 p-3"
            : "mt-2 w-56 max-w-full rounded-xl bg-cream-50 p-2"
        }
      >
        <p className="text-xs font-semibold text-cocoa-800">
          Variant Tracepos item codes
        </p>

        <div className="mt-2 grid gap-2">
          {product.variants.map((variant) => (
            <label
              key={variant.id}
              className="text-xs text-stone-500"
            >
              {variant.name}

              <input
                type="text"
                value={variantCodes[variant.id] || ""}
                onChange={(event) =>
                  setVariantCodes((current) => ({
                    ...current,
                    [variant.id]: event.target.value,
                  }))
                }
                placeholder="Exact scanner item code"
                className={
                  compact
                    ? "mt-1 w-full rounded-lg border border-cream-300 bg-white px-2 py-1.5 text-sm"
                    : "mt-1 w-full rounded-lg border border-cream-300 bg-white px-2 py-1 text-xs"
                }
              />
            </label>
          ))}
        </div>
      </div>
    );
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
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
              />
            </label>

            <label className="mt-2 block text-xs text-stone-500">
              Parent Tracepos item code

              <input
                value={traceposItemCode}
                onChange={(event) =>
                  setTraceposItemCode(event.target.value)
                }
                placeholder="Leave empty when variants have separate codes"
                className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
              />
            </label>

            <div className="mt-3 grid gap-2">
              <label className="block text-xs text-stone-500">
                Category

                <select
                  value={category}
                  onChange={(event) =>
                    handleCategoryChange(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
                >
                  {CATEGORIES.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs text-stone-500">
                Subcategory

                <select
                  value={subcategory}
                  onChange={(event) =>
                    setSubcategory(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
                >
                  {selectedCategory?.subcategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-2 break-words text-xs text-red-600">
            {error}
          </p>
        )}

        {variantCodeFields(true)}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-stone-500">
            Price (₦)

            <input
              type="number"
              value={price}
              onChange={(event) =>
                setPrice(Number(event.target.value))
              }
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-xs text-stone-500">
            Stock

            <input
              type="number"
              value={stock}
              onChange={(event) =>
                setStock(Number(event.target.value))
              }
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-cream-100 pt-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-full bg-cocoa-800 px-4 py-1.5 text-xs text-cream-50 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>

          {deleteButton()}
        </div>
      </article>
    );
  }

  return (
    <tr className="border-b border-cream-100">
      <td className="p-3 align-top">
        <div className="flex items-start gap-3">
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

          <div className="min-w-0">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-40 rounded-lg border border-cream-300 px-2 py-1 text-sm"
            />

            {error && (
              <p className="mt-1 max-w-xs text-xs text-red-600">
                {error}
              </p>
            )}

            <input
              value={traceposItemCode}
              onChange={(event) =>
                setTraceposItemCode(event.target.value)
              }
              placeholder="Parent Tracepos code"
              className="mt-2 w-40 rounded-lg border border-cream-300 px-2 py-1 text-xs"
            />

            {variantCodeFields(false)}
          </div>
        </div>
      </td>

      <td className="p-3 align-top">
        <div className="grid min-w-[10rem] gap-2">
          <label className="text-xs text-stone-500">
            Category

            <select
              value={category}
              onChange={(event) =>
                handleCategoryChange(event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-xs"
            >
              {CATEGORIES.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-stone-500">
            Subcategory

            <select
              value={subcategory}
              onChange={(event) =>
                setSubcategory(event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-xs"
            >
              {selectedCategory?.subcategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </td>

      <td className="p-3 align-top">
        <input
          type="number"
          value={price}
          onChange={(event) =>
            setPrice(Number(event.target.value))
          }
          className="w-24 rounded-lg border border-cream-300 px-2 py-1 text-sm"
        />
      </td>

      <td className="p-3 align-top">
        <input
          type="number"
          value={stock}
          onChange={(event) =>
            setStock(Number(event.target.value))
          }
          className="w-16 rounded-lg border border-cream-300 px-2 py-1 text-sm"
        />
      </td>

      <td className="p-3 align-top">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-full bg-cocoa-800 px-3 py-1.5 text-xs text-cream-50 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>

          {deleteButton()}
        </div>
      </td>
    </tr>
  );
}