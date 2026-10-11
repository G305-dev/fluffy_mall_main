"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type WishlistContextValue = {
  ids: string[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (
    productId: string,
    productName: string
  ) => void;
  remove: (productId: string) => void;
  resetForLogout: () => void;
};

const WishlistContext =
  createContext<WishlistContextValue | null>(
    null
  );

const STORAGE =
  "fny_wishlist_guest_v1";

const AUTH_EVENT =
  "fny:customer-auth-changed";

function readGuestWishlist(): string[] {
  try {
    const raw = localStorage.getItem(
      STORAGE
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (id): id is string =>
            typeof id === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function mergeWishlists(
  saved: string[],
  guest: string[]
) {
  return Array.from(
    new Set([...saved, ...guest])
  );
}

export function WishlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ids, setIds] = useState<string[]>(
    []
  );

  const [ready, setReady] =
    useState(false);

  const [authenticated, setAuthenticated] =
    useState(false);

  const [notice, setNotice] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWishlist() {
      const guestWishlist =
        readGuestWishlist();

      setReady(false);
      setAuthenticated(false);
      setIds([]);

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
              "Could not load saved wishlist."
            );
          }

          const saved =
            await savedResponse.json();

          if (cancelled) {
            return;
          }

          const savedWishlist =
            Array.isArray(saved.wishlist)
              ? saved.wishlist
              : [];

          setAuthenticated(true);

          setIds(
            mergeWishlists(
              savedWishlist,
              guestWishlist
            )
          );

          localStorage.removeItem(STORAGE);
        } else {
          if (cancelled) {
            return;
          }

          setAuthenticated(false);
          setIds(guestWishlist);
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
          setIds(guestWishlist);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    const handleAuthChange = () => {
      void loadWishlist();
    };

    void loadWishlist();

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
        JSON.stringify(ids)
      );
    }
  }, [
    ids,
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
            wishlist: ids,
          }),
        }
      ).catch(() => {
        // Keep the local wishlist if saving fails.
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    ids,
    ready,
    authenticated,
  ]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(
      () => setNotice(null),
      2600
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      ids,
      count: ids.length,

      has: (productId) =>
        ids.includes(productId),

      toggle: (
        productId,
        productName
      ) => {
        setIds((current) => {
          const isSaved =
            current.includes(productId);

          setNotice(
            isSaved
              ? `${productName} removed from your wishlist`
              : `${productName} added to your wishlist`
          );

          return isSaved
            ? current.filter(
                (id) => id !== productId
              )
            : [...current, productId];
        });
      },

      remove: (productId) => {
        setIds((current) =>
          current.filter(
            (id) => id !== productId
          )
        );
      },

      resetForLogout: () => {
        setAuthenticated(false);
        setIds([]);
        localStorage.removeItem(STORAGE);
      },
    }),
    [ids]
  );

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

  if (!context) {
    throw new Error(
      "useWishlist must be used within WishlistProvider"
    );
  }

  return context;
}