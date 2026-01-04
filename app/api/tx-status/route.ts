/**
 * Transaction Status API
 * Checks Monero TX status on blockchain
 * Rate Limited: Max 10 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkTxStatus, monitorPendingPayments } from '@/lib/monitoring/tx-monitor';

// Rate limiting (simple in-memory store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const MAX_REQUESTS = 10;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS - record.count };
}

const SingleTxSchema = z.object({
  txHash: z.string().length(64),
});

const BulkMonitorSchema = z.object({
  mode: z.literal('bulk'),
});

// GET /api/tx-status?txHash=... - Single TX status
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': `${RATE_LIMIT_WINDOW}`,
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash');

    if (!txHash) {
      return NextResponse.json(
        { error: 'Missing txHash parameter' },
        { status: 400 }
      );
    }

    // Validate TX hash
    const validated = SingleTxSchema.safeParse({ txHash });
    
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid TX hash format (must be 64 hex characters)' },
        { status: 400 }
      );
    }

    // Check TX status
    const result = await checkTxStatus(validated.data.txHash);

    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    });

  } catch (error) {
    console.error('TX status API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check transaction status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/tx-status - Bulk monitoring (all pending payments)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (stricter for bulk operations)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    const validated = BulkMonitorSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Monitor all pending payments
    const result = await monitorPendingPayments(3); // Max 3 concurrent checks

    return NextResponse.json({
      success: true,
      ...result,
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      },
    });

  } catch (error) {
    console.error('Bulk TX monitoring API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to monitor pending payments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
