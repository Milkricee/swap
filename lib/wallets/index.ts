'use server'

import { z } from 'zod';
import { encryptedStorage } from '@/lib/storage/encrypted';
import type { XMRWallet, WalletDistribution } from '@/types/wallet';
import { WALLET_DISTRIBUTION } from '@/types/wallet';

// Zod Schemas
const WalletSchema = z.object({
  id: z.number().min(1).max(5),
  address: z.string().min(95).max(106), // XMR address length
  balance: z.string(),
  type: z.enum(['cold', 'hot', 'reserve']),
  label: z.string(),
});

const WalletsArraySchema = z.array(WalletSchema).length(5);

// Storage Keys
const WALLETS_KEY = 'xmr_wallets';
const WALLET_SEED_KEY = 'xmr_seed'; // NEVER expose this!

// Wallet Types per ID
const WALLET_TYPES: Record<number, 'cold' | 'hot' | 'reserve'> = {
  1: 'cold',
  2: 'cold',
  3: 'hot', // Hot Wallet für schnelle Payments
  4: 'cold',
  5: 'reserve',
};

/**
 * Create 5 new XMR wallets with distribution
 * CRITICAL: This uses mock addresses. In production, use monero-javascript
 */
export async function createWallets(userPassword: string): Promise<XMRWallet[]> {
  // Validate password
  if (!userPassword || userPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // In production: Use monero-javascript to generate real wallets
  // For now, mock wallets with valid XMR address format
  const wallets: XMRWallet[] = [
    {
      id: 1,
      address: generateMockXMRAddress(1),
      balance: '0.000000000000',
      type: 'cold',
      label: 'Wallet 1 (Cold)',
    },
    {
      id: 2,
      address: generateMockXMRAddress(2),
      balance: '0.000000000000',
      type: 'cold',
      label: 'Wallet 2 (Cold)',
    },
    {
      id: 3,
      address: generateMockXMRAddress(3),
      balance: '0.000000000000',
      type: 'hot',
      label: 'Wallet 3 (Hot)',
    },
    {
      id: 4,
      address: generateMockXMRAddress(4),
      balance: '0.000000000000',
      type: 'cold',
      label: 'Wallet 4 (Cold)',
    },
    {
      id: 5,
      address: generateMockXMRAddress(5),
      balance: '0.000000000000',
      type: 'reserve',
      label: 'Wallet 5 (Reserve)',
    },
  ];

  // Validate with Zod
  WalletsArraySchema.parse(wallets);

  // Store encrypted (NEVER store private keys here!)
  if (typeof window !== 'undefined') {
    encryptedStorage.set(WALLETS_KEY, wallets);
  }

  return wallets;
}

/**
 * Get all wallets from encrypted storage
 */
export async function getWallets(): Promise<XMRWallet[] | null> {
  if (typeof window === 'undefined') return null;
  
  const wallets = encryptedStorage.get<XMRWallet[]>(WALLETS_KEY);
  
  if (!wallets) return null;
  
  // Validate structure
  try {
    WalletsArraySchema.parse(wallets);
    return wallets;
  } catch {
    return null;
  }
}

/**
 * Distribute swap proceeds across 5 wallets according to WALLET_DISTRIBUTION
 */
export async function distributeSwapAmount(
  totalAmount: number
): Promise<Record<number, number>> {
  const distribution: Record<number, number> = {
    1: parseFloat((totalAmount * WALLET_DISTRIBUTION.wallet1).toFixed(12)),
    2: parseFloat((totalAmount * WALLET_DISTRIBUTION.wallet2).toFixed(12)),
    3: parseFloat((totalAmount * WALLET_DISTRIBUTION.wallet3).toFixed(12)),
    4: parseFloat((totalAmount * WALLET_DISTRIBUTION.wallet4).toFixed(12)),
    5: parseFloat((totalAmount * WALLET_DISTRIBUTION.wallet5).toFixed(12)),
  };

  return distribution;
}

/**
 * Update wallet balances after swap distribution
 */
export async function updateWalletBalances(
  distribution: Record<number, number>
): Promise<void> {
  const wallets = await getWallets();
  if (!wallets) throw new Error('No wallets found');

  const updated = wallets.map((wallet) => ({
    ...wallet,
    balance: (parseFloat(wallet.balance) + distribution[wallet.id]).toFixed(12),
  }));

  encryptedStorage.set(WALLETS_KEY, updated);
}

/**
 * Consolidate wallets 1,2,4,5 → Wallet 3 (Hot Wallet)
 * Use before making exact payments from Hot Wallet
 */
export async function consolidateToHotWallet(
  targetAmount?: number
): Promise<{ success: boolean; consolidatedAmount: number }> {
  const wallets = await getWallets();
  if (!wallets) throw new Error('No wallets found');

  const sourceWallets = [1, 2, 4, 5];
  const hotWallet = wallets.find((w) => w.id === 3);
  if (!hotWallet) throw new Error('Hot wallet not found');

  let consolidatedAmount = 0;

  // Calculate total from source wallets
  const updated = wallets.map((wallet) => {
    if (sourceWallets.includes(wallet.id)) {
      const balance = parseFloat(wallet.balance);
      
      if (targetAmount) {
        // Only take what's needed
        const needed = Math.max(0, targetAmount - consolidatedAmount);
        const toTransfer = Math.min(balance, needed);
        consolidatedAmount += toTransfer;
        
        return {
          ...wallet,
          balance: (balance - toTransfer).toFixed(12),
        };
      } else {
        // Transfer all
        consolidatedAmount += balance;
        return { ...wallet, balance: '0.000000000000' };
      }
    }
    
    if (wallet.id === 3) {
      // Add to hot wallet
      return {
        ...wallet,
        balance: (parseFloat(wallet.balance) + consolidatedAmount).toFixed(12),
      };
    }
    
    return wallet;
  });

  encryptedStorage.set(WALLETS_KEY, updated);

  return { success: true, consolidatedAmount };
}

/**
 * Get total balance across all wallets
 */
export async function getTotalBalance(): Promise<number> {
  const wallets = await getWallets();
  if (!wallets) return 0;

  return wallets.reduce((sum, wallet) => sum + parseFloat(wallet.balance), 0);
}

/**
 * Get Hot Wallet (Wallet #3) balance
 */
export async function getHotWalletBalance(): Promise<number> {
  const wallets = await getWallets();
  if (!wallets) return 0;

  const hotWallet = wallets.find((w) => w.id === 3);
  return hotWallet ? parseFloat(hotWallet.balance) : 0;
}

/**
 * Check if wallets exist
 */
export async function walletsExist(): Promise<boolean> {
  const wallets = await getWallets();
  return wallets !== null && wallets.length === 5;
}

/**
 * Delete all wallets (DANGEROUS!)
 */
export async function deleteWallets(): Promise<void> {
  encryptedStorage.remove(WALLETS_KEY);
  encryptedStorage.remove(WALLET_SEED_KEY);
}

// Helper: Generate mock XMR address (95-106 chars, starts with 4)
function generateMockXMRAddress(walletId: number): string {
  const prefix = '4';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let address = prefix;
  
  // Add wallet ID as identifier in mock address
  address += walletId.toString();
  
  // Fill to 95 characters
  for (let i = address.length; i < 95; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return address;
}
