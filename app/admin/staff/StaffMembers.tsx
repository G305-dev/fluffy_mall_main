"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { AdminRole } from "@/lib/admin-session-token";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
};

type StaffForm = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  password: string;
  active: boolean;
};

type RoleOption = { key: string; label: string };

const emptyForm: StaffForm = {
  name: "",
  email: "",
  phone: "",
  role: "sales_representative",
  password: "",
  active: true,
};

export default function StaffMembers() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [form, setForm] = useState<StaffForm | null>(null);
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/staff", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load staff members.");
      setStaff(result.staff);
      setRoles(result.roles);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not load staff members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  function editMember(member: StaffMember) {
    setNotice("");
    setError("");
    setForm({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      role: member.role,
      password: "",
      active: member.active,
    });
  }

  async function saveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(form.id ? `/api/admin/staff/${encodeURIComponent(form.id)}` : "/api/admin/staff", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this staff account.");
      setNotice(form.id ? "Staff account updated." : "Staff account created.");
      setForm(null);
      await loadStaff();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save this staff account.");
    } finally {
      setSaving(false);
    }
  }

  async function addRole() {
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/staff/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name: newRoleName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add role.");
      setRoles((current) => [...current, result.role].sort((left, right) => left.label.localeCompare(right.label)));
      if (form) setForm({ ...form, role: result.role.key });
      setNewRoleName("");
      setAddingRole(false);
      setNotice(`Added the ${result.role.label} role. It has Manager access.`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not add role.");
    }
  }

  async function toggleActive(member: StaffMember) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/staff/${encodeURIComponent(member.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name: member.name,
          email: member.email,
          phone: member.phone || "",
          role: member.role,
          active: !member.active,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update staff access.");
      setNotice(`${member.name}'s account is now ${member.active ? "inactive" : "active"}.`);
      await loadStaff();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not update staff access.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">People manage</p>
          <h1 className="mt-1 font-display text-3xl text-cocoa-800">Staff members</h1>
          <p className="mt-1 text-sm text-stone-600">Create individual sign-ins and control what each staff member can access.</p>
        </div>
        {!form && (
          <button type="button" onClick={() => { setError(""); setNotice(""); setForm({ ...emptyForm }); }} className="rounded-xl bg-cocoa-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cocoa-700">
            Add staff member
          </button>
        )}
      </div>

      <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-950">
        <strong>Access levels:</strong> Admin manages staff and has full access. Manager, Accountant, CFO, and custom roles can use the existing admin areas. Sales representatives can access Orders and Point of sale only.
      </div>
      {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {form && (
        <form onSubmit={saveMember} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-semibold text-cocoa-800 sm:col-span-2">{form.id ? "Edit staff member" : "New staff member"}</h2>
          <label className="text-sm font-medium text-stone-700">Full name
            <input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-stone-700">Email for sign-in
            <input required type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-stone-700">Phone (optional)
            <input type="tel" maxLength={32} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5" />
          </label>
          <div className="text-sm font-medium text-stone-700">
            <label htmlFor="staff-role">Access level</label>
            <div className="mt-1 flex gap-2">
              <select id="staff-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminRole })} className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5">
                {roles.map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}
              </select>
              <button type="button" onClick={() => { setAddingRole((value) => !value); setError(""); }} aria-label="Add a new role" title="Add a new role" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 text-cocoa-800 hover:border-orange-400 hover:bg-orange-50">
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          {addingRole && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 sm:col-span-2">
              <label className="block text-sm font-medium text-stone-700">New role name
                <input required minLength={2} maxLength={50} value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5" placeholder="e.g. Inventory lead" />
              </label>
              <p className="mt-1 text-xs text-stone-600">New roles have the same access as Manager. Only Admins can manage staff accounts.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void addRole()} className="rounded-lg bg-cocoa-800 px-3 py-2 text-xs font-semibold text-white">Add role</button>
                <button type="button" onClick={() => { setAddingRole(false); setNewRoleName(""); }} className="rounded-lg border border-stone-300 px-3 py-2 text-xs">Cancel</button>
              </div>
            </div>
          )}
          <label className="text-sm font-medium text-stone-700 sm:col-span-2">Password {form.id ? "(leave blank to keep current)" : ""}
            <input required={!form.id} minLength={7} maxLength={256} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5" />
            <span className="mt-1 block text-xs font-normal text-stone-500">At least 7 characters.</span>
          </label>
          {form.id && (
            <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              Account active
            </label>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={saving} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Saving…" : form.id ? "Save changes" : "Create staff account"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        {loading ? (
          <p className="p-5 text-sm text-stone-500">Loading staff…</p>
        ) : staff.length ? (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-50 text-xs text-stone-600">
              <tr><th className="px-4 py-3">Staff member</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Manage</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-cocoa-800">{member.name}</span>
                    <span className="text-xs text-stone-500">{member.email}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{member.phone || "—"}</td>
                  <td className="px-4 py-3 text-stone-700">{roles.find((role) => role.key === member.role)?.label || member.role}</td>
                  <td className="px-4 py-3"><span className={member.active ? "text-green-700" : "text-stone-500"}>{member.active ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button type="button" onClick={() => editMember(member)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-orange-300">Edit</button>
                      <button type="button" onClick={() => void toggleActive(member)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-orange-300">
                        {member.active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-5 text-sm text-stone-500">No staff accounts found.</p>
        )}
      </section>
    </div>
  );
}
