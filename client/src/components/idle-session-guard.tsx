import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useIdleTimer } from "@/hooks/use-idle-timer";
import { Clock, LogOut, ShieldAlert } from "lucide-react";

const WARN_SECONDS = 5 * 60; // 5 minutes countdown

export function IdleSessionGuard() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARN_SECONDS);
  const countdownRef = { current: null as ReturnType<typeof setInterval> | null };

  const startCountdown = useCallback(() => {
    setSecondsLeft(WARN_SECONDS);
    setOpen(true);

    // Tick every second
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setOpen(false);
    setSecondsLeft(WARN_SECONDS);
  }, []); // eslint-disable-line

  const handleLogout = useCallback(() => {
    stopCountdown();
    logout.mutate();
  }, [stopCountdown, logout]);

  const { keepAlive } = useIdleTimer({
    onWarn: startCountdown,
    onLogout: handleLogout,
    onReset: stopCountdown,
  });

  const handleKeepAlive = useCallback(() => {
    stopCountdown();
    keepAlive();
  }, [stopCountdown, keepAlive]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // eslint-disable-line

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")} min`
    : `${seconds} sec`;

  // Progress: 1 → 0 as countdown goes from WARN_SECONDS → 0
  const progressPct = (secondsLeft / WARN_SECONDS) * 100;
  const isUrgent = secondsLeft <= 60;

  return (
    <Dialog open={open} onOpenChange={() => {/* prevent accidental close */}}>
      <DialogContent
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center gap-2">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-1 transition-colors duration-500 ${
            isUrgent ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-500"
          }`}>
            {isUrgent
              ? <ShieldAlert className="w-7 h-7" />
              : <Clock className="w-7 h-7" />
            }
          </div>
          <DialogTitle className="text-xl">Session Timeout Warning</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            You've been inactive for a while. Your session will automatically
            expire due to inactivity.
          </DialogDescription>
        </DialogHeader>

        {/* Countdown display */}
        <div className="flex flex-col items-center gap-3 my-2">
          <div className={`text-4xl font-bold tabular-nums transition-colors duration-300 ${
            isUrgent ? "text-destructive" : "text-amber-500"
          }`}>
            {timeStr}
          </div>
          <p className="text-xs text-muted-foreground">remaining before logout</p>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isUrgent ? "bg-destructive" : "bg-amber-500"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={handleKeepAlive}
            className="w-full"
            data-testid="button-stay-logged-in"
          >
            Stay Logged In
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full gap-2"
            data-testid="button-idle-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
