import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  getDb,
  COLLECTIONS,
} from "@/lib/mongo";
import {
  CUSTOMER_COOKIE,
  readCustomerSession,
} from "@/lib/customer-auth";
import type { CartItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCustomerEmail(
  request: NextRequest
) {
  const session = readCustomerSession(
    request.cookies.get(CUSTOMER_COOKIE)?.value
  );

  return session?.email || null;
}

function normalizeWishlist(
  input: unknown
): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .filter(
          (value): value is string =>
            typeof value === "string"
        )
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function normalizeCart(
  input: unknown
): CartItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((value) => {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return [];
    }

    const item =
      value as Record<string, unknown>;

    const productId = String(
      item.productId || ""
    ).trim();

    const slug = String(
      item.slug || ""
    ).trim();

    const name = String(
      item.name || ""
    ).trim();

    const image = String(
      item.image || ""
    ).trim();

    const unitPrice = Number(
      item.unitPrice
    );

    const qty = Math.floor(
      Number(item.qty)
    );

    if (
      !productId ||
      !slug ||
      !name ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isFinite(qty) ||
      qty <= 0
    ) {
      return [];
    }

    const variantId =
      typeof item.variantId === "string"
        ? item.variantId.trim()
        : "";

    const variantName =
      typeof item.variantName === "string"
        ? item.variantName.trim()
        : "";

    const normalized: CartItem = {
      productId,
      slug,
      name,
      image,
      unitPrice,
      qty,
    };

    if (variantId) {
      normalized.variantId = variantId;
    }

    if (variantName) {
      normalized.variantName = variantName;
    }

    return [normalized];
  });
}

export async function GET(
  request: NextRequest
) {
  const email = getCustomerEmail(request);

  if (!email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const db = await getDb();

  const account = await db
    .collection(COLLECTIONS.CUSTOMERS)
    .findOne({ email });

  return NextResponse.json(
    {
      cart: normalizeCart(
        account?.savedCart
      ),
      wishlist: normalizeWishlist(
        account?.savedWishlist
      ),
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function PUT(
  request: NextRequest
) {
  const email = getCustomerEmail(request);

  if (!email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(
    () => null
  );

  if (
    !body ||
    typeof body !== "object"
  ) {
    return NextResponse.json(
      { error: "Invalid saved state." },
      { status: 400 }
    );
  }

  const input =
    body as Record<string, unknown>;

  const updates: Record<string, unknown> = {
    savedStateUpdatedAt:
      new Date().toISOString(),
  };

  if ("cart" in input) {
    updates.savedCart = normalizeCart(
      input.cart
    );
  }

  if ("wishlist" in input) {
    updates.savedWishlist =
      normalizeWishlist(input.wishlist);
  }

  if (
    !("cart" in input) &&
    !("wishlist" in input)
  ) {
    return NextResponse.json(
      { error: "Nothing to save." },
      { status: 400 }
    );
  }

  const db = await getDb();

  await db
    .collection(COLLECTIONS.CUSTOMERS)
    .updateOne(
      { email },
      { $set: updates }
    );

  return NextResponse.json({ ok: true });
}