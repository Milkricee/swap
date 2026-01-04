/**
 * VPS Wallet Server
 * 
 * Express API für Monero-Wallet-Operationen
 * Läuft auf VPS, kommuniziert mit monero-wallet-rpc
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONERO_RPC_URL = process.env.MONERO_RPC_URL || 'http://127.0.0.1:18082';
const API_SECRET = process.env.API_SECRET || '';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

// Middleware
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// API Secret Authentication
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-api-secret'];
  
  if (secret !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Schemas
const TransferSchema = z.object({
  walletIndex: z.number().min(0).max(4),
  toAddress: z.string().min(95).max(106),
  amount: z.number().positive(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

const DistributeSchema = z.object({
  fromWalletIndex: z.number().min(0).max(4),
  percentage: z.number().min(1).max(100).optional(),
});

const ConsolidateSchema = z.object({
  sourceWallets: z.array(z.number().min(0).max(4)),
  targetWallet: z.number().min(0).max(4),
  amount: z.number().positive().optional(),
});

/**
 * Helper: Call monero-wallet-rpc JSON-RPC
 */
async function callWalletRPC(method: string, params: any = {}, walletIndex: number = 0) {
  try {
    const response = await fetch(`${MONERO_RPC_URL}/json_rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '0',
        method,
        params: {
          ...params,
          account_index: walletIndex, // Select wallet by index
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    return data.result;
  } catch (error) {
    console.error('❌ [RPC] Error:', error);
    throw error;
  }
}

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * POST /api/wallet/transfer
 * Send XMR from specific wallet
 */
app.post('/api/wallet/transfer', authMiddleware, async (req, res) => {
  try {
    const validated = TransferSchema.parse(req.body);
    
    console.log(`📤 [Transfer] Wallet ${validated.walletIndex} → ${validated.amount} XMR`);

    // Convert XMR to atomic units (1 XMR = 10^12 atomic units)
    const amountAtomic = Math.floor(validated.amount * 1e12);

    const result = await callWalletRPC(
      'transfer',
      {
        destinations: [
          {
            address: validated.toAddress,
            amount: amountAtomic,
          },
        ],
        priority: validated.priority === 'high' ? 3 : validated.priority === 'low' ? 1 : 2,
        get_tx_key: true,
      },
      validated.walletIndex
    );

    console.log(`✅ [Transfer] TX Hash: ${result.tx_hash}`);

    res.json({
      success: true,
      txHash: result.tx_hash,
      fee: result.fee / 1e12, // Convert to XMR
    });
  } catch (error) {
    console.error('❌ [Transfer] Failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transfer failed',
    });
  }
});

/**
 * GET /api/wallet/balance
 * Get wallet balance
 */
app.get('/api/wallet/balance', authMiddleware, async (req, res) => {
  try {
    const walletIndex = parseInt(req.query.walletIndex as string) || 0;

    const result = await callWalletRPC('get_balance', {}, walletIndex);

    res.json({
      success: true,
      balance: (result.balance / 1e12).toFixed(12),
      unlockedBalance: (result.unlocked_balance / 1e12).toFixed(12),
    });
  } catch (error) {
    console.error('❌ [Balance] Failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Balance check failed',
    });
  }
});

/**
 * POST /api/wallet/distribute
 * Distribute from one wallet to 4 others (20% each)
 */
app.post('/api/wallet/distribute', authMiddleware, async (req, res) => {
  try {
    const validated = DistributeSchema.parse(req.body);
    const percentage = validated.percentage || 20;

    console.log(`🔄 [Distribute] From Wallet ${validated.fromWalletIndex}, ${percentage}% each`);

    // Get source wallet balance
    const balanceResult = await callWalletRPC('get_balance', {}, validated.fromWalletIndex);
    const totalBalance = balanceResult.unlocked_balance;
    const amountPerWallet = Math.floor((totalBalance * percentage) / 100);

    // Transfer to other wallets (exclude source wallet)
    const txHashes: string[] = [];
    const targetWallets = [0, 1, 2, 3, 4].filter(i => i !== validated.fromWalletIndex);

    for (const targetIndex of targetWallets) {
      // Get target wallet address
      const addressResult = await callWalletRPC('get_address', {}, targetIndex);
      const targetAddress = addressResult.address;

      // Transfer
      const transferResult = await callWalletRPC(
        'transfer',
        {
          destinations: [{ address: targetAddress, amount: amountPerWallet }],
          priority: 2, // Normal
        },
        validated.fromWalletIndex
      );

      txHashes.push(transferResult.tx_hash);
      console.log(`✅ [Distribute] Wallet ${validated.fromWalletIndex} → ${targetIndex}: ${transferResult.tx_hash}`);
    }

    res.json({
      success: true,
      txHashes,
    });
  } catch (error) {
    console.error('❌ [Distribute] Failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Distribution failed',
    });
  }
});

/**
 * POST /api/wallet/consolidate
 * Merge multiple wallets into one
 */
app.post('/api/wallet/consolidate', authMiddleware, async (req, res) => {
  try {
    const validated = ConsolidateSchema.parse(req.body);

    console.log(`🔀 [Consolidate] ${validated.sourceWallets.join(',')} → ${validated.targetWallet}`);

    // Get target wallet address
    const targetAddressResult = await callWalletRPC('get_address', {}, validated.targetWallet);
    const targetAddress = targetAddressResult.address;

    const txHashes: string[] = [];

    for (const sourceIndex of validated.sourceWallets) {
      if (sourceIndex === validated.targetWallet) continue;

      // Get balance
      const balanceResult = await callWalletRPC('get_balance', {}, sourceIndex);
      const amount = validated.amount 
        ? Math.min(validated.amount * 1e12, balanceResult.unlocked_balance)
        : balanceResult.unlocked_balance;

      if (amount <= 0) continue;

      // Transfer
      const transferResult = await callWalletRPC(
        'transfer',
        {
          destinations: [{ address: targetAddress, amount }],
          priority: 2,
        },
        sourceIndex
      );

      txHashes.push(transferResult.tx_hash);
      console.log(`✅ [Consolidate] Wallet ${sourceIndex} → ${validated.targetWallet}: ${transferResult.tx_hash}`);
    }

    res.json({
      success: true,
      txHashes,
    });
  } catch (error) {
    console.error('❌ [Consolidate] Failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Consolidation failed',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 VPS Wallet Server running on port ${PORT}`);
  console.log(`📡 Monero RPC: ${MONERO_RPC_URL}`);
  console.log(`🔒 API Secret: ${API_SECRET ? 'Configured' : '⚠️ NOT SET!'}`);
});
