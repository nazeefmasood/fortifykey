"use client";

import { useState, useEffect } from "react";
import { Lock, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMasterKeyStore } from "../../stores/master-key";

const LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes in ms
const WARNING_THRESHOLD = 2 * 60 * 1000; // Show warning when 2 minutes left

export function AutoLockIndicator() {
  const isUnlocked = useMasterKeyStore((s) => s.isUnlocked);
  const lastActivity = useMasterKeyStore((s) => s.lastActivity);
  const [timeLeft, setTimeLeft] = useState(LOCK_TIMEOUT);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isUnlocked) {
      setTimeLeft(LOCK_TIMEOUT);
      setShowWarning(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const remaining = Math.max(0, LOCK_TIMEOUT - elapsed);
      setTimeLeft(remaining);
      setShowWarning(remaining < WARNING_THRESHOLD && remaining > 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [isUnlocked, lastActivity]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = ((LOCK_TIMEOUT - timeLeft) / LOCK_TIMEOUT) * 100;

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 bg-amber-500 text-black px-4 py-3 rounded-xl shadow-lg">
            <Clock size={18} />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Auto-lock in {formatTime(timeLeft)}</span>
              <span className="text-xs opacity-80">Click anywhere to stay active</span>
            </div>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-xl overflow-hidden">
              <motion.div
                className="h-full bg-black/40"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
