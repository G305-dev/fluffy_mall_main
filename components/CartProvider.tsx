"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CartItem } from "@/lib/types";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  itemKey: (item: Pick<CartItem, "productId" | "variantId">) => string;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE = "fny_cart_v1";

export function itemKey(item: Pick<CartItem, "productId" | "variantId">) {
  return `${item.productId}::${item.variantId || "default"}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    return {
      items,
      count,
      subtotal,
      itemKey,
      add: (item, qty = 1) => {
        setItems((prev) => {
          const key = itemKey(item);
          const found = prev.find((p) => itemKey(p) === key);
          if (found) {
            return prev.map((p) =>
              itemKey(p) === key ? { ...p, qty: p.qty + qty } : p
            );
          }
          return [...prev, { ...item, qty }];
        });
      },
      setQty: (key, qty) => {
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => itemKey(p) !== key)
            : prev.map((p) => (itemKey(p) === key ? { ...p, qty } : p))
        );
      },
      remove: (key) => setItems((prev) => prev.filter((p) => itemKey(p) !== key)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
