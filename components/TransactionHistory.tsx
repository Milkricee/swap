'use client';

import { useState, useEffect } from 'react';
import { getSwapHistory, type SwapOrder } from '@/lib/swap-providers/execute';
import { getPaymentHistory, type PaymentRecord, clearPaymentHistory } from '@/lib/payment/history';
import { clearSwapHistory } from '@/lib/swap-providers/execute';
// Removed: useTxMonitor, useSwapMonitor - will use API calls instead
import TransactionRow from './TransactionRow';
import { Skeleton } from './Skeleton';

type Transaction = (SwapOrder | PaymentRecord) & { type: 'swap' | 'payment' };

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'swaps' | 'payments'>('all');

  const loadTransactions = () => {
    try {
      setLoading(true);
      const swaps = getSwapHistory().map(s => ({ ...s, type: 'swap' as const }));
      const payments = getPaymentHistory().map(p => ({ ...p, type: 'payment' as const }));
      
      const combined = [...swaps, ...payments].sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(combined);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Auto-monitor pending payments (checks every 60s)
  const monitor = useTxMonitor({
    enabled: true,
    interval: 60_000, // 60 seconds
    onUpdate: () => {
      // Reload transactions when status updates
      loadTransactions();
    },
  });

  // Auto-monitor swap timeouts (checks every 2min)
  const swapMonitor = useSwapMonitor({
    enabled: true,
    interval: 120_000, // 2 minutes
    onTimeout: (count) => {
      // Reload transactions when timeouts detected
      if (count > 0) {
        loadTransactions();
      }
    },
  });

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'swaps') return tx.type === 'swap';
    if (filter === 'payments') return tx.type === 'payment';
    return true;
  });

  const handleExportCSV = () => {
    try {
      if (transactions.length === 0) {
        alert('No transactions to export');
        return;
      }

      const csvRows = [
        ['Type', 'Date', 'Amount', 'Currency', 'Status', 'Details'].join(','),
      ];

      transactions.forEach(tx => {
        if (tx.type === 'swap') {
          const swap = tx as SwapOrder;
          csvRows.push([
            'Swap',
            new Date(swap.timestamp).toISOString(),
            String(swap.receiveAmount ?? 0),
            swap.receiveCurrency ?? 'XMR',
            swap.status ?? 'unknown',
            `${swap.depositCurrency ?? '?'} → ${swap.receiveCurrency ?? 'XMR'} via ${swap.provider ?? 'unknown'}`,
          ].join(','));
        } else {
          const payment = tx as PaymentRecord;
          csvRows.push([
            'Payment',
            new Date(payment.timestamp).toISOString(),
            String(payment.amount ?? 0),
            'XMR',
            payment.status ?? 'unknown',
            `To ${(payment.recipient ?? 'unknown').slice(0, 10)}...`,
          ].join(','));
        }
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xmr-transactions-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleClearHistory = () => {
    if (transactions.length === 0) {
      return;
    }

    if (confirm('⚠️ Clear ALL transaction history? This cannot be undone.')) {
      try {
        clearSwapHistory();
        clearPaymentHistory();
        loadTransactions();
      } catch (error) {
        console.error('Failed to clear history:', error);
        alert('Failed to clear history. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Transaction History ({filteredTransactions.length})
        </h2>
        <div className="flex gap-2">
          {/* TX Monitor Status */}
          <button
            onClick={monitor.refresh}
            disabled={monitor.isMonitoring}
            className="px-3 py-1.5 text-sm bg-[#00d4aa]/10 hover:bg-[#00d4aa]/20 text-[#00d4aa] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            title={monitor.lastCheck ? `Last check: ${monitor.lastCheck.toLocaleTimeString()}` : 'Check TX status'}
          >
            {monitor.isMonitoring ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <span>🔄</span>
                Check Status
              </>
            )}
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={handleClearHistory}
            disabled={transactions.length === 0}
            className="px-3 py-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Monitor Info */}
      {monitor.pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-amber-400">
            <span>⏳</span>
            <span>
              {monitor.pendingCount} payment{monitor.pendingCount > 1 ? 's' : ''} pending confirmation
              {monitor.lastCheck && ` • Last checked ${monitor.lastCheck.toLocaleTimeString()}`}
            </span>
          </div>
        </div>
      )}

      {/* Swap Monitor Info */}
      {swapMonitor.timeoutsDetected > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-red-400">
            <span>⏰</span>
            <span>
              {swapMonitor.timeoutsDetected} swap{swapMonitor.timeoutsDetected > 1 ? 's' : ''} timed out
              {swapMonitor.lastCheck && ` • Last checked ${swapMonitor.lastCheck.toLocaleTimeString()}`}
            </span>
          </div>
        </div>
      )}

      {monitor.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          ⚠️ Monitor error: {monitor.error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
        {(['all', 'swaps', 'payments'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#00d4aa] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' && `All (${transactions.length})`}
            {f === 'swaps' && `Swaps (${transactions.filter(t => t.type === 'swap').length})`}
            {f === 'payments' && `Payments (${transactions.filter(t => t.type === 'payment').length})`}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <div>No {filter !== 'all' ? filter : 'transactions'} yet</div>
            <div className="text-sm mt-1">
              {filter === 'swaps' && 'Complete a swap to see it here'}
              {filter === 'payments' && 'Make a payment to see it here'}
              {filter === 'all' && 'Your transaction history will appear here'}
            </div>
          </div>
        ) : (
          filteredTransactions.map(tx => (
            <TransactionRow key={tx.id} tx={tx} />
          ))
        )}
      </div>
    </div>
  );
}
