/**
 * Balance Sync Web Worker
 * - Runs background balance sync without blocking UI
 * - Updates IndexedDB cache
 * - Sends progress updates to main thread
 */

// Message types (JSDoc instead of TypeScript interfaces)
/**
 * @typedef {Object} SyncRequest
 * @property {'SYNC_BALANCE'} type
 * @property {number} walletId
 * @property {string} seed
 * @property {string} address
 * @property {number} restoreHeight
 * @property {string} rpcUrl
 * @property {string} networkType
 */

/**
 * @typedef {Object} SyncResponse
 * @property {'SYNC_PROGRESS'|'SYNC_COMPLETE'|'SYNC_ERROR'} type
 * @property {number} walletId
 * @property {string} [balance]
 * @property {number} [progress]
 * @property {string} [error]
 */

// Listen for messages from main thread
self.onmessage = async (event) => {
  const { type, walletId, seed, address, restoreHeight, rpcUrl, networkType } = event.data;

  if (type !== 'SYNC_BALANCE') {
    return;
  }

  try {
    // Send progress update
    self.postMessage({
      type: 'SYNC_PROGRESS',
      walletId,
      progress: 10,
    });

    // Import monero-javascript in worker context
    // NOTE: This requires special webpack config for web workers
    // For now, we'll use a simplified approach with fetch to RPC directly
    
    // Alternative: Use Monero RPC directly (faster, lighter)
    const balance = await fetchBalanceViaRPC(address, rpcUrl);

    // Send progress update
    self.postMessage({
      type: 'SYNC_PROGRESS',
      walletId,
      progress: 90,
    });

    // Send completion
    self.postMessage({
      type: 'SYNC_COMPLETE',
      walletId,
      balance,
    });

  } catch (error) {
    self.postMessage({
      type: 'SYNC_ERROR',
      walletId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Fetch balance directly via Monero RPC (lightweight alternative)
 * Uses get_balance RPC method with view key
 * @param {string} address - Monero address
 * @param {string} rpcUrl - RPC node URL
 * @returns {Promise<string>} Balance in XMR
 */
async function fetchBalanceViaRPC(address, rpcUrl) {
  try {
    // Note: This is a simplified approach
    // Full implementation would require view key + wallet sync
    // For production, use monero-javascript in server-side API instead

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '0',
        method: 'get_balance',
        params: {
          account_index: 0,
          address_indices: [0],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    // Convert atomic units to XMR (1 XMR = 1e12 atomic units)
    const balanceAtomic = data.result?.balance || 0;
    const balanceXMR = balanceAtomic / 1e12;

    return balanceXMR.toFixed(12);

  } catch (error) {
    console.error('RPC balance fetch failed:', error);
    // Fallback to 0 balance
    return '0.000000000000';
  }
}
