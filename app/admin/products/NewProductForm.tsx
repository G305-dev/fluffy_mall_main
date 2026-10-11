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
  file: File | null;
  preview: string | null;
  traceposItemCode: string;
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
  traceposItemCode: string;
};

type ApiResponse = {
  error?: string;
  path?: string;
  [key: string]: unknown;
};

function createEmptyVariant(): VariantDraft {
  return {
    size: "",
    color: "",
    price: "",
    stock: "",
    file: null,
    preview: null,
    traceposItemCode: "",
  };
}

function createEmptyForm(): FormState {
  return {
    name: "",
    price: "",
    category:
      CATEGORIES[0].slug as CategorySlug,
    subcategory:
      CATEGORIES[0].subcategories[0] || "",
    stock: "",
    short: "",
    description: "",
    deliveryNote: "",
    featured: false,
    bestseller: false,
    variants: [],
    traceposItemCode: "",
  };
}

function getClipboardImage(
  event: React.ClipboardEvent<HTMLElement>
): File | null {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const item = Array.from(
    event.clipboardData.items
  ).find(
    (clipboardItem) =>
      clipboardItem.kind === "file" &&
      allowedTypes.includes(
        clipboardItem.type
      )
  );

  return item?.getAsFile() ?? null;
}

async function readApiResponse(
  response: Response,
  name: string
): Promise<ApiResponse> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `${name} returned an empty response. HTTP status: ${response.status}`
    );
  }

  try {
    const parsed = JSON.parse(text);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      throw new Error(
        "The response was not an object."
      );
    }

    return parsed as ApiResponse;
  } catch {
    throw new Error(
      `${name} returned invalid JSON. HTTP status: ${response.status}. Response: ${text.slice(
        0,
        300
      )}`
    );
  }
}

export default function NewProductForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] =
    useState<FormState>(createEmptyForm);

  const [imageFiles, setImageFiles] =
    useState<File[]>([]);

  const [imagePreviews, setImagePreviews] =
    useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const router = useRouter();

  function reset() {
    setForm(createEmptyForm());
    setImageFiles([]);
    setImagePreviews([]);
    setError(null);
  }

  function onImageFilesChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (selected.length === 0) {
      return;
    }

    setImageFiles(selected);

    setImagePreviews(
      selected.map((file) =>
        URL.createObjectURL(file)
      )
    );
  }

  function onMainImagePaste(
    event: React.ClipboardEvent<HTMLInputElement>
  ) {
    event.preventDefault();

    const selected = getClipboardImage(event);

    if (!selected) {
      setError(
        "Paste a JPEG, PNG or WEBP image."
      );
      return;
    }

    setError(null);

    setImageFiles((current) => [
      ...current,
      selected,
    ]);

    setImagePreviews((current) => [
      ...current,
      URL.createObjectURL(selected),
    ]);
  }

  function removeProductImage(index: number) {
    if (imageFiles.length <= 1) {
      setError(
        "A product must have at least one image."
      );
      return;
    }

    setImageFiles((current) =>
      current.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );

    setImagePreviews((current) =>
      current.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );

    setError(null);
  }

  function onVariantFileChange(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files?.[0] ?? null;

    event.target.value = "";

    setForm((current) => ({
      ...current,
      variants: current.variants.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                file: selected,
                preview: selected
                  ? URL.createObjectURL(selected)
                  : null,
              }
            : variant
      ),
    }));
  }

  function onVariantImagePaste(
    index: number,
    event: React.ClipboardEvent<HTMLInputElement>
  ) {
    event.preventDefault();

    const selected = getClipboardImage(event);

    if (!selected) {
      setError(
        "Paste a JPEG, PNG or WEBP image."
      );
      return;
    }

    setError(null);

    setForm((current) => ({
      ...current,
      variants: current.variants.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                file: selected,
                preview: URL.createObjectURL(
                  selected
                ),
              }
            : variant
      ),
    }));
  }

  function updateVariant(
    index: number,
    field:
      | "size"
      | "color"
      | "price"
      | "stock"
      | "traceposItemCode",
    value: string
  ) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                [field]: value,
              }
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
        (_, variantIndex) =>
          variantIndex !== index
      ),
    }));
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
      response,
      label
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

  async function submit(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError(null);

    if (imageFiles.length === 0) {
      setError(
        "Please choose at least one product image."
      );
      return;
    }

    const price = Number(form.price);

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError("Enter a valid base price.");
      return;
    }

    const variantInputs: Array<{
      size: string;
      color: string;
      price: number;
      stock: number;
      file: File;
      traceposItemCode: string;
    }> = [];

    for (
      let index = 0;
      index < form.variants.length;
      index++
    ) {
      const draft = form.variants[index];

      const size = draft.size.trim();
      const color = draft.color.trim();

      const hasAnyValue = Boolean(
        size ||
          color ||
          draft.price.trim() ||
          draft.stock.trim() ||
          draft.traceposItemCode.trim() ||
          draft.file
      );

      if (!hasAnyValue) {
        continue;
      }

      if (!size && !color) {
        setError(
          `Variant ${
            index + 1
          } needs a size or a color.`
        );
        return;
      }

      if (!draft.file) {
        setError(
          `Please choose an image for variant ${
            index + 1
          }.`
        );
        return;
      }

      const variantPrice = Number(
        draft.price
      );

      const variantStock = Number(
        draft.stock || 0
      );

      if (
        !Number.isFinite(variantPrice) ||
        variantPrice <= 0
      ) {
        setError(
          `Enter a valid price for variant ${
            index + 1
          }.`
        );
        return;
      }

      if (
        !Number.isFinite(variantStock) ||
        variantStock < 0
      ) {
        setError(
          `Enter a valid stock quantity for variant ${
            index + 1
          }.`
        );
        return;
      }

      variantInputs.push({
        size,
        color,
        price: variantPrice,
        stock: variantStock,
        file: draft.file,
        traceposItemCode:
          draft.traceposItemCode.trim(),
      });
    }

    setBusy(true);

    try {
      const imagePaths: string[] = [];

      for (
        let index = 0;
        index < imageFiles.length;
        index++
      ) {
        const path = await uploadImage(
          imageFiles[index],
          `Product image ${index + 1} upload`
        );

        imagePaths.push(path);
      }

      const variants: Array<{
        size: string;
        color: string;
        price: number;
        stock: number;
        image: string;
        traceposItemCode: string;
      }> = [];

      for (
        let index = 0;
        index < variantInputs.length;
        index++
      ) {
        const variantInput =
          variantInputs[index];

        const image = await uploadImage(
          variantInput.file,
          `Variant ${index + 1} image upload`
        );

        variants.push({
          size: variantInput.size,
          color: variantInput.color,
          price: variantInput.price,
          stock: variantInput.stock,
          image,
          traceposItemCode:
            variantInput.traceposItemCode,
        });
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

            traceposItemCode:
              form.traceposItemCode.trim() ||
              undefined,

            price,
            category: form.category,
            subcategory: form.subcategory,
            stock: Number(form.stock || 0),
            short: form.short.trim(),
            description:
              form.description.trim(),
            deliveryNote:
              form.deliveryNote.trim(),
            featured: form.featured,
            bestseller: form.bestseller,
            variants,

            /*
             * The first image is the main image.
             */
            images: imagePaths,
          }),
        }
      );

      const createJson =
        await readApiResponse(
          createResponse,
          "Product creation"
        );

      if (!createResponse.ok) {
        throw new Error(
          createJson.error ||
            "Could not create product."
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
          Tracepos item code

          <input
            value={form.traceposItemCode}
            onChange={(event) =>
              setForm({
                ...form,
                traceposItemCode:
                  event.target.value,
              })
            }
            placeholder="Exact scanner item code"
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          Category

          <select
            value={form.category}
            onChange={(event) => {
              const category =
                CATEGORIES.find(
                  (item) =>
                    item.slug ===
                    event.target.value
                );

              setForm({
                ...form,
                category:
                  event.target.value as CategorySlug,
                subcategory:
                  category?.subcategories[0] ||
                  "",
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
              setForm({
                ...form,
                subcategory:
                  event.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
          >
            {(
              CATEGORIES.find(
                (item) =>
                  item.slug === form.category
              )?.subcategories || []
            ).map((subcategory) => (
              <option
                key={subcategory}
                value={subcategory}
              >
                {subcategory}
              </option>
            ))}
          </select>
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
        </label>

        <div className="sm:col-span-2">
          <label className="text-sm">
            Product images

            <input
              type="text"
              readOnly
              placeholder="Click here, then press Ctrl+V to add an image"
              onPaste={onMainImagePaste}
              aria-label="Paste product image"
              className="mt-1 w-full rounded-lg border border-dashed border-cream-300 px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-stone-500">
              Choose multiple files below. The first
              image will be the main product image.
            </p>

            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={onImageFilesChange}
              className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
            />
          </label>

          {imagePreviews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {imagePreviews.map(
                (preview, index) => (
                  <div
                    key={`${preview}-${index}`}
                    className="relative"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`Product image ${
                        index + 1
                      } preview`}
                      className="h-24 w-24 rounded-xl object-cover ring-1 ring-cream-300"
                    />

                    {index === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-cocoa-800 px-1.5 py-0.5 text-[10px] text-white">
                        Main
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        removeProductImage(index)
                      }
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"
                      aria-label={`Remove product image ${
                        index + 1
                      }`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-cocoa-800">
                Product variants
              </h3>

              <p className="mt-1 text-xs text-stone-500">
                Add as many size and color variants as
                needed. Each variant needs its own
                image.
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
            <p className="mt-4 rounded-xl bg-cream-50 px-3 py-3 text-sm text-stone-500">
              No variants added. This will be treated
              as a single-option product.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {form.variants.map(
                (variant, index) => (
                  <div
                    key={index}
                    className="rounded-2xl bg-cream-50 p-3 ring-1 ring-cream-200"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">
                        Variant {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeVariant(index)
                        }
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                      >
                        <X size={14} />
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

                      <label className="text-sm">
                        Tracepos item code

                        <input
                          value={
                            variant.traceposItemCode
                          }
                          onChange={(event) =>
                            updateVariant(
                              index,
                              "traceposItemCode",
                              event.target.value
                            )
                          }
                          placeholder="Exact scanner code"
                          className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
                        />
                      </label>

                      <label className="text-sm">
                        Variant image

                        <input
                          type="text"
                          readOnly
                          placeholder="Click, then press Ctrl+V"
                          onPaste={(event) =>
                            onVariantImagePaste(
                              index,
                              event
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-dashed border-cream-300 px-2 py-2 text-xs"
                        />

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            onVariantFileChange(
                              index,
                              event
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-2 text-xs"
                        />

                        {variant.preview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={variant.preview}
                            alt={`Variant ${
                              index + 1
                            } preview`}
                            className="mt-2 h-16 w-16 rounded-lg object-cover"
                          />
                        )}
                      </label>
                    </div>
                  </div>
                )
              )}
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
                deliveryNote:
                  event.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border border-cream-300 px-3 py-2"
            placeholder="For example: Large item — please confirm access."
          />
        </label>

        <div className="grid gap-3 sm:col-span-2 sm:flex sm:gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) =>
                setForm({
                  ...form,
                  featured:
                    event.target.checked,
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
                  bestseller:
                    event.target.checked,
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