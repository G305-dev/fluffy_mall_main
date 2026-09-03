import Link from "next/link";
import { cookies } from "next/headers";
import { getOrdersByEmail } from "@/lib/db";
import { CUSTOMER_COOKIE, readCustomerSession } from "@/lib/customer-auth";
import { naira } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const metadata = { title: "Order history" };

export default async function OrderHistoryPage() {
  const session = readCustomerSession(cookies().get(CUSTOMER_COOKIE)?.value);

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-20 text-center">
        <h1 className="font-display text-3xl text-cocoa-800">Sign in to view your orders</h1>
        <p className="mt-3 text-sm text-cocoa-700/70">
          Your order history is connected to the email used at checkout.
        </p>
        <Link
          href="/login?next=/account/orders"
          className="mt-6 inline-block rounded-full bg-cocoa-800 px-6 py-3 text-sm font-semibold text-cream-50"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const orders = await getOrdersByEmail(session.email);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Your account</p>
      <h1 className="mt-2 font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">Order history</h1>
      <p className="mt-2 break-all text-sm text-cocoa-700/70">Orders for {session.email}</p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white p-5 text-center sm:p-8 ring-1 ring-cream-200">
          <h2 className="font-display text-2xl text-cocoa-800">No orders yet</h2>
          <p className="mt-2 text-sm text-cocoa-700/70">Your completed checkouts will appear here.</p>
          <Link href="/shop" className="mt-5 inline-block text-sm font-semibold text-terracotta-600">
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-3xl bg-white p-5 ring-1 ring-cream-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/order/${order.id}`} className="font-display text-xl text-cocoa-800 hover:text-terracotta-600">
                    {order.id}
                  </Link>
                  <p className="mt-1 text-xs text-cocoa-700/60">
                    {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(order.createdAt))}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cream-200 pt-4 text-sm">
                <span>{order.items.reduce((total, item) => total + item.qty, 0)} item(s)</span>
                <span className="font-semibold">{naira(order.total)}</span>
                <Link href={`/order/${order.id}`} className="text-terracotta-600">
                  View order
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
