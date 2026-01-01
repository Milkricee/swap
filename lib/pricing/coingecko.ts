/**
 * Fiat Pricing via CoinGecko API (Client-Side Helper)
 * Fetches prices from /api/prices (server-side route)
 * Cache: 5 minutes TTL
 */

export interface CryptoPrice {
  usd: number;
  eur: number;
  btc: number;
}

export interface PriceCache {
  timestamp: number;
  prices: Record<string, CryptoPrice>;
}

const CACHE_TTL = 300000; // 5 minutes

let priceCache: PriceCache | null = null;

/**
 * Get cryptocurrency prices from server API
 * Cached for 5 minutes to reduce requests
 */
export async function getCryptoPrices(): Promise<Record<string, CryptoPrice>> {
  // Check cache
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
    return priceCache.prices;
  }

  try {
    // Fetch from our own API route (server-side)
    const res = await fetch('/api/prices', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Prices API error: ${res.status}`);
    }

    const prices = await res.json();

    // Update cache
    priceCache = {
      timestamp: Date.now(),
      prices,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('💰 Prices updated from API');
    }

    return prices;
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    
    // Return cached data if available, otherwise fallback
    if (priceCache) {
      console.warn('Using stale price cache');
      return priceCache.prices;
    }

    // Fallback to approximate prices
    return {
      XMR: { usd: 150, eur: 138, btc: 0.0035 },
      BTC: { usd: 43000, eur: 39560, btc: 1 },
      ETH: { usd: 2200, eur: 2024, btc: 0.051 },
      SOL: { usd: 95, eur: 87, btc: 0.0022 },
      USDC: { usd: 1, eur: 0.92, btc: 0.000023 },
    };
  }
}

/**
 * Format crypto amount as fiat price
 * @param amount - Crypto amount (string or number)
 * @param currency - Target fiat currency
 * @param crypto - Crypto symbol (XMR, BTC, etc.)
 */
export function formatFiatPrice(
  amount: string | number,
  currency: 'USD' | 'EUR' = 'USD',
  crypto: string = 'XMR'
): string {
  if (!priceCache) {
    return '...';
  }

  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount === 0) return '$0.00';

    const price = priceCache.prices[crypto]?.[currency.toLowerCase() as 'usd' | 'eur'];
    if (!price) return '—';

    const fiatValue = numAmount * price;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(fiatValue);
  } catch {
    return '—';
  }
}

/**
 * Get single crypto price
 */
export function getPrice(crypto: string, currency: 'usd' | 'eur' | 'btc' = 'usd'): number | null {
  if (!priceCache) return null;
  return priceCache.prices[crypto]?.[currency] || null;
}

/**
 * Check if cache is fresh
 */
export function isCacheFresh(): boolean {
  if (!priceCache) return false;
  return Date.now() - priceCache.timestamp < CACHE_TTL;
}

/**
 * Get cache age in seconds
 */
export function getCacheAge(): number {
  if (!priceCache) return Infinity;
  return Math.floor((Date.now() - priceCache.timestamp) / 1000);
}

/**
 * Force cache refresh
 */
export async function refreshPrices(): Promise<void> {
  priceCache = null;
  await getCryptoPrices();
}
