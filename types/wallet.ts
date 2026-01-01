// XMR Wallet types
export interface XMRWallet {
  id: number;
  address: string;
  balance: string;
  type: 'cold' | 'hot' | 'reserve';
  label: string;
  publicViewKey?: string;
  publicSpendKey?: string;
}

export interface EncryptedWalletData {
  encryptedSeeds: string; // AES encrypted array of mnemonic seeds
  walletAddresses: string[]; // Public addresses (safe to store)
  createdAt: number;
}

export interface WalletDistribution {
  wallet1: number; // 20%
  wallet2: number; // 20%
  wallet3: number; // 30% - Hot Wallet (id=2, 0-indexed)
  wallet4: number; // 20%
  wallet5: number; // 10% - Reserve
}

export const WALLET_DISTRIBUTION: WalletDistribution = {
  wallet1: 0.20,
  wallet2: 0.20,
  wallet3: 0.30, // Hot Wallet
  wallet4: 0.20,
  wallet5: 0.10, // Reserve
};

export interface SwapProvider {
  name: string;
  fee: number;
  estimatedTime: string;
  pairs: string[];
}

export interface SwapRoute {
  provider: string; // Provider name: 'BTCSwapXMR', 'ChangeNOW', etc.
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  fee: string;
  estimatedTime: string;
  rate: string;
}

export interface PaymentRequest {
  address: string;
  amount: string;
  label?: string;
}
