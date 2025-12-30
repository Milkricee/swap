import { NextRequest, NextResponse } from 'next/server';
import { getPaymentEstimate } from '@/lib/payment';
import { z } from 'zod';

const EstimateRequestSchema = z.object({
  exactAmount: z.number().positive().max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = EstimateRequestSchema.parse(body);

    const estimate = await getPaymentEstimate(validated.exactAmount);

    return NextResponse.json(estimate, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Estimate error:', error);
    return NextResponse.json(
      { error: 'Failed to get estimate' },
      { status: 500 }
    );
  }
}
