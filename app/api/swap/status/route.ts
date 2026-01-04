/**
 * Swap Status Check API
 * 
 * Checks the current status of an active swap order
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSwapStatus } from '@/lib/swap-providers/execute';
import { z } from 'zod';

const StatusRequestSchema = z.object({
  orderId: z.string(),
  provider: z.enum(['BTCSwapXMR', 'ChangeNOW', 'GhostSwap']),
});

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 60; // 60 status checks
const RATE_WINDOW = 60000; // per minute

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const requests = rateLimitMap.get(ip) || [];
    const recentRequests = requests.filter((time) => now - time < RATE_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    rateLimitMap.set(ip, [...recentRequests, now]);

    // Validate request
    const body = await request.json();
    const validated = StatusRequestSchema.parse(body);

    // Get status from provider
    const status = await getSwapStatus(validated.provider, validated.orderId);

    return NextResponse.json(
      {
        success: true,
        status: {
          orderId: status.orderId,
          status: status.status,
          depositTxHash: status.depositTxHash,
          withdrawalTxHash: status.withdrawalTxHash,
          amountReceived: status.amountReceived,
          amountSent: status.amountSent,
          confirmations: status.confirmations,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [Swap Status Error]:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { 
        error: 'Status check failed',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
