import { getOrder } from "@/lib/db";
import { notFound } from "next/navigation";
import { naira } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { orderWaHref } from "@/lib/whatsapp";
import OrderActions from "./OrderActions";

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  const order = await getOrder(params.id);
  if (!order) notFound();

  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-widest text-gold-600">Order</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="break-words font-display text-2xl sm:text-3xl">{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <dl className="mt-6 grid gap-3 rounded-3xl bg-white p-4 text-sm sm:p-6 ring-1 ring-cream-200 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-gold-600">Customer</dt>
          <dd className="mt-1 break-words">
            {order.customer.name}
            <br />
            {order.customer.phone}
            <br />
            {order.customer.email}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gold-600">Fulfilment</dt>
          <dd className="mt-1 break-words">
            {order.fulfilment === "pickup" ? "Pickup · Anthony Village" : `Delivery · ${order.customer.state}`}
            <br />
            {order.customer.address}
          </dd>
        </div>
      </dl>
      <ul className="mt-4 rounded-3xl bg-white p-4 text-sm sm:p-6 ring-1 ring-cream-200">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex min-w-0 justify-between gap-3 py-1.5">
            <span className="min-w-0 break-words">
              {i.name}
              {i.variantName ? ` (${i.variantName})` : ""} × {i.qty}
            </span>
            <span className="shrink-0">{naira(i.unitPrice * i.qty)}</span>
          </li>
        ))}
        <li className="mt-2 flex justify-between gap-3 border-t border-cream-200 pt-2 font-semibold">
          <span>Total</span>
          <span>{naira(order.total)}</span>
        </li>
      </ul>
      <p className="mt-3 break-words text-xs text-cocoa-700">
        Payment: {order.payment.method} · {order.payment.status}
        {order.payment.reference ? ` · ref ${order.payment.reference}` : ""}
      </p>
      <OrderActions id={order.id} status={order.status} paymentStatus={order.payment.status} />
      <a
        href={orderWaHref(order)}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block text-sm text-[#128C46]"
      >
        Open WhatsApp thread for this order
      </a>
    </div>
  );
}
