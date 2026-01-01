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
  orderId: string;
  provider: string;
  depositAddress: string;
  withdrawalAddress: string;
  fromCoin: string;
  toCoin: string;
  fromAmount: number;
  expectedToAmount: number;
  status: string;
  expiresAt: number;
  createdAt: number;
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

  console.log(`🔄 Executing swap: ${amount} ${fromCoin} → ${toCoin} via ${provider}`);

  switch (validated.provider) {
    case 'BTCSwapXMR': {
      const swap = await createBTCSwapXMRSwap(amount, xmrAddress);
      return {
        orderId: swap.swapId,
        provider: 'BTCSwapXMR',
        depositAddress: swap.depositAddress,
        withdrawalAddress: swap.withdrawalAddress,
        fromCoin: 'BTC',
        toCoin: 'XMR',
        fromAmount: swap.amountBTC,
        expectedToAmount: swap.amountXMR,
        status: swap.status,
        expiresAt: swap.expiresAt,
        createdAt: Date.now(),
      };
    }

    case 'ChangeNOW': {
      const exchange = await createChangeNOWExchange(
        fromCoin,
        toCoin,
        amount,
        xmrAddress
      );
      return {
        orderId: exchange.exchangeId,
        provider: 'ChangeNOW',
        depositAddress: exchange.depositAddress,
        withdrawalAddress: exchange.withdrawalAddress,
        fromCoin: exchange.fromCurrency.toUpperCase(),
        toCoin: exchange.toCurrency.toUpperCase(),
        fromAmount: amount,
        expectedToAmount: exchange.expectedAmount,
        status: exchange.status,
        expiresAt: Date.now() + 3600000, // 1 hour
        createdAt: Date.now(),
      };
    }

    case 'GhostSwap': {
      const order = await createGhostSwapOrder(fromCoin, toCoin, amount, xmrAddress);
      return {
        orderId: order.orderId,
        provider: 'GhostSwap',
        depositAddress: order.depositAddress,
        withdrawalAddress: order.withdrawalAddress,
        fromCoin,
        toCoin,
        fromAmount: amount,
        expectedToAmount: 0, // Unknown for mock
        status: order.status,
        expiresAt: order.expiresAt,
        createdAt: Date.now(),
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
