/**
 * Transaction Monitoring for Monero Payments - SERVER-ONLY
 * Checks TX status on blockchain and updates payment records
 * 
 * NO 'use client' = server-only in Next.js (not bundled for browser)
 */

import { getMoneroTxStatus, type MoneroTxInfo } from '@/lib/wallets/monero-core';
import { updatePaymentStatus, getPaymentHistory, type PaymentRecord } from '@/lib/payment/history';

export interface TxStatusResult {
  txHash: string;
  status: 'confirmed' | 'pending' | 'failed' | 'not_found';
  confirmations: number;
  blockHeight?: number;
  inTxPool?: boolean;
  error?: string;
}

export interface BulkMonitorResult {
  updated: number;
  failed: number;
  results: Array<{
    paymentId: string;
    txHash: string;
    oldStatus: PaymentRecord['status'];
    newStatus: PaymentRecord['status'];
    confirmations: number;
  }>;
  errors: Array<{
    paymentId: string;
    txHash: string;
    error: string;
  }>;
}

// Minimum confirmations to mark as "confirmed"
const MIN_CONFIRMATIONS = 10;

// Max age to check (30 days) - older TXs are assumed lost
const MAX_TX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Check single TX status on Monero blockchain
 * @param txHash - Transaction hash to check
 * @param rpcUrl - Remote node URL (optional, uses default if not provided)
 */
export async function checkTxStatus(
  txHash: string,
  rpcUrl?: string
): Promise<TxStatusResult> {
  try {
    if (!txHash || txHash.length !== 64) {
      return {
        txHash,
        status: 'failed',
        confirmations: 0,
        error: 'Invalid TX hash format',
      };
    }

    const nodeUrl = rpcUrl || process.env.NEXT_PUBLIC_MONERO_RPC_URL || 'https://xmr-node.cakewallet.com:18081';

    // Query blockchain for TX info
    const txInfo = await getMoneroTxStatus(txHash, nodeUrl);

    if (!txInfo) {
      return {
        txHash,
        status: 'not_found',
        confirmations: 0,
        error: 'Transaction not found on blockchain',
      };
    }

    // Determine status based on confirmations
    let status: TxStatusResult['status'];
    
    if (txInfo.inTxPool) {
      status = 'pending';
    } else if (txInfo.confirmations >= MIN_CONFIRMATIONS) {
      status = 'confirmed';
    } else if (txInfo.confirmations > 0) {
      status = 'pending';
    } else {
      status = 'not_found';
    }

    return {
      txHash,
      status,
      confirmations: txInfo.confirmations,
      blockHeight: txInfo.blockHeight,
      inTxPool: txInfo.inTxPool,
    };

  } catch (error) {
    console.error(`TX monitoring error for ${txHash}:`, error);
    
    return {
      txHash,
      status: 'pending', // Keep as pending on errors (don't mark as failed)
      confirmations: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Monitor all pending payments and update their status
 * @param maxConcurrent - Max concurrent RPC calls (default: 3)
 */
export async function monitorPendingPayments(
  maxConcurrent: number = 3
): Promise<BulkMonitorResult> {
  const result: BulkMonitorResult = {
    updated: 0,
    failed: 0,
    results: [],
    errors: [],
  };

  try {
    const allPayments = getPaymentHistory();
    
    // Filter: only pending payments with TX hash
    const pendingPayments = allPayments.filter(
      p => p.status === 'pending' && p.txHash
    );

    if (pendingPayments.length === 0) {
      console.log('📡 No pending payments to monitor');
      return result;
    }

    console.log(`📡 Monitoring ${pendingPayments.length} pending payments...`);

    // Check TX age - skip very old TXs
    const now = Date.now();
    const recentPayments = pendingPayments.filter(p => {
      const age = now - p.timestamp;
      if (age > MAX_TX_AGE_MS) {
        console.warn(`⏰ Payment ${p.id} is older than 30 days, marking as failed`);
        updatePaymentStatus(p.id, 'failed');
        result.failed++;
        return false;
      }
      return true;
    });

    // Process in batches to avoid overwhelming the node
    for (let i = 0; i < recentPayments.length; i += maxConcurrent) {
      const batch = recentPayments.slice(i, i + maxConcurrent);
      
      await Promise.all(
        batch.map(async (payment) => {
          try {
            const txStatus = await checkTxStatus(payment.txHash!);
            
            const oldStatus = payment.status;
            let newStatus = payment.status;

            // Update status if changed
            if (txStatus.status === 'confirmed' && oldStatus === 'pending') {
              newStatus = 'confirmed';
              updatePaymentStatus(payment.id, 'confirmed', payment.txHash);
              result.updated++;
              
              console.log(`✅ Payment ${payment.id} confirmed (${txStatus.confirmations} confirmations)`);
            } else if (txStatus.status === 'not_found' && txStatus.error) {
              // Only mark as failed if node explicitly says not found
              // Keep as pending for network errors
              if (!txStatus.error.includes('network') && !txStatus.error.includes('timeout')) {
                newStatus = 'failed';
                updatePaymentStatus(payment.id, 'failed', payment.txHash);
                result.failed++;
                
                console.warn(`❌ Payment ${payment.id} failed: ${txStatus.error}`);
              }
            }

            result.results.push({
              paymentId: payment.id,
              txHash: payment.txHash!,
              oldStatus,
              newStatus,
              confirmations: txStatus.confirmations,
            });

          } catch (error) {
            result.errors.push({
              paymentId: payment.id,
              txHash: payment.txHash!,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + maxConcurrent < recentPayments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📊 Monitoring complete: ${result.updated} updated, ${result.failed} failed, ${result.errors.length} errors`);

  } catch (error) {
    console.error('Bulk monitoring error:', error);
  }

  return result;
}

/**
 * Check if TX monitoring should run
 * Avoids checking too frequently (max every 60 seconds)
 */
export function shouldRunMonitoring(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;

  try {
    const lastRun = localStorage.getItem('tx_monitor_last_run');
  
  if (!lastRun) {
    return true;
  }

  const lastRunTime = parseInt(lastRun);
  const now = Date.now();
  const timeSinceLastRun = now - lastRunTime;

  // Run at most every 60 seconds
  return timeSinceLastRun > 60_000;
  } catch (error) {
    console.warn('Failed to check monitoring schedule:', error);
    return true; // Allow check if localStorage fails
  }
}

/**
 * Mark monitoring as run (prevents too frequent checks)
 */
export function markMonitoringRun(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  
  try {
    localStorage.setItem('tx_monitor_last_run', Date.now().toString());
  } catch (error) {
    console.warn('Failed to mark monitoring run:', error);
  }
}

/**
 * Get monitoring statistics
 */
export function getMonitoringStats() {
  const history = getPaymentHistory();
  const pendingWithTx = history.filter(p => p.status === 'pending' && p.txHash);
  
  let lastRunTime: Date | null = null;
  
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const lastRun = localStorage.getItem('tx_monitor_last_run');
      lastRunTime = lastRun ? new Date(parseInt(lastRun)) : null;
    } catch (error) {
      console.warn('Failed to get last monitoring run time:', error);
    }
  }

  return {
    totalPayments: history.length,
    pendingCount: history.filter(p => p.status === 'pending').length,
    pendingWithTxCount: pendingWithTx.length,
    confirmedCount: history.filter(p => p.status === 'confirmed').length,
    failedCount: history.filter(p => p.status === 'failed').length,
    lastMonitorRun: lastRunTime,
  };
}
