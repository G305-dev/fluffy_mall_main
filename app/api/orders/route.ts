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
  OrderItem,
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
import { resolveAvailableOrderItems, StockUnavailableError } from "@/lib/product-availability";

const ALLOWED_DELIVERY_STATES = [
  "Lagos",
  "Outside Lagos",
] as const;

export async function POST(
  req: NextRequest
) {
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

  const items = Array.isArray(body?.items) ? body.items as CartItem[] : [];

  const fulfilment =
    body.fulfilment === "pickup"
      ? "pickup"
      : "delivery";

  /*
   * Paystack is the only checkout provider.
   */
  const method: PayMethod = "paystack";

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
        error:
          "Name and phone are required",
      },
      { status: 400 }
    );
  }

  const requestedState = String(
    customer.state || "Lagos"
  ).trim();

  if (
    fulfilment === "delivery" &&
    !ALLOWED_DELIVERY_STATES.includes(
      requestedState as
        (typeof ALLOWED_DELIVERY_STATES)[number]
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Please select Lagos or Outside Lagos.",
      },
      { status: 400 }
    );
  }

  /*
   * Pickup does not use a delivery area.
   */
  const state =
    fulfilment === "pickup"
      ? "Lagos"
      : requestedState;

  const zone = zoneFromState(state);

  const city =
    fulfilment === "delivery" &&
    zone === "lagos"
      ? String(customer.city || "").trim()
      : "";

  if (
    fulfilment === "delivery" &&
    zone === "lagos" &&
    !DELIVERY_CITIES.some(
      (deliveryCity) => deliveryCity === city
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Please select a valid Lagos delivery city.",
      },
      { status: 400 }
    );
  }

  if (
    fulfilment === "delivery" &&
    !String(customer.address || "").trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Please add your delivery address.",
      },
      { status: 400 }
    );
  }

  const catalog = await getProducts();
  let resolved: OrderItem[];
  try {
    resolved = resolveAvailableOrderItems(items, catalog);
  } catch (error) {
    if (error instanceof StockUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  const subtotal = resolved.reduce(
    (sum, item) =>
      sum + item.unitPrice * item.qty,
    0
  );

  const settings = await getSettings();

  const quote = quoteDelivery({
    settings,
    fulfilment,
    zone,
    subtotal,
    city,
  });

  /*
   * Only eligible new customer accounts can claim
   * the discount. The claim is atomic and happens
   * when this order is created.
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

      /*
       * Always use the authenticated account email.
       */
      email: session.email,

      address: String(
        customer.address || ""
      ).trim(),

      state,

      city:
        fulfilment === "delivery" &&
        zone === "lagos"
          ? city
          : "",

      notes: String(
        customer.notes || ""
      ).trim(),
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

  return NextResponse.json({
    order,
  });
}