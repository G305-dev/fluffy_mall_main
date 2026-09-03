import { getOrders } from "@/lib/db";
import OrdersTable from "./OrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getOrders();
  return (
    <div>
      <h1 className="font-display text-3xl">Orders</h1>
      <OrdersTable orders={orders} />
    </div>
  );
}
