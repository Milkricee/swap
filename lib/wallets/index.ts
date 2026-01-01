import { z } from 'zod';
import CryptoJS from 'crypto-js';
import type { XMRWallet, EncryptedWalletData } from '@/types/wallet';
import { WALLET_DISTRIBUTION } from '@/types/wallet';
import {
  createMoneroWallet,
  getMoneroBalance,
  sendMonero,
  getRestoreHeight,
  isValidMoneroAddress,
  estimateTransactionFee,
  type MoneroWalletConfig,
} from './monero-core';

// Zod Schemas
const WalletSchema = z.object({
  id: z.number().min(0).max(4),
  address: z.string().min(95).max(106),
  balance: z.string(),
  type: z.enum(['cold', 'hot', 'reserve']),
  label: z.string(),
  publicViewKey: z.string().optional(),
  publicSpendKey: z.string().optional(),
});

const WalletsArraySchema = z.array(WalletSchema).length(5);

// Storage Keys
const WALLETS_KEY = 'xmr_wallets_encrypted';
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';

// Wallet Types per ID (0-indexed)
const WALLET_TYPES: Record<number, 'cold' | 'hot' | 'reserve'> = {
  0: 'cold',    // Wallet #1
  1: 'cold',    // Wallet #2
  2: 'hot',     // Wallet #3 - Hot Wallet
  3: 'cold',    // Wallet #4
  4: 'reserve', // Wallet #5
};

const WALLET_LABELS: Record<number, string> = {
  0: 'Wallet 1 (Cold)',
  1: 'Wallet 2 (Cold)',
  2: 'Wallet 3 (Hot)',
  3: 'Wallet 4 (Cold)',
  4: 'Wallet 5 (Reserve)',
};

/**
 * Encrypt data with AES
 */
function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt data with AES
 */
function decrypt(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Create 5 new XMR wallets with real monero-javascript
 * Seeds are encrypted and stored in localStorage
 */
export async function createWallets(): Promise<XMRWallet[]> {
  if (typeof window === 'undefined') {
    throw new Error('Wallets can only be created in browser');
  }

  const wallets: XMRWallet[] = [];
  const seeds: string[] = [];
  const addresses: string[] = [];
  const createdAt = Date.now();

  try {
    console.log('🔐 Creating 5 XMR wallets with monero-javascript...');

    // Create 5 wallets in-memory
    for (let i = 0; i < 5; i++) {
      console.log(`Creating wallet ${i + 1}/5...`);

      const walletData = await createMoneroWallet();

      seeds.push(walletData.mnemonic);
      addresses.push(walletData.address);

      wallets.push({
        id: i,
        address: walletData.address,
        balance: '0.000000000000',
        type: WALLET_TYPES[i],
        label: WALLET_LABELS[i],
        publicViewKey: walletData.publicViewKey,
        publicSpendKey: walletData.publicSpendKey,
      });
    }

    // Encrypt seeds and store
    const encryptedData: EncryptedWalletData = {
      encryptedSeeds: encrypt(JSON.stringify(seeds)),
      walletAddresses: addresses,
      createdAt,
    };

    localStorage.setItem(WALLETS_KEY, JSON.stringify(encryptedData));

    // Store public wallet data (non-sensitive)
    localStorage.setItem('xmr_wallets_public', JSON.stringify(wallets));
    localStorage.setItem('xmr_wallets_created_at', createdAt.toString());

    console.log('✅ Created 5 XMR wallets (seeds encrypted in localStorage)');
    console.log('📝 IMPORTANT: Backup your seeds NOW!');
    console.log('📋 Use: await window.getWalletSeed(0) in console to view seed');
    
    return wallets;

  } catch (error) {
    console.error('Failed to create wallets:', error);
    throw new Error('Wallet creation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Get all wallets from storage
 */
export async function getWallets(): Promise<XMRWallet[] | null> {
  if (typeof window === 'undefined') return null;

  const publicData = localStorage.getItem('xmr_wallets_public');
  if (!publicData) return null;

  try {
    const wallets = JSON.parse(publicData) as XMRWallet[];
    WalletsArraySchema.parse(wallets);
    return wallets;
  } catch (error) {
    console.error('Failed to load wallets:', error);
    return null;
  }
}

/**
 * Get decrypted seed for a specific wallet (DANGEROUS - use with care!)
 * Usage: await getWalletSeed(0) in browser console
 */
export async function getWalletSeed(walletId: number): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (walletId < 0 || walletId > 4) return null;

  try {
    const encryptedDataStr = localStorage.getItem(WALLETS_KEY);
    if (!encryptedDataStr) return null;

    const encryptedData: EncryptedWalletData = JSON.parse(encryptedDataStr);
    const decryptedSeeds = decrypt(encryptedData.encryptedSeeds);
    const seeds: string[] = JSON.parse(decryptedSeeds);

    return seeds[walletId] || null;
  } catch (error) {
    console.error('Failed to get wallet seed:', error);
    return null;
  }
}

/**
 * Get wallet balance from public Monero node
 * Uses optimized restore height for faster sync
 */
export async function getWalletBalance(walletId: number): Promise<string> {
  if (typeof window === 'undefined') return '0.000000000000';

  try {
    const wallets = await getWallets();
    if (!wallets || !wallets[walletId]) return '0.000000000000';

    const seed = await getWalletSeed(walletId);
    if (!seed) return '0.000000000000';

    // Get wallet creation date for restore height optimization
    const createdAtStr = localStorage.getItem('xmr_wallets_created_at');
    const createdAt = createdAtStr ? parseInt(createdAtStr) : Date.now();
    const restoreHeight = getRestoreHeight(new Date(createdAt));

    // Configure remote node
    const config: MoneroWalletConfig = {
      rpcUrl: process.env.NEXT_PUBLIC_MONERO_RPC_URL || 'https://xmr-node.cakewallet.com:18081',
      networkType: (process.env.NEXT_PUBLIC_MONERO_NETWORK as any) || 'mainnet',
      restoreHeight,
    };

    console.log(`🔍 Fetching balance for wallet ${walletId} (restore height: ${restoreHeight})...`);

    const balance = await getMoneroBalance(seed, config);

    console.log(`Wallet ${walletId}: ${balance} XMR`);

    return balance;

  } catch (error) {
    console.error(`Failed to get balance for wallet ${walletId}:`, error);
    return '0.000000000000';
  }
}

/**
 * Update all wallet balances
 */
export async function updateWalletBalances(): Promise<XMRWallet[]> {
  const wallets = await getWallets();
  if (!wallets) throw new Error('No wallets found');

  console.log('🔄 Updating wallet balances (this may take a while)...');

  // Update balances sequentially to avoid overwhelming the remote node
  const updatedWallets: XMRWallet[] = [];
  for (const wallet of wallets) {
    const balance = await getWalletBalance(wallet.id);
    console.log(`Wallet ${wallet.id}: ${balance} XMR`);
    updatedWallets.push({ ...wallet, balance });
  }

  // Update storage
  if (typeof window !== 'undefined') {
    localStorage.setItem('xmr_wallets_public', JSON.stringify(updatedWallets));
  }

  console.log('✅ Balances updated');
  return updatedWallets;
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
 * Get Hot Wallet (id=2) balance
 */
export async function getHotWalletBalance(): Promise<number> {
  const wallets = await getWallets();
  if (!wallets) return 0;

  const hotWallet = wallets.find(w => w.id === 2);
  return hotWallet ? parseFloat(hotWallet.balance) : 0;
}

/**
 * Consolidate wallets: Transfer from cold wallets to hot wallet
 * This requires spending transactions - COMPLEX operation
 */
export async function consolidateToHotWallet(targetAmount: number): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const wallets = await getWallets();
    if (!wallets) throw new Error('No wallets found');

    const hotWalletId = 2;
    const hotWallet = wallets[hotWalletId];
    const hotBalance = parseFloat(hotWallet.balance);

    if (hotBalance >= targetAmount) {
      console.log('✅ Hot wallet already has sufficient balance');
      return true;
    }

    const needed = targetAmount - hotBalance;
    console.log(`Need to consolidate ${needed} XMR to hot wallet`);

    // Collect from other wallets (0,1,3,4)
    const sourceWalletIds = [0, 1, 3, 4];
    
    // Get wallet creation date for restore height
    const createdAtStr = localStorage.getItem('xmr_wallets_created_at');
    const createdAt = createdAtStr ? parseInt(createdAtStr) : Date.now();
    const restoreHeight = getRestoreHeight(new Date(createdAt));
    
    const config: MoneroWalletConfig = {
      rpcUrl: process.env.NEXT_PUBLIC_MONERO_RPC_URL || 'https://xmr-node.cakewallet.com:18081',
      networkType: (process.env.NEXT_PUBLIC_MONERO_NETWORK as any) || 'mainnet',
      restoreHeight,
    };
    
    for (const sourceId of sourceWalletIds) {
      const sourceWallet = wallets[sourceId];
      const sourceBalance = parseFloat(sourceWallet.balance);

      if (sourceBalance > 0.001) { // Minimum 0.001 XMR to transfer (avoid dust)
        console.log(`Transferring from wallet ${sourceId}: ${sourceBalance} XMR`);

        // Get wallet seed
        const seed = await getWalletSeed(sourceId);
        if (!seed) continue;

        try {
          // Send using monero-core
          const amountToSend = Math.min(sourceBalance - 0.0001, needed);
          const txHash = await sendMonero(seed, hotWallet.address, amountToSend, config);

          console.log(`✅ Sent ${amountToSend} XMR from wallet ${sourceId} to hot wallet`);
          console.log(`TX Hash: ${txHash}`);

          // Check if we have enough now
          if (amountToSend >= needed) break;
        } catch (error) {
          console.error(`Failed to send from wallet ${sourceId}:`, error);
          continue;
        }
      }
    }

    // Refresh balances
    await updateWalletBalances();

    return true;

  } catch (error) {
    console.error('Consolidation failed:', error);
    return false;
  }
}

/**
 * Distribute XMR to all wallets according to WALLET_DISTRIBUTION
 * Used after swaps to split funds across 5 wallets
 */
export async function distributeToWallets(totalAmount: number): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const wallets = await getWallets();
    if (!wallets) throw new Error('No wallets found');

    // Calculate distribution amounts
    const amounts = [
      totalAmount * WALLET_DISTRIBUTION.wallet1, // 20%
      totalAmount * WALLET_DISTRIBUTION.wallet2, // 20%
      totalAmount * WALLET_DISTRIBUTION.wallet3, // 30%
      totalAmount * WALLET_DISTRIBUTION.wallet4, // 20%
      totalAmount * WALLET_DISTRIBUTION.wallet5, // 10%
    ];

    console.log('Distribution plan:', amounts);

    // In production: Send from swap receive address to each wallet
    // This is a mock - actual implementation requires swap integration

    return true;
  } catch (error) {
    console.error('Distribution failed:', error);
    return false;
  }
}

/**
 * Delete all wallets (DANGEROUS!)
 */
export async function deleteWallets(): Promise<void> {
  if (typeof window === 'undefined') return;

  const confirmed = confirm(
    '⚠️ WARNING: This will delete all wallets and encrypted seeds!\n\n' +
    'Make sure you have backed up your mnemonic seeds.\n\n' +
    'Continue?'
  );

  if (!confirmed) return;

  localStorage.removeItem(WALLETS_KEY);
  localStorage.removeItem('xmr_wallets_public');

  console.log('🗑️ All wallets deleted');
}

// Export wallet seed getter for browser console access
if (typeof window !== 'undefined') {
  (window as any).getWalletSeed = getWalletSeed;
  (window as any).deleteWallets = deleteWallets;
}
