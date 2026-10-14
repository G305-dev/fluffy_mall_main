"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import type { Product } from "@/lib/types";

const PLACEHOLDER = "/images/product-placeholder.svg";

type ApiResult = { path?: string; error?: string };

export default function ProductPhotoForm({
  product,
  currentImage,
  onSaved,
  onCancel,
}: {
  product: Product;
  currentImage: string;
  onSaved: (path: string) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
        !selected.size || selected.size > 5 * 1024 * 1024) {
      setError("Select a JPEG, PNG or WEBP image under 5 MB.");
      return;
    }
    setFile(selected);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const upload = await fetch("/api/admin/upload", { method: "POST", body: form });
      const uploaded = await upload.json() as ApiResult;
      if (!upload.ok || !uploaded.path) {
        throw new Error(uploaded.error || "Could not upload the image.");
      }
      const saveResponse = await fetch("/api/admin/products/photo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, path: uploaded.path }),
      });
      const saved = await saveResponse.json() as ApiResult;
      if (!saveResponse.ok || !saved.path) {
        throw new Error(saved.error || "The image uploaded but could not be saved to the product. Try again.");
      }
      onSaved(saved.path);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} aria-label={`Save a photo for ${product.name}`} className="max-w-2xl rounded-2xl border border-orange-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-cocoa-800">{product.name} · product photo</h3>
          <p className="mt-1 text-xs text-stone-500">This saves the main image to this product. Its other gallery photos stay in place. The image also appears on the storefront.</p>
        </div>
        <button type="button" onClick={onCancel} disabled={busy} aria-label="Close photo form" className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-50"><X size={18} /></button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
          {preview ? (
            // An object URL preview cannot be used with Next.js image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected product photo preview" className="h-24 w-24 object-cover" />
          ) : currentImage && currentImage !== PLACEHOLDER ? (
            <Image src={currentImage} alt="Current product photo" width={96} height={96} className="h-24 w-24 object-cover" />
          ) : <Camera size={28} aria-hidden="true" className="text-stone-400" />}
        </div>
        <label className="block min-w-0 flex-1 text-sm font-medium text-stone-700">
          {!currentImage || currentImage === PLACEHOLDER ? "Add photo" : "Change main photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} disabled={busy} className="mt-2 block w-full rounded-xl border border-stone-200 bg-white p-2 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-orange-700" />
          <span className="mt-1 block text-xs font-normal text-stone-500">JPEG, PNG or WEBP · up to 5 MB. Choose a file, then click Save image.</span>
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={!file || busy} className="rounded-xl bg-[#ff8200] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87700] disabled:opacity-50">
          {busy ? "Uploading and saving…" : "Save image"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 disabled:opacity-50">Cancel</button>
      </div>
    </form>
  );
}