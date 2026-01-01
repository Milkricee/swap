import { z } from 'zod';
import type { SwapRoute, SwapProvider } from '@/types/wallet';
import {
  getBTCSwapXMRQuote,
  createBTCSwapXMRSwap,
  getBTCSwapXMRStatus,
} from './btcswapxmr';
import {
  getChangeNOWQuote,
  createChangeNOWExchange,
  getChangeNOWStatus,
  getChangeNOWMinAmount,
} from './changenow';
import {
  getGhostSwapQuote,
  createGhostSwapOrder,
  getGhostSwapStatus,
  GHOSTSWAP_ALTERNATIVES,
} from './ghostswap';

// Zod Schemas
const SwapRequestSchema = z.object({
  fromCoin: z.enum(['BTC', 'ETH', 'LTC', 'SOL', 'USDC']),
  toCoin: z.literal('XMR'),
  amount: z.number().positive(),
});

// Provider Configurations
const PROVIDERS: Record<string, SwapProvider> = {
  btcswapxmr: {
    name: 'BTCSwapXMR',
    fee: 0.0015, // 0.15%
    estimatedTime: '15-30 min',
    pairs: ['BTC-XMR'],
  },
  changenow: {
    name: 'ChangeNOW',
    fee: 0.0025, // 0.25%
    estimatedTime: '10-20 min',
    pairs: ['ETH-XMR', 'LTC-XMR', 'USDC-XMR'],
  },
  ghostswap: {
    name: 'GhostSwap',
    fee: 0.002, // 0.20%
    estimatedTime: '8-15 min',
    pairs: ['BTC-XMR', 'ETH-XMR', 'LTC-XMR'],
  },
  jupiter: {
    name: 'Jupiter (Mock)',
    fee: 0.003, // 0.30%
    estimatedTime: '5-10 min',
    pairs: ['SOL-XMR'],
  },
};

/**
 * Find best swap route across all providers
 * Queries REAL APIs in parallel and returns best rate
 */
export async function getBestRoute(
  fromCoin: string,
  toCoin: string = 'XMR',
  amount: number
): Promise<SwapRoute | null> {
  try {
    // Validate input
    const validated = SwapRequestSchema.parse({
      fromCoin,
      toCoin,
      amount,
    });

    console.log(`🔍 Querying swap providers for ${amount} ${fromCoin} → ${toCoin}...`);

    // Query providers in parallel based on supported pairs
    const routePromises: Promise<SwapRoute | null>[] = [];

    if (fromCoin === 'BTC') {
      routePromises.push(getBTCSwapXMRRoute(amount));
      routePromises.push(getChangeNOWRoute('BTC', amount));
      routePromises.push(getGhostSwapRoute('BTC', amount));
    }

    if (fromCoin === 'ETH') {
      routePromises.push(getChangeNOWRoute('ETH', amount));
      routePromises.push(getGhostSwapRoute('ETH', amount));
    }

    if (fromCoin === 'USDC') {
      routePromises.push(getChangeNOWRoute('USDC', amount));
    }

    if (fromCoin === 'LTC') {
      routePromises.push(getChangeNOWRoute('LTC', amount));
      routePromises.push(getGhostSwapRoute('LTC', amount));
    }

    if (fromCoin === 'SOL') {
      // SOL requires 2-step: SOL → USDC → XMR (not implemented yet)
      console.warn('⚠️ SOL swaps not yet implemented');
    }

    const routes = await Promise.allSettled(routePromises);

    // Filter successful routes
    const validRoutes = routes
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<SwapRoute | null>).value!)
      .filter((r) => r !== null);

    if (validRoutes.length === 0) {
      console.error('❌ No valid swap routes found');
      return null;
    }

    // Sort by total XMR received (highest first)
    validRoutes.sort((a, b) => parseFloat(b.toAmount) - parseFloat(a.toAmount));

    const bestRoute = validRoutes[0];
    console.log(`✅ Best route: ${bestRoute.provider} - ${bestRoute.toAmount} XMR (fee: ${bestRoute.fee})`);

    return bestRoute;
  } catch (error) {
    console.error('Get best route error:', error);
    return null;
  }
}

/**
 * Get all available routes (not just best)
 */
export async function getAllRoutes(
  fromCoin: string,
  toCoin: string = 'XMR',
  amount: number
): Promise<SwapRoute[]> {
  try {
    const validated = SwapRequestSchema.parse({ fromCoin, toCoin, amount });

    const routePromises: Promise<SwapRoute | null>[] = [];

    if (validated.fromCoin === 'BTC') {
      routePromises.push(getBTCSwapXMRRoute(amount));
      routePromises.push(getChangeNOWRoute('BTC', amount));
      routePromises.push(getGhostSwapRoute('BTC', amount));
    } else if (validated.fromCoin === 'ETH') {
      routePromises.push(getChangeNOWRoute('ETH', amount));
      routePromises.push(getGhostSwapRoute('ETH', amount));
    } else if (validated.fromCoin === 'USDC') {
      routePromises.push(getChangeNOWRoute('USDC', amount));
    } else if (validated.fromCoin === 'LTC') {
      routePromises.push(getChangeNOWRoute('LTC', amount));
      routePromises.push(getGhostSwapRoute('LTC', amount));
    }

    const routes = await Promise.allSettled(routePromises);

    const validRoutes = routes
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<SwapRoute | null>).value!)
      .filter((r) => r !== null);

    // Sort by XMR received (highest first)
    validRoutes.sort((a, b) => parseFloat(b.toAmount) - parseFloat(a.toAmount));

    return validRoutes;
  } catch (error) {
    console.error('Get all routes error:', error);
    return [];
  }
}

/**
 * BTCSwapXMR Provider Route
 */
async function getBTCSwapXMRRoute(amount: number): Promise<SwapRoute | null> {
  try {
    const quote = await getBTCSwapXMRQuote('BTC', 'XMR', amount);

    return {
      provider: 'BTCSwapXMR',
      fromCoin: 'BTC',
      toCoin: 'XMR',
      fromAmount: quote.fromAmount.toString(),
      toAmount: quote.toAmount.toString(),
      fee: quote.fee.toString(),
      estimatedTime: quote.estimatedTime,
      rate: quote.rate.toString(),
    };
  } catch (error) {
    console.error('BTCSwapXMR route error:', error);
    return null;
  }
}

/**
 * ChangeNOW Provider Route
 */
async function getChangeNOWRoute(
  fromCoin: string,
  amount: number
): Promise<SwapRoute | null> {
  try {
    const quote = await getChangeNOWQuote(fromCoin, 'XMR', amount);

    return {
      provider: 'ChangeNOW',
      fromCoin,
      toCoin: 'XMR',
      fromAmount: quote.fromAmount.toString(),
      toAmount: quote.toAmount.toString(),
      fee: quote.fee.toString(),
      estimatedTime: quote.estimatedTime,
      rate: (quote.toAmount / quote.fromAmount).toString(),
    };
  } catch (error) {
    console.error('ChangeNOW route error:', error);
    return null;
  }
}

/**
 * GhostSwap Provider Route (Mock - API offline)
 */
async function getGhostSwapRoute(
  fromCoin: string,
  amount: number
): Promise<SwapRoute | null> {
  try {
    const quote = await getGhostSwapQuote(fromCoin, 'XMR', amount);

    if (!quote.available) {
      console.warn('⚠️ GhostSwap unavailable:', quote.message);
      return null;
    }

    return {
      provider: 'GhostSwap',
      fromCoin,
      toCoin: 'XMR',
      fromAmount: quote.fromAmount.toString(),
      toAmount: quote.toAmount.toString(),
      fee: quote.fee.toString(),
      estimatedTime: quote.estimatedTime,
      rate: (quote.toAmount / quote.fromAmount).toString(),
    };
  } catch (error) {
    console.error('GhostSwap route error:', error);
    return null;
  }
}

/**
 * Get supported coins
 */
export function getSupportedCoins(): string[] {
  return ['BTC', 'ETH', 'LTC', 'SOL', 'USDC'];
}

/**
 * Get all providers
 */
export function getAllProviders(): SwapProvider[] {
  return Object.values(PROVIDERS);
}

// Re-export all provider functions
export {
  executeSwap,
  getSwapStatus,
  saveSwapToHistory,
  getSwapHistory,
  clearSwapHistory,
  type SwapOrder,
  type SwapStatus,
} from './execute';

export type { SwapRoute, SwapProvider };
export function getProviders(): SwapProvider[] {
  return Object.values(PROVIDERS);
}
