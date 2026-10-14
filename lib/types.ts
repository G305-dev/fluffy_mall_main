export type CategorySlug =
  | "pantry-storage-organiser"
  | "waste-bin"
  | "cookware"
  | "air-fryers"
  | "sieve"
  | "bath-series"
  | "laundry"
  | "hangers"
  | "blenders"
  | "vacuum-cleaner"
  | "iron"
  | "oven"
  | "electric-chopper"
  | "cutlery-utensils"
  | "cleaning-tools"
  | "dinnerware"
  | "ladders"
  | "glassware"
  | "tools"
  | "clothes-dryer"
  | "electric-kettle"
  | "rack"
  | "mats"
  | "food-warmer"
  | "trays"
  | "spoons"
  | "breakfast-makers"
  | "slow-juicer"
  | "wooden-utensils"
  | "straws"
  | "bakeware"
  | "covers"
  | "scale"
  | "dehydrator"
  | "gas-burner"
  | "chopping-board"
  | "pressure-cooker"
  | "mixer"
  | "food-processor"
  | "moulds"
  | "tables";

export type ProductVariant = {
  id: string;
  name: string;
  size?: string;
  color?: string;
  price: number;
  stock: number;
  image: string;
  traceposItemCode?: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  price: number;
  compareAt?: number;
  stock: number;
  images: string[];
  short: string;
  description: string;
  variants: ProductVariant[];
  deliveryNote?: string;
  featured?: boolean;
  bestseller?: boolean;
  traceposItemCode?: string;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  unitPrice: number;
  qty: number;
  variantId?: string;
  variantName?: string;
};

export type Fulfilment = "delivery" | "pickup";
export type Zone = "lagos" | "outside";
export type PayMethod = "paystack" | "bank";
export type PaymentStatus = "pending" | "paid" | "failed";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "out_for_delivery"
  | "awaiting_pickup"
  | "completed"
  | "cancelled"
  | "refunded";

export type OrderItem = {
  productId: string;
  name: string;
  variantName?: string;
  unitPrice: number;
  qty: number;
  image?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    state: string;
    city?: string;
    notes?: string;
  };
  items: OrderItem[];
  fulfilment: Fulfilment;
  zone: Zone;
  subtotal: number;
  discount?: number;
  discountPercent?: number;
  deliveryFee: number;
  pickupDiscount: number;
  total: number;
  status: OrderStatus;
  payment: {
    method: PayMethod;
    status: PaymentStatus;
    amount: number;
    reference?: string;
    paidAt?: string;
  };
  customerNotified?: boolean;
  traceposSaleStatus?: "processing" | "synced" | "failed";
  traceposSaleReference?: string;
  traceposSaleAttemptedAt?: string;
  traceposSaleSyncedAt?: string;
  traceposSaleInvoiceNumber?: string;
  traceposSaleError?: string;
};

export type StoreSettings = {
  storeName: string;
  tagline: string;
  address: string;
  hours: string;
  phones: string[];
  instagram: string;
  tiktok: string;
  email: string;
  lagosDeliveryFee: number;
  outsideDeliveryFee: number;
  lagosFreeThreshold: number;
  outsideFreeThreshold: number;
  pickupDiscountPercent: number;
  pickupDiscountMin: number;
  pickupDiscountMax: number;
  bankAccounts: Array<{
    bank: string;
    number: string;
    name: string;
  }>;
  antiFraudNote: string;
  openingHours: Array<{
    day: string;
    hours: string;
  }>;
};

export type Subscriber = {
  name: string;
  email: string;
  subscribedAt: string;
  unsubscribedAt?: string;
};