// Encrypted localStorage wrapper for wallet data
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';

export interface EncryptedStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

export const encryptedStorage: EncryptedStorage = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString();
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Encryption error:', error);
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  },
};

// Swap order specific helpers
export interface SwapOrder {
  orderId: string;
  provider: string;
  depositAddress: string;
  depositAmount: string;
  depositCurrency: string;
  expectedReceiveAmount: string;
  receiveCurrency: string;
  recipientAddress: string;
  expiresAt: string;
  createdAt: string;
  status?: string;
}

export function saveSwapOrder(order: SwapOrder): void {
  const orders = getSwapOrders();
  orders.push(order);
  encryptedStorage.set('swapOrders', orders);
}

export function getSwapOrders(): SwapOrder[] {
  return encryptedStorage.get<SwapOrder[]>('swapOrders') || [];
}

export function updateSwapOrderStatus(orderId: string, status: string): void {
  const orders = getSwapOrders();
  const updated = orders.map(o => o.orderId === orderId ? { ...o, status } : o);
  encryptedStorage.set('swapOrders', updated);
}
