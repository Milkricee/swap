'use client';

import { useState, memo } from 'react';
import type { SwapOrder } from '@/lib/swap-providers/execute';
import type { PaymentRecord } from '@/lib/payment/history';
// Removed: useSingleTxStatus - uses monero-ts which can't run in browser
import { getExplorerUrl, getExplorerName } from '@/lib/utils/explorer';

type Transaction = SwapOrder | PaymentRecord;

interface TransactionRowProps {
  tx: Transaction;
}

function isSwap(tx: Transaction): tx is SwapOrder {
  return 'depositAmount' in tx;
}

function isPayment(tx: Transaction): tx is PaymentRecord {
  return 'recipient' in tx;
}

function TransactionRow({ tx }: TransactionRowProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
        return 'text-green-400';
      case 'pending':
      case 'waiting':
      case 'processing':
        return 'text-yellow-400';
      case 'failed':
      case 'expired':
        return 'text-red-400';
      case 'timeout':
        return 'text-orange-400';
      case 'cancelled':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
        return '✓';
      case 'pending':
      case 'waiting':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'failed':
      case 'expired':
        return '✗';
      case 'timeout':
        return '⏰';
      case 'cancelled':
        return '⊘';
      default:
        return '○';
    }
  };

  /**
   * Status Badge Component
   * Visual badge with color-coded status indicators
   */
  const StatusBadge = ({ status, lastChecked }: { status: string; lastChecked?: number }) => {
    const colorClass = getStatusColor(status);
    const icon = getStatusIcon(status);
    
    return (
      <div className="inline-flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${colorClass}`}
              style={{
                backgroundColor: status === 'confirmed' ? 'rgba(34, 197, 94, 0.1)' :
                               status === 'pending' ? 'rgba(234, 179, 8, 0.1)' :
                               status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                borderColor: status === 'confirmed' ? 'rgba(34, 197, 94, 0.3)' :
                            status === 'pending' ? 'rgba(234, 179, 8, 0.3)' :
                            status === 'failed' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'
              }}
              title={lastChecked ? `Last checked: ${new Date(lastChecked).toLocaleString()}` : undefined}>
          {icon} {status}
        </span>
      </div>
    );
  };

  if (isSwap(tx)) {
    const [showDetails, setShowDetails] = useState(false);
    const [retrying, setRetrying] = useState(false);

    // Check if swap can be retried (with null safety)
    const canRetry = Boolean(tx.canRetry) && ['failed', 'timeout', 'cancelled'].includes(tx.status);

    const handleRetry = async () => {
      if (!canRetry) return;

      setRetrying(true);
      try {
        const { retrySwap } = await import('@/lib/swap-providers/execute');
        const newSwap = await retrySwap(tx.id);
        
        if (newSwap) {
          // Reload page to show new swap
          window.location.reload();
        } else {
          alert('Failed to create retry swap');
        }
      } catch (error) {
        console.error('Retry failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retry swap';
        alert(errorMessage);
      } finally {
        setRetrying(false);
      }
    };

    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
        <div className="flex items-center justify-between p-3">
          {/* Left: Type & Details */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00a885] flex items-center justify-center text-lg">
              ↔️
            </div>
            <div>
              <div className="font-medium text-white">
                Swap {tx.depositCurrency} → {tx.receiveCurrency}
              </div>
              <div className="text-xs text-gray-400">
                {formatDate(tx.timestamp)} • {tx.provider}
                {tx.retryCount != null && tx.retryCount > 0 && (
                  <span className="ml-2 text-amber-400">• Retry #{tx.retryCount}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Amount & Status */}
          <div className="text-right flex items-center gap-3">
            <div>
              <div className="font-mono text-white">
                +{tx.receiveAmount} {tx.receiveCurrency}
              </div>
              <StatusBadge status={tx.status} lastChecked={tx.lastChecked} />
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              {/* Show Details Button */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Show details"
              >
                <span className="text-xs">{showDetails ? '▼' : '▶'}</span>
              </button>

              {/* Retry Button (only for failed/timeout) */}
              {canRetry && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="px-2 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  title="Retry swap with same parameters"
                >
                  {retrying ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      🔄 Retry
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="px-3 pb-3 pt-0 border-t border-white/10">
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Order ID:</span>
                <span className="font-mono text-white">{tx.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deposit Address:</span>
                <span className="font-mono text-white text-right break-all">
                  {formatAddress(tx.depositAddress)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deposit Amount:</span>
                <span className="font-mono text-white">
                  {tx.depositAmount} {tx.depositCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expected:</span>
                <span className="font-mono text-white">
                  {tx.receiveAmount} {tx.receiveCurrency}
                </span>
              </div>
              
              {/* Error Message */}
              {tx.errorMessage && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400">
                  <div className="font-medium mb-1">⚠️ Error</div>
                  <div className="text-xs">{tx.errorMessage}</div>
                  {tx.errorCode && (
                    <div className="text-xs text-red-300 mt-1">Code: {tx.errorCode}</div>
                  )}
                </div>
              )}

              {/* Timeout Warning */}
              {tx.status === 'timeout' && (
                <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400">
                  <div className="font-medium mb-1">⏰ Swap Timed Out</div>
                  <div className="text-xs">
                    No deposit detected within 30 minutes. You can retry the swap or contact {tx.provider} support with Order ID: {tx.orderId}
                  </div>
                </div>
              )}

              {/* Failed Warning */}
              {tx.status === 'failed' && !tx.errorMessage && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400">
                  <div className="font-medium mb-1">❌ Swap Failed</div>
                  <div className="text-xs">
                    This swap failed. You can retry or contact {tx.provider} support.
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="mt-3 pt-2 border-t border-white/5 space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Created:</span>
                  <span>{new Date(tx.createdAt).toLocaleString()}</span>
                </div>
                {tx.timeoutAt && (
                  <div className="flex justify-between text-gray-500">
                    <span>Timeout:</span>
                    <span>{new Date(tx.timeoutAt).toLocaleString()}</span>
                  </div>
                )}
                {tx.lastChecked && (
                  <div className="flex justify-between text-gray-500">
                    <span>Last Checked:</span>
                    <span>{new Date(tx.lastChecked).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isPayment(tx)) {
    const [showDetails, setShowDetails] = useState(false);
    
    // Only check TX status if payment is pending and has TX hash
    const shouldCheckStatus = tx.status === 'pending' && !!tx.txHash;
    
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
        <div className="flex items-center justify-between p-3">
          {/* Left: Type & Details */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-lg">
              💸
            </div>
            <div>
              <div className="font-medium text-white">
                Payment
              </div>
              <div className="text-xs text-gray-400">
                {formatDate(tx.timestamp)} • To {formatAddress(tx.recipient)}
              </div>
            </div>
          </div>

          {/* Right: Amount & Status */}
          <div className="text-right flex items-center gap-3">
            <div>
              <div className="font-mono text-white">
                -{tx.amount} XMR
              </div>
              <StatusBadge status={tx.status} lastChecked={tx.lastChecked} />
            </div>
            
            {/* Actions */}
            <div className="flex gap-1">
              {/* Show Details Button */}
              {tx.txHash && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  title="Show transaction details"
                >
                  <span className="text-xs">{showDetails ? '▼' : '▶'}</span>
                </button>
              )}
              
              {/* Manual Status Check Button (only for pending) */}
              {shouldCheckStatus && (
                <RefreshButton txHash={tx.txHash!} />
              )}
            </div>
          </div>
        </div>
        
        {/* Expandable Details */}
        {showDetails && tx.txHash && (
          <div className="px-3 pb-3 pt-0 border-t border-white/10">
            <div className="mt-3 space-y-3">
              {/* TX Hash with Explorer Link */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400">TX Hash:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={getExplorerUrl(tx.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[#00d4aa] hover:underline flex items-center gap-1"
                    title={`View on ${getExplorerName()}`}
                  >
                    {formatAddress(tx.txHash)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {/* Copy Button */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tx.txHash || '');
                    }}
                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                    title="Copy TX hash"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-2 text-xs">
                {tx.fee && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network Fee:</span>
                    <span className="font-mono text-white">{tx.fee} XMR</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">From Wallet:</span>
                  <span className="text-white">Wallet #{tx.fromWallet} (Hot)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Recipient:</span>
                  <span className="font-mono text-white text-xs break-all">
                    {formatAddress(tx.recipient)}
                  </span>
                </div>
              </div>

              {/* Manual Verification Help */}
              <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <div className="text-xs text-blue-300 font-medium mb-1.5">
                  🔍 Manual Verification
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>1. Click the TX hash link above to open {getExplorerName()}</p>
                  <p>2. Check confirmations (10+ = confirmed)</p>
                  <p>3. Verify recipient address matches</p>
                  <p className="text-gray-500 mt-2">Status updates automatically every 60s</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Memoization mit custom comparison (nur re-render bei Status-Änderung)
export default memo(TransactionRow, (prevProps, nextProps) => {
  const prevId = 'txHash' in prevProps.tx ? prevProps.tx.txHash : 
                 'orderId' in prevProps.tx ? prevProps.tx.orderId : 
                 prevProps.tx.timestamp.toString();
  const nextId = 'txHash' in nextProps.tx ? nextProps.tx.txHash : 
                 'orderId' in nextProps.tx ? nextProps.tx.orderId : 
                 nextProps.tx.timestamp.toString();
  
  return (
    prevId === nextId &&
    prevProps.tx.status === nextProps.tx.status
  );
});

/**
 * Manual Status Check Button
 * Allows user to manually trigger TX status verification
 * Shows loading spinner during check
 */
function RefreshButton({ txHash }: { txHash: string }) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = async () => {
    if (!txHash) return;
    
    setIsChecking(true);
    try {
      const response = await fetch(`/api/tx-status?txHash=${txHash}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setLastChecked(new Date());
      
      // Show user-friendly notification
      if (data.status === 'confirmed') {
        // TX confirmed - reload to update UI
        alert(`✅ Transaction confirmed! ${data.confirmations} confirmations.`);
        window.location.reload();
      } else if (data.inTxPool) {
        alert(`⏳ Transaction is in mempool (unconfirmed). Current confirmations: ${data.confirmations || 0}`);
      } else {
        alert(`ℹ️ Status: ${data.status}. Confirmations: ${data.confirmations || 0}/10`);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
      alert('❌ Failed to check status. Please verify manually in block explorer.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <button
      onClick={checkStatus}
      disabled={isChecking}
      className="px-2 py-1 text-xs bg-[#00d4aa]/10 hover:bg-[#00d4aa]/20 text-[#00d4aa] 
                 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5
                 border border-[#00d4aa]/30"
      title={lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Check TX status on blockchain'}
    >
      {isChecking ? (
        <>
          <span className="inline-block w-3 h-3 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
          Checking...
        </>
      ) : (
        <>
          <span>🔄</span>
          <span className="hidden sm:inline">Check Status</span>
        </>
      )}
    </button>
  );
}


