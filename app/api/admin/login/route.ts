import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_PASSWORD,
  ADMIN_SESSION_MAX_AGE,
  createAdminToken,
} from "@/lib/auth";
import { isAdminRole, normalizeStaffEmail, verifyStaffPassword, type StaffMember } from "@/lib/admin-staff";
import { sessionCookieOptions } from "@/lib/cookies";
import { COLLECTIONS, getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const email = typeof input.email === "string" ? normalizeStaffEmail(input.email) : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  const db = await getDb();
  const staffCollection = db.collection<StaffMember>(COLLECTIONS.STAFF);
  const adminCount = await staffCollection.countDocuments({ role: "admin" });
  if (adminCount === 0) {
    if (!ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Owner setup is unavailable. Configure ADMIN_PASSWORD first." }, { status: 503 });
    }
    if (password === ADMIN_PASSWORD) {
      const token = await createAdminToken({ kind: "bootstrap" });
      const response = NextResponse.json({ setupRequired: true });
      response.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(req, ADMIN_SESSION_MAX_AGE));
      return response;
    }
  }

  const staff = email ? await staffCollection.findOne({ email, active: true }) : null;
  if (!staff || !isAdminRole(staff.role) || !verifyStaffPassword(password, staff.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const token = await createAdminToken({
    kind: "staff",
    staffId: staff.id,
    role: staff.role,
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(req, ADMIN_SESSION_MAX_AGE));
  return response;
}
