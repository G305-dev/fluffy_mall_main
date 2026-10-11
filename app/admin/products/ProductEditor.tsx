"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CATEGORIES } from "@/lib/categories";
import type {
  CategorySlug,
  Product,
} from "@/lib/types";
import {
  Camera,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type ApiResponse = {
  error?: string;
  product?: Product;
  path?: string;
  [key: string]: unknown;
};

async function readApiResponse(
  response: Response
): Promise<ApiResponse> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `The server returned an empty response. HTTP ${response.status}.`
    );
  }

  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error(
      `The server returned invalid JSON. HTTP ${response.status}.`
    );
  }
}

export default function ProductEditor({
  product,
  mobile = false,
}: {
  product: Product;
  mobile?: boolean;
}) {
  const [price, setPrice] =
    useState(product.price);

  const [stock, setStock] =
    useState(product.stock);

  const [name, setName] =
    useState(product.name);

  const [featured, setFeatured] =
    useState(Boolean(product.featured));

  const [bestseller, setBestseller] =
    useState(Boolean(product.bestseller));

  const [traceposItemCode, setTraceposItemCode] =
    useState(product.traceposItemCode || "");

  const [variantCodes, setVariantCodes] =
    useState<Record<string, string>>(() =>
      Object.fromEntries(
        product.variants.map((variant) => [
          variant.id,
          variant.traceposItemCode || "",
        ])
      )
    );

  const [images, setImages] = useState<string[]>(
    product.images || []
  );

  const [category, setCategory] =
    useState<CategorySlug>(product.category);

  const [subcategory, setSubcategory] =
    useState(product.subcategory ?? "");

  const [busy, setBusy] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const confirmTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const fileInput =
    useRef<HTMLInputElement | null>(null);

  const galleryInput =
    useRef<HTMLInputElement | null>(null);

  const router = useRouter();

  useEffect(() => {
    setImages(product.images || []);
  }, [product.id, product.images]);

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

  function handleCategoryChange(
    value: string
  ) {
    const nextCategory = CATEGORIES.find(
      (item) => item.slug === value
    );

    if (!nextCategory) {
      return;
    }

    setCategory(nextCategory.slug);

    setSubcategory(
      nextCategory.subcategories[0] ?? ""
    );
  }

  async function uploadImage(
    file: File,
    label: string
  ) {
    const uploadData = new FormData();
    uploadData.append("file", file);

    const response = await fetch(
      "/api/admin/upload",
      {
        method: "POST",
        body: uploadData,
      }
    );

    const data = await readApiResponse(
      response
    );

    if (!response.ok) {
      throw new Error(
        data.error || `${label} failed.`
      );
    }

    if (!data.path) {
      throw new Error(
        `${label} did not return an image path.`
      );
    }

    return data.path;
  }

  async function saveImages(
    nextImages: string[]
  ) {
    if (nextImages.length === 0) {
      throw new Error(
        "A product must have at least one image."
      );
    }

    const response = await fetch(
      "/api/admin/products",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: product.id,
          images: nextImages,
        }),
      }
    );

    const data = await readApiResponse(
      response
    );

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not save product images."
      );
    }

    const savedImages =
      data.product?.images || nextImages;

    setImages(savedImages);
    router.refresh();
  }

  async function save() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/products",
        {
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
            featured,
            bestseller,
            images,
            variantItemCodes: variantCodes,
            traceposItemCode:
              traceposItemCode.trim(),
          }),
        }
      );

      const data =
        await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not save product."
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

    if (!file) {
      return;
    }

    setError(null);
    setBusy(true);

    try {
      const path = await uploadImage(
        file,
        "Main image upload"
      );

      await saveImages([
        path,
        ...images.slice(1),
      ]);
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

  async function addGalleryImages(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setError(null);
    setBusy(true);

    try {
      const uploadedPaths: string[] = [];

      for (let index = 0; index < files.length; index++) {
        const path = await uploadImage(
          files[index],
          `Gallery image ${index + 1} upload`
        );

        uploadedPaths.push(path);
      }

      await saveImages([
        ...images,
        ...uploadedPaths,
      ]);
    } catch (galleryError) {
      setError(
        galleryError instanceof Error
          ? galleryError.message
          : "Could not add gallery images."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeGalleryImage(
    index: number
  ) {
    if (images.length <= 1) {
      setError(
        "A product must have at least one image."
      );
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await saveImages(
        images.filter(
          (_, imageIndex) =>
            imageIndex !== index
        )
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove product image."
      );
    } finally {
      setBusy(false);
    }
  }

  async function makeMainImage(
    index: number
  ) {
    if (index <= 0) {
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await saveImages([
        images[index],
        ...images.filter(
          (_, imageIndex) =>
            imageIndex !== index
        ),
      ]);
    } catch (mainImageError) {
      setError(
        mainImageError instanceof Error
          ? mainImageError.message
          : "Could not set main image."
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
      const response = await fetch(
        "/api/admin/products",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: product.id,
          }),
        }
      );

      const data =
        await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not delete product."
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

  function galleryFields(
    compact = false
  ) {
    return (
      <div
        className={
          compact
            ? "mt-4 rounded-xl bg-cream-50 p-3"
            : "mt-3 rounded-xl bg-cream-50 p-3"
        }
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-cocoa-800">
            Product images
          </p>

          <button
            type="button"
            onClick={() =>
              galleryInput.current?.click()
            }
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full bg-cocoa-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            <Plus size={13} />
            Add images
          </button>
        </div>

        <input
          ref={galleryInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={addGalleryImages}
          className="hidden"
        />

        <p className="mt-1 text-xs text-stone-500">
          The first image is the main image shown
          on product cards.
        </p>

        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="relative"
            >
              <Image
                src={image}
                alt={`${product.name} image ${
                  index + 1
                }`}
                width={compact ? 72 : 84}
                height={compact ? 72 : 84}
                className={
                  compact
                    ? "h-[72px] w-[72px] rounded-lg object-cover"
                    : "h-[84px] w-[84px] rounded-lg object-cover"
                }
              />

              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-cocoa-800 px-1.5 py-0.5 text-[9px] text-white">
                  Main
                </span>
              )}

              {index > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    makeMainImage(index)
                  }
                  disabled={busy}
                  className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-1 text-[9px] font-semibold text-cocoa-800 disabled:opacity-60"
                >
                  Make main
                </button>
              )}

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    removeGalleryImage(index)
                  }
                  disabled={busy}
                  aria-label={`Remove product image ${
                    index + 1
                  }`}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white disabled:opacity-60"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function variantCodeFields(
    compact = false
  ) {
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
                value={
                  variantCodes[variant.id] || ""
                }
                onChange={(event) =>
                  setVariantCodes((current) => ({
                    ...current,
                    [variant.id]:
                      event.target.value,
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

  function launchFlags(
    compact = false
  ) {
    return (
      <div
        className={
          compact
            ? "mt-4 grid gap-3 rounded-xl bg-cream-50 p-3"
            : "mt-3 grid gap-2"
        }
      >
        <label className="flex items-center gap-2 text-xs text-cocoa-800">
          <input
            type="checkbox"
            checked={featured}
            onChange={(event) =>
              setFeatured(event.target.checked)
            }
            className="h-4 w-4 rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-400"
          />

          <span>Featured for launch</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-cocoa-800">
          <input
            type="checkbox"
            checked={bestseller}
            onChange={(event) =>
              setBestseller(event.target.checked)
            }
            className="h-4 w-4 rounded border-cream-300 text-terracotta-500 focus:ring-terracotta-400"
          />

          <span>Best seller</span>
        </label>
      </div>
    );
  }

  if (mobile) {
    return (
      <article className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-cream-200">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() =>
              fileInput.current?.click()
            }
            disabled={busy}
            title="Change main image"
            aria-label={`Change main image for ${product.name}`}
            className="group relative shrink-0 disabled:opacity-60"
          >
            <Image
              src={
                images[0] ||
                product.images[0]
              }
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
                onChange={(event) =>
                  setName(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
              />
            </label>

            <label className="mt-2 block text-xs text-stone-500">
              Parent Tracepos item code

              <input
                value={traceposItemCode}
                onChange={(event) =>
                  setTraceposItemCode(
                    event.target.value
                  )
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
                    handleCategoryChange(
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
                >
                  {CATEGORIES.map((item) => (
                    <option
                      key={item.slug}
                      value={item.slug}
                    >
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
                    setSubcategory(
                      event.target.value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
                >
                  {selectedCategory?.subcategories.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          </div>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={changeImage}
          className="hidden"
        />

        {error && (
          <p className="mt-2 break-words text-xs text-red-600">
            {error}
          </p>
        )}

        {galleryFields(true)}
        {variantCodeFields(true)}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-stone-500">
            Price (₦)

            <input
              type="number"
              value={price}
              onChange={(event) =>
                setPrice(
                  Number(event.target.value)
                )
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
                setStock(
                  Number(event.target.value)
                )
              }
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        {launchFlags(true)}

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
            onClick={() =>
              fileInput.current?.click()
            }
            disabled={busy}
            title="Change main image"
            aria-label={`Change main image for ${product.name}`}
            className="group relative shrink-0 disabled:opacity-60"
          >
            <Image
              src={
                images[0] ||
                product.images[0]
              }
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
              onChange={(event) =>
                setName(event.target.value)
              }
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
                setTraceposItemCode(
                  event.target.value
                )
              }
              placeholder="Parent Tracepos code"
              className="mt-2 w-40 rounded-lg border border-cream-300 px-2 py-1 text-xs"
            />

            {galleryFields(false)}
            {launchFlags(false)}
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
                handleCategoryChange(
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-xs"
            >
              {CATEGORIES.map((item) => (
                <option
                  key={item.slug}
                  value={item.slug}
                >
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
                setSubcategory(
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-xs"
            >
              {selectedCategory?.subcategories.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </label>
        </div>
      </td>

      <td className="p-3 align-top">
        <input
          type="number"
          value={price}
          onChange={(event) =>
            setPrice(
              Number(event.target.value)
            )
          }
          className="w-24 rounded-lg border border-cream-300 px-2 py-1 text-sm"
        />
      </td>

      <td className="p-3 align-top">
        <input
          type="number"
          value={stock}
          onChange={(event) =>
            setStock(
              Number(event.target.value)
            )
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