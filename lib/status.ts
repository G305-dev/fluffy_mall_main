import { OrderStatus } from "./types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  awaiting_verification: "Awaiting verification",
  paid: "Paid / confirmed",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
  awaiting_pickup: "Awaiting pickup",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900",
  awaiting_verification: "bg-orange-100 text-orange-900",
  paid: "bg-emerald-100 text-emerald-900",
  processing: "bg-sky-100 text-sky-900",
  out_for_delivery: "bg-indigo-100 text-indigo-900",
  awaiting_pickup: "bg-violet-100 text-violet-900",
  completed: "bg-sage-500/15 text-sage-600",
  cancelled: "bg-stone-200 text-stone-700",
  refunded: "bg-rose-100 text-rose-800",
};
