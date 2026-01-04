/**
 * Monero Explorer Configuration
 * Configurable block explorer links for TX verification
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

// Default explorer (can be changed by user later)
export const DEFAULT_EXPLORER = 'xmrchain';

/**
 * Get explorer URL for a transaction
 * @param txHash - Transaction hash
 * @param explorerKey - Explorer key (default: xmrchain)
 */
export function getExplorerUrl(txHash: string, explorerKey = DEFAULT_EXPLORER): string {
  const explorer = MONERO_EXPLORERS[explorerKey] || MONERO_EXPLORERS[DEFAULT_EXPLORER];
  return `${explorer.baseUrl}${explorer.txPath}${txHash}`;
}

/**
 * Get explorer name
 */
export function getExplorerName(explorerKey = DEFAULT_EXPLORER): string {
  const explorer = MONERO_EXPLORERS[explorerKey] || MONERO_EXPLORERS[DEFAULT_EXPLORER];
  return explorer.name;
}
