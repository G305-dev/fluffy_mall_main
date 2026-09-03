import { getOrders, getProducts } from "@/lib/db";
import Link from "next/link";
import { naira } from "@/lib/format";

export default async function AdminHome() {
  const [orders, products] = await Promise.all([getOrders(), getProducts()]);
  const awaiting = orders.filter((o) => o.status === "awaiting_verification");
  const paidToday = orders.filter((o) => o.payment.status === "paid");
  const revenue = paidToday.reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <h1 className="font-display text-3xl">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 ring-1 ring-cream-200">
          <p className="text-xs uppercase tracking-widest text-gold-600">Orders</p>
          <p className="mt-2 font-display text-3xl">{orders.length}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-cream-200">
          <p className="text-xs uppercase tracking-widest text-gold-600">Awaiting bank confirmation</p>
          <p className="mt-2 font-display text-3xl">{awaiting.length}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-cream-200">
          <p className="text-xs uppercase tracking-widest text-gold-600">Confirmed revenue</p>
          <p className="mt-2 break-words font-display text-2xl sm:text-3xl">{naira(revenue)}</p>
        </div>
      </div>
      <div className="mt-7 grid gap-3 min-[430px]:flex min-[430px]:flex-wrap sm:mt-8">
        <Link href="/admin/orders" className="rounded-full bg-terracotta-500 px-5 py-2.5 text-sm text-white">
          Process orders
        </Link>
        <Link href="/admin/products" className="rounded-full px-5 py-2.5 text-sm ring-1 ring-cream-300">
          {products.length} products
        </Link>
        <Link href="/admin/analytics" className="rounded-full px-5 py-2.5 text-sm ring-1 ring-cream-300">
          View analytics
        </Link>
      </div>
    </div>
  );
}
