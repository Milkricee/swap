// XMR Wallet types
export interface XMRWallet {
  id: number;
  address: string;
  balance: string;
  type: 'cold' | 'hot' | 'reserve';
  label: string;
}

export interface WalletDistribution {
  wallet1: number; // 20%
  wallet2: number; // 20%
  wallet3: number; // 30% - Hot Wallet
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
  provider: SwapProvider;
  fromAmount: string;
  toAmount: string;
  fee: string;
  estimatedTime: string;
}

export interface PaymentRequest {
  address: string;
  amount: string;
  label?: string;
}
