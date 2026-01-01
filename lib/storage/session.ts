'use client';

import { create } from 'zustand';

/**
 * Session Store
 * - Holds decrypted password in memory (max 30min)
 * - Auto-lock after inactivity
 * - Clears on page unload
 */
interface SessionState {
  password: string | null;
  lastActivity: number;
  isLocked: boolean;
  
  setPassword: (pwd: string) => void;
  clearPassword: () => void;
  updateActivity: () => void;
  checkLock: () => boolean;
}

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useSessionStore = create<SessionState>((set, get) => ({
  password: null,
  lastActivity: Date.now(),
  isLocked: true,

  setPassword: (pwd: string) => {
    set({
      password: pwd,
      lastActivity: Date.now(),
      isLocked: false,
    });

    // Auto-lock after 30min inactivity
    const checkInterval = setInterval(() => {
      const state = get();
      const elapsed = Date.now() - state.lastActivity;

      if (elapsed > SESSION_TIMEOUT && state.password) {
        state.clearPassword();
        clearInterval(checkInterval);
      }
    }, 60000); // Check every minute
  },

  clearPassword: () => {
    set({
      password: null,
      isLocked: true,
    });
  },

  updateActivity: () => {
    set({ lastActivity: Date.now() });
  },

  checkLock: () => {
    const state = get();
    const elapsed = Date.now() - state.lastActivity;

    if (elapsed > SESSION_TIMEOUT) {
      state.clearPassword();
      return true;
    }

    return state.isLocked;
  },
}));

// Clear password on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useSessionStore.getState().clearPassword();
  });
}
