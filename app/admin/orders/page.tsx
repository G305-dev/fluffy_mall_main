import { getOrders } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";
import OrdersDashboard from "./OrdersDashboard";
import type { ChannelFilter, StatusFilter } from "./OrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { status?: string | string[]; channel?: string | string[] };
}) {
  const requested = searchParams?.status;
  const value = typeof requested === "string" ? requested : "all";
  const initialStatus: StatusFilter = value === "pending" ||
    Object.prototype.hasOwnProperty.call(STATUS_LABEL, value)
    ? value as "pending" | OrderStatus : "all";
  const requestedChannel = searchParams?.channel;
  const channel = typeof requestedChannel === "string" ? requestedChannel : "all";
  const initialChannel: ChannelFilter = channel === "website" || channel === "pos"
    ? channel : "all";
  const orders = await getOrders();

  return (
    <OrdersDashboard
      key={`${initialStatus}-${initialChannel}`}
      orders={orders}
      initialStatus={initialStatus}
      initialChannel={initialChannel}
      nowISO={new Date().toISOString()}
    />
  );
}