import { getOrders } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";
import OrdersDashboard from "./OrdersDashboard";
import type { StatusFilter } from "./OrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { status?: string | string[] };
}) {
  const requested = searchParams?.status;
  const value = typeof requested === "string" ? requested : "all";
  const initialStatus: StatusFilter = value === "pending" ||
    Object.prototype.hasOwnProperty.call(STATUS_LABEL, value)
    ? value as "pending" | OrderStatus : "all";
  const orders = await getOrders();

  return (
    <OrdersDashboard
      orders={orders}
      initialStatus={initialStatus}
      nowISO={new Date().toISOString()}
    />
  );
}