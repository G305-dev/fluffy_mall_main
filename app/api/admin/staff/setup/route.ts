import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, ADMIN_COOKIE, ADMIN_PASSWORD, ADMIN_SESSION_MAX_AGE } from "@/lib/auth";
import { hashStaffPassword, MIN_STAFF_PASSWORD_LENGTH, newStaffId, normalizeStaffEmail, type StaffMember } from "@/lib/admin-staff";
import { sessionCookieOptions } from "@/lib/cookies";
import { COLLECTIONS, getDb } from "@/lib/mongo";
import { verifyAdminToken } from "@/lib/admin-session-token";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (token?.kind !== "bootstrap") {
    return NextResponse.json({ error: "Complete owner setup by signing in with the current admin password." }, { status: 401 });
  }
  if (!ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Set ADMIN_PASSWORD in your hosting environment before first-time setup." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Enter valid account details." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (name.length < 2 || name.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < MIN_STAFF_PASSWORD_LENGTH || password.length > 256 ||
      input.password !== input.confirmPassword) {
    return NextResponse.json({
      error: `Enter your name and a valid email, and choose a matching password of at least ${MIN_STAFF_PASSWORD_LENGTH} characters.`,
    }, { status: 400 });
  }

  const db = await getDb();
  const collection = db.collection<StaffMember>(COLLECTIONS.STAFF);
  await collection.createIndex({ email: 1 }, { unique: true });
  if (await collection.countDocuments({ role: "admin" }) > 0) {
    return NextResponse.json({ error: "The first Admin account has already been set up. Sign in with your staff account." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const staff: StaffMember = {
    id: newStaffId(),
    name,
    email: normalizeStaffEmail(email),
    phone: "",
    role: "admin",
    active: true,
    passwordHash: hashStaffPassword(password),
    createdAt: now,
    updatedAt: now,
  };
  try {
    await collection.insertOne(staff);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "A staff account already uses that email, or setup has already been completed." }, { status: 409 });
    }
    throw error;
  }

  const sessionToken = await createAdminToken({
    kind: "staff",
    staffId: staff.id,
    role: "admin",
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, sessionToken, sessionCookieOptions(req, ADMIN_SESSION_MAX_AGE));
  return response;
}
