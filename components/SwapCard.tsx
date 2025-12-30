'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SwapRoute } from '@/types/wallet';
import { ArrowDownUp, TrendingUp, Clock, Zap } from 'lucide-react';

const SUPPORTED_COINS = ['BTC', 'ETH', 'SOL', 'USDC'];

export default function SwapCard() {
  const [fromCoin, setFromCoin] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<SwapRoute | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFindBestRoute() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter valid amount');
      return;
    }

    setLoading(true);
    setError(null);
    setRoute(null);

    try {
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCoin,
          toCoin: 'XMR',
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find route');
      }

      if (!data.route) {
        setError('No routes available for this pair');
        return;
      }

      setRoute(data.route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find route');
    } finally {
      setLoading(false);
    }
  }

  async function handleExecuteSwap() {
    if (!route) return;

    setLoading(true);
    try {
      // In production: Execute swap with wallet connection
      console.log('Executing swap:', route);
      
      // Mock: Show success
      alert(`Swap executed! You will receive ${route.toAmount} XMR`);
      
      // Reset
      setAmount('');
      setRoute(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Swap Form */}
      <Card className="backdrop-blur-md bg-white/5 border-white/10 p-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <ArrowDownUp className="w-5 h-5 text-[#00d4aa]" />
              Swap to XMR
            </h3>
            <div className="text-sm text-white/50">Privacy-First</div>
          </div>

          {/* From Coin Selector */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">From</label>
            <div className="grid grid-cols-4 gap-2">
              {SUPPORTED_COINS.map((coin) => (
                <button
                  key={coin}
                  onClick={() => setFromCoin(coin)}
                  className={`min-h-[48px] rounded-md font-medium transition-colors ${
                    fromCoin === coin
                      ? 'bg-[#00d4aa] text-black'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {coin}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">Amount</label>
            <Input
              type="number"
              step="0.000001"
              placeholder={`0.0 ${fromCoin}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-[48px] bg-white/5 border-white/10 text-white text-lg"
            />
          </div>

          {/* To Coin (Fixed: XMR) */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">To</label>
            <div className="min-h-[48px] rounded-md bg-[#00d4aa]/10 border border-[#00d4aa]/30 px-4 flex items-center justify-between">
              <span className="text-[#00d4aa] font-medium">XMR</span>
              <span className="text-white/50 text-sm">Monero</span>
            </div>
          </div>

          {/* Find Best Route Button */}
          <Button
            onClick={handleFindBestRoute}
            disabled={loading || !amount}
            className="w-full min-h-[48px] bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 font-semibold"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Finding Best Route...
              </div>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 mr-2" />
                Find Best Route
              </>
            )}
          </Button>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </Card>

      {/* Route Results */}
      {route && (
        <Card className="backdrop-blur-md bg-white/5 border-white/10 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-5">
            {/* Provider Info */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/50 mb-1">Best Provider</div>
                <div className="text-xl font-bold text-[#00d4aa]">
                  {route.provider.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/50 mb-1">Fee</div>
                <div className="text-xl font-bold text-white">
                  {(route.provider.fee * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center gap-3 p-3 rounded-md bg-white/5">
              <Clock className="w-5 h-5 text-white/50" />
              <div>
                <div className="text-sm text-white/50">Estimated Time</div>
                <div className="text-white font-medium">{route.estimatedTime}</div>
              </div>
            </div>

            {/* Amounts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <span className="text-white/70">You Send</span>
                <span className="text-white font-semibold">
                  {route.fromAmount} {fromCoin}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <span className="text-white/70">Fee</span>
                <span className="text-red-400">
                  -{route.fee} {fromCoin}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-white/70">You Receive</span>
                <span className="text-[#00d4aa] font-bold text-lg">
                  {parseFloat(route.toAmount).toFixed(6)} XMR
                </span>
              </div>
            </div>

            {/* Distribution Info */}
            <div className="p-3 rounded-md bg-[#00d4aa]/10 border border-[#00d4aa]/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-[#00d4aa]" />
                <span className="text-[#00d4aa] text-sm font-medium">
                  Auto-Distribution
                </span>
              </div>
              <div className="text-xs text-white/70">
                Funds will be distributed across 5 wallets (20%-20%-30%-20%-10%)
              </div>
            </div>

            {/* Execute Swap Button */}
            <Button
              onClick={handleExecuteSwap}
              disabled={loading}
              className="w-full min-h-[48px] bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 font-semibold"
            >
              <Zap className="w-5 h-5 mr-2" />
              Execute Swap
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
