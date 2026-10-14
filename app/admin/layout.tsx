import AdminNav from "@/components/AdminNav";
import AdminSessionGuard from "@/components/AdminSessionGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream-50">
      <AdminSessionGuard />

      <div className="min-h-screen lg:flex">
        <AdminNav />

        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}