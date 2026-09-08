import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAdminAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 5 * 1024 * 1024;

function slugifyFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 }
      );
    }

    const extension = ALLOWED_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          error:
            "Only JPEG, PNG or WEBP images are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 5MB." },
        { status: 400 }
      );
    }

    const baseName =
      slugifyFilename(file.name) || "product";

    const filename = `${baseName}-${Date.now()}.${extension}`;

    const blob = await put(
      `products/${filename}`,
      file,
      {
        access: "public",
      }
    );

    return NextResponse.json({
      path: blob.url,
    });
  } catch (error) {
    console.error("[admin upload]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Image upload failed.",
      },
      { status: 500 }
    );
  }
}
