import AdminNav from "@/components/AdminNav";
import AdminSessionGuard from "@/components/AdminSessionGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminSessionGuard />
      <AdminNav>{children}</AdminNav>
    </>
  );
}