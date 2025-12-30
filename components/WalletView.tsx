'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { XMRWallet } from '@/types/wallet';
import { Wallet, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';

export default function WalletView() {
  const [wallets, setWallets] = useState<XMRWallet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  async function handleCreateWallet() {
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

  async function handleRefreshBalance() {
    setRefreshing(true);
    try {
      await loadWallets();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCopyAddress() {
    if (!wallets || !wallets[0]) return;
    
    await navigator.clipboard.writeText(wallets[0].address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/50">Loading wallet...</div>
      </div>
    );
  }

  if (!wallets) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
        <div className="text-center space-y-2">
          <Wallet className="w-16 h-16 mx-auto text-[#00d4aa]/50" />
          <h3 className="text-xl font-semibold text-white">No Wallet Found</h3>
          <p className="text-white/50 max-w-md">
            Create your secure XMR wallet to start swapping and receiving payments.
          </p>
        </div>
        <Button
          onClick={handleCreateWallet}
          className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 min-h-[48px] px-8"
        >
          <Wallet className="w-5 h-5 mr-2" />
          Create Wallet
        </Button>
      </div>
    );
  }

  // Calculate total balance across all 5 wallets (background)
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);
  
  // Use Wallet #3 (Hot Wallet) as primary display address
  const primaryWallet = wallets.find(w => w.id === 3) || wallets[0];

  return (
    <div className="space-y-4" id="wallets-section">
      {/* Main Wallet Card */}
      <Card className="backdrop-blur-md bg-white/5 border-white/10 p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-[#00d4aa]/20">
                <Wallet className="w-6 h-6 text-[#00d4aa]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">My XMR Wallet</h3>
                <p className="text-sm text-white/50">Monero</p>
              </div>
            </div>
            <Button
              onClick={handleRefreshBalance}
              variant="outline"
              size="sm"
              className="border-white/20 text-white/70 hover:bg-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Total Balance */}
          <div className="text-center py-6">
            <div className="text-sm text-white/50 mb-2">Total Balance</div>
            <div className="text-5xl font-bold text-white mb-1">
              {totalBalance.toFixed(6)}
            </div>
            <div className="text-lg text-white/50">XMR</div>
          </div>

          {/* Primary Address (Wallet #3 - Hot Wallet) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Receiving Address</span>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-[#00d4aa] flex items-center gap-1 hover:underline"
              >
                {showDetails ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Show Details
                  </>
                )}
              </button>
            </div>

            <div className="backdrop-blur-md bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between gap-3">
                <code className="text-sm text-white/70 font-mono break-all flex-1">
                  {showDetails 
                    ? primaryWallet.address 
                    : `${primaryWallet.address.slice(0, 12)}...${primaryWallet.address.slice(-8)}`
                  }
                </code>
                <Button
                  onClick={handleCopyAddress}
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#00d4aa]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Details (Optional) */}
          {showDetails && (
            <div className="pt-4 border-t border-white/10">
              <details className="group">
                <summary className="cursor-pointer text-sm text-white/70 hover:text-white flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  Advanced: Multi-Wallet Distribution
                </summary>
                <div className="mt-4 space-y-2">
                  {wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="flex items-center justify-between text-xs p-2 rounded bg-white/5"
                    >
                      <span className="text-white/50">
                        Wallet #{wallet.id} ({wallet.type})
                      </span>
                      <span className="text-white font-mono">
                        {parseFloat(wallet.balance).toFixed(6)} XMR
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-white/50">
                    💡 Funds are distributed across 5 wallets for enhanced privacy
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Info */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="backdrop-blur-md bg-white/5 border-white/10 p-4">
          <div className="text-xs text-white/50 mb-1">Available for Payments</div>
          <div className="text-xl font-bold text-[#00d4aa]">
            {totalBalance.toFixed(6)}
          </div>
          <div className="text-xs text-white/50">XMR</div>
        </Card>

        <Card className="backdrop-blur-md bg-white/5 border-white/10 p-4">
          <div className="text-xs text-white/50 mb-1">Security</div>
          <div className="text-sm font-semibold text-white">
            Multi-Wallet
          </div>
          <div className="text-xs text-white/50">5-Way Split</div>
        </Card>
      </div>
    </div>
  );
}
