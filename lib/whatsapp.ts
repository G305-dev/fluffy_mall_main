import { CartItem, Order } from "./types";
import { naira, waLink } from "./format";

export const PRIMARY_WA = "08133630563";
export const WA_LINES = ["08133630563", "08147081420", "09167013447"];

export function productWhatsAppText(name: string, price: number, variant?: string) {
  const v = variant ? ` (${variant})` : "";
  return `Hello Fluffy'n'Yummy Mall! I want to order:\n\n• ${name}${v} — ${naira(price)}\n\nFrom fluffynyummy.com`;
}

export function cartWhatsAppText(items: CartItem[], extra?: string) {
  const lines = items.map(
    (i) =>
      `• ${i.name}${i.variantName ? ` (${i.variantName})` : ""} x${i.qty} — ${naira(i.unitPrice * i.qty)}`
  );
  const sub = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  return `Hello Fluffy'n'Yummy Mall! I'd like to order:\n\n${lines.join("\n")}\n\nSubtotal: ${naira(sub)}${extra ? `\n${extra}` : ""}\n\nFrom fluffynyummy.com`;
}

export function orderWhatsAppText(order: Order) {
  const lines = order.items.map(
    (i) =>
      `• ${i.name}${i.variantName ? ` (${i.variantName})` : ""} x${i.qty} — ${naira(i.unitPrice * i.qty)}`
  );
  const fulfil =
    order.fulfilment === "pickup"
      ? "Pickup at 30A Oseni Street, Anthony Village"
      : `Delivery — ${order.customer.state}${order.customer.address ? `\nAddress: ${order.customer.address}` : ""}`;
  return `Hello Fluffy'n'Yummy Mall! New / existing order ${order.id}

${lines.join("\n")}

Subtotal: ${naira(order.subtotal)}
${order.pickupDiscount ? `Pickup discount: -${naira(order.pickupDiscount)}\n` : ""}Delivery: ${naira(order.deliveryFee)}
Total: ${naira(order.total)}
Payment: ${order.payment.method === "paystack" ? "Paystack" : "Bank transfer"} (${order.payment.status})
${fulfil}

Name: ${order.customer.name}
Phone: ${order.customer.phone}`;
}

export function orderWaHref(order: Order, phone = PRIMARY_WA) {
  return waLink(phone, orderWhatsAppText(order));
}
