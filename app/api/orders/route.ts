import { NextRequest, NextResponse } from "next/server";
import {
  getProducts,
  getSettings,
  makeOrderId,
  saveOrder,
} from "@/lib/db";
import {
  DELIVERY_CITIES,
  quoteDelivery,
  zoneFromState,
} from "@/lib/delivery";
import {
  CartItem,
  Order,
  PayMethod,
} from "@/lib/types";
import {
  CUSTOMER_COOKIE,
  claimNewCustomerDiscount,
  findCustomerAccount,
  readCustomerSession,
} from "@/lib/customer-auth";
import {
  NEW_CUSTOMER_DISCOUNT_PERCENT,
  roundMoney,
} from "@/lib/promotions";

export async function POST(req: NextRequest) {
  const session = readCustomerSession(
    req.cookies.get(CUSTOMER_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json(
      {
        error:
          "You must sign in before placing an order.",
      },
      { status: 401 }
    );
  }

  const account = await findCustomerAccount(
    session.email
  );

  if (!account) {
    return NextResponse.json(
      {
        error:
          "Your customer account could not be found.",
      },
      { status: 401 }
    );
  }

  const body = await req.json();

  const items = (body.items || []) as CartItem[];

  const fulfilment =
    body.fulfilment === "pickup"
      ? "pickup"
      : "delivery";

  const method: PayMethod =
    body.method === "bank_transfer"
      ? "bank_transfer"
      : "paystack";

  const customer =
    body.customer &&
    typeof body.customer === "object"
      ? body.customer
      : {};

  if (!items.length) {
    return NextResponse.json(
      { error: "Cart is empty" },
      { status: 400 }
    );
  }

  if (!customer.name || !customer.phone) {
    return NextResponse.json(
      {
        error: "Name and phone are required",
      },
      { status: 400 }
    );
  }

  const city = String(
    customer.city || ""
  ).trim();

  if (
    fulfilment === "delivery" &&
    !DELIVERY_CITIES.some(
      (deliveryCity) =>
        deliveryCity === city
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Please select a valid delivery city.",
      },
      { status: 400 }
    );
  }

  const catalog = await getProducts();

  const resolved = items.map((item) => {
    const product = catalog.find(
      (catalogProduct) =>
        catalogProduct.id === item.productId
    );

    if (!product) {
      throw new Error(
        `Unknown product ${item.productId}`
      );
    }

    const variant = product.variants.find(
      (productVariant) =>
        productVariant.id === item.variantId
    );

    const unitPrice = variant
      ? variant.price
      : product.price;

    return {
      productId: product.id,
      name: product.name,
      variantName: variant?.name,
      unitPrice,
      qty: Math.max(
        1,
        Number(item.qty) || 1
      ),
      image: product.images[0],
    };
  });

  const subtotal = resolved.reduce(
    (sum, item) =>
      sum + item.unitPrice * item.qty,
    0
  );

  const settings = await getSettings();

  const zone = zoneFromState(
    customer.state || "Lagos"
  );

  const quote = quoteDelivery({
    settings,
    fulfilment,
    zone,
    subtotal,
    city,
  });

  /*
   * Delivery and pickup adjustments are not
   * discounted. Only the product subtotal receives
   * the 5% discount.
   */
  const discountClaimed =
    await claimNewCustomerDiscount(
      session.email
    );

  const discount = discountClaimed
    ? roundMoney(
        subtotal *
          (NEW_CUSTOMER_DISCOUNT_PERCENT / 100)
      )
    : 0;

  const total = roundMoney(
    Math.max(0, quote.total - discount)
  );

  const now = new Date().toISOString();
  const id = makeOrderId();

  const order: Order = {
    id,
    createdAt: now,
    updatedAt: now,

    customer: {
      name: String(customer.name).trim(),
      phone: String(customer.phone).trim(),

      // Always use the authenticated account email.
      email: session.email,

      address: customer.address || "",
      state: customer.state || "Lagos",
      city:
        fulfilment === "delivery"
          ? city
          : "",
      notes: customer.notes || "",
    },

    items: resolved,
    fulfilment,
    zone,
    subtotal,
    discount,
    discountPercent: discountClaimed
      ? NEW_CUSTOMER_DISCOUNT_PERCENT
      : 0,
    deliveryFee: quote.deliveryFee,
    pickupDiscount: quote.pickupDiscount,
    total,
    status: "pending_payment",

    payment: {
      method,
      status: "pending",
      amount: total,
      reference: id,
    },
  };

  await saveOrder(order);

  return NextResponse.json({ order });
}