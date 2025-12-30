import SwapCard from "@/components/SwapCard";
import WalletView from "@/components/WalletView";
import PaymentForm from "@/components/PaymentForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#00d4aa]">XMR Swap</h1>
            <p className="text-sm text-white/50">Privacy-first Monero exchange</p>
          </div>
        </div>
      </header>

      {/* Main Dashboard - 2 Column Layout */}
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Wallet Section - Full Width */}
        <section>
          <WalletView />
        </section>

        {/* Swap & Payment - Side by Side on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Swap Section */}
          <section id="swap-section">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">↔️</span>
              Swap to XMR
            </h2>
            <SwapCard />
          </section>

          {/* Payment Section */}
          <section id="payment-section">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">💸</span>
              Send Payment
            </h2>
            <PaymentForm />
          </section>
        </div>

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
