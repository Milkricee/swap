import { z } from 'zod';
import {
  getWallets,
  consolidateToHotWallet,
  getHotWalletBalance,
} from '@/lib/wallets/index';
import type { XMRWallet } from '@/types/wallet';

// Zod Schemas
const PaymentRequestSchema = z.object({
  shopAddress: z.string().min(95).max(106), // XMR address length
  exactAmount: z.number().positive().max(100), // Max 100 XMR per payment
  label: z.string().optional(),
});

export interface PaymentStatus {
  stage: 'idle' | 'consolidating' | 'paying' | 'completed' | 'error';
  message: string;
  txId?: string;
  error?: string;
}

/**
 * Execute exact payment to shop
 * Smart Consolidation: If Hot Wallet insufficient → Consolidate from others
 */
export async function executePayment(
  shopAddress: string,
  exactAmount: number,
  label?: string
): Promise<PaymentStatus> {
  try {
    // Validate inputs
    const validated = PaymentRequestSchema.parse({
      shopAddress,
      exactAmount,
      label,
    });

    // Check if wallets exist
    const wallets = await getWallets();
    if (!wallets) {
      return {
        stage: 'error',
        message: 'No wallets found',
        error: 'Create wallets first',
      };
    }

    // Get Hot Wallet balance
    const hotWalletBalance = await getHotWalletBalance();
    
    // Stage 1: Consolidation (if needed)
    if (hotWalletBalance < validated.exactAmount) {
      const deficit = validated.exactAmount - hotWalletBalance;
      
      // Consolidate from other wallets
      const consolidationSuccess = await consolidateToHotWallet(validated.exactAmount);
      
      if (!consolidationSuccess) {
        return {
          stage: 'error',
          message: 'Consolidation failed',
          error: 'Insufficient funds across all wallets',
        };
      }

      // Check if we have enough after consolidation
      const newHotBalance = await getHotWalletBalance();
      if (newHotBalance < validated.exactAmount) {
        return {
          stage: 'error',
          message: 'Insufficient funds',
          error: `Need ${validated.exactAmount} XMR, have ${newHotBalance} XMR`,
        };
      }
    }

    // Stage 2: Execute payment from Hot Wallet
    const txId = await sendExactPayment(
      validated.shopAddress,
      validated.exactAmount,
      validated.label
    );

    return {
      stage: 'completed',
      message: 'Payment successful',
      txId,
    };
  } catch (error) {
    console.error('Payment error:', error);
    return {
      stage: 'error',
      message: 'Payment failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send exact payment from Hot Wallet (Wallet #3)
 * CRITICAL: Must send EXACT amount to shop
 */
async function sendExactPayment(
  shopAddress: string,
  exactAmount: number,
  label?: string
): Promise<string> {
  try {
    // In production: Use monero-javascript wallet.createTx()
    // Must ensure EXACT amount reaches shop (handle fees separately)
    
    // Mock transaction
    const txId = `xmr_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In production:
    // 1. Get Hot Wallet from encrypted storage
    // 2. Create transaction with EXACT amount
    // 3. Sign and broadcast
    // 4. Return transaction ID
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    console.log(`Payment sent: ${exactAmount} XMR to ${shopAddress}`);
    console.log(`Label: ${label || 'N/A'}`);
    console.log(`TX ID: ${txId}`);
    
    return txId;
  } catch (error) {
    throw new Error(`Send payment failed: ${error}`);
  }
}

/**
 * Validate XMR address format
 */
export function validateXMRAddress(address: string): boolean {
  // XMR addresses:
  // - Standard: 95 chars, starts with 4
  // - Integrated: 106 chars, starts with 4
  // - Subaddress: 95 chars, starts with 8
  
  if (!address) return false;
  
  const validLengths = [95, 106];
  const validPrefixes = ['4', '8'];
  
  return (
    validLengths.includes(address.length) &&
    validPrefixes.includes(address[0])
  );
}

/**
 * Parse XMR payment URI (xmr://address?amount=X.XX&label=Shop)
 */
export function parsePaymentURI(uri: string): {
  address: string;
  amount?: number;
  label?: string;
} | null {
  try {
    // Handle both xmr:// and monero:// schemes
    const normalized = uri.replace(/^(xmr|monero):\/?\/?/, '');
    
    // Split address and query params
    const [address, queryString] = normalized.split('?');
    
    if (!validateXMRAddress(address)) {
      return null;
    }
    
    const result: { address: string; amount?: number; label?: string } = {
      address,
    };
    
    if (queryString) {
      const params = new URLSearchParams(queryString);
      
      const amount = params.get('amount') || params.get('tx_amount');
      if (amount) {
        result.amount = parseFloat(amount);
      }
      
      const label = params.get('label') || params.get('recipient_name');
      if (label) {
        result.label = decodeURIComponent(label);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Parse payment URI error:', error);
    return null;
  }
}

/**
 * Calculate total funds needed (including estimated network fees)
 */
export function calculateRequiredFunds(exactAmount: number): number {
  // XMR network fee typically 0.00001 - 0.0001 XMR
  // Add small buffer for fee estimation
  const estimatedFee = 0.0001;
  return exactAmount + estimatedFee;
}

/**
 * Get payment estimate (consolidation needed, fees, etc.)
 */
export async function getPaymentEstimate(exactAmount: number): Promise<{
  possible: boolean;
  consolidationNeeded: boolean;
  totalAvailable: number;
  hotWalletBalance: number;
  estimatedFee: number;
}> {
  const wallets = await getWallets();
  
  if (!wallets) {
    return {
      possible: false,
      consolidationNeeded: false,
      totalAvailable: 0,
      hotWalletBalance: 0,
      estimatedFee: 0,
    };
  }
  
  const totalAvailable = wallets.reduce(
    (sum: number, w: XMRWallet) => sum + parseFloat(w.balance),
    0
  );
  
  const hotWalletBalance = await getHotWalletBalance();
  const estimatedFee = 0.0001;
  const requiredTotal = calculateRequiredFunds(exactAmount);
  
  return {
    possible: totalAvailable >= requiredTotal,
    consolidationNeeded: hotWalletBalance < requiredTotal,
    totalAvailable,
    hotWalletBalance,
    estimatedFee,
  };
}
