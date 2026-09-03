import { Fulfilment, StoreSettings, Zone } from "./types";

export function zoneFromState(state: string): Zone {
  return state === "Lagos" ? "lagos" : "outside";
}

export function quoteDelivery(opts: {
  settings: StoreSettings;
  fulfilment: Fulfilment;
  zone: Zone;
  subtotal: number;
}) {
  const { settings, fulfilment, zone, subtotal } = opts;
  if (fulfilment === "pickup") {
    const pct = settings.pickupDiscountPercent;
    const discount = Math.round((subtotal * pct) / 100);
    return {
      deliveryFee: 0,
      pickupDiscount: discount,
      freeDelivery: false,
      total: Math.max(0, subtotal - discount),
    };
  }
  const fee =
    zone === "lagos"
      ? settings.lagosDeliveryFee
      : settings.outsideDeliveryFee;
  const threshold =
    zone === "lagos"
      ? settings.lagosFreeThreshold
      : settings.outsideFreeThreshold;
  const free = subtotal >= threshold;
  const deliveryFee = free ? 0 : fee;
  return {
    deliveryFee,
    pickupDiscount: 0,
    freeDelivery: free,
    total: subtotal + deliveryFee,
  };
}
