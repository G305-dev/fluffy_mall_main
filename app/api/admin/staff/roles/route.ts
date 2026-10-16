import { NextRequest, NextResponse } from "next/server";
import { BUILT_IN_STAFF_ROLES, type StaffRoleOption } from "@/lib/admin-staff";
import { getAdminSession } from "@/lib/auth";
import { COLLECTIONS, getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Only Admin users can add staff roles." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Enter a role name." }, { status: 400 });
  }
  const name = body && typeof body === "object" && "name" in body && typeof body.name === "string"
    ? body.name.trim()
    : "";
  if (name.length < 2 || name.length > 50) {
    return NextResponse.json({ error: "Role name must be between 2 and 50 characters." }, { status: 400 });
  }

  const keyPart = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!keyPart) {
    return NextResponse.json({ error: "Use letters or numbers in the role name." }, { status: 400 });
  }
  const db = await getDb();
  const collection = db.collection<StaffRoleOption & { createdAt: string }>(COLLECTIONS.STAFF_ROLES);
  await collection.createIndex({ key: 1 }, { unique: true });
  const allRoles = [...BUILT_IN_STAFF_ROLES, ...await collection.find({}, { projection: { _id: 0, key: 1, label: 1 } }).toArray()];
  if (allRoles.some((role) => role.label.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "A role with that name already exists." }, { status: 409 });
  }
  const key = `custom-${keyPart}`;
  const role = { key, label: name, createdAt: new Date().toISOString() };
  try {
    await collection.insertOne(role);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "A role with a similar name already exists." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ role: { key, label: name } }, { status: 201 });
}
