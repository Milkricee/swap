'use client';

import type { SwapOrder } from '@/lib/swap-providers/execute';
import type { PaymentRecord } from '@/lib/payment/history';

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
    return (
      <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
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
        <div className="text-right">
          <div className="font-mono text-white">
            -{tx.amount} XMR
          </div>
          <div className={`text-xs ${getStatusColor(tx.status)}`}>
            {getStatusIcon(tx.status)} {tx.status}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
