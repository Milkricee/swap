import { NextResponse } from 'next/server';

export interface CryptoPrice {
  usd: number;
  eur: number;
  btc: number;
}

const CACHE_TTL = 300000; // 5 minutes
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

let priceCache: { timestamp: number; prices: Record<string, CryptoPrice> } | null = null;

/**
 * GET /api/prices
 * Fetch crypto prices from CoinGecko (server-side to avoid CORS)
 */
export async function GET() {
  try {
    // Check cache
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
      return NextResponse.json(priceCache.prices);
    }

    // Fetch from CoinGecko
    const res = await fetch(
      `${COINGECKO_API}?ids=monero,bitcoin,ethereum,solana,usd-coin&vs_currencies=usd,eur,btc`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`);
    }

    const data = await res.json();

    const prices: Record<string, CryptoPrice> = {
      XMR: {
        usd: data.monero?.usd || 0,
        eur: data.monero?.eur || 0,
        btc: data.monero?.btc || 0,
      },
      BTC: {
        usd: data.bitcoin?.usd || 0,
        eur: data.bitcoin?.eur || 0,
        btc: 1,
      },
      ETH: {
        usd: data.ethereum?.usd || 0,
        eur: data.ethereum?.eur || 0,
        btc: data.ethereum?.btc || 0,
      },
      SOL: {
        usd: data.solana?.usd || 0,
        eur: data.solana?.eur || 0,
        btc: data.solana?.btc || 0,
      },
      USDC: {
        usd: data['usd-coin']?.usd || 1,
        eur: data['usd-coin']?.eur || 0.92,
        btc: data['usd-coin']?.btc || 0,
      },
    };

    // Update cache
    priceCache = {
      timestamp: Date.now(),
      prices,
    };

    return NextResponse.json(prices);

  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    
    // Return cached data if available
    if (priceCache) {
      return NextResponse.json(priceCache.prices);
    }

    // Fallback prices
    return NextResponse.json({
      XMR: { usd: 150, eur: 138, btc: 0.0035 },
      BTC: { usd: 43000, eur: 39560, btc: 1 },
      ETH: { usd: 2200, eur: 2024, btc: 0.051 },
      SOL: { usd: 95, eur: 87, btc: 0.0022 },
      USDC: { usd: 1, eur: 0.92, btc: 0.000023 },
    });
  }
}
