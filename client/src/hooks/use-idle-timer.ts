import { useEffect, useRef, useCallback } from "react";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;        // 60 minutes → auto logout
const WARN_BEFORE_MS  = 5  * 60 * 1000;        // warn 5 minutes before

type IdleTimerOptions = {
  onWarn: () => void;      // called when 55 min of inactivity reached
  onLogout: () => void;    // called when 60 min of inactivity reached
  onReset: () => void;     // called when user becomes active again (resets warning)
};

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "touchmove",
  "scroll",
  "click",
  "wheel",
];

export function useIdleTimer({ onWarn, onLogout, onReset }: IdleTimerOptions) {
  const warnTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnedRef      = useRef(false);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current)   clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();

    // If user was in "warned" state, tell parent to dismiss the dialog
    if (warnedRef.current) {
      warnedRef.current = false;
      onReset();
    }

    // Schedule warning
    warnTimerRef.current = setTimeout(() => {
      warnedRef.current = true;
      onWarn();

      // Schedule logout after the remaining 5 minutes
      logoutTimerRef.current = setTimeout(() => {
        onLogout();
      }, WARN_BEFORE_MS);
    }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);
  }, [clearTimers, onWarn, onLogout, onReset]);

  useEffect(() => {
    // Start timers immediately
    resetTimers();

    // Listen to all activity events
    const handler = () => resetTimers();
    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, handler, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, handler)
      );
    };
  }, [resetTimers, clearTimers]);

  /** Call this when the user clicks "Stay Logged In" in the warning dialog */
  const keepAlive = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  return { keepAlive };
}
