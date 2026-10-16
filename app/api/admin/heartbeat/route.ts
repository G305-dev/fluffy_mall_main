import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminToken,
  getAdminSession,
  isAdminBypassed,
  verifyAdminToken,
} from "@/lib/auth";
import { COLLECTIONS, getDb } from "@/lib/mongo";
import { sessionCookieOptions } from "@/lib/cookies";
import { adminAccessForRole } from "@/lib/admin-staff";

export async function POST(req: NextRequest) {
  if (isAdminBypassed()) {
    return NextResponse.json({ ok: true });
  }
  const token = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (token?.kind === "bootstrap") {
    const db = await getDb();
    const admins = await db.collection(COLLECTIONS.STAFF).countDocuments({ role: "admin" });
    if (admins > 0) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const renewed = await createAdminToken({ kind: "bootstrap" });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, renewed, sessionCookieOptions(req, ADMIN_SESSION_MAX_AGE));
    return response;
  }

  const staff = await getAdminSession();
  if (!staff) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const renewed = await createAdminToken({
    kind: "staff",
    staffId: staff.staffId,
    role: adminAccessForRole(staff.role),
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, renewed, sessionCookieOptions(req, ADMIN_SESSION_MAX_AGE));
  return res;
}