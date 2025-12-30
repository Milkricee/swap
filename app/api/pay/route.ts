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

    // Execute payment with smart consolidation
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

    return NextResponse.json(
      {
        status,
        consolidationNeeded: true, // Indicate if consolidation happened
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
