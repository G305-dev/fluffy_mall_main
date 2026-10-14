import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthed } from "@/lib/auth";
import {
  addAdminCategory,
  CategoryAlreadyExistsError,
  CategoryInputError,
} from "@/lib/admin-categories";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Send a valid category." }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Send a valid category." }, { status: 400 });
  }

  const body = input as Record<string, unknown>;
  try {
    const category = await addAdminCategory({ name: body.name, blurb: body.blurb });
    revalidatePath("/admin/categories");
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof CategoryAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CategoryInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[admin category creation]", error);
    return NextResponse.json({ error: "Could not save the category. Try again." }, { status: 500 });
  }
}