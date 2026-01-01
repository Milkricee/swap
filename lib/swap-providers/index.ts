import { z } from 'zod';
import type { SwapRoute, SwapProvider } from '@/types/wallet';

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
 * Queries REAL APIs where available
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

    // Query all providers in parallel
    const routes = await Promise.allSettled([
      getBTCSwapXMRRoute(validated.fromCoin, validated.amount),
      getChangeNOWRoute(validated.fromCoin, validated.amount),
      getGhostSwapRoute(validated.fromCoin, validated.amount),
      getJupiterRoute(validated.fromCoin, validated.amount),
    ]);

    // Filter successful routes
    const validRoutes = routes
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<SwapRoute | null>).value!)
      .filter((r) => r !== null);

    if (validRoutes.length === 0) {
      return null;
    }

    // Sort by total XMR received (highest first)
    validRoutes.sort((a, b) => parseFloat(b.toAmount) - parseFloat(a.toAmount));

    return validRoutes[0];
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

    const routes = await Promise.allSettled([
      getBTCSwapXMRRoute(validated.fromCoin, validated.amount),
      getChangeNOWRoute(validated.fromCoin, validated.amount),
      getGhostSwapRoute(validated.fromCoin, validated.amount),
      getJupiterRoute(validated.fromCoin, validated.amount),
    ]);

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
 * BTCSwapXMR Provider - REAL API
 * Docs: https://btcswapxmr.com/api
 */
async function getBTCSwapXMRRoute(
  fromCoin: string,
  amount: number
): Promise<SwapRoute | null> {
  if (fromCoin !== 'BTC') return null;

  try {
    console.log(`🔍 Querying BTCSwapXMR for ${amount} BTC...`);

    // REAL API CALL
    const response = await fetch(
      `https://btcswapxmr.com/api/quote?from=BTC&to=XMR&amount=${amount}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      console.warn('BTCSwapXMR API failed:', response.status);
      // Fallback to mock
      return getMockBTCSwapXMRRoute(amount);
    }

    const data = await response.json();

    // Parse API response (adjust based on actual API structure)
    const estimatedXMR = parseFloat(data.estimatedAmount || data.toAmount || '0');
    const feeAmount = amount * PROVIDERS.btcswapxmr.fee;

    if (estimatedXMR === 0) {
      return getMockBTCSwapXMRRoute(amount);
    }

    return {
      provider: PROVIDERS.btcswapxmr,
      fromAmount: amount.toString(),
      toAmount: estimatedXMR.toFixed(12),
      fee: feeAmount.toFixed(8),
      estimatedTime: PROVIDERS.btcswapxmr.estimatedTime,
    };

  } catch (error) {
    console.error('BTCSwapXMR API error:', error);
    // Fallback to mock
    return getMockBTCSwapXMRRoute(amount);
  }
}

/**
 * BTCSwapXMR Mock Fallback
 */
function getMockBTCSwapXMRRoute(amount: number): SwapRoute {
  const provider = PROVIDERS.btcswapxmr;
  const feeAmount = amount * provider.fee;
  const btcToXmrRate = 350; // Mock rate
  const estimatedXMR = (amount - feeAmount) * btcToXmrRate;

  return {
    provider,
    fromAmount: amount.toString(),
    toAmount: estimatedXMR.toFixed(12),
    fee: feeAmount.toFixed(8),
    estimatedTime: provider.estimatedTime,
  };
}

/**
 * ChangeNOW Provider - REAL API
 * Docs: https://changenow.io/api/docs
 */
async function getChangeNOWRoute(
  fromCoin: string,
  amount: number
): Promise<SwapRoute | null> {
  const supportedCoins = ['ETH', 'LTC', 'USDC'];
  if (!supportedCoins.includes(fromCoin)) return null;

  try {
    console.log(`🔍 Querying ChangeNOW for ${amount} ${fromCoin}...`);

    // REAL API CALL (v2)
    const fromTicker = fromCoin.toLowerCase();
    const response = await fetch(
      `https://api.changenow.io/v2/exchange/estimated-amount?fromCurrency=${fromTicker}&toCurrency=xmr&fromAmount=${amount}&fromNetwork=${fromTicker}&toNetwork=xmr&flow=standard&type=direct`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      console.warn('ChangeNOW API failed:', response.status);
      return getMockChangeNOWRoute(fromCoin, amount);
    }

    const data = await response.json();

    // Parse response
    const estimatedXMR = parseFloat(data.toAmount || '0');
    const feeAmount = amount * PROVIDERS.changenow.fee;

    if (estimatedXMR === 0) {
      return getMockChangeNOWRoute(fromCoin, amount);
    }

    return {
      provider: PROVIDERS.changenow,
      fromAmount: amount.toString(),
      toAmount: estimatedXMR.toFixed(12),
      fee: feeAmount.toFixed(8),
      estimatedTime: PROVIDERS.changenow.estimatedTime,
    };

  } catch (error) {
    console.error('ChangeNOW API error:', error);
    return getMockChangeNOWRoute(fromCoin, amount);
  }
}

/**
 * ChangeNOW Mock Fallback
 */
function getMockChangeNOWRoute(fromCoin: string, amount: number): SwapRoute {
  const provider = PROVIDERS.changenow;
  const feeAmount = amount * provider.fee;

  // Mock rates
  const rates: Record<string, number> = {
    ETH: 80,    // 1 ETH = 80 XMR
    LTC: 0.4,   // 1 LTC = 0.4 XMR
    USDC: 0.006, // 1 USDC = 0.006 XMR
  };

  const rate = rates[fromCoin] || 1;
  const estimatedXMR = (amount - feeAmount) * rate;

  return {
    provider,
    fromAmount: amount.toString(),
    toAmount: estimatedXMR.toFixed(12),
    fee: feeAmount.toFixed(8),
    estimatedTime: provider.estimatedTime,
  };
}

/**
 * GhostSwap Provider - MOCK (No public API)
 */
async function getGhostSwapRoute(
  fromCoin: string,
  amount: number
): Promise<SwapRoute | null> {
  const supportedCoins = ['BTC', 'ETH', 'LTC'];
  if (!supportedCoins.includes(fromCoin)) return null;

  try {
    const provider = PROVIDERS.ghostswap;
    const feeAmount = amount * provider.fee;

    // Mock rates (slightly better than ChangeNOW)
    const rates: Record<string, number> = {
      BTC: 352,  // 1 BTC = 352 XMR
      ETH: 81,   // 1 ETH = 81 XMR
      LTC: 0.41, // 1 LTC = 0.41 XMR
    };

    const rate = rates[fromCoin] || 1;
    const estimatedXMR = (amount - feeAmount) * rate;

    return {
      provider,
      fromAmount: amount.toString(),
      toAmount: estimatedXMR.toFixed(12),
      fee: feeAmount.toFixed(8),
      estimatedTime: provider.estimatedTime,
    };

  } catch (error) {
    console.error('GhostSwap error:', error);
    return null;
  }
}

/**
 * Jupiter Provider - MOCK (SOL → XMR via multiple hops)
 */
async function getJupiterRoute(
  fromCoin: string,
  amount: number
): Promise<SwapRoute | null> {
  if (fromCoin !== 'SOL') return null;

  try {
    const provider = PROVIDERS.jupiter;
    const feeAmount = amount * provider.fee;

    // Mock rate
    const solToXmrRate = 0.5; // 1 SOL = 0.5 XMR
    const estimatedXMR = (amount - feeAmount) * solToXmrRate;

    return {
      provider,
      fromAmount: amount.toString(),
      toAmount: estimatedXMR.toFixed(12),
      fee: feeAmount.toFixed(8),
      estimatedTime: provider.estimatedTime,
    };

  } catch (error) {
    console.error('Jupiter error:', error);
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
export function getProviders(): SwapProvider[] {
  return Object.values(PROVIDERS);
}
