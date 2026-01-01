import { z } from 'zod';
import {
  getWallets,
  consolidateToHotWallet,
  getHotWalletBalance,
  getWalletSeed,
} from '@/lib/wallets/index';
import {
  sendMonero,
  getMoneroBalance,
  estimateTransactionFee,
  isValidMoneroAddress,
  getRestoreHeight,
  type MoneroWalletConfig,
} from '@/lib/wallets/monero-core';
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
 * REAL Implementation with monero-javascript
 */
async function sendExactPayment(
  shopAddress: string,
  exactAmount: number,
  label?: string
): Promise<string> {
  try {
    // Validate address
    if (!isValidMoneroAddress(shopAddress)) {
      throw new Error('Invalid Monero address');
    }

    // Get Hot Wallet seed (id=2)
    const hotWalletId = 2;
    const seed = await getWalletSeed(hotWalletId);
    
    if (!seed) {
      throw new Error('Hot wallet seed not found');
    }

    // Get wallet creation date for restore height
    const createdAtStr = localStorage.getItem('xmr_wallets_created_at');
    const createdAt = createdAtStr ? parseInt(createdAtStr) : Date.now();
    const restoreHeight = getRestoreHeight(new Date(createdAt));

    // Configure remote node
    const config: MoneroWalletConfig = {
      rpcUrl: process.env.NEXT_PUBLIC_MONERO_RPC_URL || 'https://xmr-node.cakewallet.com:18081',
      networkType: (process.env.NEXT_PUBLIC_MONERO_NETWORK as any) || 'mainnet',
      restoreHeight,
    };

    console.log(`💸 Sending ${exactAmount} XMR to ${shopAddress}`);
    console.log(`📝 Label: ${label || 'N/A'}`);

    // Send transaction using monero-core
    const txHash = await sendMonero(
      seed,
      shopAddress,
      exactAmount,
      config
    );

    console.log(`✅ Payment broadcasted! TX Hash: ${txHash}`);

    return txHash;

  } catch (error) {
    console.error('Send payment failed:', error);
    throw new Error(`Send payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate XMR address format
 */
export function validateXMRAddress(address: string): boolean {
  return isValidMoneroAddress(address);
}

/**
 * Estimate payment fee
 */
export function estimatePaymentFee(): number {
  return estimateTransactionFee();
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
