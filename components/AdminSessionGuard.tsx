"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const AWAY_TIMEOUT = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL = 60 * 1000;

export default function AdminSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/admin/login") {
      return;
    }

    let heartbeatTimer: number | undefined;
    let logoutTimer: number | undefined;
    let isLoggingOut = false;

    const logout = async () => {
      if (isLoggingOut) return;

      isLoggingOut = true;

      try {
        await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      } catch {
        // Continue to the login page even if the request fails.
      } finally {
        const nextPath = pathname || "/admin";

        window.location.replace(
          `/admin/login?next=${encodeURIComponent(nextPath)}`
        );
      }
    };

    const sendHeartbeat = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const response = await fetch("/api/admin/heartbeat", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          void logout();
        }
      } catch {
        // Do not log out because of a temporary network error.
        // The cookie expiration and middleware remain the fallback.
      }
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer !== undefined) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
      }
    };

    const startHeartbeat = () => {
      stopHeartbeat();

      void sendHeartbeat();

      heartbeatTimer = window.setInterval(() => {
        void sendHeartbeat();
      }, HEARTBEAT_INTERVAL);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopHeartbeat();

        if (logoutTimer !== undefined) {
          window.clearTimeout(logoutTimer);
        }

        logoutTimer = window.setTimeout(() => {
          void logout();
        }, AWAY_TIMEOUT);

        return;
      }

      if (logoutTimer !== undefined) {
        window.clearTimeout(logoutTimer);
        logoutTimer = undefined;
      }

      startHeartbeat();
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    startHeartbeat();

    return () => {
      stopHeartbeat();

      if (logoutTimer !== undefined) {
        window.clearTimeout(logoutTimer);
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [pathname]);

  return null;
}