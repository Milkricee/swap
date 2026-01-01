/**
 * Swap Execution Functions
 * 
 * Creates actual swap orders with providers
 */

import { z } from 'zod';
import { createBTCSwapXMRSwap, getBTCSwapXMRStatus } from './btcswapxmr';
import { createChangeNOWExchange, getChangeNOWStatus } from './changenow';
import { createGhostSwapOrder, getGhostSwapStatus } from './ghostswap';

const ExecuteSwapSchema = z.object({
  provider: z.enum(['BTCSwapXMR', 'ChangeNOW', 'GhostSwap']),
  fromCoin: z.string(),
  toCoin: z.literal('XMR'),
  amount: z.number().positive(),
  xmrAddress: z.string().min(95).max(106),
});

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
  status: string;
  expiresAt: number;
  createdAt: number;
  timestamp: number; // For sorting with PaymentRecord
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
 */
export async function executeSwap(
  provider: string,
  fromCoin: string,
  toCoin: string,
  amount: number,
  xmrAddress: string
): Promise<SwapOrder> {
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

  switch (validated.provider) {
    case 'BTCSwapXMR': {
      const swap = await createBTCSwapXMRSwap(amount, xmrAddress);
      const timestamp = Date.now();
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
        status: swap.status,
        expiresAt: swap.expiresAt,
        createdAt: timestamp,
        timestamp,
      };
    }

    case 'ChangeNOW': {
      const exchange = await createChangeNOWExchange(
        fromCoin,
        toCoin,
        amount,
        xmrAddress
      );
      const timestamp = Date.now();
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
        status: exchange.status,
        expiresAt: timestamp + 3600000, // 1 hour
        createdAt: timestamp,
        timestamp,
      };
    }

    case 'GhostSwap': {
      const order = await createGhostSwapOrder(fromCoin, toCoin, amount, xmrAddress);
      const timestamp = Date.now();
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
        status: order.status,
        expiresAt: order.expiresAt,
        createdAt: timestamp,
        timestamp,
      };
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Check swap status
 */
export async function getSwapStatus(
  provider: string,
  orderId: string
): Promise<SwapStatus> {
  console.log(`📊 Checking swap status: ${orderId} (${provider})`);

  switch (provider) {
    case 'BTCSwapXMR': {
      const status = await getBTCSwapXMRStatus(orderId);
      return {
        orderId,
        status: status.status,
        amountReceived: status.btcReceived,
        amountSent: status.xmrSent,
        confirmations: status.confirmations,
      };
    }

    case 'ChangeNOW': {
      const status = await getChangeNOWStatus(orderId);
      return {
        orderId: status.id,
        status: status.status,
        depositTxHash: status.payinHash,
        withdrawalTxHash: status.payoutHash,
        amountReceived: status.amountSent,
        amountSent: status.amountReceived,
      };
    }

    case 'GhostSwap': {
      const status = await getGhostSwapStatus(orderId);
      return {
        orderId,
        status: status.status,
      };
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
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
