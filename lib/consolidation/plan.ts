// Smart wallet consolidation for exact payments
import { XMRWallet } from '@/types/wallet';

export interface ConsolidationPlan {
  sourceWallets: number[];
  targetWallet: number;
  totalAmount: string;
  requiredAmount: string;
}

export function createConsolidationPlan(
  wallets: XMRWallet[],
  paymentAmount: number
): ConsolidationPlan | null {
  const hotWallet = wallets.find((w) => w.id === 3);
  if (!hotWallet) return null;

  const hotBalance = parseFloat(hotWallet.balance);
  
  // If hot wallet has enough, no consolidation needed
  if (hotBalance >= paymentAmount) {
    return null;
  }

  // Calculate deficit
  const deficit = paymentAmount - hotBalance;

  // Get cold wallets sorted by balance
  const coldWallets = wallets
    .filter((w) => w.type === 'cold')
    .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

  let totalCollected = 0;
  const sourceWallets: number[] = [];

  for (const wallet of coldWallets) {
    const balance = parseFloat(wallet.balance);
    if (totalCollected < deficit) {
      sourceWallets.push(wallet.id);
      totalCollected += balance;
    }
  }

  if (totalCollected < deficit) {
    // Not enough funds across all wallets
    return null;
  }

  return {
    sourceWallets,
    targetWallet: 3, // Hot wallet
    totalAmount: (hotBalance + totalCollected).toFixed(8),
    requiredAmount: paymentAmount.toFixed(8),
  };
}
