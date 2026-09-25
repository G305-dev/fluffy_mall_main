import {
  claimTraceposSale,
  getOrder,
  getProducts,
  markTraceposSaleFailed,
  markTraceposSaleSynced,
} from "@/lib/db";

import {
  createTraceposSale,
  fetchTraceposProducts,
  normalizeTraceposCode,
} from "@/lib/tracepos";

function addWebsiteCodeCount(
  counts: Map<string, number>,
  value: unknown
): void {
  const code = normalizeTraceposCode(value);

  if (!code) {
    return;
  }

  counts.set(
    code,
    (counts.get(code) || 0) + 1
  );
}

export async function syncPaidOrderToTracepos(
  orderId: string
) {
  const order = await getOrder(orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.payment.status !== "paid") {
    return {
      status: "not_paid",
      orderId,
    };
  }

  const orderReference = order.id;

  const claim = await claimTraceposSale(
    order.id,
    orderReference
  );

  if (!claim) {
    const latestOrder = await getOrder(order.id);

    return {
      status:
        latestOrder?.traceposSaleStatus ||
        "processing",
      alreadyHandled: true,
      orderId: order.id,
    };
  }

  try {
    const [
      websiteProducts,
      traceposProducts,
    ] = await Promise.all([
      getProducts(),
      fetchTraceposProducts(),
    ]);

    const websiteCodeCounts = new Map<
      string,
      number
    >();

    for (const product of websiteProducts) {
      addWebsiteCodeCount(
        websiteCodeCounts,
        product.traceposItemCode
      );

      for (const variant of product.variants) {
        addWebsiteCodeCount(
          websiteCodeCounts,
          variant.traceposItemCode
        );
      }
    }

    const traceposByCode = new Map<
      string,
      (typeof traceposProducts)[number]
    >();

    const duplicateTraceposCodes =
      new Set<string>();

    for (const traceposProduct of traceposProducts) {
      const code = normalizeTraceposCode(
        traceposProduct.item_code ||
          traceposProduct.sku
      );

      if (!code) {
        continue;
      }

      if (traceposByCode.has(code)) {
        duplicateTraceposCodes.add(code);
        continue;
      }

      traceposByCode.set(code, traceposProduct);
    }

    const saleItems: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
    }> = [];

    for (const item of order.items) {
      const websiteProduct =
        websiteProducts.find(
          (product) =>
            product.id === item.productId
        );

      if (!websiteProduct) {
        throw new Error(
          `Website product not found: ${item.productId}`
        );
      }

      const variant = item.variantName
        ? websiteProduct.variants.find(
            (option) =>
              option.name === item.variantName
          )
        : undefined;

      if (
        websiteProduct.variants.length > 0 &&
        !variant
      ) {
        throw new Error(
          `Variant mapping not found for ${item.name} - ${
            item.variantName || "unknown variant"
          }`
        );
      }

      const websiteCode =
        normalizeTraceposCode(
          variant?.traceposItemCode ||
            websiteProduct.traceposItemCode
        );

      if (!websiteCode) {
        throw new Error(
          `No Tracepos item code for ${item.name}${
            item.variantName
              ? ` - ${item.variantName}`
              : ""
          }`
        );
      }

      if (
        (websiteCodeCounts.get(websiteCode) || 0) >
        1
      ) {
        throw new Error(
          `Duplicate website Tracepos code: ${websiteCode}`
        );
      }

      if (
        duplicateTraceposCodes.has(websiteCode)
      ) {
        throw new Error(
          `Duplicate Tracepos code: ${websiteCode}`
        );
      }

      const traceposProduct =
        traceposByCode.get(websiteCode);

      if (!traceposProduct) {
        throw new Error(
          `Tracepos item not found for code: ${websiteCode}`
        );
      }

      if (!traceposProduct.id) {
        throw new Error(
          `Tracepos product id is missing for code: ${websiteCode}`
        );
      }

      const quantity = Number(item.qty);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid quantity for ${item.name}`
        );
      }

      const unitPrice = Number(item.unitPrice);

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        throw new Error(
          `Invalid price for ${item.name}`
        );
      }

      saleItems.push({
        product_id: traceposProduct.id,
        quantity,
        unit_price: unitPrice,
      });
    }

    const traceposResponse =
      await createTraceposSale({
        orderReference,
        orderDate: order.createdAt.slice(0, 10),
        items: saleItems,
        notes: `Fluffy N Yummy website order ${orderReference}`,
      });

    const invoiceNumber = String(
      traceposResponse?.data?.invoice_number || ""
    );

    await markTraceposSaleSynced(order.id, {
      orderReference,
      invoiceNumber: invoiceNumber || undefined,
    });

    return {
      status: "synced",
      orderId: order.id,
      orderReference,
      invoiceNumber:
        invoiceNumber || undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Tracepos sale synchronization failed.";

    await markTraceposSaleFailed(
      order.id,
      message
    );

    return {
      status: "failed",
      orderId: order.id,
      orderReference,
      error: message,
    };
  }
}