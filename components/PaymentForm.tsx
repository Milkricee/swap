'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface PaymentStatus {
  stage: 'idle' | 'consolidating' | 'paying' | 'completed' | 'error';
  message: string;
  txId?: string;
  error?: string;
}

export default function PaymentForm() {
  const [shopAddress, setShopAddress] = useState('');
  const [exactAmount, setExactAmount] = useState('');
  const [status, setStatus] = useState<PaymentStatus>({ stage: 'idle', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSmartPay = async () => {
    if (!shopAddress || !exactAmount) {
      setStatus({
        stage: 'error',
        message: 'Please enter address and amount',
        error: 'Missing required fields',
      });
      return;
    }

    const amount = parseFloat(exactAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatus({
        stage: 'error',
        message: 'Invalid amount',
        error: 'Amount must be a positive number',
      });
      return;
    }

    setLoading(true);
    setStatus({ stage: 'consolidating', message: 'Checking wallets...' });

    try {
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopAddress,
          exactAmount: amount,
          label: 'Shop Payment',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      // Show consolidation stage if needed
      if (data.consolidationNeeded) {
        setStatus({ stage: 'consolidating', message: 'Collecting funds...' });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Show paying stage
      setStatus({ stage: 'paying', message: 'Sending payment...' });
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Completed
      setStatus({
        stage: 'completed',
        message: `✅ Sent! ${amount.toFixed(5)} XMR`,
        txId: data.status.txId || 'simulated-tx-' + Date.now(),
      });

      // Clear form after success
      setTimeout(() => {
        setShopAddress('');
        setExactAmount('');
        setStatus({ stage: 'idle', message: '' });
      }, 5000);
    } catch (error) {
      setStatus({
        stage: 'error',
        message: 'Payment failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status.stage) {
      case 'consolidating':
        return 'text-yellow-400';
      case 'paying':
        return 'text-blue-400';
      case 'completed':
        return 'text-[#00d4aa]';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-white/50';
    }
  };

  const getStatusIcon = () => {
    switch (status.stage) {
      case 'consolidating':
        return '🔄';
      case 'paying':
        return '💸';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '';
    }
  };

  return (
    <Card className="backdrop-blur-md bg-white/5 border-white/10 p-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">💸</span>
        Smart Pay
      </h2>

      <div className="space-y-4">
        {/* Shop Address Input */}
        <div>
          <label className="text-sm text-white/50 mb-2 block">Shop Address</label>
          <Input
            type="text"
            value={shopAddress}
            onChange={(e) => setShopAddress(e.target.value)}
            placeholder="4Adk..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            disabled={loading}
          />
        </div>

        {/* Exact Amount Input */}
        <div>
          <label className="text-sm text-white/50 mb-2 block">Exact Amount (XMR)</label>
          <Input
            type="number"
            step="0.000001"
            value={exactAmount}
            onChange={(e) => setExactAmount(e.target.value)}
            placeholder="2.45372"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            disabled={loading}
          />
          <p className="text-xs text-white/30 mt-1">
            Enter the exact amount from the shop (e.g., 2.45372)
          </p>
        </div>

        {/* Status Display */}
        {status.stage !== 'idle' && (
          <div
            className={`backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-4 ${getStatusColor()}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStatusIcon()}</span>
              <div className="flex-1">
                <p className="font-semibold">{status.message}</p>
                {status.txId && (
                  <p className="text-xs mt-1 font-mono break-all">tx: {status.txId}</p>
                )}
                {status.error && (
                  <p className="text-xs mt-1 text-red-300">{status.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Smart Pay Button */}
        <Button
          onClick={handleSmartPay}
          disabled={loading || !shopAddress || !exactAmount}
          className="w-full bg-[#00d4aa] hover:bg-[#00d4aa]/80 text-black font-semibold h-12"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚙️</span>
              {status.message}
            </span>
          ) : (
            'Smart Pay (1 Tx)'
          )}
        </Button>

        {/* Info Box */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white/50">
          <p className="font-semibold text-white/70 mb-1">How it works:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Checks all 5 wallets for funds</li>
            <li>Auto-consolidates to Hot Wallet if needed</li>
            <li>Sends exact amount in 1 transaction</li>
            <li>+1% buffer for fees included</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
