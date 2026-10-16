import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import type { AdminRole } from "@/lib/admin-session-token";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  active: boolean;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicStaffMember = Omit<StaffMember, "passwordHash">;
export type StaffRoleOption = { key: string; label: string };

export const BUILT_IN_STAFF_ROLES: StaffRoleOption[] = [
  { key: "admin", label: "Admin" },
  { key: "manager", label: "Manager" },
  { key: "accountant", label: "Accountant" },
  { key: "cfo", label: "CFO" },
  { key: "sales_representative", label: "Sales representative" },
];

export const MIN_STAFF_PASSWORD_LENGTH = 7;

export function canonicalStaffRole(role: string): string {
  return role === "cashier" ? "sales_representative" : role;
}

export function adminAccessForRole(role: string): "admin" | "manager" | "sales_representative" {
  const canonical = canonicalStaffRole(role);
  if (canonical === "admin") return "admin";
  if (canonical === "sales_representative") return "sales_representative";
  return "manager";
}

export function isBuiltInStaffRole(value: unknown): value is string {
  return typeof value === "string" &&
    BUILT_IN_STAFF_ROLES.some((role) => role.key === value);
}

export function normalizeStaffEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashStaffPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyStaffPassword(password: string, passwordHash: unknown) {
  if (typeof passwordHash !== "string") return false;
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash || !/^[a-f0-9]{128}$/i.test(storedHash)) return false;
  const actualHash = scryptSync(password, salt, 64);
  const expectedHash = Buffer.from(storedHash, "hex");
  return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
}

export function newStaffId() {
  return randomUUID();
}

export function publicStaffMember(staff: StaffMember): PublicStaffMember {
  const { passwordHash: _passwordHash, ...publicMember } = staff;
  return publicMember;
}
