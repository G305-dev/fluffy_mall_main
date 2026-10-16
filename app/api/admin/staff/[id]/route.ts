import { NextRequest, NextResponse } from "next/server";
import {
  hashStaffPassword,
  isBuiltInStaffRole,
  MIN_STAFF_PASSWORD_LENGTH,
  normalizeStaffEmail,
  publicStaffMember,
  type StaffMember,
  type StaffRoleOption,
} from "@/lib/admin-staff";
import { getAdminSession } from "@/lib/auth";
import { COLLECTIONS, getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 100;
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Only Admin users can manage staff." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Enter valid staff details." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Enter valid staff details." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (!validName(input.name) || !validEmail(input.email) || typeof input.role !== "string" || typeof input.active !== "boolean") {
    return NextResponse.json({ error: "Enter a name, valid email, role, and account status." }, { status: 400 });
  }
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (phone.length > 32) {
    return NextResponse.json({ error: "Phone number must be 32 characters or fewer." }, { status: 400 });
  }
  if (input.password !== undefined && input.password !== "" &&
      (typeof input.password !== "string" || input.password.length < MIN_STAFF_PASSWORD_LENGTH || input.password.length > 256)) {
    return NextResponse.json({ error: `A new password must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  const db = await getDb();
  const roleIsValid = isBuiltInStaffRole(input.role) ||
    Boolean(await db.collection<StaffRoleOption>(COLLECTIONS.STAFF_ROLES).findOne({ key: input.role }));
  if (!roleIsValid) {
    return NextResponse.json({ error: "Choose a valid staff role." }, { status: 400 });
  }
  const collection = db.collection<StaffMember>(COLLECTIONS.STAFF);
  await collection.createIndex({ email: 1 }, { unique: true });
  const existing = await collection.findOne({ id: params.id });
  if (!existing) return NextResponse.json({ error: "Staff account not found." }, { status: 404 });
  if (existing.id === session.staffId && (!input.active || input.role !== "admin")) {
    return NextResponse.json({ error: "You cannot disable or demote your own Admin account." }, { status: 400 });
  }
  if (existing.role === "admin" && existing.active && (input.role !== "admin" || !input.active)) {
    const otherActiveAdmins = await collection.countDocuments({
      role: "admin",
      active: true,
      id: { $ne: existing.id },
    });
    if (otherActiveAdmins === 0) {
      return NextResponse.json({ error: "At least one active Admin account must remain." }, { status: 409 });
    }
  }

  const update: Record<string, unknown> = {
    name: input.name.trim(),
    email: normalizeStaffEmail(input.email),
    phone,
    role: input.role,
    active: input.active,
    updatedAt: new Date().toISOString(),
  };
  if (typeof input.password === "string" && input.password) {
    update.passwordHash = hashStaffPassword(input.password);
  }
  try {
    await collection.updateOne({ id: existing.id }, { $set: update });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "A staff account already uses that email." }, { status: 409 });
    }
    throw error;
  }
  const updated = { ...existing, ...update } as StaffMember;
  return NextResponse.json({ staff: publicStaffMember(updated) });
}
