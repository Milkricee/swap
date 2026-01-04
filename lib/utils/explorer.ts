/**
 * Multi-Chain Explorer Configuration
 * Block explorer links for TX verification across different chains
 */

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
  txPath: string; // e.g., '/tx/' or '/search?value='
}

// Popular Monero Block Explorers
export const MONERO_EXPLORERS: Record<string, ExplorerConfig> = {
  xmrchain: {
    name: 'XMRChain.net',
    baseUrl: 'https://xmrchain.net',
    txPath: '/tx/',
  },
  localmonero: {
    name: 'LocalMonero Explorer',
    baseUrl: 'https://localmonero.co/blocks',
    txPath: '/search/',
  },
  moneroscan: {
    name: 'MoneroScan',
    baseUrl: 'https://moneroscan.io',
    txPath: '/tx/',
  },
};

// Bitcoin Explorers
export const BITCOIN_EXPLORERS: Record<string, ExplorerConfig> = {
  mempool: {
    name: 'Mempool.space',
    baseUrl: 'https://mempool.space',
    txPath: '/tx/',
  },
  blockstream: {
    name: 'Blockstream',
    baseUrl: 'https://blockstream.info',
    txPath: '/tx/',
  },
};

// Ethereum Explorers
export const ETHEREUM_EXPLORERS: Record<string, ExplorerConfig> = {
  etherscan: {
    name: 'Etherscan',
    baseUrl: 'https://etherscan.io',
    txPath: '/tx/',
  },
};

// Solana Explorers
export const SOLANA_EXPLORERS: Record<string, ExplorerConfig> = {
  solscan: {
    name: 'Solscan',
    baseUrl: 'https://solscan.io',
    txPath: '/tx/',
  },
  solanaexplorer: {
    name: 'Solana Explorer',
    baseUrl: 'https://explorer.solana.com',
    txPath: '/tx/',
  },
};

// Default explorers
export const DEFAULT_EXPLORER = 'xmrchain';
export const DEFAULT_BTC_EXPLORER = 'mempool';
export const DEFAULT_ETH_EXPLORER = 'etherscan';
export const DEFAULT_SOL_EXPLORER = 'solscan';

/**
 * Get explorer URL for any chain transaction
 * @param txHash - Transaction hash
 * @param chain - Blockchain (XMR, BTC, ETH, SOL)
 * @param explorerKey - Optional specific explorer
 */
export function getExplorerUrl(txHash: string, chain: 'XMR' | 'BTC' | 'ETH' | 'SOL' = 'XMR', explorerKey?: string): string {
  let explorer: ExplorerConfig;

  switch (chain) {
    case 'BTC':
      explorer = BITCOIN_EXPLORERS[explorerKey || DEFAULT_BTC_EXPLORER] || BITCOIN_EXPLORERS[DEFAULT_BTC_EXPLORER];
      break;
    case 'ETH':
      explorer = ETHEREUM_EXPLORERS[explorerKey || DEFAULT_ETH_EXPLORER] || ETHEREUM_EXPLORERS[DEFAULT_ETH_EXPLORER];
      break;
    case 'SOL':
      explorer = SOLANA_EXPLORERS[explorerKey || DEFAULT_SOL_EXPLORER] || SOLANA_EXPLORERS[DEFAULT_SOL_EXPLORER];
      break;
    case 'XMR':
    default:
      explorer = MONERO_EXPLORERS[explorerKey || DEFAULT_EXPLORER] || MONERO_EXPLORERS[DEFAULT_EXPLORER];
  }

  return `${explorer.baseUrl}${explorer.txPath}${txHash}`;
}

/**
 * Get explorer name
 */
export function getExplorerName(chain: 'XMR' | 'BTC' | 'ETH' | 'SOL' = 'XMR', explorerKey?: string): string {
  let explorer: ExplorerConfig;

  switch (chain) {
    case 'BTC':
      explorer = BITCOIN_EXPLORERS[explorerKey || DEFAULT_BTC_EXPLORER] || BITCOIN_EXPLORERS[DEFAULT_BTC_EXPLORER];
      break;
    case 'ETH':
      explorer = ETHEREUM_EXPLORERS[explorerKey || DEFAULT_ETH_EXPLORER] || ETHEREUM_EXPLORERS[DEFAULT_ETH_EXPLORER];
      break;
    case 'SOL':
      explorer = SOLANA_EXPLORERS[explorerKey || DEFAULT_SOL_EXPLORER] || SOLANA_EXPLORERS[DEFAULT_SOL_EXPLORER];
      break;
    case 'XMR':
    default:
      explorer = MONERO_EXPLORERS[explorerKey || DEFAULT_EXPLORER] || MONERO_EXPLORERS[DEFAULT_EXPLORER];
  }

  return explorer.name;
}
