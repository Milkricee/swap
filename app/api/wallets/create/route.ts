import { NextRequest, NextResponse } from 'next/server';
import { createWallets } from '@/lib/wallets/index';
import { z } from 'zod';

// Validation schema
const CreateWalletsSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Rate limiting (simple in-memory)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5; // max 5 wallet creations
const RATE_WINDOW = 3600000; // per 60 minutes (1 hour)

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const requests = rateLimitMap.get(ip) || [];
    const recentRequests = requests.filter((time) => now - time < RATE_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 5 wallet creations per hour.' },
        { status: 429 }
      );
    }
    
    rateLimitMap.set(ip, [...recentRequests, now]);

    // Validate request body
    const body = await request.json();
    const validated = CreateWalletsSchema.parse(body);

    // Create wallets with user password (PBKDF2 encryption)
    const wallets = await createWallets(validated.password);

    return NextResponse.json({ wallets }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Create wallets error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to create wallets', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
