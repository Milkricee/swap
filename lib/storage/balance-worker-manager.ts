/**
 * Web Worker Manager for Balance Sync
 * - Spawns worker for background sync
 * - Handles message passing
 * - Updates cache automatically
 */

import { setCachedBalance } from './balance-cache';

type BalanceSyncCallback = (walletId: number, balance: string) => void;
type ProgressCallback = (walletId: number, progress: number) => void;
type ErrorCallback = (walletId: number, error: string) => void;

interface WorkerMessage {
  type: 'SYNC_PROGRESS' | 'SYNC_COMPLETE' | 'SYNC_ERROR';
  walletId: number;
  balance?: string;
  progress?: number;
  error?: string;
}

export class BalanceSyncWorker {
  private worker: Worker | null = null;
  private onBalanceUpdate: BalanceSyncCallback | null = null;
  private onProgress: ProgressCallback | null = null;
  private onError: ErrorCallback | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker('/balance-worker.js');

      this.worker.onmessage = async (event: MessageEvent<WorkerMessage>) => {
        const { type, walletId, balance, progress, error } = event.data;

        switch (type) {
          case 'SYNC_PROGRESS':
            if (progress !== undefined && this.onProgress) {
              this.onProgress(walletId, progress);
            }
            break;

          case 'SYNC_COMPLETE':
            if (balance && this.onBalanceUpdate) {
              // Update cache
              await setCachedBalance(walletId, balance, '');
              this.onBalanceUpdate(walletId, balance);
            }
            break;

          case 'SYNC_ERROR':
            if (error && this.onError) {
              this.onError(walletId, error);
            }
            break;
        }
      };

      this.worker.onerror = (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Worker error:', error);
        }
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to initialize worker:', error);
      }
    }
  }

  /**
   * Start background sync for a wallet
   */
  syncBalance(
    walletId: number,
    seed: string,
    address: string,
    restoreHeight: number,
    rpcUrl: string,
    networkType: string
  ) {
    if (!this.worker) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Worker not initialized');
      }
      return;
    }

    this.worker.postMessage({
      type: 'SYNC_BALANCE',
      walletId,
      seed,
      address,
      restoreHeight,
      rpcUrl,
      networkType,
    });
  }

  /**
   * Set callback for balance updates
   */
  onBalance(callback: BalanceSyncCallback) {
    this.onBalanceUpdate = callback;
  }

  /**
   * Set callback for progress updates
   */
  onProgressUpdate(callback: ProgressCallback) {
    this.onProgress = callback;
  }

  /**
   * Set callback for errors
   */
  onErrorOccurred(callback: ErrorCallback) {
    this.onError = callback;
  }

  /**
   * Terminate worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
let workerInstance: BalanceSyncWorker | null = null;

/**
 * Get or create worker instance
 */
export function getBalanceSyncWorker(): BalanceSyncWorker {
  if (!workerInstance) {
    workerInstance = new BalanceSyncWorker();
  }
  return workerInstance;
}

/**
 * Cleanup worker on page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (workerInstance) {
      workerInstance.terminate();
    }
  });
}
