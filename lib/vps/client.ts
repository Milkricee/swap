/**
 * VPS API Client
 * 
 * Handles communication between Vercel (frontend) and VPS (wallet operations)
 * All XMR transfers go through this client
 */

import { z } from 'zod';

const VPS_API_URL = process.env.WALLET_VPS_URL || 'http://localhost:3001';
const VPS_API_SECRET = process.env.WALLET_VPS_SECRET || 'dev-secret-change-in-production';

// Response schemas
const TransferResponseSchema = z.object({
  success: z.boolean(),
  txHash: z.string().optional(),
  fee: z.number().optional(),
  error: z.string().optional(),
});

const BalanceResponseSchema = z.object({
  success: z.boolean(),
  balance: z.string(),
  unlockedBalance: z.string().optional(),
  error: z.string().optional(),
});

const DistributeResponseSchema = z.object({
  success: z.boolean(),
  txHashes: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export interface TransferRequest {
  walletIndex: number; // 0-4 (Wallet #1-5)
  toAddress: string;
  amount: number; // In XMR (not atomic units)
  priority?: 'low' | 'normal' | 'high';
}

export interface BalanceRequest {
  walletIndex: number;
}

export interface DistributeRequest {
  fromWalletIndex: number; // Usually 0 (Wallet #1 receives from swaps)
  percentage?: number; // Default 20% to each wallet
}

/**
 * Send XMR from specific wallet
 * Used for payments from Hot Wallet (#3)
 */
export async function sendXMR(request: TransferRequest): Promise<{
  success: boolean;
  txHash?: string;
  fee?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${VPS_API_URL}/api/wallet/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': VPS_API_SECRET,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'VPS API error');
    }

    const data = await response.json();
    return TransferResponseSchema.parse(data);
  } catch (error) {
    console.error('❌ [VPS] sendXMR failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get wallet balance from VPS
 * More accurate than cached balance
 */
export async function getWalletBalance(request: BalanceRequest): Promise<{
  success: boolean;
  balance?: string;
  unlockedBalance?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${VPS_API_URL}/api/wallet/balance?walletIndex=${request.walletIndex}`,
      {
        headers: {
          'X-API-Secret': VPS_API_SECRET,
        },
      }
    );

    if (!response.ok) {
      throw new Error('VPS balance check failed');
    }

    const data = await response.json();
    return BalanceResponseSchema.parse(data);
  } catch (error) {
    console.error('❌ [VPS] getWalletBalance failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Distribute incoming XMR to 5 wallets (20% each)
 * Called after swap completes
 */
export async function distributeToWallets(request: DistributeRequest): Promise<{
  success: boolean;
  txHashes?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${VPS_API_URL}/api/wallet/distribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': VPS_API_SECRET,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Distribution failed');
    }

    const data = await response.json();
    return DistributeResponseSchema.parse(data);
  } catch (error) {
    console.error('❌ [VPS] distributeToWallets failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Consolidate multiple wallets into one (for large payments)
 * Example: Wallets #1,2,4,5 → Wallet #3 (Hot Wallet)
 */
export async function consolidateWallets(
  sourceWallets: number[],
  targetWallet: number,
  amount?: number // Optional: only transfer specific amount
): Promise<{
  success: boolean;
  txHashes?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${VPS_API_URL}/api/wallet/consolidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': VPS_API_SECRET,
      },
      body: JSON.stringify({
        sourceWallets,
        targetWallet,
        amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Consolidation failed');
    }

    const data = await response.json();
    return DistributeResponseSchema.parse(data);
  } catch (error) {
    console.error('❌ [VPS] consolidateWallets failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Health check - verify VPS is reachable
 */
export async function checkVPSHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${VPS_API_URL}/health`, {
      method: 'GET',
      headers: {
        'X-API-Secret': VPS_API_SECRET,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('❌ [VPS] Health check failed:', error);
    return false;
  }
}
