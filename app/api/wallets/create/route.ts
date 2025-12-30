import { NextRequest, NextResponse } from 'next/server';
import { createWallets } from '@/lib/wallets';
import { z } from 'zod';

const CreateWalletsSchema = z.object({
  password: z.string().min(8),
});

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

    // Validate request
    const body = await request.json();
    const { password } = CreateWalletsSchema.parse(body);

    // Create wallets
    const wallets = await createWallets(password);

    return NextResponse.json({ wallets }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create wallets error:', error);
    return NextResponse.json(
      { error: 'Failed to create wallets' },
      { status: 500 }
    );
  }
}
