import { NextRequest, NextResponse } from 'next/server';
import { createWallets } from '@/lib/wallets/index';

// Rate limiting (simple in-memory)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 3; // max 3 requests
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
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    rateLimitMap.set(ip, [...recentRequests, now]);

    // Create wallets (no password needed - encryption key from .env)
    const wallets = await createWallets();

    return NextResponse.json({ wallets }, { status: 201 });
  } catch (error) {
    console.error('Create wallets error:', error);
    return NextResponse.json(
      { error: 'Failed to create wallets', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
