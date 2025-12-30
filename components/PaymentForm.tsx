'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { PaymentStatus } from '@/lib/payment';
import { Send, QrCode, Loader2, CheckCircle2, XCircle, Wallet, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function PaymentForm() {
  const [shopAddress, setShopAddress] = useState('');
  const [exactAmount, setExactAmount] = useState('');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  async function handleGetEstimate() {
    if (!exactAmount || parseFloat(exactAmount) <= 0) {
      return;
    }

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
      setStatus({
        stage: 'error',
        message: 'Missing required fields',
        error: 'Enter shop address and amount',
      });
      return;
    }

    // Reset status
    setStatus({ stage: 'consolidating', message: 'Preparing payment...' });

    try {
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopAddress,
          exactAmount: parseFloat(exactAmount),
          label,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({
          stage: 'error',
          message: 'Payment failed',
          error: data.error || 'Unknown error',
        });
        return;
      }

      // Show progress updates
      if (data.consolidationNeeded) {
        setStatus({ stage: 'consolidating', message: 'Consolidating wallets...' });
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setStatus({ stage: 'paying', message: 'Sending payment...' });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Final status
      setStatus(data.status);

      // Reset form on success
      if (data.status.stage === 'completed') {
        setTimeout(() => {
          setShopAddress('');
          setExactAmount('');
          setLabel('');
          setEstimate(null);
        }, 3000);
      }
    } catch (error) {
      setStatus({
        stage: 'error',
        message: 'Payment failed',
        error: error instanceof Error ? error.message : 'Network error',
      });
    }
  }

  async function handleQRScan() {
    if (scannerActive) {
      await stopScanner();
      return;
    }

    setScannerActive(true);

    try {
      const qrScanner = new Html5Qrcode('qr-reader');
      scannerRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: 'environment' }, // Use back camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Successfully scanned QR code
          parsePaymentURI(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Scanning in progress (no code detected yet)
          console.log('Scanning...', errorMessage);
        }
      );
    } catch (err) {
      console.error('QR Scanner error:', err);
      alert('Camera access denied or not available');
      setScannerActive(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  function parsePaymentURI(text: string) {
    // Parse xmr://address?amount=X&label=Y
    const uriMatch = text.match(/^(xmr|monero):\/?\/?([4|8][a-zA-Z0-9]{94,105})/);
    if (uriMatch) {
      setShopAddress(uriMatch[2]);
      
      const amountMatch = text.match(/[?&]amount=([0-9.]+)/);
      if (amountMatch) {
        setExactAmount(amountMatch[1]);
      }
      
      const labelMatch = text.match(/[?&]label=([^&]+)/);
      if (labelMatch) {
        setLabel(decodeURIComponent(labelMatch[1]));
      }
    } else {
      // Try direct address
      if (text.match(/^[4|8][a-zA-Z0-9]{94,105}$/)) {
        setShopAddress(text);
      }
    }
  }

  function handleQRFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // In production: Use QR decoder library (jsQR, qr-scanner)
    // Mock: Parse URI from filename or user input
    alert('QR Scanner: Use camera in production. For now, paste payment URI manually.');
  }

  function handlePasteURI() {
    navigator.clipboard.readText().then((text) => {
      parsePaymentURI(text);
    });
  }

  return (
    <div className="space-y-4">
      {/* QR Scanner Modal */}
      {scannerActive && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">Scan Payment QR Code</h3>
              <Button
                onClick={() => stopScanner()}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div 
              id="qr-reader" 
              ref={qrReaderRef}
              className="rounded-lg overflow-hidden"
            />
            <p className="text-white/70 text-sm text-center">
              Position QR code within the frame
            </p>
          </div>
        </div>
      )}

      {/* Payment Form */}
      <Card className="backdrop-blur-md bg-white/5 border-white/10 p-6">
        <div className="space-y-5">
          {/* Header */}
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

          {/* Shop Address */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">Shop Address</label>
            <Input
              type="text"
              placeholder="4... (95-106 characters)"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              className="min-h-[48px] bg-white/5 border-white/10 text-white font-mono text-sm"
            />
            <button
              onClick={handlePasteURI}
              className="text-xs text-[#00d4aa] hover:underline"
            >
              Paste Payment URI
            </button>
          </div>

          {/* Exact Amount */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">Exact Amount</label>
            <div className="relative">
              <Input
                type="number"
                step="0.000000000001"
                placeholder="2.453720000000"
                value={exactAmount}
                onChange={(e) => {
                  setExactAmount(e.target.value);
                  setEstimate(null);
                }}
                onBlur={handleGetEstimate}
                className="min-h-[48px] bg-white/5 border-white/10 text-white text-lg pr-16"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 font-medium">
                XMR
              </div>
            </div>
          </div>

          {/* Label (Optional) */}
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

          {/* Payment Estimate */}
          {estimate && (
            <div className="p-4 rounded-md bg-white/5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Available</span>
                <span className="text-white font-mono">
                  {estimate.totalAvailable.toFixed(6)} XMR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Hot Wallet</span>
                <span className="text-white font-mono">
                  {estimate.hotWalletBalance.toFixed(6)} XMR
                </span>
              </div>
              {estimate.consolidationNeeded && (
                <div className="pt-2 border-t border-white/10 text-[#00d4aa] flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Will consolidate from other wallets
                </div>
              )}
              {!estimate.possible && (
                <div className="pt-2 border-t border-white/10 text-red-400">
                  Insufficient funds
                </div>
              )}
            </div>
          )}

          {/* Pay Button */}
          <Button
            onClick={handlePay}
            disabled={
              !shopAddress ||
              !exactAmount ||
              (estimate && !estimate.possible) ||
              (status && status.stage !== 'error' && status.stage !== 'completed')
            }
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
        </div>
      </Card>

      {/* Status Card */}
      {status && (
        <Card
          className={`backdrop-blur-md border p-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            status.stage === 'completed'
              ? 'bg-[#00d4aa]/10 border-[#00d4aa]/30'
              : status.stage === 'error'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-white/5 border-white/10'
          }`}
        >
          <div className="flex items-start gap-4">
            {status.stage === 'completed' && (
              <CheckCircle2 className="w-6 h-6 text-[#00d4aa] flex-shrink-0 mt-1" />
            )}
            {status.stage === 'error' && (
              <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            )}
            {status.stage === 'consolidating' && (
              <Loader2 className="w-6 h-6 text-[#00d4aa] flex-shrink-0 mt-1 animate-spin" />
            )}
            {status.stage === 'paying' && (
              <Loader2 className="w-6 h-6 text-[#00d4aa] flex-shrink-0 mt-1 animate-spin" />
            )}

            <div className="flex-1">
              <div
                className={`font-semibold mb-1 ${
                  status.stage === 'completed'
                    ? 'text-[#00d4aa]'
                    : status.stage === 'error'
                    ? 'text-red-400'
                    : 'text-white'
                }`}
              >
                {status.message}
              </div>

              {status.error && (
                <div className="text-sm text-red-300 mb-2">{status.error}</div>
              )}

              {status.txId && (
                <div className="text-sm text-white/50 font-mono break-all">
                  TX: {status.txId}
                </div>
              )}

              {status.stage === 'consolidating' && (
                <div className="text-sm text-white/70 mt-2">
                  Collecting funds from multiple wallets...
                </div>
              )}

              {status.stage === 'paying' && (
                <div className="text-sm text-white/70 mt-2">
                  Broadcasting transaction to network...
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
