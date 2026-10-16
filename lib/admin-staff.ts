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

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "admin" || value === "manager" || value === "cashier";
}
