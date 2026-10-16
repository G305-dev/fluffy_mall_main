import AdminNav from "@/components/AdminNav";
import AdminSessionGuard from "@/components/AdminSessionGuard";
import { getAdminSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  return (
    <>
      <AdminSessionGuard />
      <AdminNav role={session?.role}>{children}</AdminNav>
    </>
  );
}