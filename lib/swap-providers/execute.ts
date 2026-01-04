/**
 * Swap Execution Functions
 * 
 * Creates actual swap orders with providers
 */

import { z } from 'zod';
import { createBTCSwapXMRSwap, getBTCSwapXMRStatus } from './btcswapxmr';
import { createChangeNOWExchange, getChangeNOWStatus } from './changenow';
import { createGhostSwapOrder, getGhostSwapStatus } from './ghostswap';
import {
  SwapError,
  NetworkError,
  APIError,
  ProviderError,
  TimeoutError,
  ValidationError,
  parseSwapError,
  logSwapError,
} from './errors';

// Swap timeout: 30 minutes (providers typically expire after 15-30min)
const SWAP_TIMEOUT_MS = 30 * 60 * 1000;

const ExecuteSwapSchema = z.object({
  provider: z.enum(['BTCSwapXMR', 'ChangeNOW', 'GhostSwap']),
  fromCoin: z.string(),
  toCoin: z.literal('XMR'),
  amount: z.number().positive(),
  xmrAddress: z.string().min(95).max(106),
});

export type SwapOrderStatus = 
  | 'pending'     // Waiting for deposit
  | 'processing'  // Deposit received, processing
  | 'completed'   // Successfully completed
  | 'failed'      // Failed (provider error, validation)
  | 'timeout'     // Timed out (no deposit within timeframe)
  | 'cancelled'   // Cancelled by user
  | 'expired';    // Expired (deposit window closed)

export interface SwapOrder {
  id: string; // For consistency with PaymentRecord
  orderId: string;
  provider: string;
  depositAddress: string;
  withdrawalAddress: string;
  depositCurrency: string; // For TransactionRow display
  receiveCurrency: string; // For TransactionRow display
  depositAmount: string; // For TransactionRow display
  receiveAmount: string; // For TransactionRow display
  fromCoin: string;
  toCoin: string;
  fromAmount: number;
  expectedToAmount: number;
  status: SwapOrderStatus;
  expiresAt: number;
  createdAt: number;
  timestamp: number; // For sorting with PaymentRecord
  timeoutAt?: number; // When swap should timeout (20-30 min)
  lastChecked?: number; // Last status check timestamp
  errorMessage?: string; // Error message if failed
  errorCode?: string; // Error code for debugging
  retryCount?: number; // Number of retry attempts
  canRetry?: boolean; // Whether swap can be retried
}

export interface SwapStatus {
  orderId: string;
  status: string;
  depositTxHash?: string;
  withdrawalTxHash?: string;
  amountReceived?: number;
  amountSent?: number;
  confirmations?: number;
}

/**
 * Execute swap with chosen provider
 * Now with proper error handling
 */
export async function executeSwap(
  provider: string,
  fromCoin: string,
  toCoin: string,
  amount: number,
  xmrAddress: string
): Promise<SwapOrder> {
  try {
    // Validate input
    const validated = ExecuteSwapSchema.parse({
      provider,
      fromCoin,
      toCoin,
      amount,
      xmrAddress,
    });

    // Silent execution in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Executing swap: ${amount} ${fromCoin} → ${toCoin} via ${provider}`);
    }

    const timestamp = Date.now();
    const timeoutAt = timestamp + SWAP_TIMEOUT_MS;

    switch (validated.provider) {
      case 'BTCSwapXMR': {
        try {
          const swap = await createBTCSwapXMRSwap(amount, xmrAddress);
          return {
            id: `swap-${timestamp}`,
            orderId: swap.swapId,
            provider: 'BTCSwapXMR',
            depositAddress: swap.depositAddress,
            withdrawalAddress: swap.withdrawalAddress,
            depositCurrency: 'BTC',
            receiveCurrency: 'XMR',
            depositAmount: swap.amountBTC.toString(),
            receiveAmount: swap.amountXMR.toString(),
            fromCoin: 'BTC',
            toCoin: 'XMR',
            fromAmount: swap.amountBTC,
            expectedToAmount: swap.amountXMR,
            status: mapProviderStatus(swap.status),
            expiresAt: swap.expiresAt,
            createdAt: timestamp,
            timestamp,
            timeoutAt,
            canRetry: true,
            retryCount: 0,
          };
        } catch (error) {
          const swapError = parseSwapError(error);
          logSwapError('BTCSwapXMR.createSwap', error, { amount, provider });
          throw new ProviderError(
            `BTCSwapXMR: ${swapError.message}`,
            'BTCSwapXMR',
            swapError.retryable,
            swapError.details
          );
        }
      }

      case 'ChangeNOW': {
        try {
          const exchange = await createChangeNOWExchange(
            fromCoin,
            toCoin,
            amount,
            xmrAddress
          );
          return {
            id: `swap-${timestamp}`,
            orderId: exchange.exchangeId,
            provider: 'ChangeNOW',
            depositAddress: exchange.depositAddress,
            withdrawalAddress: exchange.withdrawalAddress,
            depositCurrency: exchange.fromCurrency.toUpperCase(),
            receiveCurrency: exchange.toCurrency.toUpperCase(),
            depositAmount: amount.toString(),
            receiveAmount: exchange.expectedAmount.toString(),
            fromCoin: exchange.fromCurrency.toUpperCase(),
            toCoin: exchange.toCurrency.toUpperCase(),
            fromAmount: amount,
            expectedToAmount: exchange.expectedAmount,
            status: mapProviderStatus(exchange.status),
            expiresAt: timestamp + 3600000, // 1 hour
            createdAt: timestamp,
            timestamp,
            timeoutAt,
            canRetry: true,
            retryCount: 0,
          };
        } catch (error) {
          const swapError = parseSwapError(error);
          logSwapError('ChangeNOW.createExchange', error, { amount, provider });
          throw new ProviderError(
            `ChangeNOW: ${swapError.message}`,
            'ChangeNOW',
            swapError.retryable,
            swapError.details
          );
        }
      }

      case 'GhostSwap': {
        try {
          const order = await createGhostSwapOrder(fromCoin, toCoin, amount, xmrAddress);
          return {
            id: `swap-${timestamp}`,
            orderId: order.orderId,
            provider: 'GhostSwap',
            depositAddress: order.depositAddress,
            withdrawalAddress: order.withdrawalAddress,
            depositCurrency: fromCoin,
            receiveCurrency: toCoin,
            depositAmount: amount.toString(),
            receiveAmount: '0', // Unknown for mock
            fromCoin,
            toCoin,
            fromAmount: amount,
            expectedToAmount: 0, // Unknown for mock
            status: mapProviderStatus(order.status),
            expiresAt: order.expiresAt,
            createdAt: timestamp,
            timestamp,
            timeoutAt,
            canRetry: true,
            retryCount: 0,
          };
        } catch (error) {
          const swapError = parseSwapError(error);
          logSwapError('GhostSwap.createOrder', error, { amount, provider });
          throw new ProviderError(
            `GhostSwap: ${swapError.message}`,
            'GhostSwap',
            swapError.retryable,
            swapError.details
          );
        }
      }

      default:
        throw new ValidationError(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    // Re-throw SwapErrors as-is
    if (error instanceof SwapError) {
      throw error;
    }

    // Validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(message, error);
    }

    // Unknown errors
    throw parseSwapError(error);
  }
}

/**
 * Map provider status to standardized status
 */
function mapProviderStatus(providerStatus: string): SwapOrderStatus {
  const status = providerStatus.toLowerCase();

  // Completed states
  if (status.includes('complete') || status.includes('finished') || status.includes('success')) {
    return 'completed';
  }

  // Failed states
  if (status.includes('fail') || status.includes('error') || status.includes('refund')) {
    return 'failed';
  }

  // Timeout/Expired states
  if (status.includes('timeout') || status.includes('expired')) {
    return 'timeout';
  }

  // Processing states
  if (
    status.includes('processing') ||
    status.includes('confirming') ||
    status.includes('sending') ||
    status.includes('exchanging')
  ) {
    return 'processing';
  }

  // Waiting/Pending states (default)
  return 'pending';
}

/**
 * Check swap status
 * Now with proper error handling and timeout detection
 */
export async function getSwapStatus(
  provider: string,
  orderId: string
): Promise<SwapStatus> {
  try {
    console.log(`📊 Checking swap status: ${orderId} (${provider})`);

    switch (provider) {
      case 'BTCSwapXMR': {
        try {
          const status = await getBTCSwapXMRStatus(orderId);
          return {
            orderId,
            status: mapProviderStatus(status.status),
            amountReceived: status.btcReceived,
            amountSent: status.xmrSent,
            confirmations: status.confirmations,
          };
        } catch (error) {
          const swapError = parseSwapError(error);
          logSwapError('BTCSwapXMR.getStatus', error, { orderId });
          throw new ProviderError(
            `BTCSwapXMR status check failed: ${swapError.message}`,
            'BTCSwapXMR',
            swapError.retryable
          );
        }
      }

      case 'ChangeNOW': {
        try {
          const status = await getChangeNOWStatus(orderId);
          return {
            orderId: status.id,
            status: mapProviderStatus(status.status),
            depositTxHash: status.payinHash,
            withdrawalTxHash: status.payoutHash,
            amountReceived: status.amountSent,
            amountSent: status.amountReceived,
          };
        } catch (error) {
          const swapError = parseSwapError(error);
          logSwapError('ChangeNOW.getStatus', error, { orderId });
          throw new ProviderError(
            `ChangeNOW status check failed: ${swapError.message}`,
            'ChangeNOW',
            swapError.retryable
          );
        }
      }

      case 'GhostSwap': {
        try {
          const status = await getGhostSwapStatus(orderId);
          return {
            orderId,
            status: mapProviderStatus(status.status),
          };
        } catch (error) {
          const swapError = parseSwapError(error);
          logSwapError('GhostSwap.getStatus', error, { orderId });
          throw new ProviderError(
            `GhostSwap status check failed: ${swapError.message}`,
            'GhostSwap',
            swapError.retryable
          );
        }
      }

      default:
        throw new ValidationError(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    if (error instanceof SwapError) {
      throw error;
    }
    throw parseSwapError(error);
  }
}

/**
 * Save swap to localStorage
 */
export function saveSwapToHistory(swap: SwapOrder): void {
  const history = getSwapHistory();
  history.unshift(swap);
  
  // Keep last 50 swaps
  if (history.length > 50) {
    history.splice(50);
  }
  
  localStorage.setItem('swap_history', JSON.stringify(history));
}

/**
 * Update swap status in history
 */
export function updateSwapStatus(
  swapId: string,
  updates: Partial<Pick<SwapOrder, 'status' | 'errorMessage' | 'errorCode' | 'lastChecked' | 'retryCount'>>
): void {
  const history = getSwapHistory();
  const index = history.findIndex(s => s.id === swapId);
  
  if (index !== -1) {
    history[index] = {
      ...history[index],
      ...updates,
      lastChecked: Date.now(),
    };
    localStorage.setItem('swap_history', JSON.stringify(history));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Swap ${swapId} updated:`, updates);
    }
  }
}

/**
 * Retry failed/timeout swap with same parameters
 * Creates a new swap order with incremented retry count
 */
export async function retrySwap(originalSwapId: string): Promise<SwapOrder | null> {
  const history = getSwapHistory();
  const originalSwap = history.find(s => s.id === originalSwapId);
  
  if (!originalSwap) {
    throw new ValidationError('Original swap not found');
  }

  if (!originalSwap.canRetry) {
    throw new ValidationError('This swap cannot be retried');
  }

  // Only allow retry for failed, timeout, or cancelled swaps
  if (!['failed', 'timeout', 'cancelled'].includes(originalSwap.status)) {
    throw new ValidationError('Can only retry failed, timeout, or cancelled swaps');
  }

  try {
    const newSwap = await executeSwap(
      originalSwap.provider,
      originalSwap.fromCoin,
      originalSwap.toCoin,
      originalSwap.fromAmount,
      originalSwap.withdrawalAddress
    );

    // Increment retry count
    newSwap.retryCount = (originalSwap.retryCount || 0) + 1;

    // Save to history
    saveSwapToHistory(newSwap);

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Retrying swap (attempt ${newSwap.retryCount}):`, newSwap.id);
    }

    return newSwap;
  } catch (error) {
    logSwapError('retrySwap', error, {
      originalSwapId,
      provider: originalSwap.provider,
      retryCount: originalSwap.retryCount,
    });
    throw error;
  }
}

/**
 * Check for timed-out swaps and update their status
 */
export function checkSwapTimeouts(): number {
  const history = getSwapHistory();
  const now = Date.now();
  let timeoutCount = 0;

  history.forEach((swap, index) => {
    // Only check pending/processing swaps
    if (!['pending', 'processing'].includes(swap.status)) {
      return;
    }

    // Check if timed out
    if (swap.timeoutAt && now > swap.timeoutAt) {
      history[index] = {
        ...swap,
        status: 'timeout',
        errorMessage: 'Swap timed out. No deposit detected within 30 minutes.',
        errorCode: 'TIMEOUT',
        lastChecked: now,
        canRetry: true,
      };
      timeoutCount++;
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⏰ Swap ${swap.id} timed out`);
      }
    }
  });

  if (timeoutCount > 0) {
    localStorage.setItem('swap_history', JSON.stringify(history));
  }

  return timeoutCount;
}

/**
 * Get swap history from localStorage
 */
export function getSwapHistory(): SwapOrder[] {
  try {
    const stored = localStorage.getItem('swap_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear swap history
 */
export function clearSwapHistory(): void {
  localStorage.removeItem('swap_history');
}
