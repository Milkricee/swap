import { NextRequest, NextResponse } from 'next/server';
import { consolidateToHotWallet, getWallets } from '@/lib/wallets/index';
import { z } from 'zod';

const ConsolidateSchema = z.object({
  targetAmount: z.number().positive(),
  password: z.string().min(8, 'Password required'),
});

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60000;

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
    const { targetAmount, password } = ConsolidateSchema.parse(body);

    // Consolidate wallets with password
    const result = await consolidateToHotWallet(targetAmount, password);
    
    // Get updated wallets
    const wallets = await getWallets();

    return NextResponse.json(
      {
        success: result,
        targetAmount,
        wallets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Consolidate error:', error);
    return NextResponse.json(
      { error: 'Failed to consolidate wallets', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
