import type {
  Fulfilment,
  StoreSettings,
  Zone,
} from "./types";

export const DELIVERY_FEES: Record<string, number> = {
  Surulere: 5000,
  Ikeja: 5000,
  Ogba: 5000,
  Isolo: 5000,
  Ikotun: 5000,
  Igando: 5000,
  Command: 4000,
  "Iyana Ipaja": 4000,
  Dopemu: 4000,
  "Abule-Egba": 5000,
  Yaba: 4000,
  Ikorodu: 5000,
  Ketu: 4000,
  Gbagada: 3500,
  Alakuko: 5000,
  Egbeda: 5000,
  Idimu: 5000,
  Agege: 5000,
  Ayobo: 7000,
  Shomolu: 4000,
  Ikosi: 4000,
  Ago: 5000,
  VGC: 8000,
  Ikoyi: 6000,
  VI: 6000,
  Lekki: 6000,
  Chevron: 7000,
  "Orchid Road": 7000,
  Ajah: 8000,
  Sangotedo: 8000,
  Ikate: 6000,
  Agugi: 7000,
};

export const DELIVERY_CITIES = Object.keys(
  DELIVERY_FEES
);

export function zoneFromState(state: string): Zone {
  return state === "Lagos" ? "lagos" : "outside";
}

export function quoteDelivery(opts: {
  settings: StoreSettings;
  fulfilment: Fulfilment;
  zone: Zone;
  subtotal: number;
  city?: string;
}) {
  const {
    fulfilment,
    subtotal,
    city,
  } = opts;

  if (fulfilment === "pickup") {
    return {
      deliveryFee: 0,
      pickupDiscount: 0,
      freeDelivery: false,
      total: subtotal,
    };
  }

  const deliveryFee = city
    ? DELIVERY_FEES[city] ?? 0
    : 0;

  return {
    deliveryFee,
    pickupDiscount: 0,
    freeDelivery: false,
    total: subtotal + deliveryFee,
  };
}