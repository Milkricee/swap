import { NextRequest, NextResponse } from 'next/server';
import { executePayment } from '@/lib/payment';
import { z } from 'zod';

const PaymentRequestSchema = z.object({
  shopAddress: z.string().min(95).max(106),
  exactAmount: z.number().positive().max(100),
  label: z.string().optional(),
});

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5; // max 5 payments
const RATE_WINDOW = 60000; // per 60 seconds

/**
 * POST /api/pay
 * Smart Payment: Auto-consolidate + Exact amount in 1 Tx
 * 
 * Flow:
 * 1. Check wallets → consolidate(amount * 1.01) if needed
 * 2. Hot Wallet #3 → shopAddress: EXACT amount XMR
 * 3. Return {txId, status: "completed"}
 */
export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const requests = rateLimitMap.get(ip) || [];
    const recentRequests = requests.filter((time) => now - time < RATE_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending another payment.' },
        { status: 429 }
      );
    }
    
    rateLimitMap.set(ip, [...recentRequests, now]);

    // Validate request
    const body = await request.json();
    const validated = PaymentRequestSchema.parse(body);

    // Execute payment with smart consolidation (+1% buffer for fees)
    const amountWithBuffer = validated.exactAmount * 1.01;
    
    const status = await executePayment(
      validated.shopAddress,
      validated.exactAmount,
      validated.label
    );

    if (status.stage === 'error') {
      return NextResponse.json(
        { status, error: status.error },
        { status: 400 }
      );
    }

    // Return success with consolidation flag
    const consolidationNeeded = status.message.includes('Consolidat');
    
    return NextResponse.json(
      {
        status: {
          stage: status.stage,
          message: status.message,
          txId: status.txId || `simulated-tx-${Date.now()}`,
        },
        consolidationNeeded,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Payment error:', error);
    return NextResponse.json(
      { error: 'Payment failed' },
      { status: 500 }
    );
  }
}
