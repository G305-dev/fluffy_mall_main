"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@/lib/types";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (
    item: Omit<CartItem, "qty">,
    qty?: number
  ) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  resetForLogout: () => void;
  itemKey: (
    item: Pick<
      CartItem,
      "productId" | "variantId"
    >
  ) => string;
};

const CartContext =
  createContext<CartContextValue | null>(
    null
  );

const STORAGE =
  "fny_cart_guest_v1";

const AUTH_EVENT =
  "fny:customer-auth-changed";

export function itemKey(
  item: Pick<
    CartItem,
    "productId" | "variantId"
  >
) {
  return `${item.productId}::${
    item.variantId || "default"
  }`;
}

function readGuestCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(
      STORAGE
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function mergeCarts(
  saved: CartItem[],
  guest: CartItem[]
) {
  const merged = [...saved];

  for (const guestItem of guest) {
    const key = itemKey(guestItem);

    const existing = merged.find(
      (item) => itemKey(item) === key
    );

    if (existing) {
      existing.qty += guestItem.qty;
    } else {
      merged.push(guestItem);
    }
  }

  return merged;
}

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<
    CartItem[]
  >([]);

  const [ready, setReady] =
    useState(false);

  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      const guestCart = readGuestCart();

      setReady(false);
      setAuthenticated(false);
      setItems([]);

      try {
        const sessionResponse = await fetch(
          "/api/customer/session",
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        const session =
          await sessionResponse.json();

        if (
          session?.authenticated
        ) {
          const savedResponse =
            await fetch(
              "/api/customer/saved-state",
              {
                cache: "no-store",
                credentials: "include",
              }
            );

          if (!savedResponse.ok) {
            throw new Error(
              "Could not load saved cart."
            );
          }

          const saved =
            await savedResponse.json();

          if (cancelled) {
            return;
          }

          const savedCart =
            Array.isArray(saved.cart)
              ? saved.cart
              : [];

          setAuthenticated(true);

          /*
           * Preserve any guest cart items and
           * combine them with the account cart.
           */
          setItems(
            mergeCarts(
              savedCart,
              guestCart
            )
          );

          localStorage.removeItem(STORAGE);
        } else {
          if (cancelled) {
            return;
          }

          setAuthenticated(false);
          setItems(guestCart);
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
          setItems(guestCart);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    const handleAuthChange = () => {
      void loadCart();
    };

    void loadCart();

    window.addEventListener(
      AUTH_EVENT,
      handleAuthChange
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        AUTH_EVENT,
        handleAuthChange
      );
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (authenticated) {
      localStorage.removeItem(STORAGE);
    } else {
      localStorage.setItem(
        STORAGE,
        JSON.stringify(items)
      );
    }
  }, [
    items,
    ready,
    authenticated,
  ]);

  useEffect(() => {
    if (!ready || !authenticated) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetch(
        "/api/customer/saved-state",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            cart: items,
          }),
        }
      ).catch(() => {
        // Keep the local cart if saving fails.
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    items,
    ready,
    authenticated,
  ]);

  const value = useMemo<CartContextValue>(
    () => {
      const count = items.reduce(
        (sum, item) => sum + item.qty,
        0
      );

      const subtotal = items.reduce(
        (sum, item) =>
          sum +
          item.unitPrice * item.qty,
        0
      );

      return {
        items,
        count,
        subtotal,
        itemKey,

        add: (item, qty = 1) => {
          setItems((current) => {
            const key = itemKey(item);

            const existing =
              current.find(
                (entry) =>
                  itemKey(entry) === key
              );

            if (existing) {
              return current.map(
                (entry) =>
                  itemKey(entry) === key
                    ? {
                        ...entry,
                        qty:
                          entry.qty + qty,
                      }
                    : entry
              );
            }

            return [
              ...current,
              {
                ...item,
                qty,
              },
            ];
          });
        },

        setQty: (key, qty) => {
          setItems((current) =>
            qty <= 0
              ? current.filter(
                  (item) =>
                    itemKey(item) !== key
                )
              : current.map((item) =>
                  itemKey(item) === key
                    ? { ...item, qty }
                    : item
                )
          );
        },

        remove: (key) => {
          setItems((current) =>
            current.filter(
              (item) =>
                itemKey(item) !== key
            )
          );
        },

        clear: () => {
          setItems([]);
        },

        resetForLogout: () => {
          setAuthenticated(false);
          setItems([]);
          localStorage.removeItem(STORAGE);
        },
      };
    },
    [items]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used within CartProvider"
    );
  }

  return context;
}