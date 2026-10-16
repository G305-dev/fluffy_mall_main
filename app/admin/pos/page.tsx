import { getProducts } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import PosWorkspace from "./PosWorkspace";

export const dynamic = "force-dynamic";

export default async function AdminPosPage() {
  const [products, staff] = await Promise.all([getProducts(), getAdminSession()]);
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <PosWorkspace
      products={products}
      staffName={staff?.name || "there"}
      greeting={greeting}
    />
  );
}
