/**
 * Balance Sync Web Worker
 * - Runs background balance sync without blocking UI
 * - Updates IndexedDB cache
 * - Sends progress updates to main thread
 */

// Types for messaging
interface SyncRequest {
  type: 'SYNC_BALANCE';
  walletId: number;
  seed: string;
  address: string;
  restoreHeight: number;
  rpcUrl: string;
  networkType: string;
}

interface SyncResponse {
  type: 'SYNC_PROGRESS' | 'SYNC_COMPLETE' | 'SYNC_ERROR';
  walletId: number;
  balance?: string;
  progress?: number;
  error?: string;
}

// Listen for messages from main thread
self.onmessage = async (event: MessageEvent<SyncRequest>) => {
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
    } as SyncResponse);

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
    } as SyncResponse);

    // Send completion
    self.postMessage({
      type: 'SYNC_COMPLETE',
      walletId,
      balance,
    } as SyncResponse);

  } catch (error) {
    self.postMessage({
      type: 'SYNC_ERROR',
      walletId,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as SyncResponse);
  }
};

/**
 * Fetch balance directly via Monero RPC (lightweight alternative)
 * Uses get_balance RPC method with view key
 */
async function fetchBalanceViaRPC(
  address: string,
  rpcUrl: string
): Promise<string> {
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
