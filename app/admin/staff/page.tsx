import { redirect } from "next/navigation";
import StaffMembers from "./StaffMembers";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StaffMembersPage() {
  const session = await getAdminSession();
  if (session?.role !== "admin") redirect("/admin");
  return <StaffMembers />;
}
