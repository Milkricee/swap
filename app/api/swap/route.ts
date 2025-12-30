import { NextRequest, NextResponse } from 'next/server';
import { getBestRoute } from '@/lib/swap-providers';
import { z } from 'zod';

const SwapRequestSchema = z.object({
  fromCoin: z.enum(['BTC', 'ETH', 'SOL', 'USDC']),
  toCoin: z.literal('XMR'),
  amount: z.number().positive().max(1000000),
});

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10; // max 10 requests
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
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }
    
    rateLimitMap.set(ip, [...recentRequests, now]);

    // Validate request
    const body = await request.json();
    const validated = SwapRequestSchema.parse(body);

    // Get best route
    const route = await getBestRoute(
      validated.fromCoin,
      validated.toCoin,
      validated.amount
    );

    if (!route) {
      return NextResponse.json(
        { error: 'No swap routes available for this pair' },
        { status: 404 }
      );
    }

    return NextResponse.json({ route }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Swap route error:', error);
    return NextResponse.json(
      { error: 'Failed to find swap route' },
      { status: 500 }
    );
  }
}

// GET: Get supported coins
export async function GET() {
  return NextResponse.json({
    supportedCoins: ['BTC', 'ETH', 'SOL', 'USDC'],
    targetCoin: 'XMR',
  });
}
