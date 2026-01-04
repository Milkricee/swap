'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Lazy Loading mit Skeleton Fallbacks
const SwapCard = dynamic(() => import('@/components/SwapCard'), {
  loading: () => (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8 animate-pulse">
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
      </div>
    </div>
  ),
});

const WalletView = dynamic(() => import('@/components/WalletView'), {
  loading: () => (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 animate-pulse">
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
      </div>
    </div>
  ),
});

const PaymentForm = dynamic(() => import('@/components/PaymentForm'), {
  loading: () => (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 animate-pulse">
      <div className="h-80 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
      </div>
    </div>
  ),
});

const TransactionHistory = dynamic(() => import('@/components/TransactionHistory'), {
  loading: () => (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 animate-pulse">
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
      </div>
    </div>
  ),
});

const AddressBookManager = dynamic(() => import('@/components/AddressBookManager'), {
  loading: () => (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 animate-pulse">
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
      </div>
    </div>
  ),
});

export default function Home() {
  const [toCoin, setToCoin] = useState('XMR');
  const [showAddressBook, setShowAddressBook] = useState(false);

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#00d4aa]">XMR Swap</h1>
            <p className="text-sm text-white/50">Privacy-first Monero exchange</p>
          </div>

          {/* Address Book Toggle */}
          <button
            onClick={() => setShowAddressBook(!showAddressBook)}
            className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
              showAddressBook
                ? 'bg-[#00d4aa]/20 border-[#00d4aa] text-[#00d4aa]'
                : 'bg-white/5 border-white/10 text-white hover:border-white/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📖</span>
              <span className="hidden sm:inline">Address Book</span>
            </span>
          </button>
        </div>
      </header>

      {/* Main Dashboard - 2 Column Layout */}
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Wallet Section - Full Width */}
        <section>
          <WalletView />
        </section>

        {/* Swap / Receive / Send Section - Full Width */}
        <section id="swap-section">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">↔️</span>
            Swap to {toCoin}
          </h2>
          <SwapCard onToCoinChange={setToCoin} />
        </section>

        {/* Payment Section - Full Width */}
        <section id="payment-section">
          <PaymentForm />
        </section>

        {/* Address Book Section - Toggleable */}
        {showAddressBook && (
          <section id="addressbook-section">
            <AddressBookManager />
          </section>
        )}

        {/* Transaction History Section - Full Width */}
        <section id="history-section">
          <TransactionHistory />
        </section>

        {/* Footer Info */}
        <footer className="text-center pt-8 pb-4 text-white/30 text-sm">
          <p>🔒 Privacy-first • 5-Wallet Distribution • Encrypted Storage</p>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs">
            <kbd className="px-2 py-1 rounded bg-white/5">⌘+S</kbd> Swap
            <kbd className="px-2 py-1 rounded bg-white/5">⌘+P</kbd> Pay
            <kbd className="px-2 py-1 rounded bg-white/5">⌘+W</kbd> Wallet
          </div>
        </footer>
      </div>
    </main>
  );
}
