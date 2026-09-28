"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const COUNTDOWN_SECONDS = 60; // 60 seconds prompt
const STORAGE_KEY = "constrade_last_activity";

export function IdleLogoutPrompt() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateActivity = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
  };

  const getLastActivity = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return parseInt(stored, 10);
    }
    return Date.now();
  };

  const resetIdleTimer = useCallback(() => {
    if (showPrompt) return; // Don't reset if prompt is active, user must click 'Stay logged in'
    updateActivity();
  }, [showPrompt]);

  const handleStayLoggedIn = () => {
    setShowPrompt(false);
    setCountdown(COUNTDOWN_SECONDS);
    updateActivity();
  };

  const handleLogout = useCallback(async () => {
    setShowPrompt(false);
    await signOut();
    router.push("/login");
  }, [signOut, router]);

  useEffect(() => {
    if (!user) {
      setShowPrompt(false);
      return;
    }

    // Initialize activity on mount
    updateActivity();

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleActivity = () => resetIdleTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // Check for idle timeout
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const lastActivity = getLastActivity();
      
      // If we crossed the 15m threshold and the prompt isn't showing
      if (now - lastActivity >= IDLE_TIMEOUT_MS && !showPrompt) {
        setShowPrompt(true);
      } else if (now - lastActivity < IDLE_TIMEOUT_MS && showPrompt) {
        // If another tab updated the activity, hide the prompt here
        setShowPrompt(false);
        setCountdown(COUNTDOWN_SECONDS);
      }
    }, 5000); // check every 5s

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, showPrompt, resetIdleTimer]);

  useEffect(() => {
    if (showPrompt) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            void handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showPrompt, handleLogout]);

  return (
    <Dialog open={showPrompt} onOpenChange={(open) => !open && handleLogout()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Expiring Soon</DialogTitle>
          <DialogDescription>
            You have been idle for a while. You will be logged out automatically in {countdown} seconds to protect your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleLogout}>
            Log out now
          </Button>
          <Button variant="premium" onClick={handleStayLoggedIn}>
            Stay logged in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
