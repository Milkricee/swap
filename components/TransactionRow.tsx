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
        return 'text-yellow-400';
      case 'failed':
      case 'expired':
        return 'text-red-400';
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
      case 'failed':
      case 'expired':
        return '✗';
      default:
        return '○';
    }
  };

  if (isSwap(tx)) {
    return (
      <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
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
            </div>
          </div>
        </div>

        {/* Right: Amount & Status */}
        <div className="text-right">
          <div className="font-mono text-white">
            +{tx.receiveAmount} {tx.receiveCurrency}
          </div>
          <div className={`text-xs ${getStatusColor(tx.status)}`}>
            {getStatusIcon(tx.status)} {tx.status}
          </div>
        </div>
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
