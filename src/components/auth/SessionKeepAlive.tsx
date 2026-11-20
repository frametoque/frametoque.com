"use client";

import { useEffect, useRef } from "react";
import { useAuth, useSession } from "@clerk/nextjs";

/**
 * SessionKeepAlive
 *
 * Keeps Clerk authentication sessions active and prevents unexpected logouts:
 * 1. Proactively touches the session and refreshes short-lived JWT tokens every 45 seconds while active.
 * 2. Immediately refreshes the session token when returning to the tab (visibilitychange / window focus).
 * 3. Throttles user interaction touches (clicks, keypresses) to maintain activity state.
 * 4. Ensures the browser's __session cookie is always fresh before user navigation occurs.
 */
export default function SessionKeepAlive() {
  const { isSignedIn, getToken } = useAuth();
  const { session } = useSession();
  const lastTouchRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isSignedIn || !session) return;

    const refreshTokenAndTouch = async (force = false) => {
      const now = Date.now();
      // Throttle: don't refresh more often than every 15 seconds unless forced
      if (!force && now - lastTouchRef.current < 15000) return;
      if (isRefreshingRef.current) return;

      isRefreshingRef.current = true;
      lastTouchRef.current = now;

      try {
        // Touch the Clerk session to reset any inactivity timeout
        if (session && typeof session.touch === "function") {
          await session.touch().catch(() => {});
        }
        // Force Clerk to mint/renew the short-lived session token and set the __session cookie
        if (typeof getToken === "function") {
          await getToken({ skipCache: force }).catch(() => {});
        }
      } catch (err) {
        // Silently catch background refresh errors
        console.debug("[SessionKeepAlive] Token refresh error:", err);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // 1. Recurring background interval while tab is active (every 45s).
    // Clerk session JWT defaults to 60s, so renewing at 45s keeps the cookie perpetually valid.
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshTokenAndTouch(false);
      }
    }, 45000);

    // 2. Tab wakeup / window focus handler (crucial when returning after a few minutes)
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshTokenAndTouch(true);
      }
    };

    // 3. User interaction handler (debounced touch when user clicks or types)
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastTouchRef.current >= 30000) {
        refreshTokenAndTouch(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("online", handleVisibilityOrFocus);
    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });

    // Initial touch on mount
    refreshTokenAndTouch(false);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("online", handleVisibilityOrFocus);
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, [isSignedIn, session, getToken]);

  return null;
}
