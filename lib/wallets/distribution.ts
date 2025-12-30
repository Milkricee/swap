import { XMRWallet, WALLET_DISTRIBUTION } from '@/types/wallet';

export function distributeXMR(totalAmount: number): Record<string, number> {
  return {
    wallet1: totalAmount * WALLET_DISTRIBUTION.wallet1,
    wallet2: totalAmount * WALLET_DISTRIBUTION.wallet2,
    wallet3: totalAmount * WALLET_DISTRIBUTION.wallet3,
    wallet4: totalAmount * WALLET_DISTRIBUTION.wallet4,
    wallet5: totalAmount * WALLET_DISTRIBUTION.wallet5,
  };
}

export function createWalletStructure(totalXMR: number): XMRWallet[] {
  const distribution = distributeXMR(totalXMR);
  
  return [
    {
      id: 1,
      address: '', // Will be generated
      balance: distribution.wallet1.toFixed(8),
      type: 'cold',
      label: 'Cold Wallet 1',
    },
    {
      id: 2,
      address: '',
      balance: distribution.wallet2.toFixed(8),
      type: 'cold',
      label: 'Cold Wallet 2',
    },
    {
      id: 3,
      address: '',
      balance: distribution.wallet3.toFixed(8),
      type: 'hot',
      label: 'Hot Wallet',
    },
    {
      id: 4,
      address: '',
      balance: distribution.wallet4.toFixed(8),
      type: 'cold',
      label: 'Cold Wallet 4',
    },
    {
      id: 5,
      address: '',
      balance: distribution.wallet5.toFixed(8),
      type: 'reserve',
      label: 'Reserve Wallet',
    },
  ];
}
