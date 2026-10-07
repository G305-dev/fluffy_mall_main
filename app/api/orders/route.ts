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

const ALLOWED_DELIVERY_STATES = [
  "Lagos",
  "Outside Lagos",
] as const;

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

  // Paystack is the only checkout provider.
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
        error: "Name and phone are required",
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
   * Store it as Lagos internally for compatibility.
   */
  const state =
    fulfilment === "pickup"
      ? "Lagos"
      : requestedState;

  const zone = zoneFromState(state);

  /*
   * Lagos delivery requires a valid city.
   * Outside Lagos delivery does not require a city.
   */
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

  const quote = quoteDelivery({
    settings,
    fulfilment,
    zone,
    subtotal,
    city,
  });

  /*
   * Delivery and pickup adjustments are not discounted.
   * Only the product subtotal receives the discount.
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

  return NextResponse.json({ order });
}