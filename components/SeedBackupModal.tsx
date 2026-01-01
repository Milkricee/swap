'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Check, Download, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useSessionStore } from '@/lib/storage/session';
import { PasswordSetup } from '@/components/PasswordSetup';

interface SeedBackupModalProps {
  onClose: () => void;
  onConfirmed: () => void;
}

export default function SeedBackupModal({ onClose, onConfirmed }: SeedBackupModalProps) {
  const [seeds, setSeeds] = useState<string[]>([]);
  const [showSeeds, setShowSeeds] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  const { password, setPassword } = useSessionStore();

  // Load seeds from localStorage (encrypted with password)
  const loadSeeds = async (pwd?: string) => {
    setLoading(true);
    const passwordToUse = pwd || password;
    
    if (!passwordToUse) {
      setNeedsPassword(true);
      setLoading(false);
      return;
    }

    try {
      // Import getWalletSeed dynamically
      const { getWalletSeed } = await import('@/lib/wallets/index');
      
      const loadedSeeds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const seed = await getWalletSeed(i, passwordToUse);
        if (seed) loadedSeeds.push(seed);
      }
      
      if (loadedSeeds.length === 0) {
        throw new Error('Invalid password or no wallets found');
      }

      // Store password in session if not already stored
      if (pwd && !password) {
        setPassword(pwd);
      }
      
      setSeeds(loadedSeeds);
      setShowSeeds(true);
      setNeedsPassword(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load seeds:', error);
      }
      alert('Failed to load wallet seeds. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordProvided = (pwd: string) => {
    loadSeeds(pwd);
  };

  const copySeed = async (seed: string, index: number) => {
    try {
      await navigator.clipboard.writeText(seed);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to copy:', error);
      }
    }
  };

  const downloadAllSeeds = () => {
    const content = seeds
      .map((seed, i) => `Wallet ${i + 1} (${['Cold', 'Cold', 'Hot', 'Cold', 'Reserve'][i]}):\n${seed}\n`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xmr-wallet-seeds-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirm = () => {
    if (!confirmed) {
      alert('Please confirm that you have backed up your seeds');
      return;
    }
    onConfirmed();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/10 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Backup Your Wallet Seeds</h2>
            <p className="text-sm text-white/50">CRITICAL: Without these, you lose access forever</p>
          </div>
        </div>

        {/* Password Prompt */}
        {needsPassword && !showSeeds && (
          <div className="mb-6">
            <PasswordSetup 
              onPasswordSet={handlePasswordProvided}
              isCreating={false}
            />
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full mt-4 border-white/20 text-white/70 hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Warning */}
        {!needsPassword && (
          <div className="backdrop-blur-md bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-400 mb-2">⚠️ Security Warning</h3>
            <ul className="text-sm text-red-300 space-y-1 list-disc list-inside">
              <li>Never share these seeds with anyone</li>
              <li>Store them offline in a safe place</li>
              <li>Anyone with these seeds can steal your XMR</li>
              <li>No recovery possible if lost</li>
            </ul>
          </div>
        )}

        {/* Show Seeds Button */}
        {!showSeeds && !needsPassword && (
          <Button
            onClick={() => loadSeeds()}
            disabled={loading}
            className="w-full bg-[#00d4aa] hover:bg-[#00d4aa]/80 text-black font-semibold h-12 mb-4"
          >
            {loading ? 'Loading...' : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Reveal 25-Word Seeds
              </>
            )}
          </Button>
        )}

        {/* Seeds Display */}
        {showSeeds && seeds.length > 0 && (
          <>
            <div className="space-y-4 mb-6">
              {seeds.map((seed, index) => (
                <div
                  key={index}
                  className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">
                      Wallet {index + 1} ({['Cold', 'Cold', 'Hot', 'Cold', 'Reserve'][index]})
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copySeed(seed, index)}
                      className="border-white/10 text-white hover:bg-white/10"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs font-mono text-[#00d4aa] break-all leading-relaxed">
                    {seed}
                  </p>
                </div>
              ))}
            </div>

            {/* Download All */}
            <Button
              onClick={downloadAllSeeds}
              variant="outline"
              className="w-full border-white/10 text-white hover:bg-white/10 mb-6"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All Seeds as .txt
            </Button>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-5 h-5 accent-[#00d4aa]"
              />
              <span className="text-sm text-white">
                I have securely backed up all 5 wallet seeds and understand that I cannot recover my funds without them.
              </span>
            </label>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-white/10 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          {showSeeds && (
            <Button
              onClick={handleConfirm}
              disabled={!confirmed}
              className="flex-1 bg-[#00d4aa] hover:bg-[#00d4aa]/80 text-black font-semibold"
            >
              I've Backed Up My Seeds
            </Button>
          )}
        </div>

        {/* Recovery Instructions */}
        {showSeeds && (
          <div className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-2">📋 Recovery Instructions</h4>
            <p className="text-xs text-white/50">
              To restore these wallets on another device, use the 25-word seed phrase with any Monero wallet 
              software that supports mnemonic recovery (Cake Wallet, Monero GUI, etc.).
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
