/**
 * useSwapMonitor Hook
 * Client-side hook for automatic swap timeout checking
 */

import { useEffect, useCallback, useState } from 'react';
import { checkSwapTimeouts } from '@/lib/swap-providers/execute';

export interface SwapMonitorState {
  isChecking: boolean;
  lastCheck: Date | null;
  timeoutsDetected: number;
}

export interface UseSwapMonitorOptions {
  enabled?: boolean;
  interval?: number; // Milliseconds between checks (default: 120000 = 2 min)
  onTimeout?: (count: number) => void; // Callback when timeouts detected
}

/**
 * Hook for automatic swap timeout monitoring
 * Checks every 2 minutes for timed-out swaps
 */
export function useSwapMonitor(options: UseSwapMonitorOptions = {}) {
  const {
    enabled = true,
    interval = 120_000, // 2 minutes
    onTimeout,
  } = options;

  const [state, setState] = useState<SwapMonitorState>({
    isChecking: false,
    lastCheck: null,
    timeoutsDetected: 0,
  });

  /**
   * Check for timed-out swaps
   */
  const checkTimeouts = useCallback(() => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const timeoutCount = checkSwapTimeouts();

      setState({
        isChecking: false,
        lastCheck: new Date(),
        timeoutsDetected: timeoutCount,
      });

      if (timeoutCount > 0 && onTimeout) {
        onTimeout(timeoutCount);
      }

      if (process.env.NODE_ENV === 'development' && timeoutCount > 0) {
        console.log(`⏰ Swap monitor: ${timeoutCount} swap(s) timed out`);
      }

    } catch (error) {
      console.error('Swap timeout check failed:', error);
      setState(prev => ({ ...prev, isChecking: false }));
    }
  }, [onTimeout]);

  // Auto-checking effect
  useEffect(() => {
    if (!enabled) return;

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(() => {
      checkTimeouts();
    }, 5000);

    // Recurring checks
    const intervalId = setInterval(() => {
      checkTimeouts();
    }, interval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [enabled, interval, checkTimeouts]);

  return {
    ...state,
    checkNow: checkTimeouts,
  };
}
