'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SwapRoute } from '@/types/wallet';
import type { PaymentStatus } from '@/lib/payment';
import { ArrowDownUp, TrendingUp, Clock, Zap, Copy, Check, QrCode, Send, X, Loader2, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { saveSwapOrder } from '@/lib/storage/encrypted';
import { useDebounce } from '@/lib/utils/hooks';

const SUPPORTED_COINS = ['BTC', 'ETH', 'LTC', 'SOL', 'USDC', 'XMR'];

interface SwapCardProps {
  onToCoinChange?: (coin: string) => void;
}

export default function SwapCard({ onToCoinChange }: SwapCardProps) {
  const [mode, setMode] = useState<'swap' | 'receive' | 'send'>('swap');
  const [fromCoin, setFromCoin] = useState('BTC');
  const [toCoin, setToCoin] = useState('XMR');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<SwapRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Send mode states
  const [shopAddress, setShopAddress] = useState('');
  const [exactAmount, setExactAmount] = useState('');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<any>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  // Prefetch prices API for instant quotes
  useEffect(() => {
    fetch('/api/prices').catch(() => {});
  }, []);

  // Debounced amount for API calls (reduces requests during typing)
  const debouncedAmount = useDebounce(amount, 600);

  // Auto-fetch route when debounced amount changes
  useEffect(() => {
    if (debouncedAmount && parseFloat(debouncedAmount) > 0 && fromCoin !== toCoin) {
      handleFindBestRoute();
    }
  }, [debouncedAmount, fromCoin, toCoin]);

  async function handleFindBestRoute() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter valid amount');
      return;
    }

    if (fromCoin === toCoin) {
      setError('Cannot swap same coin');
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
          toCoin,
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

  const [showXMRAddressModal, setShowXMRAddressModal] = useState(false);
  const [manualXMRAddress, setManualXMRAddress] = useState('');
  const [xmrAddressScannerActive, setXMRAddressScannerActive] = useState(false);
  const xmrScannerRef = useRef<any>(null);

  async function handleExecuteSwap() {
    if (!route) return;
    setShowXMRAddressModal(true);
  }

  async function handleXMRAddressConfirm() {
    if (!route) return;

    const xmrAddress = manualXMRAddress.trim();

    if (!xmrAddress || xmrAddress.length < 95) {
      toast.error('Invalid XMR Address', { description: 'Address must be 95+ characters' });
      return;
    }

    setShowXMRAddressModal(false);
    setLoading(true);
    setError(null);

    try {
      console.log(`🔄 Executing swap: ${route.fromAmount} ${route.fromCoin} → ${route.toCoin} via ${route.provider}`);

      const response = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: route.provider,
          fromCoin: route.fromCoin,
          toCoin: route.toCoin,
          amount: route.fromAmount,
          xmrAddress: xmrAddress.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Swap execution failed');
      }

      // Show success modal with deposit instructions
      const order = data.order;
      
      // Copy deposit address immediately
      await navigator.clipboard.writeText(order.depositAddress);
      
      toast.success('Swap Order Created!', {
        description: `Send ${order.depositAmount} ${order.depositCurrency} to address (copied to clipboard)`,
        duration: 10000,
      });

      // Save order with encryption (async lazy-loaded crypto-js)
      await saveSwapOrder({
        orderId: order.orderId,
        provider: order.provider,
        depositAddress: order.depositAddress,
        depositAmount: order.depositAmount,
        depositCurrency: order.depositCurrency,
        expectedReceiveAmount: order.expectedReceiveAmount,
        receiveCurrency: order.receiveCurrency,
        recipientAddress: xmrAddress,
        expiresAt: order.expiresAt,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });

      // Reset form
      setAmount('');
      setRoute(null);

      console.log(`✅ Swap order created: ${order.orderId}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMessage);
      console.error('❌ Swap execution error:', err);
      
      toast.error('Swap Failed', { 
        description: errorMessage + '. Try another provider.',
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyAddress() {
    const mockAddress = '4ABC1234567890abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234';
    await navigator.clipboard.writeText(mockAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Send mode functions
  async function handleGetEstimate() {
    if (!exactAmount || parseFloat(exactAmount) <= 0) return;
    try {
      const response = await fetch('/api/pay/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exactAmount: parseFloat(exactAmount) }),
      });
      const data = await response.json();
      setEstimate(data);
    } catch (error) {
      console.error('Get estimate error:', error);
    }
  }

  async function handlePay() {
    if (!shopAddress || !exactAmount) {
      setStatus({ stage: 'error', message: 'Missing required fields', error: 'Enter shop address and amount' });
      return;
    }
    setStatus({ stage: 'consolidating', message: 'Preparing payment...' });
    try {
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopAddress, exactAmount: parseFloat(exactAmount), label }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus({ stage: 'error', message: 'Payment failed', error: data.error || 'Unknown error' });
        return;
      }
      if (data.consolidationNeeded) {
        setStatus({ stage: 'consolidating', message: 'Consolidating wallets...' });
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setStatus({ stage: 'paying', message: 'Sending payment...' });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setStatus(data.status);
      if (data.status.stage === 'completed') {
        setTimeout(() => { setShopAddress(''); setExactAmount(''); setLabel(''); setEstimate(null); }, 3000);
      }
    } catch (error) {
      setStatus({ stage: 'error', message: 'Payment failed', error: error instanceof Error ? error.message : 'Network error' });
    }
  }

  async function handleXMRQRScan() {
    if (xmrAddressScannerActive) {
      await stopXMRScanner();
      return;
    }
    setXMRAddressScannerActive(true);
    try {
      // Lazy load html5-qrcode only when QR scanner opens
      const { Html5Qrcode } = await import('html5-qrcode');
      const qrScanner = new Html5Qrcode('xmr-qr-reader');
      xmrScannerRef.current = qrScanner;
      await qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Parse XMR address from QR (could be monero:ADDRESS or just ADDRESS)
          const address = decodedText.startsWith('monero:')
            ? decodedText.replace('monero:', '').split('?')[0]
            : decodedText;
          setManualXMRAddress(address);
          stopXMRScanner();
          toast.success('Address Scanned', { description: 'XMR address detected from QR code' });
        },
        (errorMessage) => console.log('Scanning...', errorMessage)
      );
    } catch (err) {
      console.error('XMR QR Scanner error:', err);
      toast.error('Camera Error', { description: 'Camera access denied or not available' });
      setXMRAddressScannerActive(false);
    }
  }

  async function stopXMRScanner() {
    if (xmrScannerRef.current) {
      try {
        await xmrScannerRef.current.stop();
        xmrScannerRef.current.clear();
      } catch (err) {
        console.error('Stop XMR scanner error:', err);
      }
      xmrScannerRef.current = null;
    }
    setXMRAddressScannerActive(false);
  }

  async function handleQRScan() {
    if (scannerActive) { await stopScanner(); return; }
    setScannerActive(true);
    try {
      // Lazy load html5-qrcode only when QR scanner opens
      const { Html5Qrcode } = await import('html5-qrcode');
      const qrScanner = new Html5Qrcode('qr-reader');
      scannerRef.current = qrScanner;
      await qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { parsePaymentURI(decodedText); stopScanner(); },
        (errorMessage) => console.log('Scanning...', errorMessage)
      );
    } catch (err) {
      console.error('QR Scanner error:', err);
      toast.error('Camera Error', { description: 'Camera access denied or not available' });
      setScannerActive(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); }
      catch (err) { console.error('Stop scanner error:', err); }
      scannerRef.current = null;
    }
    setScannerActive(false);
  }

  useEffect(() => {
    return () => { if (scannerRef.current) scannerRef.current.stop().catch(console.error); };
  }, []);

  function parsePaymentURI(text: string) {
    const uriMatch = text.match(/^(xmr|monero):\/?\/?([4|8][a-zA-Z0-9]{94,105})/);
    if (uriMatch) {
      setShopAddress(uriMatch[2]);
      const amountMatch = text.match(/[?&]amount=([0-9.]+)/);
      if (amountMatch) setExactAmount(amountMatch[1]);
      const labelMatch = text.match(/[?&]label=([^&]+)/);
      if (labelMatch) setLabel(decodeURIComponent(labelMatch[1]));
    } else if (text.match(/^[4|8][a-zA-Z0-9]{94,105}$/)) {
      setShopAddress(text);
    }
  }

  function handlePasteURI() {
    navigator.clipboard.readText().then((text) => parsePaymentURI(text));
  }

  return (
    <div className="space-y-4">
      <Card className="backdrop-blur-md bg-white/5 border-white/10 p-6">
        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => setMode('swap')}
              variant={mode === 'swap' ? 'default' : 'ghost'}
              className={`flex-1 min-h-[48px] ${
                mode === 'swap' 
                  ? 'bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90' 
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <ArrowDownUp className="w-4 h-4 mr-2" />
              Swap
            </Button>
            <Button
              onClick={() => setMode('receive')}
              variant={mode === 'receive' ? 'default' : 'ghost'}
              className={`flex-1 min-h-[48px] ${
                mode === 'receive' 
                  ? 'bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90' 
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Receive
            </Button>
            <Button
              onClick={() => setMode('send')}
              variant={mode === 'send' ? 'default' : 'ghost'}
              className={`flex-1 min-h-[48px] ${
                mode === 'send' 
                  ? 'bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90' 
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>

          {/* Swap Mode */}
          {mode === 'swap' && (
            <div className="space-y-5 text-center">
              {/* From Coin Dropdown */}
              <div className="space-y-2">
                <label className="text-sm text-white/70">From</label>
                <select
                  value={fromCoin}
                  onChange={(e) => setFromCoin(e.target.value)}
                  className="w-full max-w-xs mx-auto min-h-[48px] rounded-md bg-white/5 border border-white/10 text-white text-lg px-4 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300d4aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.5rem',
                  }}
                >
                  {SUPPORTED_COINS.filter(c => c !== toCoin).map((coin) => (
                    <option key={coin} value={coin} className="bg-[#0a0a0a]">
                      {coin}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm text-white/70">Amount</label>
                <div className="relative max-w-xs mx-auto">
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="min-h-[48px] bg-white/5 border-white/10 text-white text-lg text-center pr-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 font-medium">
                    {fromCoin}
                  </div>
                </div>
              </div>

              {/* To Coin Dropdown */}
              <div className="space-y-2">
                <label className="text-sm text-white/70">To</label>
                <select
                  value={toCoin}
                  onChange={(e) => {
                    setToCoin(e.target.value);
                    onToCoinChange?.(e.target.value);
                  }}
                  className="w-full max-w-xs mx-auto min-h-[48px] rounded-md bg-[#00d4aa]/10 border border-[#00d4aa]/30 text-[#00d4aa] text-lg px-4 appearance-none cursor-pointer hover:bg-[#00d4aa]/20 transition-colors font-medium"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300d4aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.5rem',
                  }}
                >
                  {SUPPORTED_COINS.filter(c => c !== fromCoin).map((coin) => (
                    <option key={coin} value={coin} className="bg-[#0a0a0a] text-white">
                      {coin}
                    </option>
                  ))}
                </select>
              </div>

              {/* Find Best Route Button */}
              <Button
                onClick={handleFindBestRoute}
                disabled={loading || !amount || fromCoin === toCoin}
                className="w-full max-w-xs mx-auto min-h-[48px] bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 font-semibold"
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
          )}

          {/* Receive Mode */}
          {mode === 'receive' && (
            <div className="space-y-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-6 h-6 text-[#00d4aa]" />
                <h3 className="text-xl font-semibold text-white">Receive XMR</h3>
              </div>

              <p className="text-white/70 text-sm">
                Send XMR to this address
              </p>

              {/* Wallet Address */}
              <div className="backdrop-blur-md bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm text-white/70 font-mono break-all flex-1">
                    4ABC1234...XYZ12345
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

              {/* QR Code Placeholder */}
              <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center">
                <QrCode className="w-24 h-24 text-black/20" />
              </div>

              <p className="text-xs text-white/50">
                💡 Scan QR code or copy address above
              </p>
            </div>
          )}

          {/* Send Mode */}
          {mode === 'send' && (
            <div className="space-y-5">
              {scannerActive && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white text-lg font-semibold">Scan Payment QR Code</h3>
                      <Button onClick={() => stopScanner()} variant="ghost" size="sm" className="text-white hover:bg-white/10">
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <div id="qr-reader" ref={qrReaderRef} className="rounded-lg overflow-hidden" />
                    <p className="text-white/70 text-sm text-center">Position QR code within the frame</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#00d4aa]" />
                  Send Payment
                </h3>
                <Button
                  onClick={handleQRScan}
                  variant="outline"
                  size="sm"
                  className={`border-white/20 hover:bg-white/10 ${
                    scannerActive ? 'bg-[#00d4aa]/20 text-[#00d4aa] border-[#00d4aa]/50' : 'text-white/70'
                  }`}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {scannerActive ? 'Stop Scan' : 'Scan QR'}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Shop Address</label>
                <Input
                  type="text"
                  placeholder="4... (95-106 characters)"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="min-h-[48px] bg-white/5 border-white/10 text-white font-mono text-sm"
                />
                <button onClick={handlePasteURI} className="text-xs text-[#00d4aa] hover:underline">
                  Paste Payment URI
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Exact Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.000000000001"
                    placeholder="2.453720000000"
                    value={exactAmount}
                    onChange={(e) => { setExactAmount(e.target.value); setEstimate(null); }}
                    onBlur={handleGetEstimate}
                    className="min-h-[48px] bg-white/5 border-white/10 text-white text-lg pr-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 font-medium">XMR</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70">Label (Optional)</label>
                <Input
                  type="text"
                  placeholder="Shop name or description"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="min-h-[48px] bg-white/5 border-white/10 text-white"
                />
              </div>

              {estimate && (
                <div className="p-4 rounded-md bg-white/5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Available</span>
                    <span className="text-white font-mono">{estimate.totalAvailable.toFixed(6)} XMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Hot Wallet</span>
                    <span className="text-white font-mono">{estimate.hotWalletBalance.toFixed(6)} XMR</span>
                  </div>
                  {estimate.consolidationNeeded && (
                    <div className="pt-2 border-t border-white/10 text-[#00d4aa] flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Will consolidate from other wallets
                    </div>
                  )}
                  {!estimate.possible && (
                    <div className="pt-2 border-t border-white/10 text-red-400">Insufficient funds</div>
                  )}
                </div>
              )}

              <Button
                onClick={handlePay}
                disabled={!shopAddress || !exactAmount || (estimate && !estimate.possible) || (status && status.stage !== 'error' && status.stage !== 'completed')}
                className="w-full min-h-[48px] bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 font-semibold disabled:opacity-50"
              >
                {status && status.stage !== 'error' && status.stage !== 'completed' ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {status.message}
                  </div>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Payment
                  </>
                )}
              </Button>

              {status && (
                <Card className={`backdrop-blur-md border p-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                  status.stage === 'completed' ? 'bg-[#00d4aa]/10 border-[#00d4aa]/30' :
                  status.stage === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-start gap-4">
                    {status.stage === 'completed' && <CheckCircle2 className="w-6 h-6 text-[#00d4aa] flex-shrink-0 mt-1" />}
                    {status.stage === 'error' && <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />}
                    {(status.stage === 'consolidating' || status.stage === 'paying') && <Loader2 className="w-6 h-6 text-[#00d4aa] flex-shrink-0 mt-1 animate-spin" />}
                    <div className="flex-1">
                      <div className={`font-semibold mb-1 ${
                        status.stage === 'completed' ? 'text-[#00d4aa]' :
                        status.stage === 'error' ? 'text-red-400' : 'text-white'
                      }`}>{status.message}</div>
                      {status.error && <div className="text-sm text-red-300 mb-2">{status.error}</div>}
                      {status.txId && <div className="text-sm text-white/50 font-mono break-all">TX: {status.txId}</div>}
                      {status.stage === 'consolidating' && <div className="text-sm text-white/70 mt-2">Collecting funds from multiple wallets...</div>}
                      {status.stage === 'paying' && <div className="text-sm text-white/70 mt-2">Broadcasting transaction to network...</div>}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Route Results */}
      {route && mode === 'swap' && (
        <Card className="backdrop-blur-md bg-white/5 border-white/10 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-5">
            {/* Provider Info */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/50 mb-1">Best Provider</div>
                <div className="text-xl font-bold text-[#00d4aa]">
                  {route.provider}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/50 mb-1">Fee</div>
                <div className="text-xl font-bold text-white">
                  {route.fee}
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
                  {parseFloat(route.toAmount).toFixed(6)} {toCoin}
                </span>
              </div>
            </div>

            {/* Distribution Info */}
            {toCoin === 'XMR' && (
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
            )}

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

      {/* XMR Address Modal */}
      {showXMRAddressModal && route && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="backdrop-blur-md bg-[#0a0a0a]/95 border-white/20 p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Enter XMR Address</h3>
                <button
                  onClick={() => { setShowXMRAddressModal(false); setManualXMRAddress(''); stopXMRScanner(); }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">You Send</span>
                  <span className="text-white font-semibold">{route.fromAmount} {route.fromCoin}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">You Receive</span>
                  <span className="text-[#00d4aa] font-bold">~{parseFloat(route.toAmount).toFixed(6)} {route.toCoin}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm text-white/70">
                  XMR Receiving Address
                  <span className="text-red-400 ml-1">*</span>
                </label>

                {/* QR Scanner Container */}
                {xmrAddressScannerActive && (
                  <div id="xmr-qr-reader" className="rounded-lg overflow-hidden border-2 border-[#00d4aa]"></div>
                )}

                <Input
                  value={manualXMRAddress}
                  onChange={(e) => setManualXMRAddress(e.target.value)}
                  placeholder="4ABC...xyz (95+ characters)"
                  className="font-mono text-sm bg-white/5 border-white/20"
                  disabled={xmrAddressScannerActive}
                />

                <div className="flex gap-2">
                  <Button
                    onClick={handleXMRQRScan}
                    variant="outline"
                    className="flex-1 border-white/20 hover:bg-white/10"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    {xmrAddressScannerActive ? 'Stop Scanner' : 'Scan QR Code'}
                  </Button>
                </div>

                <div className="text-xs text-white/50 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>Make sure your XMR address is correct. Funds sent to wrong address cannot be recovered.</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => { setShowXMRAddressModal(false); setManualXMRAddress(''); stopXMRScanner(); }}
                  variant="outline"
                  className="flex-1 border-white/20 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleXMRAddressConfirm}
                  disabled={!manualXMRAddress || manualXMRAddress.length < 95}
                  className="flex-1 bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 font-semibold disabled:opacity-50"
                >
                  Confirm & Execute
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
