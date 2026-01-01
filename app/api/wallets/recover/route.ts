import { NextRequest, NextResponse } from 'next/server';
import { recoverWalletsFromSeeds } from '@/lib/wallets/index';
import { z } from 'zod';

// Validation schema
const RecoveryRequestSchema = z.object({
  seeds: z.array(z.string()).length(5),
});

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 2; // max 2 recovery attempts
const RATE_WINDOW = 300000; // per 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting (stricter for recovery)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const requests = rateLimitMap.get(ip) || [];
    const recentRequests = requests.filter((time) => now - time < RATE_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Too many recovery attempts. Please wait 5 minutes.' },
        { status: 429 }
      );
    }
    
    rateLimitMap.set(ip, [...recentRequests, now]);

    // Validate request
    const body = await request.json();
    const validated = RecoveryRequestSchema.parse(body);

    // Validate each seed format
    for (let i = 0; i < validated.seeds.length; i++) {
      const words = validated.seeds[i].trim().split(/\s+/);
      if (words.length !== 25) {
        return NextResponse.json(
          { error: `Wallet ${i + 1} seed must be exactly 25 words` },
          { status: 400 }
        );
      }
    }

    // Recover wallets
    const wallets = await recoverWalletsFromSeeds(validated.seeds);

    return NextResponse.json({ 
      wallets,
      message: 'Wallets recovered. Balances will sync in background.' 
    }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Recovery error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Recovery failed' },
      { status: 500 }
    );
  }
}
