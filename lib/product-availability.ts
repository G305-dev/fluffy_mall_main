import type { CartItem, OrderItem, Product } from "./types";

export function hasVariants(product: Product) {
  return (
    product.productType === "variable" ||
    (product.variants?.length || 0) > 0
  );
}

// The parent stock on a variable product is not a sellable option's stock.
export function availableStock(product: Product) {
  if (hasVariants(product)) {
    return (product.variants || []).reduce(
      (total, variant) =>
        total + Math.max(0, Number(variant.stock) || 0),
      0
    );
  }
  return Math.max(0, Number(product.stock) || 0);
}

export function isOutOfStock(product: Product) {
  return availableStock(product) <= 0;
}

export function startingPrice(product: Product) {
  if (!product.variants?.length) return product.price;

  const available = product.variants.filter(
    (variant) => variant.stock > 0
  );

  return Math.min(
    ...(available.length
      ? available
      : product.variants
    ).map((variant) => variant.price)
  );
}

export class StockUnavailableError extends Error {}

// Never trust the cart's product name, price or stock. Use current inventory.
// Variants remain visible for browsing, but cannot be ordered in this release.
export function resolveAvailableOrderItems(
  items: CartItem[],
  catalog: Product[]
): OrderItem[] {
  const products = new Map(
    catalog.map((product) => [product.id, product])
  );
  const requested = new Map<string, number>();

  return items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new StockUnavailableError(
        "A product in your cart is invalid. Please review your cart."
      );
    }

    const product = products.get(item.productId);
    if (!product) {
      throw new StockUnavailableError(
        "A product in your cart is no longer available. Please review your cart."
      );
    }

    if (hasVariants(product)) {
      throw new StockUnavailableError(
        `${product.name} options are temporarily paused. Remove this item before checkout.`
      );
    }

    if (item.variantId) {
      throw new StockUnavailableError(
        `The selected option for ${product.name} is unavailable.`
      );
    }

    const qty = Number(item.qty);
    if (!Number.isSafeInteger(qty) || qty <= 0) {
      throw new StockUnavailableError(
        "Choose a valid whole-number quantity for each item."
      );
    }

    const totalRequested =
      (requested.get(product.id) || 0) + qty;
    const stock = Number(product.stock);

    if (!Number.isSafeInteger(stock) || stock <= 0) {
      throw new StockUnavailableError(
        `${product.name} is out of stock. Remove it from your cart.`
      );
    }

    if (totalRequested > stock) {
      throw new StockUnavailableError(
        `Only ${stock} of ${product.name} ${
          stock === 1 ? "is" : "are"
        } available. Reduce the quantity in your cart.`
      );
    }

    requested.set(product.id, totalRequested);

    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      qty,
      image: product.images?.[0],
    };
  });
}