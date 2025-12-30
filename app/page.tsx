import { ArrowLeftRight, Wallet, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">XMR Swap</h1>
            <p className="text-sm text-muted-foreground">Privacy-first exchange</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="text-xl md:text-2xl font-bold">0.00 XMR</p>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
        
        {/* Swap Card */}
        <Card className="glass hover:bg-white/10 transition-all">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowLeftRight className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Swap</CardTitle>
                <CardDescription>BTC/ETH/SOL → XMR</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Best Rate</p>
              <p className="text-2xl font-bold text-primary">0.15%</p>
              <p className="text-xs text-muted-foreground">via btcswapxmr</p>
            </div>
            <Button className="w-full touch-target" size="lg">
              Find Best Route
            </Button>
          </CardContent>
        </Card>

        {/* Wallets Card */}
        <Card className="glass hover:bg-white/10 transition-all">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Wallets</CardTitle>
                <CardDescription>5-Wallet Distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div 
                  key={num} 
                  className="p-3 rounded-md bg-white/5 border border-white/10"
                >
                  <p className="text-xs text-muted-foreground">Wallet {num}</p>
                  <p className="font-mono font-bold">0.00 XMR</p>
                  {num === 3 && (
                    <span className="text-xs text-primary">Hot</span>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full touch-target" size="lg">
              Create Wallets
            </Button>
          </CardContent>
        </Card>

        {/* Payment Card */}
        <Card className="glass hover:bg-white/10 transition-all md:col-span-2 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Send className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Payment</CardTitle>
                <CardDescription>Exact amount transfer</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Quick Actions</p>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start touch-target">
                  <span className="mr-2">💸</span> Send Payment
                </Button>
                <Button variant="ghost" className="w-full justify-start touch-target">
                  <span className="mr-2">📷</span> Scan QR Code
                </Button>
                <Button variant="ghost" className="w-full justify-start touch-target">
                  <span className="mr-2">🔄</span> Consolidate Wallets
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center">
        <p className="text-xs text-muted-foreground">
          100% Private • No KYC • Localhost Only
        </p>
      </footer>
    </main>
  );
}
