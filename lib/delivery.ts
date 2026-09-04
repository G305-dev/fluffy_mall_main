import type { Fulfilment, StoreSettings, Zone } from "./types";

export function zoneFromState(state: string): Zone {
  return state === "Lagos" ? "lagos" : "outside";
}

/*
 * Temporary delivery calculation.
 *
 * Delivery fees and pickup discounts are disabled until
 * the new delivery system is implemented.
 */
export function quoteDelivery(opts: {
  settings: StoreSettings;
  fulfilment: Fulfilment;
  zone: Zone;
  subtotal: number;
}) {
  return {
    deliveryFee: 0,
    pickupDiscount: 0,
    freeDelivery: false,
    total: opts.subtotal,
  };
}
