'use client';

import { useState } from 'react';
import type { SwapOrder } from '@/lib/swap-providers/execute';
import type { PaymentRecord } from '@/lib/payment/history';
import { useSingleTxStatus } from '@/lib/hooks/useTxMonitor';

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

export default function TransactionRow({ tx }: TransactionRowProps) {
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

  if (isSwap(tx)) {
    const [showDetails, setShowDetails] = useState(false);
    const [retrying, setRetrying] = useState(false);

    // Check if swap can be retried
    const canRetry = tx.canRetry && ['failed', 'timeout', 'cancelled'].includes(tx.status);

    const handleRetry = async () => {
      if (!canRetry) return;

      setRetrying(true);
      try {
        const { retrySwap } = await import('@/lib/swap-providers/execute');
        const newSwap = await retrySwap(tx.id);
        
        if (newSwap) {
          // Reload page to show new swap
          window.location.reload();
        }
      } catch (error) {
        console.error('Retry failed:', error);
        alert(error instanceof Error ? error.message : 'Failed to retry swap');
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
                {tx.retryCount && tx.retryCount > 0 && (
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
              <div className={`text-xs ${getStatusColor(tx.status)}`}>
                {getStatusIcon(tx.status)} {tx.status}
              </div>
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
              <div className={`text-xs ${getStatusColor(tx.status)}`}>
                {getStatusIcon(tx.status)} {tx.status}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-1">
              {/* Show Details Button */}
              {tx.txHash && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  title="Show details"
                >
                  <span className="text-xs">{showDetails ? '▼' : '▶'}</span>
                </button>
              )}
              
              {/* Check Status Button (only for pending) */}
              {shouldCheckStatus && (
                <RefreshButton txHash={tx.txHash!} />
              )}
            </div>
          </div>
        </div>
        
        {/* Expandable Details */}
        {showDetails && tx.txHash && (
          <div className="px-3 pb-3 pt-0 border-t border-white/10">
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">TX Hash:</span>
                <a
                  href={`https://xmrchain.net/search?value=${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[#00d4aa] hover:underline"
                >
                  {formatAddress(tx.txHash)}
                </a>
              </div>
              {tx.fee && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee:</span>
                  <span className="font-mono text-white">{tx.fee} XMR</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">From Wallet:</span>
                <span className="text-white">Wallet #{tx.fromWallet}</span>
              </div>
              
              {/* Real-time Status Check */}
              {shouldCheckStatus && (
                <StatusDisplay txHash={tx.txHash} />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Refresh Button Component
 */
function RefreshButton({ txHash }: { txHash: string }) {
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`/api/tx-status?txHash=${txHash}`);
      const data = await response.json();
      
      // Reload page to show updated status
      if (data.status === 'confirmed') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <button
      onClick={checkStatus}
      disabled={isChecking}
      className="p-1.5 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
      title="Check transaction status"
    >
      {isChecking ? (
        <span className="inline-block w-3 h-3 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="text-xs">🔄</span>
      )}
    </button>
  );
}

/**
 * Status Display Component
 */
function StatusDisplay({ txHash }: { txHash: string }) {
  const { data, loading, error } = useSingleTxStatus(txHash);

  if (loading) {
    return (
      <div className="text-gray-400 flex items-center gap-2">
        <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        Checking blockchain...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-xs">
        ⚠️ {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-1 pt-2 border-t border-white/5">
      <div className="flex justify-between">
        <span className="text-gray-400">Blockchain Status:</span>
        <span className={`font-medium ${
          data.status === 'confirmed' ? 'text-green-400' :
          data.status === 'pending' ? 'text-yellow-400' :
          'text-gray-400'
        }`}>
          {data.status}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Confirmations:</span>
        <span className="text-white font-mono">{data.confirmations}</span>
      </div>
      {data.inTxPool && (
        <div className="text-yellow-400 text-xs">
          ⏳ In mempool (unconfirmed)
        </div>
      )}
      {data.blockHeight && (
        <div className="flex justify-between">
          <span className="text-gray-400">Block:</span>
          <span className="text-white font-mono">{data.blockHeight}</span>
        </div>
      )}
    </div>
  );
}
