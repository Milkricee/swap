'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + S = Focus Swap
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const swapSection = document.getElementById('swap-section');
        swapSection?.scrollIntoView({ behavior: 'smooth' });
      }

      // Cmd/Ctrl + P = Focus Payment
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        const paymentSection = document.getElementById('payment-section');
        paymentSection?.scrollIntoView({ behavior: 'smooth' });
      }

      // Cmd/Ctrl + W = Focus Wallets
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        const walletsSection = document.getElementById('wallets-section');
        walletsSection?.scrollIntoView({ behavior: 'smooth' });
      }

      // Esc = Clear all inputs/modals
      if (e.key === 'Escape') {
        const inputs = document.querySelectorAll('input');
        inputs.forEach((input) => {
          if (input.type === 'text' || input.type === 'number') {
            (input as HTMLInputElement).value = '';
          }
        });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return null;
}
