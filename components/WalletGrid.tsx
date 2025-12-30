'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { XMRWallet } from '@/types/wallet';
import { Wallet, RefreshCw, Zap } from 'lucide-react';

export default function WalletGrid() {
  const [wallets, setWallets] = useState<XMRWallet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [consolidating, setConsolidating] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  async function loadWallets() {
    try {
      const response = await fetch('/api/wallets');
      const data = await response.json();
      setWallets(data.wallets);
    } catch (error) {
      console.error('Failed to load wallets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWallets() {
    setLoading(true);
    try {
      const response = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'user-password-123' }), // In production: proper auth
      });
      
      const data = await response.json();
      setWallets(data.wallets);
    } catch (error) {
      console.error('Failed to create wallets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConsolidate() {
    setConsolidating(true);
    try {
      const response = await fetch('/api/wallets/consolidate', {
        method: 'POST',
      });
      
      await response.json();
      await loadWallets(); // Reload to show updated balances
    } catch (error) {
      console.error('Failed to consolidate:', error);
    } finally {
      setConsolidating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/50">Loading wallets...</div>
      </div>
    );
  }

  if (!wallets) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
        <div className="text-center space-y-2">
          <Wallet className="w-16 h-16 mx-auto text-[#00d4aa]/50" />
          <h3 className="text-xl font-semibold text-white">No Wallets Found</h3>
          <p className="text-white/50 max-w-md">
            Create your 5-wallet system to start swapping and making anonymous payments.
          </p>
        </div>
        <Button
          onClick={handleCreateWallets}
          className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 min-h-[48px] px-8"
        >
          <Wallet className="w-5 h-5 mr-2" />
          Create Wallets
        </Button>
      </div>
    );
  }

  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);
  const hotWallet = wallets.find((w) => w.id === 3);

  return (
    <div className="space-y-6">
      {/* Header with Total Balance */}
      <div className="backdrop-blur-md bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-white/50 text-sm mb-1">Total Balance</div>
            <div className="text-3xl font-bold text-white">
              {totalBalance.toFixed(6)} XMR
            </div>
          </div>
          <Button
            onClick={handleConsolidate}
            disabled={consolidating || totalBalance === 0}
            variant="outline"
            className="border-[#00d4aa]/30 text-[#00d4aa] hover:bg-[#00d4aa]/10 min-h-[48px]"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${consolidating ? 'animate-spin' : ''}`} />
            Consolidate to Hot Wallet
          </Button>
        </div>
      </div>

      {/* Wallets Grid - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {wallets.map((wallet) => (
          <Card
            key={wallet.id}
            className="backdrop-blur-md bg-white/5 border-white/10 p-5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {wallet.type === 'hot' ? (
                  <Zap className="w-5 h-5 text-[#00d4aa]" />
                ) : (
                  <Wallet className="w-5 h-5 text-white/50" />
                )}
                <span className="text-white/50 text-sm font-medium">
                  #{wallet.id}
                </span>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  wallet.type === 'hot'
                    ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                    : wallet.type === 'reserve'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                {wallet.type}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-white/50">{wallet.label}</div>
              <div className="text-2xl font-bold text-white">
                {parseFloat(wallet.balance).toFixed(6)}
              </div>
              <div className="text-xs text-white/30">XMR</div>
            </div>

            {/* Address Preview - NEVER show full address with private keys */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-xs text-white/30 font-mono truncate">
                {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Hot Wallet Quick Info */}
      {hotWallet && (
        <div className="backdrop-blur-md bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-[#00d4aa]" />
            <div>
              <div className="text-sm text-[#00d4aa]">Hot Wallet Ready</div>
              <div className="text-white/70 text-xs">
                {parseFloat(hotWallet.balance).toFixed(6)} XMR available for instant payments
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
