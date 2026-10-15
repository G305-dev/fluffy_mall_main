import type { CartItem, OrderItem, Product } from "./types";

export function hasVariants(product: Product) {
  return product.productType === "variable" || (product.variants?.length || 0) > 0;
}

// Never use the parent's stock for a variable product: it may be stale after
// an option is synced individually. A positive option keeps the parent in stock.
export function availableStock(product: Product) {
  if (hasVariants(product)) {
    return (product.variants || []).reduce(
      (total, variant) => total + Math.max(0, Number(variant.stock) || 0),
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
  const available = product.variants.filter((variant) => variant.stock > 0);
  return Math.min(...(available.length ? available : product.variants).map((variant) => variant.price));
}

export class StockUnavailableError extends Error {}

// The cart is a client-side snapshot. Recheck selected options and their total
// quantities against the current catalogue before creating an order.
export function resolveAvailableOrderItems(
  items: Pick<CartItem, "productId" | "variantId" | "qty">[],
  catalog: Product[]
): OrderItem[] {
  const products = new Map(catalog.map((product) => [product.id, product]));
  const requested = new Map<string, number>();

  return items.map((item) => {
    if (!item || typeof item !== "object") {
      throw new StockUnavailableError("A product in your cart is invalid. Please review your cart.");
    }
    const product = products.get(item.productId);
    if (!product) throw new StockUnavailableError("A product in your cart is no longer available. Please review your cart.");

    const variants = product.variants || [];
    const variant = item.variantId
      ? variants.find((option) => option.id === item.variantId)
      : undefined;
    if (hasVariants(product) && !item.variantId) {
      throw new StockUnavailableError(`Choose an option for ${product.name} before checking out.`);
    }
    if ((item.variantId && !variant) || (!hasVariants(product) && item.variantId)) {
      throw new StockUnavailableError(`The selected option for ${product.name} is no longer available. Please choose another.`);
    }

    const qty = Number(item.qty);
    if (!Number.isSafeInteger(qty) || qty <= 0) {
      throw new StockUnavailableError("Choose a valid whole-number quantity for each item.");
    }

    const label = `${product.name}${variant ? ` — ${variant.name}` : ""}`;
    const key = `${product.id}::${variant?.id || "default"}`;
    const totalRequested = (requested.get(key) || 0) + qty;
    const stock = Number(variant ? variant.stock : product.stock);
    if (!Number.isFinite(stock) || stock <= 0) {
      throw new StockUnavailableError(`${label} is out of stock. Remove it or choose an available option.`);
    }
    if (totalRequested > stock) {
      throw new StockUnavailableError(`Only ${stock} of ${label} ${stock === 1 ? "is" : "are"} available. Reduce the quantity in your cart.`);
    }
    requested.set(key, totalRequested);

    return {
      productId: product.id,
      name: product.name,
      ...(variant ? { variantId: variant.id } : {}),
      variantName: variant?.name,
      unitPrice: variant ? variant.price : product.price,
      qty,
      image: product.images?.[0],
    };
  });
}