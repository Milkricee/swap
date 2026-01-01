/**
 * Monero Wallet Core - SERVER-ONLY Implementation
 * 
 * CRITICAL: This file runs ONLY in Node.js (API routes)
 * monero-javascript CANNOT be bundled for the browser
 */

// Import monero-javascript only when module loads (server-side)
const monerojs = eval('require')('monero-javascript');
const { MoneroWalletFull, MoneroNetworkType } = monerojs;

export interface MoneroWalletConfig {
  rpcUrl: string;
  networkType: 'mainnet' | 'testnet' | 'stagenet';
  restoreHeight?: number;
}

export interface WalletCreationResult {
  address: string;
  mnemonic: string;
  publicViewKey: string;
  publicSpendKey: string;
}

/**
 * Create a new Monero wallet (in-memory, no daemon needed)
 * Returns address, mnemonic, and public keys
 */
export async function createMoneroWallet(): Promise<WalletCreationResult> {
  const wallet = await MoneroWalletFull.createWallet({
    networkType: MoneroNetworkType.MAINNET,
    password: '', // Empty password for in-memory wallet
  });

  const mnemonic = await wallet.getMnemonic();
  const address = await wallet.getPrimaryAddress();
  const publicViewKey = await wallet.getPublicViewKey();
  const publicSpendKey = await wallet.getPublicSpendKey();

  await wallet.close();

  return {
    address,
    mnemonic,
    publicViewKey,
    publicSpendKey,
  };
}

/**
 * Get wallet balance from remote node
 * Uses full wallet sync (slow but accurate)
 * 
 * @param mnemonic - 25-word seed phrase
 * @param config - Remote node configuration
 * @returns Balance in XMR (as string with 12 decimals)
 */
export async function getMoneroBalance(
  mnemonic: string,
  config: MoneroWalletConfig
): Promise<string> {

  const networkType = config.networkType === 'mainnet' 
    ? MoneroNetworkType.MAINNET 
    : config.networkType === 'testnet'
    ? MoneroNetworkType.TESTNET
    : MoneroNetworkType.STAGENET;

  const wallet = await MoneroWalletFull.createWallet({
    networkType,
    mnemonic,
    restoreHeight: config.restoreHeight || 0,
    serverUri: config.rpcUrl,
    password: '',
  });

  // Sync with blockchain
  await wallet.sync();

  // Get balance (in atomic units)
  const balanceAtomic = await wallet.getBalance();
  // Use getBalance() as it returns unlocked balance by default

  await wallet.close();

  // Convert atomic units to XMR (1 XMR = 10^12 atomic units)
  const balanceXMR = (Number(balanceAtomic) / 1e12).toFixed(12);
  
  return balanceXMR;
}

/**
 * Send exact XMR amount to address
 * 
 * @param mnemonic - Sender's 25-word seed
 * @param toAddress - Recipient Monero address
 * @param amount - Amount in XMR (will be converted to atomic units)
 * @param config - Remote node configuration
 * @returns Transaction hash
 */
export async function sendMonero(
  mnemonic: string,
  toAddress: string,
  amount: number,
  config: MoneroWalletConfig
): Promise<string> {
  const networkType = config.networkType === 'mainnet' 
    ? MoneroNetworkType.MAINNET 
    : config.networkType === 'testnet'
    ? MoneroNetworkType.TESTNET
    : MoneroNetworkType.STAGENET;

  const wallet = await MoneroWalletFull.createWallet({
    networkType,
    mnemonic,
    restoreHeight: config.restoreHeight || 0,
    serverUri: config.rpcUrl,
    password: '',
  });

  // Sync before sending
  await wallet.sync();

  // Convert XMR to atomic units
  const atomicAmount = BigInt(Math.floor(amount * 1e12)).toString();

  // Create and relay transaction
  const txConfig = {
    accountIndex: 0,
    address: toAddress,
    amount: atomicAmount,
    relay: true, // Broadcast to network
  };

  const tx = await wallet.createTx(txConfig);
  
  // Get transaction hash before closing wallet
  const txHash = tx.getHash();

  await wallet.close();

  return txHash;
}

/**
 * Get wallet restore height from date
 * Useful for faster syncing if you know when wallet was created
 * 
 * @param dateCreated - Date when wallet was created
 * @returns Estimated restore height
 */
export function getRestoreHeight(dateCreated: Date): number {
  // Monero block time is ~2 minutes
  // Genesis block: April 18, 2014
  const genesisDate = new Date('2014-04-18');
  const daysSinceGenesis = Math.floor(
    (dateCreated.getTime() - genesisDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // ~720 blocks per day (60*24/2)
  const estimatedHeight = Math.floor(daysSinceGenesis * 720);
  
  // Subtract 100 blocks as safety buffer
  return Math.max(0, estimatedHeight - 100);
}

/**
 * Validate Monero address
 */
export function isValidMoneroAddress(address: string): boolean {
  // Mainnet: starts with 4, length 95-106
  // Testnet: starts with 9 or A
  // Stagenet: starts with 5
  
  const mainnetRegex = /^4[0-9A-Za-z]{94,105}$/;
  const testnetRegex = /^[9A][0-9A-Za-z]{94,105}$/;
  const stagenetRegex = /^5[0-9A-Za-z]{94,105}$/;
  
  return mainnetRegex.test(address) || 
         testnetRegex.test(address) || 
         stagenetRegex.test(address);
}

/**
 * Estimate transaction fee (rough estimate)
 * Actual fee depends on transaction size and network conditions
 */
export function estimateTransactionFee(): number {
  // Typical Monero transaction fee: 0.00001 - 0.0001 XMR
  // Conservative estimate
  return 0.0001;
}
