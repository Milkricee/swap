'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface PasswordSetupProps {
  onPasswordSet: (password: string) => void;
  isCreating?: boolean;
}

/**
 * Password Setup Component
 * - First-time wallet creation requires strong password
 * - Password used for PBKDF2 key derivation (100k iterations)
 * - Never stored, only derived key cached in memory
 */
export function PasswordSetup({ onPasswordSet, isCreating = false }: PasswordSetupProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [strength, setStrength] = useState(0);

  // Password strength checker
  const checkPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    setStrength(score);
    return score;
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    checkPasswordStrength(pwd);
    setError('');
  };

  const handleSubmit = () => {
    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (strength < 3) {
      setError('Password too weak. Use mix of upper/lowercase, numbers, symbols.');
      return;
    }

    onPasswordSet(password);
  };

  const getStrengthColor = () => {
    if (strength <= 2) return 'bg-red-500';
    if (strength === 3) return 'bg-yellow-500';
    if (strength === 4) return 'bg-green-500';
    return 'bg-green-600';
  };

  const getStrengthText = () => {
    if (strength <= 2) return 'Weak';
    if (strength === 3) return 'Medium';
    if (strength === 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <Card className="p-6 backdrop-blur-md bg-white/5 border-white/10">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {isCreating ? '🔐 Set Master Password' : '🔓 Enter Password'}
          </h3>
          <p className="text-sm text-gray-400">
            {isCreating 
              ? 'This password encrypts your wallet seeds. Never forget it - recovery is impossible without it.'
              : 'Enter your master password to unlock wallets'
            }
          </p>
        </div>

        {/* Password Input */}
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Master password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            className="pr-20 bg-black/30 border-white/20 text-white placeholder:text-gray-500"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
          >
            {showPassword ? '👁️ Hide' : '👁️‍🗨️ Show'}
          </button>
        </div>

        {/* Strength Indicator (only for new passwords) */}
        {isCreating && password && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Strength:</span>
              <span className={strength >= 4 ? 'text-green-400' : 'text-yellow-400'}>
                {getStrengthText()}
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${getStrengthColor()}`}
                style={{ width: `${(strength / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Confirm Password (only for new passwords) */}
        {isCreating && (
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            className="bg-black/30 border-white/20 text-white placeholder:text-gray-500"
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* Security Info */}
        {isCreating && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              💡 <strong>Password Security:</strong>
              <br />
              • 100,000 iterations PBKDF2 key derivation
              <br />
              • Never stored on disk or server
              <br />
              • Lost password = lost wallets (no recovery)
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!password || (isCreating && (!confirmPassword || strength < 3))}
          className="w-full bg-gradient-to-r from-[#00d4aa] to-[#00a884] hover:opacity-90 text-black font-semibold"
        >
          {isCreating ? '🔐 Create Encrypted Wallets' : '🔓 Unlock Wallets'}
        </Button>

        {/* Alternative Actions */}
        {!isCreating && (
          <p className="text-xs text-center text-gray-500">
            Forgot password? You must recover wallets from seed phrases.
          </p>
        )}
      </div>
    </Card>
  );
}
