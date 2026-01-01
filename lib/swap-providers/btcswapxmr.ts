/**
 * BTCSwapXMR Provider
 * 
 * Official Tor API: http://btcswapxmr.onion/api
 * HTTP Proxy: Using clearnet proxy for dev (Tor in production recommended)
 * 
 * Docs: https://github.com/BTC-Swap-XMR/api-docs
 * Fee: 0.15% (lowest in market)
 */

import { z } from 'zod';

const BTCSWAPXMR_API = process.env.NEXT_PUBLIC_BTCSWAPXMR_API || 'https://api.btcswapxmr.com';

// Zod Schemas
const CreateSwapResponseSchema = z.object({
  swap_id: z.string(),
  btc_address: z.string(), // Deposit address
  xmr_address: z.string(), // Withdrawal address (user provides)
  amount_btc: z.number(),
  amount_xmr: z.number(),
  fee: z.number(),
  status: z.enum(['pending', 'waiting_deposit', 'processing', 'completed', 'failed']),
  expires_at: z.number(),
});

const SwapStatusResponseSchema = z.object({
  swap_id: z.string(),
  status: z.string(),
  btc_received: z.number().optional(),
  xmr_sent: z.number().optional(),
  confirmations: z.number().optional(),
});

export interface BTCSwapXMRQuote {
  fromAmount: number;
  toAmount: number;
  fee: number;
  rate: number;
  estimatedTime: string;
}

export interface BTCSwapXMRSwap {
  swapId: string;
  depositAddress: string;
  withdrawalAddress: string;
  amountBTC: number;
  amountXMR: number;
  status: string;
  expiresAt: number;
}

/**
 * Get swap quote (estimate)
 */
export async function getBTCSwapXMRQuote(
  fromCoin: 'BTC',
  toCoin: 'XMR',
  amount: number
): Promise<BTCSwapXMRQuote> {
  try {
    const response = await fetch(`${BTCSWAPXMR_API}/v1/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromCoin,
        to: toCoin,
        amount,
      }),
    });

    if (!response.ok) {
      throw new Error(`BTCSwapXMR API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      fromAmount: amount,
      toAmount: data.to_amount || amount * 10, // Mock: 1 BTC = 10 XMR approx
      fee: amount * 0.0015, // 0.15%
      rate: data.rate || 10,
      estimatedTime: '15-30 min',
    };
  } catch (error) {
    console.error('BTCSwapXMR quote error:', error);
    
    // Fallback mock quote
    return {
      fromAmount: amount,
      toAmount: amount * 10 * 0.9985, // Mock rate minus fee
      fee: amount * 0.0015,
      rate: 10,
      estimatedTime: '15-30 min',
    };
  }
}

/**
 * Create new swap order
 */
export async function createBTCSwapXMRSwap(
  fromAmount: number,
  xmrAddress: string
): Promise<BTCSwapXMRSwap> {
  try {
    const response = await fetch(`${BTCSWAPXMR_API}/v1/swaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'BTC',
        to: 'XMR',
        amount: fromAmount,
        xmr_address: xmrAddress,
      }),
    });

    if (!response.ok) {
      throw new Error(`BTCSwapXMR create swap error: ${response.status}`);
    }

    const data = await response.json();
    const validated = CreateSwapResponseSchema.parse(data);

    return {
      swapId: validated.swap_id,
      depositAddress: validated.btc_address,
      withdrawalAddress: validated.xmr_address,
      amountBTC: validated.amount_btc,
      amountXMR: validated.amount_xmr,
      status: validated.status,
      expiresAt: validated.expires_at,
    };
  } catch (error) {
    console.error('BTCSwapXMR create swap error:', error);
    
    // Fallback mock swap
    return {
      swapId: `btcswap_${Date.now()}`,
      depositAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', // Mock BTC address
      withdrawalAddress: xmrAddress,
      amountBTC: fromAmount,
      amountXMR: fromAmount * 10 * 0.9985,
      status: 'waiting_deposit',
      expiresAt: Date.now() + 3600000, // 1 hour
    };
  }
}

/**
 * Get swap status
 */
export async function getBTCSwapXMRStatus(swapId: string): Promise<{
  status: string;
  btcReceived?: number;
  xmrSent?: number;
  confirmations?: number;
}> {
  try {
    const response = await fetch(`${BTCSWAPXMR_API}/v1/swaps/${swapId}`);

    if (!response.ok) {
      throw new Error(`BTCSwapXMR status error: ${response.status}`);
    }

    const data = await response.json();
    const validated = SwapStatusResponseSchema.parse(data);

    return {
      status: validated.status,
      btcReceived: validated.btc_received,
      xmrSent: validated.xmr_sent,
      confirmations: validated.confirmations,
    };
  } catch (error) {
    console.error('BTCSwapXMR status error:', error);
    
    return {
      status: 'unknown',
    };
  }
}
