import { NextRequest, NextResponse } from "next/server";
import { getProducts, getSettings, makeOrderId, saveOrder } from "@/lib/db";
import { quoteDelivery, zoneFromState } from "@/lib/delivery";
import { CartItem, Order, PayMethod } from "@/lib/types";
import { CUSTOMER_COOKIE, readCustomerSession } from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  // Guest checkout is allowed (Adikastore pattern): a signed-in session is
  // optional, but every order must carry a contact email for confirmations.
  const session = readCustomerSession(req.cookies.get(CUSTOMER_COOKIE)?.value);

  const body = await req.json();
  const items = (body.items || []) as CartItem[];
  const fulfilment = body.fulfilment === "pickup" ? "pickup" : "delivery";
  const method: PayMethod = body.method === "bank_transfer" ? "bank_transfer" : "paystack";
  const customer = body.customer || {};
  if (session?.email && !customer.email) customer.email = session.email;

  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (!customer.name || !customer.phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }
  if (!session && !/^\S+@\S+\.\S+$/.test(String(customer.email || ""))) {
    return NextResponse.json(
      { error: "Enter a valid email address for order updates." },
      { status: 400 }
    );
  }

  const catalog = await getProducts();
  const resolved = items.map((item) => {
    const product = catalog.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Unknown product ${item.productId}`);
    const variant = product.variants.find((v) => v.id === item.variantId);
    const unitPrice = variant ? variant.price : product.price;
    return {
      productId: product.id,
      name: product.name,
      variantName: variant?.name,
      unitPrice,
      qty: Math.max(1, Number(item.qty) || 1),
      image: product.images[0],
    };
  });

  const subtotal = resolved.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const settings = await getSettings();
  const zone = zoneFromState(customer.state || "Lagos");
  const quote = quoteDelivery({ settings, fulfilment, zone, subtotal });
  const now = new Date().toISOString();
  const id = makeOrderId();

  const order: Order = {
    id,
    createdAt: now,
    updatedAt: now,
    customer: {
      name: String(customer.name).trim(),
      phone: String(customer.phone).trim(),
      email: session?.email || String(customer.email).trim().toLowerCase(),
      address: customer.address || "",
      state: customer.state || "Lagos",
      notes: customer.notes || "",
    },
    items: resolved,
    fulfilment,
    zone,
    subtotal,
    deliveryFee: quote.deliveryFee,
    pickupDiscount: quote.pickupDiscount,
    total: quote.total,
    status: "pending_payment",
    payment: {
      method,
      status: "pending",
      amount: quote.total,
      reference: id,
    },
  };

  await saveOrder(order);
  return NextResponse.json({ order });
}
