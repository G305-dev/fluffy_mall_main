"use client";

import type { ClipboardEvent } from "react";

/** Paste only when this control has focus; never intercept ordinary form pastes. */
export default function PasteImageBox({ label, onImages, onError, disabled = false }: {
  label: string;
  onImages: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  function paste(event: ClipboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const items = Array.from(event.clipboardData.items).filter((item) => item.kind === "file");
    const files = items.map((item) => item.getAsFile()).filter((file): file is File => !!file);
    if (!files.length) {
      onError("Copy an image first, then focus the paste area and paste it.");
      return;
    }
    event.preventDefault();
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) {
      onError("Paste a JPEG, PNG or WEBP image up to 5 MB.");
      return;
    }
    onImages(files);
  }

  return <button type="button" onPaste={paste} disabled={disabled} aria-label={label} className="mt-2 block w-full rounded-xl border border-dashed border-orange-300 bg-orange-50 px-3 py-3 text-left text-xs text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">
    {label}: focus here, then paste (Ctrl+V or ⌘+V).
  </button>;
}
