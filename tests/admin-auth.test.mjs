import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdminToken, verifyAdminToken } from "../lib/admin-session-token.ts";
import {
  adminAccessForRole,
  canonicalStaffRole,
  hashStaffPassword,
  MIN_STAFF_PASSWORD_LENGTH,
  verifyStaffPassword,
} from "../lib/admin-staff.ts";

process.env.STAFF_SESSION_SECRET = "test-staff-session-secret";

test("staff session tokens verify, expire, and reject tampering", async () => {
  const token = await createAdminToken({
    kind: "staff",
    staffId: "staff-1",
    role: "manager",
  });
  const verified = await verifyAdminToken(token);
  assert.equal(verified?.kind, "staff");
  assert.equal(verified?.staffId, "staff-1");
  assert.equal(verified?.role, "manager");
  assert.equal(typeof verified?.exp, "number");

  const [body, signature] = token.split(".");
  const changedSignature = `${body}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  assert.equal(await verifyAdminToken(changedSignature), null);
  assert.equal(await verifyAdminToken(await createAdminToken({ kind: "bootstrap" }, -1)), null);
  assert.equal(await verifyAdminToken("not-a-token"), null);
});

test("staff password hashes verify only the original password", () => {
  const hash = hashStaffPassword("long-and-unique-password");
  assert.equal(verifyStaffPassword("long-and-unique-password", hash), true);
  assert.equal(verifyStaffPassword("wrong-password", hash), false);
  assert.equal(verifyStaffPassword("password", "invalid"), false);
});

test("staff roles map to their admin access and cashier accounts migrate to Sales representative", () => {
  assert.equal(adminAccessForRole("admin"), "admin");
  for (const role of ["manager", "accountant", "cfo", "custom-inventory-lead"]) {
    assert.equal(adminAccessForRole(role), "manager");
  }
  assert.equal(adminAccessForRole("sales_representative"), "sales_representative");
  assert.equal(canonicalStaffRole("cashier"), "sales_representative");
  assert.equal(MIN_STAFF_PASSWORD_LENGTH, 7);
});
