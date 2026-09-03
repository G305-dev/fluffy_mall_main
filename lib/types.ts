export type CategorySlug =
  | "kitchen-appliances"
  | "cookware-utensils"
  | "home-organisation"
  | "household-essentials"
  | "bathroom"
  | "corporate-gifts";

export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAt?: number;
  category: CategorySlug;
  featured: boolean;
  bestseller: boolean;
  stock: number;
  images: string[];
  short: string;
  description: string;
  variants: ProductVariant[];
  deliveryNote: string;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  qty: number;
};

export type Fulfilment = "delivery" | "pickup";
export type Zone = "lagos" | "outside";
export type PayMethod = "paystack" | "bank_transfer";

export type OrderStatus =
  | "pending_payment"
  | "awaiting_verification"
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
  image: string;
};

export type Customer = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  state: string;
  notes?: string;
};

export type Payment = {
  method: PayMethod;
  status: "pending" | "paid" | "failed" | "awaiting_verification";
  reference?: string;
  amount: number;
  paidAt?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  items: OrderItem[];
  fulfilment: Fulfilment;
  zone: Zone;
  subtotal: number;
  deliveryFee: number;
  pickupDiscount: number;
  total: number;
  status: OrderStatus;
  payment: Payment;
  customerNotified?: boolean;
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
  bankAccounts: { bank: string; number: string; name: string }[];
  antiFraudNote: string;
  openingHours: { day: string; hours: string }[];
};
