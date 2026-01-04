/**
 * useTxMonitor Hook
 * Client-side hook for automatic TX monitoring with smart polling
 */

import { useEffect, useCallback, useState } from 'react';
import { shouldRunMonitoring, markMonitoringRun } from '@/lib/monitoring/tx-monitor';

export interface MonitoringState {
  isMonitoring: boolean;
  lastCheck: Date | null;
  pendingCount: number;
  error: string | null;
}

export interface UseTxMonitorOptions {
  enabled?: boolean;
  interval?: number; // Milliseconds between checks (default: 60000 = 60s)
  onUpdate?: () => void; // Callback when status updates
}

/**
 * Hook for automatic TX monitoring
 * Polls API every 60s to check pending payments
 */
export function useTxMonitor(options: UseTxMonitorOptions = {}) {
  const {
    enabled = true,
    interval = 60_000, // 60 seconds
    onUpdate,
  } = options;

  const [state, setState] = useState<MonitoringState>({
    isMonitoring: false,
    lastCheck: null,
    pendingCount: 0,
    error: null,
  });

  /**
   * Check all pending payments via API
   */
  const checkPendingPayments = useCallback(async () => {
    // Respect rate limiting
    if (!shouldRunMonitoring()) {
      console.log('⏸️ TX monitor: Skipping (too soon since last check)');
      return;
    }

    setState(prev => ({ ...prev, isMonitoring: true, error: null }));

    try {
      const response = await fetch('/api/tx-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'bulk' }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // Mark monitoring as run
      markMonitoringRun();

      setState({
        isMonitoring: false,
        lastCheck: new Date(),
        pendingCount: result.results?.filter((r: any) => r.newStatus === 'pending').length || 0,
        error: null,
      });

      // Trigger callback if any updates occurred
      if (result.updated > 0 && onUpdate) {
        onUpdate();
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('📡 TX monitor:', {
          updated: result.updated,
          failed: result.failed,
          errors: result.errors?.length || 0,
        });
      }

    } catch (error) {
      console.error('TX monitoring failed:', error);
      
      setState(prev => ({
        ...prev,
        isMonitoring: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [onUpdate]);

  /**
   * Manual refresh (bypasses rate limiting)
   */
  const refreshNow = useCallback(async () => {
    // Force check regardless of last run time
    localStorage.removeItem('tx_monitor_last_run');
    await checkPendingPayments();
  }, [checkPendingPayments]);

  // Auto-polling effect
  useEffect(() => {
    if (!enabled) return;

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(() => {
      checkPendingPayments();
    }, 5000);

    // Recurring checks
    const intervalId = setInterval(() => {
      checkPendingPayments();
    }, interval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [enabled, interval, checkPendingPayments]);

  return {
    ...state,
    refresh: refreshNow,
  };
}

/**
 * Hook for checking single TX status
 */
export function useSingleTxStatus(txHash: string | null) {
  const [status, setStatus] = useState<{
    loading: boolean;
    data: any | null;
    error: string | null;
  }>({
    loading: false,
    data: null,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    if (!txHash) return;

    setStatus({ loading: true, data: null, error: null });

    try {
      const response = await fetch(`/api/tx-status?txHash=${txHash}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      setStatus({ loading: false, data, error: null });

    } catch (error) {
      setStatus({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [txHash]);

  useEffect(() => {
    if (txHash) {
      checkStatus();
    }
  }, [txHash, checkStatus]);

  return {
    ...status,
    refresh: checkStatus,
  };
}
