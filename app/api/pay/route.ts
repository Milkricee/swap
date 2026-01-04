import { NextRequest, NextResponse } from 'next/server';
import { sendXMR, consolidateWallets, getWalletBalance } from '@/lib/vps/client';
import { savePaymentToHistory } from '@/lib/payment/history';
import { z } from 'zod';

const PaymentRequestSchema = z.object({
  shopAddress: z.string().min(95).max(106),
  exactAmount: z.number().positive().max(100),
  password: z.string().min(8, 'Password required'),
  label: z.string().optional(),
});

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10; // max 10 payments
const RATE_WINDOW = 3600000; // per 60 minutes (1 hour)

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

    console.log(`💸 [Payment] ${validated.exactAmount} XMR → ${validated.shopAddress.substring(0, 20)}...`);

    // Step 1: Check Hot Wallet (#3) balance
    const hotWalletBalance = await getWalletBalance({ walletIndex: 2 }); // Index 2 = Wallet #3
    
    if (!hotWalletBalance.success) {
      return NextResponse.json(
        { error: 'Failed to check wallet balance. VPS may be offline.' },
        { status: 503 }
      );
    }

    const balance = parseFloat(hotWalletBalance.balance || '0');
    const needed = validated.exactAmount * 1.01; // +1% for fees

    // Step 2: Consolidate if needed
    if (balance < needed) {
      console.log(`🔄 [Payment] Consolidating... Need ${needed} XMR, have ${balance} XMR`);
      
      const consolidateResult = await consolidateWallets(
        [0, 1, 3, 4], // Wallets #1,2,4,5 (indices 0,1,3,4)
        2, // Target: Wallet #3 (index 2)
        needed - balance // Only transfer what's missing
      );

      if (!consolidateResult.success) {
        return NextResponse.json(
          { error: `Consolidation failed: ${consolidateResult.error}` },
          { status: 500 }
        );
      }

      console.log(`✅ [Payment] Consolidated: ${consolidateResult.txHashes?.length} TXs`);
      
      // Wait 5s for consolidation to propagate
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Step 3: Send payment from Hot Wallet
    const transferResult = await sendXMR({
      walletIndex: 2, // Wallet #3 (Hot Wallet)
      toAddress: validated.shopAddress,
      amount: validated.exactAmount,
      priority: 'normal',
    });

    if (!transferResult.success) {
      return NextResponse.json(
        { error: `Payment failed: ${transferResult.error}` },
        { status: 500 }
      );
    }

    const txId = transferResult.txHash || '';
    console.log(`✅ [Payment] Success! TX: ${txId}`);

    // Save to payment history
    savePaymentToHistory({
      id: `payment-${Date.now()}`,
      timestamp: Date.now(),
      amount: validated.exactAmount.toString(),
      recipient: validated.shopAddress,
      status: 'pending',
      txHash: txId,
      fromWallet: 3,
      fee: transferResult.fee?.toString() || '0',
    });

    return NextResponse.json(
      {
        success: true,
        txHash: txId,
        fee: transferResult.fee,
        message: balance < needed 
          ? `Payment sent after consolidating wallets (TX: ${txId})`
          : `Payment sent successfully (TX: ${txId})`,
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
