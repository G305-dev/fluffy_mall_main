import { NextRequest, NextResponse } from "next/server";
import {
  BUILT_IN_STAFF_ROLES,
  hashStaffPassword,
  isBuiltInStaffRole,
  MIN_STAFF_PASSWORD_LENGTH,
  newStaffId,
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

export async function GET() {
  const session = await getAdminSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Only Admin users can manage staff." }, { status: 403 });
  }

  const db = await getDb();
  const staff = await db.collection<StaffMember>(COLLECTIONS.STAFF)
    .find({}, { projection: { _id: 0, passwordHash: 0 } })
    .sort({ name: 1 })
    .toArray();
  const customRoles = await db.collection<StaffRoleOption>(COLLECTIONS.STAFF_ROLES)
    .find({}, { projection: { _id: 0, key: 1, label: 1 } })
    .sort({ label: 1 })
    .toArray();
  await db.collection<StaffMember>(COLLECTIONS.STAFF).updateMany(
    { role: "cashier" },
    { $set: { role: "sales_representative" } }
  );
  const migratedStaff = staff.map((member) => member.role === "cashier"
    ? { ...member, role: "sales_representative" }
    : member);
  return NextResponse.json({ staff: migratedStaff, roles: [...BUILT_IN_STAFF_ROLES, ...customRoles] });
}

export async function POST(req: NextRequest) {
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
  if (!validName(input.name) || !validEmail(input.email) || typeof input.role !== "string") {
    return NextResponse.json({ error: "Enter a name, valid email, and staff role." }, { status: 400 });
  }
  if (typeof input.password !== "string" || input.password.length < MIN_STAFF_PASSWORD_LENGTH || input.password.length > 256) {
    return NextResponse.json({ error: `Staff passwords must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (phone.length > 32) {
    return NextResponse.json({ error: "Phone number must be 32 characters or fewer." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const staff: StaffMember = {
    id: newStaffId(),
    name: input.name.trim(),
    email: normalizeStaffEmail(input.email),
    phone,
    role: input.role,
    active: true,
    passwordHash: hashStaffPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDb();
  const roleIsValid = isBuiltInStaffRole(input.role) ||
    Boolean(await db.collection<StaffRoleOption>(COLLECTIONS.STAFF_ROLES).findOne({ key: input.role }));
  if (!roleIsValid) {
    return NextResponse.json({ error: "Choose a valid staff role." }, { status: 400 });
  }
  const collection = db.collection<StaffMember>(COLLECTIONS.STAFF);
  await collection.createIndex({ email: 1 }, { unique: true });
  try {
    await collection.insertOne(staff);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "A staff account already uses that email." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ staff: publicStaffMember(staff) }, { status: 201 });
}
