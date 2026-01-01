'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';

interface WalletRecoveryModalProps {
  onClose: () => void;
  onRecovered: () => void;
}

export default function WalletRecoveryModal({ onClose, onRecovered }: WalletRecoveryModalProps) {
  const [seeds, setSeeds] = useState<string[]>(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSeedChange = (index: number, value: string) => {
    const newSeeds = [...seeds];
    newSeeds[index] = value.trim();
    setSeeds(newSeeds);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const extractedSeeds: string[] = [];

      // Parse seeds from backup file format
      for (const line of lines) {
        if (line.includes('Wallet') && line.includes(':')) {
          const nextLineIndex = lines.indexOf(line) + 1;
          if (nextLineIndex < lines.length) {
            const seedLine = lines[nextLineIndex].trim();
            if (seedLine.split(' ').length === 25) {
              extractedSeeds.push(seedLine);
            }
          }
        }
      }

      if (extractedSeeds.length === 5) {
        setSeeds(extractedSeeds);
        setError('');
      } else {
        setError(`Found ${extractedSeeds.length} seeds, expected 5`);
      }
    } catch (err) {
      setError('Failed to read file');
    }
  };

  const validateSeeds = (): boolean => {
    for (let i = 0; i < 5; i++) {
      const seed = seeds[i].trim();
      if (!seed) {
        setError(`Wallet ${i + 1} seed is empty`);
        return false;
      }
      const words = seed.split(/\s+/);
      if (words.length !== 25) {
        setError(`Wallet ${i + 1} must have exactly 25 words (has ${words.length})`);
        return false;
      }
    }
    return true;
  };

  const handleRecover = async () => {
    setError('');
    
    if (!validateSeeds()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/wallets/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seeds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Recovery failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onRecovered();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/10 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-8 h-8 text-[#00d4aa]" />
          <div>
            <h2 className="text-2xl font-bold text-white">Recover Wallets</h2>
            <p className="text-sm text-white/50">Enter your 5 wallet seeds to restore</p>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block mb-2">
            <span className="text-sm text-white/70">Upload backup file (optional)</span>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="block w-full mt-2 text-sm text-white/50
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-[#00d4aa]/20 file:text-[#00d4aa]
                hover:file:bg-[#00d4aa]/30
                cursor-pointer"
            />
          </label>
        </div>

        {/* Seed Inputs */}
        <div className="space-y-4 mb-6">
          {seeds.map((seed, index) => (
            <div key={index}>
              <label className="text-sm text-white/70 mb-2 block">
                Wallet {index + 1} ({['Cold', 'Cold', 'Hot', 'Cold', 'Reserve'][index]}) - 25 words
              </label>
              <Input
                value={seed}
                onChange={(e) => handleSeedChange(index, e.target.value)}
                placeholder="word1 word2 word3 ..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                disabled={loading}
              />
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="backdrop-blur-md bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="backdrop-blur-md bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">✅ Wallets recovered successfully!</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={loading}
            className="flex-1 border-white/10 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRecover}
            disabled={loading || success}
            className="flex-1 bg-[#00d4aa] hover:bg-[#00d4aa]/80 text-black font-semibold"
          >
            {loading ? 'Recovering...' : success ? 'Recovered!' : 'Recover Wallets'}
          </Button>
        </div>

        {/* Info */}
        <div className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-2">⚠️ Important</h4>
          <ul className="text-xs text-white/50 space-y-1 list-disc list-inside">
            <li>Enter seeds in the SAME order as when created</li>
            <li>Each seed must be exactly 25 words</li>
            <li>This will OVERWRITE existing wallets</li>
            <li>Balance may take 5-15 minutes to sync</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
