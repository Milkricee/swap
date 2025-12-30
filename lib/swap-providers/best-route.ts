import { SwapProvider, SwapRoute } from '@/types/wallet';

// Swap Provider Configurations
export const SWAP_PROVIDERS: SwapProvider[] = [
  {
    name: 'btcswapxmr',
    fee: 0.0015, // 0.15%
    estimatedTime: '15-30 min',
    pairs: ['BTC-XMR', 'XMR-BTC'],
  },
  {
    name: 'ChangeNOW',
    fee: 0.0025, // 0.25%
    estimatedTime: '10-20 min',
    pairs: ['ETH-XMR', 'USDC-XMR', 'BTC-XMR'],
  },
  {
    name: 'Jupiter',
    fee: 0.003, // 0.30%
    estimatedTime: '5-10 min',
    pairs: ['SOL-USDC', 'USDC-XMR'],
  },
];

export async function findBestSwapRoute(
  fromCoin: string,
  toCoin: string,
  amount: number
): Promise<SwapRoute | null> {
  // Filter providers that support the pair
  const pair = `${fromCoin}-${toCoin}`;
  const availableProviders = SWAP_PROVIDERS.filter((provider) =>
    provider.pairs.includes(pair)
  );

  if (availableProviders.length === 0) {
    return null;
  }

  // Find provider with lowest fee
  const bestProvider = availableProviders.reduce((best, current) =>
    current.fee < best.fee ? current : best
  );

  // Calculate amounts
  const fee = amount * bestProvider.fee;
  const toAmount = amount - fee;

  return {
    provider: bestProvider,
    fromAmount: amount.toString(),
    toAmount: toAmount.toString(),
    fee: fee.toString(),
    estimatedTime: bestProvider.estimatedTime,
  };
}
