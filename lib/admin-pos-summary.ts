import type { Order } from "@/lib/types";

export type PosSummary = {
  salesToday: number;
  transactions: number;
  averageOrderValue: number;
  salesChange: number | null;
  topProductName: string;
  topProductUnits: number;
};

function lagosDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateKeyOffset(date: Date, offsetDays: number) {
  const [year, month, day] = lagosDateKey(date).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return shifted.toISOString().slice(0, 10);
}

export function getPosSummary(orders: Order[], now: Date): PosSummary {
  const todayKey = lagosDateKey(now);
  const yesterdayKey = dateKeyOffset(now, -1);
  const paidPosOrders = orders.filter((order) =>
    order.channel === "pos" &&
    order.payment.status === "paid" &&
    order.status !== "cancelled" &&
    order.status !== "refunded"
  );
  const today = paidPosOrders.filter((order) => lagosDateKey(new Date(order.createdAt)) === todayKey);
  const yesterday = paidPosOrders.filter((order) => lagosDateKey(new Date(order.createdAt)) === yesterdayKey);
  const salesToday = today.reduce((sum, order) => sum + order.total, 0);
  const yesterdaySales = yesterday.reduce((sum, order) => sum + order.total, 0);
  const units = new Map<string, number>();
  for (const order of today) {
    for (const item of order.items) {
      units.set(item.name, (units.get(item.name) || 0) + item.qty);
    }
  }
  const topProduct = Array.from(units.entries()).sort((a, b) => b[1] - a[1])[0];
  const salesChange = yesterdaySales > 0
    ? Math.round(((salesToday - yesterdaySales) / yesterdaySales) * 100)
    : null;
  return {
    salesToday,
    transactions: today.length,
    averageOrderValue: today.length ? Math.round(salesToday / today.length) : 0,
    salesChange,
    topProductName: topProduct?.[0] || "No sales yet",
    topProductUnits: topProduct?.[1] || 0,
  };
}
