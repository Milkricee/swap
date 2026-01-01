'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { XMRWallet } from '@/types/wallet';
import { Wallet, Copy, Check, Eye, EyeOff, RefreshCw, ArrowDownToLine, Shield, Upload } from 'lucide-react';
import SeedBackupModal from '@/components/SeedBackupModal';
import WalletRecoveryModal from '@/components/WalletRecoveryModal';

export default function WalletView() {
  const [wallets, setWallets] = useState<XMRWallet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [showSeedBackup, setShowSeedBackup] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [justCreated, setJustCreated] = useState(false);

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
        body: JSON.stringify({}),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create wallets');
      }
      
      setWallets(data.wallets);
      setJustCreated(true);
      
      // Automatically show seed backup modal after creation
      setTimeout(() => {
        setShowSeedBackup(true);
      }, 500);
      
    } catch (error) {
      console.error('Failed to create wallets:', error);
      alert('Wallet creation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

  async function handleConsolidateToHot() {
    if (!wallets) return;
    
    // Calculate total amount in cold wallets (excluding hot wallet #2)
    const coldWalletsTotal = wallets
      .filter(w => w.id !== 2)
      .reduce((sum, w) => sum + parseFloat(w.balance), 0);
    
    if (coldWalletsTotal === 0) {
      alert('No funds in cold wallets to consolidate');
      return;
    }
    
    const confirmed = confirm(
      `Consolidate ${coldWalletsTotal.toFixed(6)} XMR from cold wallets to Hot Wallet #2?`
    );
    
    if (!confirmed) return;
    
    setConsolidating(true);
    try {
      const response = await fetch('/api/wallets/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAmount: coldWalletsTotal }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Consolidation failed');
      }
      
      // Update wallets with new balances
      setWallets(data.wallets);
      alert(`Successfully consolidated ${coldWalletsTotal.toFixed(6)} XMR to Hot Wallet`);
    } catch (error) {
      console.error('Failed to consolidate:', error);
      alert('Consolidation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setConsolidating(false);
    }
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
        
        <div className="flex gap-3">
          <Button
            onClick={handleCreateWallet}
            className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 min-h-[48px] px-8"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Create Wallet
          </Button>
          
          <Button
            onClick={() => setShowRecovery(true)}
            variant="outline"
            className="border-white/10 text-white hover:bg-white/10 min-h-[48px] px-8"
          >
            <Upload className="w-5 h-5 mr-2" />
            Recover Wallet
          </Button>
        </div>
        
        {/* Recovery Modal */}
        {showRecovery && (
          <WalletRecoveryModal
            onClose={() => setShowRecovery(false)}
            onRecovered={() => {
              setShowRecovery(false);
              loadWallets();
            }}
          />
        )}
      </div>
    );
  }

  // Calculate total balance across all 5 wallets (memoized for performance)
  const totalBalance = useMemo(() => 
    wallets.reduce((sum: number, w: XMRWallet) => sum + parseFloat(w.balance), 0),
    [wallets]
  );
  
  // Use Wallet #2 (Hot Wallet) as primary display address
  const primaryWallet = useMemo(() => 
    wallets.find(w => w.id === 2) || wallets[0],
    [wallets]
  );

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

          {/* Primary Address (Wallet #2 - Hot Wallet) */}
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

          {/* Wallet Grid - All 5 Wallets */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Wallet Distribution</h4>
              <Button
                onClick={handleConsolidateToHot}
                size="sm"
                disabled={consolidating || totalBalance === 0}
                className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30"
              >
                <ArrowDownToLine className={`w-4 h-4 mr-2 ${consolidating ? 'animate-bounce' : ''}`} />
                {consolidating ? 'Consolidating...' : 'Consolidate to Hot'}
              </Button>
            </div>

            {/* Mobile-Responsive Grid: 1-col → 2-col → 5-col */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {wallets.map((wallet) => {
                const isHot = wallet.id === 2;
                const badgeColor = isHot ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30';
                const badgeText = isHot ? 'HOT' : 'COLD';
                
                return (
                  <Card
                    key={wallet.id}
                    className={`backdrop-blur-md bg-white/5 border-white/10 p-4 transition-all ${
                      isHot ? 'ring-2 ring-orange-500/30' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Wallet Number + Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/70">
                          Wallet #{wallet.id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </div>

                      {/* Balance */}
                      <div>
                        <div className="text-lg font-bold text-white">
                          {parseFloat(wallet.balance).toFixed(4)}
                        </div>
                        <div className="text-xs text-white/50">XMR</div>
                      </div>

                      {/* Type Label */}
                      <div className="text-xs text-white/40 capitalize">
                        {wallet.type}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="pt-2 text-xs text-white/50 text-center">
              💡 Funds are distributed across 5 wallets for enhanced privacy
            </div>
          </div>
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
      
      {/* Seed Backup Modal */}
      {showSeedBackup && (
        <SeedBackupModal
          onClose={() => setShowSeedBackup(false)}
          onConfirmed={() => {
            setShowSeedBackup(false);
            setJustCreated(false);
          }}
        />
      )}
      
      {/* Backup Seeds Button (show if wallets exist but not just created) */}
      {wallets && !justCreated && (
        <div className="flex gap-3">
          <Button
            onClick={() => setShowSeedBackup(true)}
            variant="outline"
            className="flex-1 border-white/10 text-white hover:bg-white/10"
          >
            <Shield className="w-4 h-4 mr-2" />
            View/Backup Seeds
          </Button>
          
          <Button
            onClick={() => setShowRecovery(true)}
            variant="outline"
            className="flex-1 border-white/10 text-white hover:bg-white/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Recover from Seed
          </Button>
        </div>
      )}
      
      {/* Recovery Modal */}
      {showRecovery && (
        <WalletRecoveryModal
          onClose={() => setShowRecovery(false)}
          onRecovered={() => {
            setShowRecovery(false);
            loadWallets();
          }}
        />
      )}
    </div>
  );
}
