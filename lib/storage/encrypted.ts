// Encrypted localStorage wrapper for wallet data
let CryptoJS: any;

// Lazy load crypto-js only when needed
async function getCrypto() {
  if (!CryptoJS) {
    CryptoJS = await import('crypto-js');
  }
  return CryptoJS;
}

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production';

export interface EncryptedStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): void;
  clear(): void;
}

export const encryptedStorage: EncryptedStorage = {
  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      const crypto = await getCrypto();
      const decrypted = crypto.AES.decrypt(encrypted, ENCRYPTION_KEY).toString(crypto.enc.Utf8);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const crypto = await getCrypto();
      const encrypted = crypto.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString();
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

export async function saveSwapOrder(order: SwapOrder): Promise<void> {
  const orders = await getSwapOrders();
  orders.push(order);
  await encryptedStorage.set('swapOrders', orders);
}

export async function getSwapOrders(): Promise<SwapOrder[]> {
  return (await encryptedStorage.get<SwapOrder[]>('swapOrders')) || [];
}

export async function updateSwapOrderStatus(orderId: string, status: string): Promise<void> {
  const orders = await getSwapOrders();
  const updated = orders.map(o => o.orderId === orderId ? { ...o, status } : o);
  await encryptedStorage.set('swapOrders', updated);
}
