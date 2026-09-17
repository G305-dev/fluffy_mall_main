import type { Fulfilment, StoreSettings, Zone } from "./types";
export const DELIVERY_CITIES = [
  "Surulere",
  "Ikeja",
  "Ogba",
  "Isolo",
  "Ikotun",
  "Igando",
  "Command",
  "Iyana Ipaja",
  "Dopemu",
  "Abule-Egba",
  "Yaba",
  "Ikorodu",
  "Ketu",
  "Gbagada",
  "Alakuko",
  "Egbeda",
  "Idimu",
  "Agege",
  "Ayobo",
  "Shomolu",
  "Ikosi",
  "Ago",
  "VGC",
  "Ikoyi",
  "VI",
  "Lekki",
  "Chevron",
  "Orchid Road",
  "Ajah",
  "Sangotedo",
  "Ikate",
  "Agugi",
] as const;
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


  const { settings, fulfilment, zone, subtotal } = opts;
  if (fulfilment === "pickup") {
  return {
    deliveryFee: 0,
    pickupDiscount: 0,
    freeDelivery: false,
    total: subtotal,
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
    deliveryFee: 0,
    pickupDiscount: 0,
    freeDelivery: false,
    total: opts.subtotal,
  };
}
