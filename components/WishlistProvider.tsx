"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type WishlistContextValue = {
  ids: string[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (productId: string, productName: string) => void;
  remove: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE = "fny_wishlist_v1";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      if (Array.isArray(stored)) setIds(stored.filter((id): id is string => typeof id === "string"));
    } catch {
      /* Ignore invalid local wishlist data. */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE, JSON.stringify(ids));
  }, [ids, ready]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const value = useMemo<WishlistContextValue>(() => ({
    ids,
    count: ids.length,
    has: (productId) => ids.includes(productId),
    toggle: (productId, productName) => {
      setIds((current) => {
        const isSaved = current.includes(productId);
        setNotice(isSaved ? `${productName} removed from your wishlist` : `${productName} added to your wishlist`);
        return isSaved ? current.filter((id) => id !== productId) : [...current, productId];
      });
    },
    remove: (productId) => setIds((current) => current.filter((id) => id !== productId)),
  }), [ids]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
      {notice && (
        <div className="fixed inset-x-4 top-4 z-[200] rounded-2xl bg-cocoa-800 px-4 py-3 text-center text-sm font-semibold text-cream-50 shadow-card sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2">
          {notice}
        </div>
      )}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}