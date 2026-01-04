/**
 * ChangeNOW Provider
 * 
 * Production API: https://api.changenow.io/v2
 * Sandbox API: https://api.sandbox.changenow.io/v2
 * Docs: https://documenter.getpostman.com/view/8180765/SVfTPnME
 * 
 * Supports: ETH, USDC, LTC → XMR
 * Fee: 0.25%
 * No KYC for small amounts (<2 XMR)
 */

import { z } from 'zod';

// Use Sandbox URL if testnet mode enabled
const IS_TESTNET = process.env.NEXT_PUBLIC_TESTNET === 'true';
const CHANGENOW_SANDBOX = process.env.CHANGENOW_SANDBOX === 'true';
const CHANGENOW_API = (IS_TESTNET || CHANGENOW_SANDBOX)
  ? (process.env.NEXT_PUBLIC_CHANGENOW_SANDBOX_URL || 'https://api.sandbox.changenow.io/v2')
  : 'https://api.changenow.io/v2';

const CHANGENOW_API_KEY = process.env.CHANGENOW_API_KEY || '';

// Log which mode we're using (server-side only)
if (typeof window === 'undefined') {
  console.log(`[ChangeNOW] Mode: ${IS_TESTNET || CHANGENOW_SANDBOX ? 'SANDBOX (Testnet)' : 'PRODUCTION'}`);
}

// Zod Schemas
const ExchangeRangeSchema = z.object({
  minAmount: z.number(),
  maxAmount: z.number(),
});

const EstimateResponseSchema = z.object({
  fromAmount: z.string(),
  toAmount: z.string(),
  estimatedAmount: z.string().optional(),
  transactionSpeedForecast: z.string().optional(),
  warningMessage: z.string().optional(),
});

const CreateExchangeResponseSchema = z.object({
  id: z.string(),
  payinAddress: z.string(),
  payoutAddress: z.string(),
  fromCurrency: z.string(),
  toCurrency: z.string(),
  fromAmount: z.string().optional(),
  toAmount: z.string().optional(),
  status: z.string(),
});

const ExchangeStatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  payinHash: z.string().optional(),
  payoutHash: z.string().optional(),
  amountSend: z.string().optional(),
  amountReceive: z.string().optional(),
});

export interface ChangeNOWQuote {
  fromAmount: number;
  toAmount: number;
  fee: number;
  estimatedTime: string;
  minAmount: number;
  maxAmount: number;
}

export interface ChangeNOWExchange {
  exchangeId: string;
  depositAddress: string;
  withdrawalAddress: string;
  fromCurrency: string;
  toCurrency: string;
  expectedAmount: number;
  status: string;
}

/**
 * Get minimum exchange amount
 */
export async function getChangeNOWMinAmount(
  from: string,
  to: string
): Promise<{ min: number; max: number }> {
  try {
    const response = await fetch(
      `${CHANGENOW_API}/exchange/range?fromCurrency=${from.toLowerCase()}&toCurrency=${to.toLowerCase()}&fromNetwork=&toNetwork=&flow=standard&api_key=${CHANGENOW_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`ChangeNOW range error: ${response.status}`);
    }

    const data = await response.json();
    const validated = ExchangeRangeSchema.parse(data);

    return {
      min: validated.minAmount,
      max: validated.maxAmount,
    };
  } catch (error) {
    console.error('ChangeNOW min amount error:', error);
    
    // Fallback defaults
    return {
      min: from === 'ETH' ? 0.01 : from === 'USDC' ? 10 : 0.001,
      max: from === 'ETH' ? 100 : from === 'USDC' ? 100000 : 10,
    };
  }
}

/**
 * Get swap quote/estimate
 */
export async function getChangeNOWQuote(
  fromCoin: string,
  toCoin: string,
  amount: number
): Promise<ChangeNOWQuote> {
  try {
    const response = await fetch(
      `${CHANGENOW_API}/exchange/estimated-amount?fromCurrency=${fromCoin.toLowerCase()}&toCurrency=${toCoin.toLowerCase()}&fromAmount=${amount}&fromNetwork=&toNetwork=&flow=standard&type=&useRateId=false&api_key=${CHANGENOW_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`ChangeNOW estimate error: ${response.status}`);
    }

    const data = await response.json();
    const validated = EstimateResponseSchema.parse(data);

    const toAmount = parseFloat(validated.estimatedAmount || validated.toAmount);
    const fee = amount * 0.0025; // 0.25%

    return {
      fromAmount: amount,
      toAmount: toAmount,
      fee,
      estimatedTime: validated.transactionSpeedForecast || '10-20 min',
      minAmount: 0.01, // Will be updated by getMinAmount
      maxAmount: 100,
    };
  } catch (error) {
    console.error('❌ ChangeNOW quote error:', error);
    throw new Error(
      error instanceof Error 
        ? `ChangeNOW API failed: ${error.message}` 
        : 'ChangeNOW API request failed'
    );
  }
}

/**
 * Create exchange order
 */
export async function createChangeNOWExchange(
  fromCoin: string,
  toCoin: string,
  fromAmount: number,
  xmrAddress: string
): Promise<ChangeNOWExchange> {
  try {
    const response = await fetch(`${CHANGENOW_API}/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-changenow-api-key': CHANGENOW_API_KEY,
      },
      body: JSON.stringify({
        fromCurrency: fromCoin.toLowerCase(),
        toCurrency: toCoin.toLowerCase(),
        fromAmount: fromAmount.toString(),
        address: xmrAddress,
        flow: 'standard',
        type: 'direct',
        rateId: '',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ChangeNOW create exchange error: ${errorData.message || response.status}`);
    }

    const data = await response.json();
    const validated = CreateExchangeResponseSchema.parse(data);

    return {
      exchangeId: validated.id,
      depositAddress: validated.payinAddress,
      withdrawalAddress: validated.payoutAddress,
      fromCurrency: validated.fromCurrency,
      toCurrency: validated.toCurrency,
      expectedAmount: parseFloat(validated.toAmount || '0'),
      status: validated.status,
    };
  } catch (error) {
    console.error('❌ ChangeNOW create exchange error:', error);
    
    // Parse error message from ChangeNOW API
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Common ChangeNOW errors
    if (errorMessage.includes('pair_is_inactive')) {
      throw new Error('ChangeNOW: This currency pair is currently unavailable');
    }
    if (errorMessage.includes('out_of_range')) {
      throw new Error('ChangeNOW: Amount is outside min/max limits');
    }
    if (errorMessage.includes('invalid_address')) {
      throw new Error('ChangeNOW: Invalid XMR address');
    }
    
    throw new Error(
      `ChangeNOW order creation failed: ${errorMessage}`
    );
  }
}

/**
 * Get exchange status
 */
export async function getChangeNOWStatus(exchangeId: string): Promise<{
  id: string;
  status: string;
  payinHash?: string;
  payoutHash?: string;
  amountSent?: number;
  amountReceived?: number;
}> {
  try {
    const response = await fetch(
      `${CHANGENOW_API}/exchange/by-id?id=${exchangeId}&api_key=${CHANGENOW_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`ChangeNOW status error: ${response.status}`);
    }

    const data = await response.json();
    const validated = ExchangeStatusSchema.parse(data);

    return {
      id: validated.id,
      status: validated.status,
      payinHash: validated.payinHash,
      payoutHash: validated.payoutHash,
      amountSent: validated.amountSend ? parseFloat(validated.amountSend) : undefined,
      amountReceived: validated.amountReceive ? parseFloat(validated.amountReceive) : undefined,
    };
  } catch (error) {
    console.error('❌ ChangeNOW status check failed:', error);
    
    // Don't throw - status checks can fail temporarily
    // Return unknown status to allow retry
    return {
      id: exchangeId,
      status: 'checking', // Indicates temporary failure
    };
  }
}
