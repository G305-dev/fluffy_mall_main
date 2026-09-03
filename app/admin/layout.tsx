import AdminNav from "@/components/AdminNav";
import AdminSessionGuard from "@/components/AdminSessionGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream-100">
      <AdminSessionGuard />

      <AdminNav />

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </div>
    </div>
  );
}