/**
 * Swap Execution API
 * 
 * Creates actual exchange orders with providers
 * Production-ready with real API calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeSwap } from '@/lib/swap-providers/execute';
import { z } from 'zod';

const ExecuteSwapSchema = z.object({
  provider: z.enum(['BTCSwapXMR', 'ChangeNOW', 'GhostSwap']),
  fromCoin: z.enum(['BTC', 'ETH', 'LTC', 'SOL', 'USDC']),
  toCoin: z.literal('XMR'),
  amount: z.number().positive().max(1000000),
  xmrAddress: z.string().min(95).max(106), // Standard XMR address length
});

// Rate limiting - stricter for actual swaps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_SWAP || '10'); // 10 swaps
const RATE_WINDOW = 3600000; // per 60 minutes

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const requests = rateLimitMap.get(ip) || [];
    const recentRequests = requests.filter((time) => now - time < RATE_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Maximum 10 swaps per hour.',
          retryAfter: Math.ceil((RATE_WINDOW - (now - recentRequests[0])) / 1000),
        },
        { status: 429 }
      );
    }
    
    rateLimitMap.set(ip, [...recentRequests, now]);

    // Validate request
    const body = await request.json();
    const validated = ExecuteSwapSchema.parse(body);

    console.log(`🔄 [Swap Execute] ${validated.amount} ${validated.fromCoin} → ${validated.toCoin} via ${validated.provider}`);

    // Execute swap with chosen provider
    const swapOrder = await executeSwap(
      validated.provider,
      validated.fromCoin,
      validated.toCoin,
      validated.amount,
      validated.xmrAddress
    );

    console.log(`✅ [Swap Created] Order ID: ${swapOrder.orderId} | Deposit: ${swapOrder.depositAddress}`);

    return NextResponse.json(
      {
        success: true,
        order: {
          orderId: swapOrder.orderId,
          provider: swapOrder.provider,
          depositAddress: swapOrder.depositAddress,
          depositAmount: swapOrder.fromAmount,
          depositCurrency: swapOrder.fromCoin,
          expectedReceiveAmount: swapOrder.expectedToAmount,
          receiveCurrency: swapOrder.toCoin,
          withdrawalAddress: swapOrder.withdrawalAddress,
          status: swapOrder.status,
          expiresAt: swapOrder.expiresAt,
          createdAt: swapOrder.createdAt,
        },
        message: `Swap order created! Send ${swapOrder.fromAmount} ${swapOrder.fromCoin} to ${swapOrder.depositAddress}`,
      },
      { status: 200 }
    );

  } catch (error) {
    // Error handling with detailed messages
    console.error('❌ [Swap Execute Error]:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provider-specific error handling
    if (errorMessage.includes('pair_is_inactive')) {
      return NextResponse.json(
        { error: 'This currency pair is currently unavailable. Try another provider.' },
        { status: 503 }
      );
    }

    if (errorMessage.includes('out_of_range') || errorMessage.includes('min/max')) {
      return NextResponse.json(
        { error: 'Amount is outside the allowed limits. Check minimum/maximum amounts.' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('invalid_address')) {
      return NextResponse.json(
        { error: 'Invalid XMR address. Please check and try again.' },
        { status: 400 }
      );
    }

    // Network errors (retryable)
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Network error. Please try again in a moment.',
          retryable: true,
        },
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      { 
        error: 'Swap creation failed',
        details: errorMessage,
        retryable: !errorMessage.includes('invalid') && !errorMessage.includes('inactive'),
      },
      { status: 500 }
    );
  }
}
