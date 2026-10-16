import { cookies } from "next/headers";
import { getDb, COLLECTIONS } from "@/lib/mongo";
import {
  ADMIN_COOKIE,
  type AdminRole,
  type AdminTokenPayload,
  verifyAdminToken,
} from "@/lib/admin-session-token";

export {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminToken,
  verifyAdminToken,
} from "@/lib/admin-session-token";
export type { AdminRole, AdminTokenPayload } from "@/lib/admin-session-token";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export type AdminSession = {
  kind: "staff";
  staffId: string;
  name: string;
  email: string;
  role: AdminRole;
};

export function isAdminBypassed() {
  return process.env.PREVIEW_ADMIN_BYPASS === "1";
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (isAdminBypassed()) {
    return { kind: "staff", staffId: "preview", name: "Preview admin", email: "", role: "admin" };
  }

  const payload: AdminTokenPayload | null = await verifyAdminToken(
    cookies().get(ADMIN_COOKIE)?.value
  );
  if (payload?.kind !== "staff" || !payload.staffId) return null;

  const db = await getDb();
  const staff = await db.collection(COLLECTIONS.STAFF).findOne({
    id: payload.staffId,
    active: true,
  });
  if (!staff || !["admin", "manager", "cashier"].includes(staff.role)) return null;
  return {
    kind: "staff",
    staffId: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  };
}

export async function isAdminAuthed() {
  const session = await getAdminSession();
  return session?.role === "admin" || session?.role === "manager";
}

export async function isStaffAuthed() {
  return (await getAdminSession()) !== null;
}
